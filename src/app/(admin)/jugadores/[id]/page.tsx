import { createClient } from '@/lib/supabase/server'
import { JugadorDetalleClient } from '@/components/admin/JugadorDetalleClient'
import { notFound } from 'next/navigation'

export default async function JugadorDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Cargar cuenta y perfil
  const { data: account } = await supabase
    .from('user_accounts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!account) notFound()

  const { data: profile } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('user_id', params.id)
    .maybeSingle()

  // Slot assignments activos
  const { data: assignments } = await supabase
    .from('slot_assignments')
    .select(`
      id, slot_id, valid_from, valid_until,
      training_slots ( id, day_of_week, start_time, end_time, label, capacity )
    `)
    .eq('player_id', params.id)
    .or(`valid_until.is.null,valid_until.gte.${today}`)

  // Pagos
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('player_id', params.id)
    .order('paid_at', { ascending: false })

  // Estado de pago
  const { data: payStatus } = await supabase
    .from('player_payment_status')
    .select('payment_status')
    .eq('player_id', params.id)
    .maybeSingle()

  // Actividad reciente (últimos 90 días)
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
    .eq('player_id', params.id)
    .gte('booked_at', ninetyDaysAgo + 'T00:00:00')
    .order('booked_at', { ascending: false })
    .limit(50)

  return (
    <JugadorDetalleClient
      account={account}
      profile={profile}
      assignments={assignments ?? []}
      payments={payments ?? []}
      paymentStatus={payStatus?.payment_status ?? null}
      bookings={bookings ?? []}
    />
  )
}
