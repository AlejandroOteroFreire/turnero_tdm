import { createClient } from '@/lib/supabase/server'
import { JugadorDetalleClient } from '@/components/admin/JugadorDetalleClient'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

export default async function JugadorDetallePage({ params }: { params: { num: string } }) {
  const playerNumber = parseInt(params.num, 10)
  if (!playerNumber || isNaN(playerNumber)) notFound()

  const supabase = createClient()

  // Verificar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Rol del usuario actual
  const { data: currentAccount } = await supabase
    .from('user_accounts')
    .select('roles, player_number')
    .eq('id', user.id)
    .single()

  const isAdmin = currentAccount?.roles?.includes('admin') || currentAccount?.roles?.includes('collaborator')
  const isSelf  = currentAccount?.player_number === playerNumber

  // Solo admin/colaborador o el propio jugador pueden ver este perfil
  if (!isAdmin && !isSelf) redirect('/calendario')

  const today = format(toZonedTime(new Date(), TZ), 'yyyy-MM-dd')

  // Cargar cuenta por número de socio
  const { data: account } = await supabase
    .from('user_accounts')
    .select('*')
    .eq('player_number', playerNumber)
    .single()

  if (!account) notFound()

  const playerId = account.id

  const [
    { data: profile },
    { data: assignments },
    { data: payments },
    { data: payStatus },
    { data: allSlots },
    { data: bookings },
  ] = await Promise.all([
    supabase
      .from('player_profiles')
      .select('*')
      .eq('user_id', playerId)
      .maybeSingle(),

    supabase
      .from('slot_assignments')
      .select(`id, slot_id, valid_from, valid_until,
        training_slots ( id, day_of_week, start_time, end_time, label, capacity )`)
      .eq('player_id', playerId)
      .or(`valid_until.is.null,valid_until.gte.${today}`),

    supabase
      .from('payments')
      .select('*')
      .eq('player_id', playerId)
      .order('paid_at', { ascending: false }),

    supabase
      .from('player_payment_status')
      .select('payment_status')
      .eq('player_id', playerId)
      .maybeSingle(),

    supabase
      .from('training_slots')
      .select('id, day_of_week, start_time, end_time, label, capacity, is_active, created_by, created_at')
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time'),

    supabase
      .from('bookings')
      .select(`id, status, type, booked_at,
        slot_instances!instance_id (
          id, date,
          training_slots!slot_id ( day_of_week, start_time, end_time, label )
        )`)
      .eq('player_id', playerId)
      .gte('booked_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00')
      .order('booked_at', { ascending: false })
      .limit(50),
  ])

  return (
    <JugadorDetalleClient
      account={account}
      profile={profile}
      assignments={assignments ?? []}
      payments={payments ?? []}
      paymentStatus={payStatus?.payment_status ?? null}
      bookings={bookings ?? []}
      allSlots={allSlots ?? []}
      today={today}
      isAdmin={isAdmin}
    />
  )
}
