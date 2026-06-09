'use client'

import { useState } from 'react'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { BookingStatus } from '@/types'

// Tipos inferidos de la query anidada
interface SlotInfo {
  label: string | null
  start_time: string
  end_time: string
  day_of_week?: string
}
interface InstanceInfo {
  id: string
  date: string
  status: string
  training_slots: SlotInfo | null
}
interface BookingRow {
  id: string
  status: BookingStatus
  waitlist_pos: number | null
  booked_at: string
  late_cancel: boolean
  cancelled_at?: string | null
  slot_instances: InstanceInfo | null
}

interface Props {
  upcoming: BookingRow[]
  history:  BookingRow[]
  userId:   string
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; cls: string }> = {
  confirmed:      { label: 'Confirmado',   cls: 'text-green-400'  },
  waitlisted:     { label: 'En espera',    cls: 'text-amber-400'  },
  cancelled:      { label: 'Cancelado',    cls: 'text-gray-500'   },
  cancelled_late: { label: 'Cancel. tardía', cls: 'text-red-400'  },
  no_show:        { label: 'No asistió',   cls: 'text-red-400'    },
}

export function MisTurnosClient({ upcoming, history, userId }: Props) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [localUpcoming, setLocalUpcoming] = useState(upcoming)
  const [error, setError] = useState<string | null>(null)

  async function cancelBooking(bookingId: string) {
    setCancellingId(bookingId)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cancelar')

      setLocalUpcoming(prev => prev.filter(b => b.id !== bookingId))

      if (data.late_cancel) {
        setError('Cancelación registrada como tardía (menos de 2 hs antes del turno).')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setCancellingId(null)
    }
  }

  function formatSlotDate(date: string): string {
    const d = parseISO(date)
    if (isToday(d))    return 'Hoy'
    if (isTomorrow(d)) return 'Mañana'
    return format(d, "EEEE d 'de' MMMM", { locale: es })
  }

  function slotLabel(b: BookingRow): string {
    const s = b.slot_instances?.training_slots
    if (!s) return 'Turno'
    return s.label ?? `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Mis turnos</h1>

      {error && (
        <div className="rounded-lg bg-amber-900/30 border border-amber-700/50 px-3 py-2 text-sm text-amber-300">
          {error}
        </div>
      )}

      {/* Próximas reservas */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Próximas reservas
          <span className="ml-2 text-gray-600 normal-case">({localUpcoming.length})</span>
        </h2>

        {localUpcoming.length === 0 && (
          <div className="card text-center py-8 text-gray-500 text-sm">
            No tenés reservas próximas.{' '}
            <a href="/calendario" className="text-club-green hover:underline">Reservar turno</a>
          </div>
        )}

        {localUpcoming.map(booking => {
          const inst   = booking.slot_instances
          const date   = inst?.date ?? ''
          const isLate = inst?.status === 'active'
            ? false
            : false  // el servidor evalúa la cancelación tardía

          return (
            <div key={booking.id} className="card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm">
                  {slotLabel(booking)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {formatSlotDate(date)}
                  {' · '}
                  {inst?.training_slots?.start_time.slice(0, 5)}–{inst?.training_slots?.end_time.slice(0, 5)}
                </p>
                {booking.status === 'waitlisted' && (
                  <span className="text-xs text-amber-400 mt-0.5 block">
                    Lista de espera #{booking.waitlist_pos}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium ${STATUS_CONFIG[booking.status].cls}`}>
                  {STATUS_CONFIG[booking.status].label}
                </span>
                <button
                  onClick={() => cancelBooking(booking.id)}
                  disabled={cancellingId === booking.id}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-900/20"
                  title="Cancelar reserva"
                >
                  {cancellingId === booking.id ? '…' : '✕'}
                </button>
              </div>
            </div>
          )
        })}
      </section>

      {/* Historial */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Historial — últimas 8 semanas
        </h2>

        {history.length === 0 && (
          <div className="card text-center py-6 text-gray-600 text-sm">
            Sin historial todavía.
          </div>
        )}

        <div className="space-y-1">
          {history.map(booking => {
            const inst = booking.slot_instances
            const date = inst?.date ?? ''
            return (
              <div
                key={booking.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{slotLabel(booking)}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {format(parseISO(date), "EEEE d/MM", { locale: es })}
                  </p>
                </div>
                <span className={`text-xs font-medium shrink-0 ml-3 ${STATUS_CONFIG[booking.status].cls}`}>
                  {STATUS_CONFIG[booking.status].label}
                  {booking.late_cancel && <span className="text-red-500 ml-1">·tarde</span>}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
