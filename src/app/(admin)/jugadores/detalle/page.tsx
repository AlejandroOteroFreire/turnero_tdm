import { createClient } from '@/lib/supabase/server'
import { JugadorDetalleClient } from '@/components/admin/JugadorDetalleClient'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

export default async function JugadorDetallePage() {
  const playerId = cookies().get('_sp')?.value
  if (!playerId) redirect('/jugadores')

  const supabase = createClient()
  const today = format(toZonedTime(new Date(), TZ), 'yyyy-MM-dd')

  const { data: account } = await supabase
    .from('user_accounts')
    .select('*')
    .eq('id', playerId)
    .single()

  if (!account) redirect('/jugadores')

  const { data: profile } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('user_id', playerId)
    .maybeSingle()

  const { data: assignments } = await supabase
    .from('slot_assignments')
    .select(`
      id, slot_id, valid_from, valid_until,
      training_slots ( id, day_of_week, start_time, end_time, label, capacity )
    `)
    .eq('player_id', playerId)
    .or(`valid_until.is.null,valid_until.gte.${today}`)

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('player_id', playerId)
    .order('paid_at', { ascending: false })

  const { data: payStatus } = await supabase
    .from('player_payment_status')
    .select('payment_status')
    .eq('player_id', playerId)
    .maybeSingle()

  const { data: allSlots } = await supabase
    .from('training_slots')
    .select('id, day_of_week, start_time, end_time, label, capacity, is_active, created_by, created_at')
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time')

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, status, type, booked_at,
      slot_instances!instance_id (
        id, date,
        training_slots!slot_id ( day_of_week, start_time, end_time, label )
      )
    `)
    .eq('player_id', playerId)
    .gte('booked_at', ninetyDaysAgo + 'T00:00:00')
    .order('booked_at', { ascending: false })
    .limit(50)

  return (
    <JugadorDetalleClient
      account={account}
      profile={profile}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assignments={(assignments ?? []) as any}
      payments={payments ?? []}
      paymentStatus={payStatus?.payment_status ?? null}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bookings={(bookings ?? []) as any}
      allSlots={allSlots ?? []}
      today={today}
      isAdmin={true}
    />
  )
}
