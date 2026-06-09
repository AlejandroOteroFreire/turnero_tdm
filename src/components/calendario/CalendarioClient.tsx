'use client'

import { useEffect, useState, useTransition } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { SlotInstanceAvailability, Booking } from '@/types'
import { SlotCard } from './SlotCard'

interface Props {
  instances:  SlotInstanceAvailability[]
  myBookings: Pick<Booking, 'id' | 'instance_id' | 'status' | 'waitlist_pos'>[]
  userId:     string | null
  weekStart:  string
}

export function CalendarioClient({ instances: initial, myBookings: initialBookings, userId, weekStart }: Props) {
  const [instances, setInstances]   = useState(initial)
  const [myBookings, setMyBookings] = useState(initialBookings)
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  // Suscripción Realtime a bookings e instancias
  useEffect(() => {
    const channel = supabase
      .channel('calendario-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
      }, payload => {
        startTransition(() => {
          if (payload.eventType === 'INSERT') {
            const b = payload.new as Booking
            setMyBookings(prev =>
              b.player_id === userId
                ? [...prev.filter(x => x.instance_id !== b.instance_id), { id: b.id, instance_id: b.instance_id, status: b.status, waitlist_pos: b.waitlist_pos }]
                : prev
            )
          } else if (payload.eventType === 'UPDATE') {
            const b = payload.new as Booking
            setMyBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: b.status, waitlist_pos: b.waitlist_pos } : x))
          } else if (payload.eventType === 'DELETE') {
            setMyBookings(prev => prev.filter(x => x.id !== (payload.old as Booking).id))
          }
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'slot_instances',
      }, payload => {
        startTransition(() => {
          const updated = payload.new as { id: string; status: string }
          setInstances(prev => prev.map(i =>
            i.instance_id === updated.id ? { ...i, instance_status: updated.status as 'active' | 'cancelled' | 'holiday' } : i
          ))
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId])

  // Agrupar por día
  const days = Array.from({ length: 6 }, (_, i) => {
    const date     = addDays(parseISO(weekStart), i)
    const dateStr  = format(date, 'yyyy-MM-dd')
    const dayInsts = instances.filter(inst => inst.date === dateStr)
    return { date, dateStr, instances: dayInsts }
  }).filter(d => d.instances.length > 0)

  const myBookingMap = Object.fromEntries(myBookings.map(b => [b.instance_id, b]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Calendario</h1>
        <p className="text-sm text-gray-400">
          Semana del {format(parseISO(weekStart), "d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {days.length === 0 && (
        <div className="card text-center py-8 text-gray-500 text-sm">
          No hay turnos disponibles esta semana
        </div>
      )}

      {days.map(({ date, dateStr, instances: dayInsts }) => (
        <div key={dateStr} className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            {format(date, "EEEE d 'de' MMMM", { locale: es })}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {dayInsts.map(inst => (
              <SlotCard
                key={inst.instance_id}
                instance={inst}
                booking={myBookingMap[inst.instance_id] ?? null}
                userId={userId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
