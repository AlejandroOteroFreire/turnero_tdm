import { createClient } from '@/lib/supabase/server'
import { JugadoresClient } from '@/components/admin/JugadoresClient'

export default async function JugadoresPage() {
  const supabase = createClient()

  const [{ data: jugadores }, { data: manuales }, { data: slots }] = await Promise.all([
    supabase
      .from('user_accounts')
      .select(`
        id, player_number, display_name, email, phone, dni, status, roles, wa_opt_in,
        player_profiles ( full_name, frequency, medical_cert, joined_at )
      `)
      .contains('roles', ['player'])
      .order('display_name'),
    // Jugadores sin cuenta (alta manual)
    supabase
      .from('player_profiles')
      .select('id, full_name, first_name, last_name, nickname, dni, phone, email, frequency, medical_cert, joined_at')
      .is('user_id', null)
      .order('full_name'),
    supabase
      .from('training_slots')
      .select('id, label, day_of_week, start_time, end_time')
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time'),
  ])

  // Normalizar jugadores manuales al mismo shape que user_accounts
  const manualesNormalized = (manuales ?? []).map(p => ({
    id:             p.id,           // profile id (no hay player_number)
    player_number:  null,
    display_name:   p.nickname ?? p.full_name,
    email:          p.email ?? '',
    phone:          p.phone,
    dni:            p.dni,
    status:         'active' as const,
    roles:          ['player'],
    wa_opt_in:      false,
    player_profiles: {
      full_name:    p.full_name,
      frequency:    p.frequency,
      medical_cert: p.medical_cert,
      joined_at:    p.joined_at,
    },
    is_manual: true,
  }))

  const todos = [
    ...(jugadores ?? []).map(j => ({ ...j, is_manual: false })),
    ...manualesNormalized,
  ].sort((a, b) => a.display_name.localeCompare(b.display_name))

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <JugadoresClient jugadores={todos as any} slots={slots ?? []} />
  )
}
