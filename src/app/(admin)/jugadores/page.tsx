import { createClient } from '@/lib/supabase/server'
import { JugadoresClient } from '@/components/admin/JugadoresClient'

export default async function JugadoresPage() {
  const supabase = createClient()

  // Traer jugadores con perfil y estado de pago
  const { data: jugadores } = await supabase
    .from('user_accounts')
    .select(`
      id, display_name, email, phone, dni, status, roles, wa_opt_in,
      player_profiles ( full_name, frequency, medical_cert, joined_at )
    `)
    .contains('roles', ['player'])
    .order('display_name')

  // Estado de pago por jugador
  const { data: paymentStatuses } = await supabase
    .from('player_payment_status')
    .select('player_id, payment_status')

  const paymentMap = Object.fromEntries(
    (paymentStatuses ?? []).map(p => [p.player_id, p.payment_status])
  )

  return (
    <JugadoresClient
      jugadores={jugadores ?? []}
      paymentMap={paymentMap}
    />
  )
}
