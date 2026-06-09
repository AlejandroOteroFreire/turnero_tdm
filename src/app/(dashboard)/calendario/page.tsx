import { createClient } from '@/lib/supabase/server'
import { CalendarioClient } from '@/components/calendario/CalendarioClient'
import { getWeekDates } from '@/lib/utils/dates'
import { addDays, startOfWeek } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

export default async function CalendarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Semana actual en zona horaria del club
  const now       = toZonedTime(new Date(), TZ)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Lunes
  const weekEnd   = addDays(weekStart, 5)                 // Sábado

  // Instancias de la semana con disponibilidad
  const { data: instances } = await supabase
    .from('slot_instance_availability')
    .select('*')
    .gte('date', weekStart.toISOString().split('T')[0])
    .lte('date', weekEnd.toISOString().split('T')[0])
    .neq('instance_status', 'cancelled')
    .order('date')
    .order('start_time')

  // Reservas del usuario para esta semana
  const { data: myBookings } = user ? await supabase
    .from('bookings')
    .select('id, instance_id, status, waitlist_pos')
    .eq('player_id', user.id)
    .in('status', ['confirmed', 'waitlisted'])
    .in('instance_id', (instances ?? []).map(i => i.instance_id))
    : { data: [] }

  return (
    <CalendarioClient
      instances={instances ?? []}
      myBookings={myBookings ?? []}
      userId={user?.id ?? null}
      weekStart={weekStart.toISOString()}
    />
  )
}
