import { createClient } from '@/lib/supabase/server'
import { EditorTurnosClient } from '@/components/editor/EditorTurnosClient'
import { startOfWeek, addDays, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

export default async function EditorTurnosPage() {
  const supabase  = createClient()
  const now       = toZonedTime(new Date(), TZ)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekStr   = format(weekStart, 'yyyy-MM-dd')

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
      .contains('roles', ['player'])
      .eq('status', 'active')
      .order('display_name'),
    supabase
      .from('slot_assignments')
      .select('*')
      .eq('week_start', weekStr),
  ])

  return (
    <EditorTurnosClient
      slots={slots ?? []}
      players={players ?? []}
      assignments={assignments ?? []}
      weekStart={weekStr}
    />
  )
}
