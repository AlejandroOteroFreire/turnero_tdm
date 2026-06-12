import { createClient } from '@/lib/supabase/server'
import { JugadoresClient } from '@/components/admin/JugadoresClient'

export default async function JugadoresPage() {
  const supabase = createClient()

  // Traer jugadores con perfil y estado de pago
  const { data: jugadores } = await supabase
    .from('user_accounts')
    .select(`
      id, player_number, display_name, email, phone, dni, status, roles, wa_opt_in,
      player_profiles ( full_name, frequency, medical_cert, joined_at )
    `)
    .contains('roles', ['player'])
    .order('display_name')

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <JugadoresClient jugadores={(jugadores ?? []) as any} />
  )
}
