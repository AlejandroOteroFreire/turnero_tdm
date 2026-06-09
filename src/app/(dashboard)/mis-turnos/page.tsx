import { createClient } from '@/lib/supabase/server'
import { MisTurnosClient } from '@/components/calendario/MisTurnosClient'
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

export default async function MisTurnosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now       = toZonedTime(new Date(), TZ)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd   = addDays(weekStart, 5) // Lunes → Sábado

  // Reservas de esta semana con disponibilidad del slot
  const { data: thisWeek } = await supabase
    .from('slot_instance_availability')
    .select('*')
    .gte('date', format(weekStart, 'yyyy-MM-dd'))
    .lte('date', format(weekEnd, 'yyyy-MM-dd'))
    .order('date')
    .order('start_time')

  // IDs de instancias de esta semana
  const thisWeekIds = (thisWeek ?? []).map(i => i.instance_id)

  // Mis reservas de esta semana
  const { data: thisWeekBookings } = thisWeekIds.length > 0
    ? await supabase
        .from('bookings')
        .select('id, instance_id, status, waitlist_pos')
        .eq('player_id', user.id)
        .in('instance_id', thisWeekIds)
        .in('status', ['confirmed', 'waitlisted'])
    : { data: [] }

  // Reservas futuras (próximas 3 semanas)
  const futureStart = addDays(weekEnd, 1)
  const futureEnd   = addDays(weekStart, 27) // 4 semanas totales
  const { data: futureInstances } = await supabase
    .from('slot_instance_availability')
    .select('*')
    .gte('date', format(futureStart, 'yyyy-MM-dd'))
    .lte('date', format(futureEnd, 'yyyy-MM-dd'))
    .order('date')
    .order('start_time')

  const futureIds = (futureInstances ?? []).map(i => i.instance_id)
  const { data: futureBookings } = futureIds.length > 0
    ? await supabase
        .from('bookings')
        .select('id, instance_id, status, waitlist_pos')
        .eq('player_id', user.id)
        .in('instance_id', futureIds)
        .in('status', ['confirmed', 'waitlisted'])
    : { data: [] }

  // Historial (últimas 8 semanas)
  const histStart = addDays(weekStart, -56)
  const { data: history } = await supabase
    .from('bookings')
    .select(`
      id, status, booked_at, late_cancel,
      slot_instances!inner (
        id, date,
        training_slots ( label, start_time, end_time )
      )
    `)
    .eq('player_id', user.id)
    .in('status', ['confirmed', 'cancelled', 'cancelled_late', 'no_show'])
    .lt('slot_instances.date', format(weekStart, 'yyyy-MM-dd'))
    .gte('slot_instances.date', format(histStart, 'yyyy-MM-dd'))
    .order('slot_instances(date)', { ascending: false })
    .limit(30)

  return (
    <MisTurnosClient
      weekStart={format(weekStart, 'yyyy-MM-dd')}
      thisWeekInstances={thisWeek ?? []}
      thisWeekBookings={thisWeekBookings ?? []}
      futureInstances={futureInstances ?? []}
      futureBookings={futureBookings ?? []}
      history={history ?? []}
      userId={user.id}
    />
  )
}
