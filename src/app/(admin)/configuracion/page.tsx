import { createClient } from '@/lib/supabase/server'
import { ConfiguracionClient } from '@/components/admin/ConfiguracionClient'

const CONFIG_KEYS = [
  'auto_approve_plan_change',
  'cancel_cutoff_hours',
  'booking_window_days',
  'waitlist_offer_minutes',
  'default_slot_capacity',
]

export default async function ConfiguracionPage() {
  const supabase = createClient()

  const { data: configs } = await supabase
    .from('app_config')
    .select('key, value, description')
    .in('key', CONFIG_KEYS)

  const configMap = Object.fromEntries(
    (configs ?? []).map(c => [c.key, c.value])
  )

  return <ConfiguracionClient configMap={configMap} />
}
