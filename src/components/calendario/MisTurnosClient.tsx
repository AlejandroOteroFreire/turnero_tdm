'use client'

import { useState } from 'react'
import { addDays, format, parseISO, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import type { SlotInstanceAvailability, BookingStatus } from '@/types'

interface BookingMin {
  id:           string
  instance_id:  string
  status:       BookingStatus
  waitlist_pos: number | null
}
interface HistoryRow {
  id: string
  status: BookingStatus
  late_cancel: boolean
  slot_instances: {
    id: string
    date: string
    training_slots: { label: string | null; start_time: string; end_time: string } | null
  } | null
}
interface Props {
  weekStart:           string
  thisWeekInstances:   SlotInstanceAvailability[]
  thisWeekBookings:    BookingMin[]
  futureInstances:     SlotInstanceAvailability[]
  futureBookings:      BookingMin[]
  history:             HistoryRow[]
  userId:              string
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed:      'Confirmado',
  waitlisted:     'En espera',
  cancelled:      'Cancelado',
  cancelled_late: 'Cancelación tardía',
  no_show:        'No asistió',
}

export function MisTurnosClient({
  weekStart,
  thisWeekInstances,
  thisWeekBookings,
  futureInstances,
  futureBookings,
  history,
  userId,
}: Props) {
  const [bookings, setBookings]           = useState<BookingMin[]>(thisWeekBookings)
  const [futBooked, setFutBooked]         = useState<BookingMin[]>(futureBookings)
  const [cancellingId, setCancellingId]   = useState<string | null>(null)
  const [errorMsg, setErrorMsg]           = useState<string | null>(null)

  async function cancelBooking(bookingId: string, isFuture = false) {
    setCancellingId(bookingId)
    setErrorMsg(null)
    try {
      const res  = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cancelar')
      if (isFuture) {
        setFutBooked(prev => prev.filter(b => b.id !== bookingId))
      } else {
        setBookings(prev => prev.filter(b => b.id !== bookingId))
      }
      if (data.late_cancel) {
        setErrorMsg('Cancelación registrada como tardía (menos de 2 hs antes del turno).')
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Error')
    } finally {
      setCancellingId(null)
    }
  }

  // Mapa instanceId → booking
  const bookingMap = Object.fromEntries(bookings.map(b => [b.instance_id, b]))
  const futMap     = Object.fromEntries(futBooked.map(b => [b.instance_id, b]))

  // Días de la semana actual (Lun–Sáb)
  const days = Array.from({ length: 6 }, (_, i) => {
    const date    = addDays(parseISO(weekStart), i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const insts   = thisWeekInstances.filter(inst => inst.date === dateStr)
    return { date, dateStr, insts }
  })

  // Reservas futuras agrupadas por semana
  const futWithBooking = futureInstances
    .filter(i => futMap[i.instance_id])
    .map(i => ({ instance: i, booking: futMap[i.instance_id] }))

  const myBookingsTotal = bookings.length + futBooked.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Mis turnos</h1>
        <Link href="/calendario" className="btn-secondary text-xs py-1.5 px-3">
          + Reservar turno
        </Link>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-amber-900/30 border border-amber-700/50 px-3 py-2 text-sm text-amber-300">
          {errorMsg}
        </div>
      )}

      {/* ── Semana actual ── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Semana actual
          <span className="ml-2 text-gray-600 normal-case font-normal">
            {format(parseISO(weekStart), "d 'de' MMMM", { locale: es })}
          </span>
        </h2>

        <div className="space-y-2">
          {days.map(({ date, dateStr, insts }) => {
            // Sólo mostrar días donde tengo turno O donde hay turnos disponibles
            const myInsts = insts.filter(i => bookingMap[i.instance_id])
            if (myInsts.length === 0) return null

            return (
              <div key={dateStr}>
                <p className={`text-xs font-medium mb-1 capitalize ${isToday(date) ? 'text-club-green' : 'text-gray-500'}`}>
                  {isToday(date) ? '▸ Hoy — ' : ''}{format(date, "EEEE d/MM", { locale: es })}
                </p>
                <div className="space-y-1.5">
                  {myInsts.map(inst => {
                    const b = bookingMap[inst.instance_id]
                    return (
                      <BookingCard
                        key={inst.instance_id}
                        instance={inst}
                        booking={b}
                        onCancel={id => cancelBooking(id, false)}
                        cancelling={cancellingId === b.id}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {bookings.length === 0 && (
            <div className="card text-center py-8 space-y-2">
              <p className="text-gray-500 text-sm">No tenés turnos reservados esta semana.</p>
              <Link href="/calendario" className="text-club-green text-sm hover:underline">
                Ver turnos disponibles →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Próximas semanas ── */}
      {futWithBooking.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Próximas semanas
            <span className="ml-2 text-gray-600 normal-case font-normal">({futWithBooking.length})</span>
          </h2>
          <div className="space-y-1.5">
            {futWithBooking.map(({ instance, booking }) => (
              <BookingCard
                key={instance.instance_id}
                instance={instance}
                booking={booking}
                onCancel={id => cancelBooking(id, true)}
                cancelling={cancellingId === booking.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Historial ── */}
      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Historial — últimas 8 semanas
          </h2>
          <div className="divide-y divide-white/5">
            {history.map(b => {
              const inst = b.slot_instances
              const slot = inst?.training_slots
              return (
                <div key={b.id} className="flex items-center justify-between py-2 px-1 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">
                      {slot?.label ?? `${slot?.start_time.slice(0,5)}–${slot?.end_time.slice(0,5)}`}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {inst?.date ? format(parseISO(inst.date), "EEEE d/MM", { locale: es }) : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${
                    b.status === 'confirmed' ? 'text-green-400' :
                    b.status === 'no_show' || b.status === 'cancelled_late' ? 'text-red-400' :
                    'text-gray-500'
                  }`}>
                    {STATUS_LABEL[b.status]}
                    {b.late_cancel && <span className="text-red-500 ml-1">·tardía</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Sub-componente: card de una reserva ──
function BookingCard({
  instance, booking, onCancel, cancelling,
}: {
  instance:   SlotInstanceAvailability
  booking:    BookingMin
  onCancel:   (id: string) => void
  cancelling: boolean
}) {
  const isCancelled = instance.instance_status === 'cancelled'
  const label = instance.label ?? `${instance.start_time.slice(0,5)}–${instance.end_time.slice(0,5)}`

  return (
    <div className={`card flex items-center justify-between gap-3 ${isCancelled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <p className="font-semibold text-white text-sm truncate">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {instance.start_time.slice(0,5)}–{instance.end_time.slice(0,5)}
          {isCancelled && <span className="text-red-400 ml-2">· Turno cancelado</span>}
        </p>
        {booking.status === 'waitlisted' && (
          <span className="text-xs text-amber-400 mt-0.5 block">
            Lista de espera #{booking.waitlist_pos}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-medium ${
          booking.status === 'confirmed'  ? 'text-green-400' :
          booking.status === 'waitlisted' ? 'text-amber-400' : 'text-gray-500'
        }`}>
          {booking.status === 'confirmed' ? '✓ Confirmado' : '⏳ En espera'}
        </span>
        {!isCancelled && (
          <button
            onClick={() => onCancel(booking.id)}
            disabled={cancelling}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-900/20"
            title="Cancelar reserva"
          >
            {cancelling ? '…' : 'Cancelar'}
          </button>
        )}
      </div>
    </div>
  )
}
