import { createClient } from '@/lib/supabase/server'
import { CalendarioClient } from '@/components/calendario/CalendarioClient'
import { addDays, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

export default async function CalendarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 7 días corridos desde hoy, saltando domingos
  const now   = toZonedTime(new Date(), TZ)
  const today = format(now, 'yyyy-MM-dd')

  // Recolectamos hasta 9 días para asegurarnos de cubrir 7 sin domingos
  const rangeEnd = format(addDays(now, 9), 'yyyy-MM-dd')

  const { data: instances } = await supabase
    .from('slot_instance_availability')
    .select('*')
    .gte('date', today)
    .lte('date', rangeEnd)
    .neq('instance_status', 'cancelled')
    .order('date')
    .order('start_time')

  const { data: myBookings } = user && (instances ?? []).length > 0
    ? await supabase
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
      today={today}
    />
  )
}
