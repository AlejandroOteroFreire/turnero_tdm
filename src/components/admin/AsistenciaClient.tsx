'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AttendanceStatus } from '@/types'

interface SlotInfo { id: string; label: string | null; start_time: string; end_time: string; capacity: number }
interface Instance  { id: string; date: string; status: string; training_slots: SlotInfo | null }
interface BookingRow {
  id: string; instance_id: string; player_id: string | null; profile_id: string | null
  status: string; waitlist_pos?: number | null
  user_accounts:  { display_name: string; dni: string | null } | null
  player_profiles: { full_name: string;   dni: string | null } | null
}
interface AttendanceRow { id: string; instance_id: string; player_id: string | null; profile_id: string | null; status: AttendanceStatus }

interface Props {
  instances:  Instance[]
  bookings:   BookingRow[]
  waitlisted: BookingRow[]
  attendance: AttendanceRow[]
  today:      string
}

const ATTEND_OPTIONS: { value: AttendanceStatus; label: string; activeStyle: React.CSSProperties; idleClass: string }[] = [
  { value: 'present',  label: 'Presente',       activeStyle: { backgroundColor:'#166534', color:'#fff' }, idleClass: 'bg-white/10 text-gray-400 hover:bg-white/20' },
  { value: 'absent',   label: 'Ausente',        activeStyle: { backgroundColor:'#374151', color:'#d1d5db' }, idleClass: 'bg-white/10 text-gray-400 hover:bg-white/20' },
  { value: 'no_show',  label: 'No se presentó', activeStyle: { backgroundColor:'#7f1d1d', color:'#fff' }, idleClass: 'bg-white/10 text-gray-400 hover:bg-white/20' },
]

const DAYS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function formatDateES(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DAYS_ES[dt.getDay()]} ${d} de ${MONTHS_ES[m - 1]}`
}

function addDays(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  const yy = dt.getFullYear()
  const mm  = String(dt.getMonth() + 1).padStart(2, '0')
  const dd  = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function AsistenciaClient({ instances, bookings: initialBookings, waitlisted: initialWaitlisted, attendance: initialAttendance, today }: Props) {
  const supabase = createClient()
  const router   = useRouter()

  const [bookings,   setBookings]   = useState<BookingRow[]>(initialBookings)
  const [waitlisted, setWaitlisted] = useState<BookingRow[]>(initialWaitlisted)
  const [attendance, setAttendance] = useState<AttendanceRow[]>(initialAttendance)
  const [saving,     setSaving]     = useState<string | null>(null)  // `${playerId}-${instanceId}`
  const [confirming, setConfirming] = useState<string | null>(null)  // booking_id

  const [cancelConfirm, setCancelConfirm] = useState<{
    bookingId:  string
    playerId:   string
    instanceId: string
    name:       string
    hour:       string
  } | null>(null)
  const [cancelling, setCancelling] = useState(false)

  function getAttendance(booking: BookingRow, instanceId: string): AttendanceStatus | null {
    return attendance.find(a =>
      a.instance_id === instanceId &&
      (booking.player_id ? a.player_id === booking.player_id : a.profile_id === booking.profile_id)
    )?.status ?? null
  }

  async function markAttendance(booking: BookingRow, instanceId: string, status: AttendanceStatus) {
    const key = `${booking.player_id ?? booking.profile_id}-${instanceId}`
    setSaving(key)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          instance_id: instanceId,
          player_id:   booking.player_id ?? null,
          profile_id:  booking.profile_id ?? null,
          status,
          marked_by:   user?.id,
          marked_at:   new Date().toISOString(),
        }, { onConflict: 'instance_id,player_id' })
        .select()
        .single()

      if (!error && data) {
        setAttendance(prev => [
          ...prev.filter(a => !(
            a.instance_id === instanceId &&
            (booking.player_id ? a.player_id === booking.player_id : a.profile_id === booking.profile_id)
          )),
          data as AttendanceRow,
        ])
      }
    } finally {
      setSaving(null)
    }
  }

  async function markAll(instanceId: string) {
    const slotBookings = bookings.filter(b => b.instance_id === instanceId)
    for (const booking of slotBookings) {
      if (getAttendance(booking, instanceId) !== 'present') {
        await markAttendance(booking, instanceId, 'present')
      }
    }
  }

  async function confirmCancel() {
    if (!cancelConfirm) return
    setCancelling(true)
    try {
      const res = await fetch('/api/admin/cancel-booking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: cancelConfirm.bookingId }),
      })
      if (res.ok) {
        setBookings(prev => prev.filter(b => b.id !== cancelConfirm.bookingId))
      }
    } finally {
      setCancelling(false)
      setCancelConfirm(null)
    }
  }

  async function confirmWaitlisted(booking: BookingRow) {
    setConfirming(booking.id)
    try {
      const res = await fetch('/api/admin/confirm-waitlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      })
      if (res.ok) {
        const updated = { ...booking, status: 'confirmed', waitlist_pos: null }
        setWaitlisted(prev => prev.filter(b => b.id !== booking.id))
        setBookings(prev => [...prev, updated])
      }
    } finally {
      setConfirming(null)
    }
  }

  const sortedInstances = [...instances].sort((a, b) =>
    (a.training_slots?.start_time ?? '').localeCompare(b.training_slots?.start_time ?? '')
  )

  return (
    <div className="space-y-4">
      {/* ── Header con navegación de fecha ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white">Asistencia</h1>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => router.push(`/asistencia?fecha=${addDays(today, -1)}`)}
            className="btn-ghost text-sm px-2.5 py-1.5"
          >
            ←
          </button>
          <span className="text-sm font-medium text-white min-w-[180px] text-center">
            {formatDateES(today)}
          </span>
          <button
            onClick={() => router.push(`/asistencia?fecha=${addDays(today, 1)}`)}
            className="btn-ghost text-sm px-2.5 py-1.5"
          >
            →
          </button>
          <input
            type="date"
            className="input text-sm py-1.5 ml-1"
            value={today}
            onChange={e => router.push(`/asistencia?fecha=${e.target.value}`)}
          />
        </div>
      </div>

      {instances.length === 0 && (
        <div className="card text-center py-10 text-gray-500 text-sm">
          No hay turnos programados para este día.
        </div>
      )}

      {/* ── Secciones de turno — lado a lado ── */}
      <div className="flex flex-wrap gap-4 items-start">
        {sortedInstances.map(instance => {
          const slot            = instance.training_slots
          const slotBookings    = bookings.filter(b => b.instance_id === instance.id)
          const slotWaitlisted  = waitlisted.filter(b => b.instance_id === instance.id)

          return (
            <div key={instance.id} className="space-y-3 min-w-[280px] flex-1 max-w-sm">
              {/* Header del turno */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {slot?.start_time.slice(0, 5)}–{slot?.end_time.slice(0, 5)}
                    {slot?.label ? ` · ${slot.label}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {slotBookings.length}/{slot?.capacity ?? '?'} confirmados
                    {slotWaitlisted.length > 0 && (
                      <span className="text-yellow-600 ml-1">· {slotWaitlisted.length} en espera</span>
                    )}
                  </p>
                </div>
              </div>

              {slotBookings.length === 0 && (
                <div className="card text-center py-5 text-gray-600 text-xs">
                  Sin reservas confirmadas para este turno.
                </div>
              )}

              {/* Cards de jugadores confirmados */}
              <div className="space-y-2">
                {slotBookings.map(booking => {
                  const currentStatus = getAttendance(booking, instance.id)
                  const isSaving      = saving === `${booking.player_id ?? booking.profile_id}-${instance.id}`
                  const name          = booking.user_accounts?.display_name ?? booking.player_profiles?.full_name ?? 'Jugador'
                  const dni           = booking.user_accounts?.dni ?? booking.player_profiles?.dni
                  const hour          = slot ? `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}` : ''

                  return (
                    <div key={booking.id} className="card bg-white/3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{name}</p>
                          {dni && <p className="text-xs text-gray-500 mt-0.5">DNI: {dni}</p>}
                        </div>
                        {isSaving && <span className="text-xs text-gray-500 shrink-0">Guardando…</span>}
                      </div>

                      {/* Botones de estado */}
                      <div className="flex flex-wrap gap-1.5">
                        {ATTEND_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => markAttendance(booking, instance.id, opt.value)}
                            disabled={isSaving}
                            style={currentStatus === opt.value ? { ...opt.activeStyle, outline: '2px solid rgba(255,255,255,0.25)', outlineOffset: '1px' } : undefined}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all
                              ${currentStatus === opt.value ? '' : opt.idleClass}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Cancelar clase */}
                      <div className="pt-1 border-t border-white/5">
                        <button
                          onClick={() => setCancelConfirm({
                            bookingId:  booking.id,
                            playerId:   booking.player_id,
                            instanceId: instance.id,
                            name,
                            hour,
                          })}
                          className="btn-secondary text-xs py-1 px-3 text-red-400 border-red-900 w-full"
                        >
                          Cancelar clase
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Lista de espera */}
              {slotWaitlisted.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-yellow-500 uppercase tracking-wide">
                    Lista de espera ({slotWaitlisted.length})
                  </p>
                  {slotWaitlisted.map(booking => {
                    const name  = booking.user_accounts?.display_name ?? booking.player_profiles?.full_name ?? 'Jugador'
                    const dni   = booking.user_accounts?.dni ?? booking.player_profiles?.dni
                    const isConfirming = confirming === booking.id

                    return (
                      <div key={booking.id} className="card bg-yellow-900/10 border border-yellow-700/20 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-yellow-600 font-bold">#{booking.waitlist_pos}</span>
                              <p className="text-sm font-medium text-white">{name}</p>
                            </div>
                            {dni && <p className="text-xs text-gray-500 mt-0.5">DNI: {dni}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => confirmWaitlisted(booking)}
                          disabled={isConfirming}
                          className="btn-secondary text-xs py-1 px-3 w-full text-yellow-400 border-yellow-800"
                        >
                          {isConfirming ? 'Confirmando…' : 'Confirmar en este turno'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modal de confirmación de cancelación ── */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card bg-gray-900 max-w-sm w-full mx-4 space-y-4">
            <p className="text-sm font-semibold text-white">¿Cancelar la clase?</p>
            <p className="text-sm text-gray-300">
              Se va a cancelar la clase de <strong>{cancelConfirm.name}</strong> del{' '}
              {formatDateES(today)} a las {cancelConfirm.hour}.
            </p>
            <p className="text-xs text-gray-500">
              Si hay jugadores en lista de espera, se ofrecerá el cupo automáticamente.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="btn-secondary text-xs py-1.5 px-4 text-red-400 border-red-800"
              >
                {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
              <button
                onClick={() => setCancelConfirm(null)}
                className="btn-ghost text-xs py-1.5 px-3"
              >
                No cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
