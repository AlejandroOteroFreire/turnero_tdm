import { createClient } from '@/lib/supabase/server'
import { PagosClient } from '@/components/admin/PagosClient'

export default async function PagosPage() {
  const supabase = createClient()

  const { data: paymentStatuses } = await supabase
    .from('player_payment_status')
    .select('*')
    .order('payment_status')
    .order('display_name')

  const { data: recentPayments } = await supabase
    .from('payments')
    .select('*, user_accounts!player_id(display_name)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PagosClient
      paymentStatuses={paymentStatuses ?? []}
      recentPayments={recentPayments ?? []}
    />
  )
}
