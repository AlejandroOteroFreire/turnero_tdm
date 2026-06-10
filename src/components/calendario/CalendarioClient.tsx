'use client'

import { useEffect, useState, useTransition } from 'react'
import { addDays, format, parseISO, isToday, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { SlotInstanceAvailability, Booking } from '@/types'

interface BookingMin {
  id:           string
  instance_id:  string
  status:       'confirmed' | 'waitlisted'
  waitlist_pos: number | null
}

interface Props {
  instances:  SlotInstanceAvailability[]
  myBookings: BookingMin[]
  userId:     string | null
  today:      string
}

export function CalendarioClient({ instances: initial, myBookings: initialBookings, userId, today }: Props) {
  const [instances, setInstances]   = useState(initial)
  const [myBookings, setMyBookings] = useState(initialBookings)
  const [daysToShow, setDaysToShow] = useState(7)
  const [, startTransition]         = useTransition()
  const supabase                    = createClient()

  const MAX_DAYS = 56  // 8 semanas

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('calendario-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
        startTransition(() => {
          if (payload.eventType === 'INSERT') {
            const b = payload.new as Booking
            if (b.player_id === userId) {
              setMyBookings(prev => [
                ...prev.filter(x => x.instance_id !== b.instance_id),
                { id: b.id, instance_id: b.instance_id, status: b.status as 'confirmed' | 'waitlisted', waitlist_pos: b.waitlist_pos },
              ])
            }
            if ((b as any).status === 'confirmed') {
              setInstances(prev => prev.map(i =>
                i.instance_id === b.instance_id
                  ? { ...i, confirmed_count: i.confirmed_count + 1, available_spots: Math.max(0, i.available_spots - 1) }
                  : i
              ))
            }
          } else if (payload.eventType === 'UPDATE') {
            const b = payload.new as Booking
            if (b.player_id === userId) {
              setMyBookings(prev => prev.map(x => x.id === b.id
                ? { ...x, status: b.status as 'confirmed' | 'waitlisted', waitlist_pos: b.waitlist_pos }
                : x
              ))
            }
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Booking
            setMyBookings(prev => prev.filter(x => x.id !== old.id))
            setInstances(prev => prev.map(i =>
              i.instance_id === old.instance_id
                ? { ...i, confirmed_count: Math.max(0, i.confirmed_count - 1), available_spots: i.available_spots + 1 }
                : i
            ))
          }
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId])

  const myBookingMap = Object.fromEntries(myBookings.map(b => [b.instance_id, b]))

  // días desde hoy, sin domingos, hasta daysToShow
  const days: string[] = []
  let cursor = parseISO(today)
  while (days.length < daysToShow) {
    const dow = getDay(cursor)
    if (dow !== 0) days.push(format(cursor, 'yyyy-MM-dd'))
    cursor = addDays(cursor, 1)
  }

  // Columnas por día de la semana (1=lun … 6=sáb)
  function gridCols(dow: number) {
    if (dow >= 1 && dow <= 4) return 'grid-cols-3'   // Lun–Jue: 3 turnos
    if (dow === 5)             return 'grid-cols-1'   // Vie: 1 turno
    if (dow === 6)             return 'grid-cols-2'   // Sáb: 2 turnos
    return 'grid-cols-1'
  }

  return (
    <div className="space-y-1">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white">Turnos</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {daysToShow <= 7
            ? 'Próxima semana · Reservá tu turno'
            : `Próximas ${Math.round(daysToShow / 7)} semanas · Reservá tu turno`}
        </p>
      </div>

      {days.map(dateStr => {
        const date     = parseISO(dateStr)
        const dow      = getDay(date)
        const dayInsts = instances.filter(i => i.date === dateStr)
        const hoy      = isToday(date)

        return (
          <div key={dateStr} className="space-y-2">
            {/* Header del día */}
            <div className={`flex items-center gap-3 pt-3 ${hoy ? 'text-club-green' : 'text-gray-400'}`}>
              <div className="min-w-0">
                <span className="text-sm font-semibold capitalize">
                  {format(date, "EEEE", { locale: es })}
                </span>
                <span className="text-sm ml-2 text-gray-500">
                  {format(date, "d 'de' MMMM", { locale: es })}
                </span>
                {hoy && (
                  <span className="ml-2 text-xs font-bold bg-club-green text-white px-1.5 py-0.5 rounded">
                    Hoy
                  </span>
                )}
              </div>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Turnos del día */}
            {dayInsts.length === 0 ? (
              <p className="text-xs text-gray-600 pb-1">Sin turnos este día.</p>
            ) : (
              <div className={`grid gap-2 ${gridCols(dow)}`}>
                {dayInsts.map(inst => (
                  <SlotCard
                    key={inst.instance_id}
                    instance={inst}
                    booking={myBookingMap[inst.instance_id] ?? null}
                    userId={userId}
                    onBooked={(b) => {
                      setMyBookings(prev => [...prev.filter(x => x.instance_id !== b.instance_id), b])
                      if (b.status === 'confirmed') {
                        setInstances(prev => prev.map(i =>
                          i.instance_id === b.instance_id
                            ? { ...i, confirmed_count: i.confirmed_count + 1, available_spots: Math.max(0, i.available_spots - 1) }
                            : i
                        ))
                      }
                    }}
                    onCancelled={(instanceId, wasConfirmed) => {
                      setMyBookings(prev => prev.filter(x => x.instance_id !== instanceId))
                      if (wasConfirmed) {
                        setInstances(prev => prev.map(i =>
                          i.instance_id === instanceId
                            ? { ...i, confirmed_count: Math.max(0, i.confirmed_count - 1), available_spots: i.available_spots + 1 }
                            : i
                        ))
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Botón cargar más días */}
      {daysToShow < MAX_DAYS ? (
        <button
          onClick={() => setDaysToShow(d => Math.min(d + 7, MAX_DAYS))}
          className="w-full mt-4 py-3 rounded-xl border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition-colors text-sm flex items-center justify-center gap-2"
        >
          <span className="text-lg leading-none font-light">+</span>
          Ver 7 días más
        </button>
      ) : (
        <p className="text-center text-xs text-gray-600 mt-4 py-2">
          Mostrando hasta 8 semanas adelante
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// SlotCard inline (diseño nuevo)
// ─────────────────────────────────────────────
function SlotCard({
  instance, booking, userId, onBooked, onCancelled,
}: {
  instance:    SlotInstanceAvailability
  booking:     BookingMin | null
  userId:      string | null
  onBooked:    (b: BookingMin) => void
  onCancelled: (instanceId: string, wasConfirmed: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const { instance_id, start_time, end_time, label, capacity, confirmed_count, available_spots, waitlist_count } = instance

  const pct        = capacity > 0 ? Math.round((confirmed_count / capacity) * 100) : 0
  const isBooked   = booking?.status === 'confirmed'
  const isWaiting  = booking?.status === 'waitlisted'
  const isFull     = available_spots <= 0
  const isLow      = !isFull && available_spots <= 3

  // Color de la barra y badge
  const barColor  = isBooked ? 'bg-club-green' : isFull ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-club-green'
  const badgeText = isFull ? 'Lleno' : `${available_spots} libre${available_spots !== 1 ? 's' : ''}`
  const badgeCls  = isFull ? 'bg-red-500/20 text-red-400' : isLow ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'

  // Borde exterior del card según estado
  const borderCls = isBooked  ? 'border-club-green/60 bg-club-green/5'
                  : isWaiting ? 'border-yellow-500/60 bg-yellow-500/5'
                  : 'border-white/10 bg-white/3'

  async function handleBook() {
    if (!userId) return
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al reservar')
      const b = data.booking
      onBooked({ id: b.id, instance_id, status: b.status, waitlist_pos: b.waitlist_pos ?? null })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!booking) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al cancelar')
      }
      onCancelled(instance_id, booking.status === 'confirmed')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${borderCls}`}>
      {/* Horario */}
      <div className="flex items-start justify-between gap-1">
        <div>
          <p className="text-[11px] text-gray-400 font-mono leading-none">
            {start_time.slice(0,5)}–{end_time.slice(0,5)}
          </p>
        </div>
        {/* Badge disponibilidad */}
        {!isBooked && !isWaiting && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${badgeCls}`}>
            {badgeText}
          </span>
        )}
        {isBooked && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-club-green/20 text-club-green shrink-0">
            ✓ Reservado
          </span>
        )}
        {isWaiting && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 shrink-0">
            ⏳ #{booking!.waitlist_pos}
          </span>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {waitlist_count > 0 && !isBooked && !isWaiting && (
        <p className="text-[10px] text-gray-700 -mt-1">{waitlist_count} en espera</p>
      )}

      {/* Estado espera */}
      {isWaiting && (
        <p className="text-[11px] text-yellow-400">
          ⏳ En espera — posición #{booking!.waitlist_pos}
        </p>
      )}

      {error && <p className="text-[10px] text-red-400">{error}</p>}

      {/* Acción */}
      {userId && (
        isBooked ? (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full mt-auto text-[11px] font-medium py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            {loading ? '…' : '✕ Cancelar reserva'}
          </button>
        ) : isWaiting ? (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full mt-auto text-[11px] font-medium py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
          >
            {loading ? '…' : '✕ Salir de la espera'}
          </button>
        ) : isFull ? (
          <button
            onClick={handleBook}
            disabled={loading}
            className="w-full mt-auto text-[11px] font-medium py-1.5 rounded-lg border border-white/20 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {loading ? '…' : '⏳ Anotarme a la espera'}
          </button>
        ) : (
          <button
            onClick={handleBook}
            disabled={loading}
            className="w-full mt-auto text-[11px] font-medium py-1.5 rounded-lg bg-club-green text-white hover:bg-club-green/90 transition-colors disabled:opacity-50"
          >
            {loading ? '…' : '✓ Reservar'}
          </button>
        )
      )}
    </div>
  )
}
