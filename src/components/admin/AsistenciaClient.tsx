'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AttendanceStatus } from '@/types'

interface SlotInfo { id: string; label: string | null; start_time: string; end_time: string; capacity: number }
interface Instance  { id: string; date: string; status: string; training_slots: SlotInfo | null }
interface BookingRow {
  id: string; instance_id: string; player_id: string; status: string
  user_accounts: { display_name: string; dni: string | null } | null
}
interface AttendanceRow { id: string; instance_id: string; player_id: string; status: AttendanceStatus }

interface Props {
  instances:  Instance[]
  bookings:   BookingRow[]
  attendance: AttendanceRow[]
  today:      string
}

const ATTEND_OPTIONS: { value: AttendanceStatus; label: string; cls: string }[] = [
  { value: 'present',        label: 'Presente',   cls: 'bg-green-600 text-white'  },
  { value: 'absent',         label: 'Ausente',    cls: 'bg-gray-700 text-gray-300'},
  { value: 'no_show',        label: 'No se presentó', cls: 'bg-red-700 text-white'},
  { value: 'cancelled_late', label: 'Canceló tarde',  cls: 'bg-amber-700 text-white'},
]

export function AsistenciaClient({ instances, bookings, attendance: initialAttendance, today }: Props) {
  const supabase = createClient()
  const router   = useRouter()
  const [selectedInstance, setSelectedInstance] = useState<string | null>(
    instances.length === 1 ? instances[0].id : null
  )
  const [attendance, setAttendance] = useState<AttendanceRow[]>(initialAttendance)
  const [saving, setSaving]         = useState<string | null>(null)

  const instance = instances.find(i => i.id === selectedInstance)
  const slotBookings = bookings.filter(b => b.instance_id === selectedInstance)

  function getAttendance(playerId: string): AttendanceStatus | null {
    return attendance.find(a => a.instance_id === selectedInstance && a.player_id === playerId)?.status ?? null
  }

  async function markAttendance(playerId: string, status: AttendanceStatus) {
    if (!selectedInstance) return
    setSaving(playerId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          instance_id: selectedInstance,
          player_id:   playerId,
          status,
          marked_by:   user?.id,
          marked_at:   new Date().toISOString(),
        }, { onConflict: 'instance_id,player_id' })
        .select()
        .single()

      if (!error && data) {
        setAttendance(prev => [
          ...prev.filter(a => !(a.instance_id === selectedInstance && a.player_id === playerId)),
          data as AttendanceRow,
        ])
      }
    } finally {
      setSaving(null)
    }
  }

  async function markAll(status: AttendanceStatus) {
    for (const booking of slotBookings) {
      if (getAttendance(booking.player_id) !== status) {
        await markAttendance(booking.player_id, status)
      }
    }
  }

  // Resumen de asistencia del slot seleccionado
  const presentCount = slotBookings.filter(b => getAttendance(b.player_id) === 'present').length
  const markedCount  = slotBookings.filter(b => getAttendance(b.player_id) !== null).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-white">Asistencia — {today}</h1>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Fecha:</label>
          <input
            type="date"
            className="input text-sm py-1.5"
            value={today}
            onChange={e => router.push(`/asistencia?fecha=${e.target.value}`)}
          />
        </div>
      </div>

      {instances.length === 0 && (
        <div className="card text-center py-8 text-gray-500 text-sm">
          No hay turnos programados para hoy.
        </div>
      )}

      {/* Selector de instancia */}
      {instances.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {instances.map(inst => {
            const slot = inst.training_slots
            return (
              <button
                key={inst.id}
                onClick={() => setSelectedInstance(inst.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedInstance === inst.id
                    ? 'bg-club-green text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {slot?.label ?? slot?.start_time?.slice(0, 5)}
              </button>
            )
          })}
        </div>
      )}

      {instance && (
        <div className="space-y-4">
          {/* Header del turno seleccionado */}
          <div className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">
                {instance.training_slots?.label ?? 'Turno'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {instance.training_slots?.start_time.slice(0, 5)}–{instance.training_slots?.end_time.slice(0, 5)}
                {' · '}
                {slotBookings.length} reservas · {markedCount} marcados · {presentCount} presentes
              </p>
            </div>
            {slotBookings.length > 0 && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => markAll('present')}
                  className="btn-secondary text-xs py-1 px-2"
                  title="Marcar todos presentes"
                >
                  ✓ Todos
                </button>
              </div>
            )}
          </div>

          {/* Lista de jugadores con botones de asistencia */}
          {slotBookings.length === 0 && (
            <div className="card text-center py-6 text-gray-500 text-sm">
              No hay reservas confirmadas para este turno.
            </div>
          )}

          <div className="space-y-2">
            {slotBookings.map(booking => {
              const currentStatus = getAttendance(booking.player_id)
              const isSaving      = saving === booking.player_id
              const name          = booking.user_accounts?.display_name ?? 'Jugador'
              const dni           = booking.user_accounts?.dni

              return (
                <div key={booking.player_id} className="card space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{name}</p>
                      {dni && <p className="text-xs text-gray-500">DNI: {dni}</p>}
                    </div>
                    {isSaving && <span className="text-xs text-gray-500">Guardando…</span>}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {ATTEND_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => markAttendance(booking.player_id, opt.value)}
                        disabled={isSaving}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all
                          ${currentStatus === opt.value
                            ? `${opt.cls} ring-2 ring-white/30`
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
