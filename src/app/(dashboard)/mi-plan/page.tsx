import { createClient } from '@/lib/supabase/server'
import { MiPlanClient } from '@/components/calendario/MiPlanClient'

export default async function MiPlanPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: assignments },
    { data: requests },
    { data: allSlots },
  ] = await Promise.all([
    supabase
      .from('slot_assignments')
      .select('*, training_slots(id, day_of_week, start_time, end_time, label, capacity)')
      .eq('player_id', user!.id)
      .order('valid_from'),
    supabase
      .from('plan_change_requests')
      .select('*')
      .eq('player_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('training_slots')
      .select('id, day_of_week, start_time, end_time, label, capacity')
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time'),
  ])

  return (
    <MiPlanClient
      userId={user!.id}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assignments={(assignments ?? []) as any}
      requests={requests ?? []}
      allSlots={allSlots ?? []}
    />
  )
}
