import { createClient } from '@/lib/supabase/server'
import { EditorTurnosClient } from '@/components/editor/EditorTurnosClient'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

export default async function EditorTurnosPage() {
  const supabase = createClient()
  const today    = format(toZonedTime(new Date(), TZ), 'yyyy-MM-dd')

  const [{ data: slots }, { data: players }, { data: assignments }] = await Promise.all([
    supabase
      .from('training_slots')
      .select('*')
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time'),
    supabase
      .from('user_accounts')
      .select('id, display_name, roles')
      .eq('status', 'active')
      .order('display_name'),
    // Asignaciones activas: valid_from <= hoy AND (valid_until IS NULL OR valid_until >= hoy)
    supabase
      .from('slot_assignments')
      .select('id, player_id, slot_id, valid_from, valid_until')
      .lte('valid_from', today)
      .or(`valid_until.is.null,valid_until.gte.${today}`),
  ])

  const soloJugadores = (players ?? []).filter(p =>
    Array.isArray(p.roles) && p.roles.includes('player')
  )

  return (
    <EditorTurnosClient
      slots={slots ?? []}
      players={soloJugadores}
      assignments={assignments ?? []}
      today={today}
    />
  )
}
