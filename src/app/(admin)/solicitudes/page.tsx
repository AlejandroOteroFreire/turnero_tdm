import { createClient } from '@/lib/supabase/server'
import { SolicitudesClient } from '@/components/admin/SolicitudesClient'

export default async function SolicitudesPage() {
  const supabase = createClient()

  const [
    { data: requests },
    { data: allSlots },
    { data: config },
  ] = await Promise.all([
    supabase
      .from('plan_change_requests')
      .select('*, user_accounts(display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('training_slots')
      .select('id, day_of_week, start_time, end_time, label')
      .eq('is_active', true),
    supabase
      .from('app_config')
      .select('value')
      .eq('key', 'auto_approve_plan_change')
      .single(),
  ])

  return (
    <SolicitudesClient
      requests={requests ?? []}
      allSlots={allSlots ?? []}
      autoApprove={config?.value === 'true'}
    />
  )
}
