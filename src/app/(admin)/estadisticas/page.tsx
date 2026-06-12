import { createClient } from '@/lib/supabase/server'
import { EstadisticasClient } from '@/components/admin/EstadisticasClient'
import { subWeeks, format, startOfWeek } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

export default async function EstadisticasPage() {
  const supabase  = createClient()
  const now       = toZonedTime(new Date(), TZ)
  const since     = format(subWeeks(now, 8), 'yyyy-MM-dd')

  const [{ data: attendance }, { data: paymentStats }] = await Promise.all([
    supabase
      .from('attendance')
      .select('status, created_at, slot_instances!inner(date)')
      .gte('slot_instances.date', since)
      .order('created_at'),
    supabase
      .from('player_payment_status')
      .select('payment_status'),
  ])

  // Agrupar asistencia por semana
  const weeklyMap: Record<string, { present: number; absent: number; cancelled: number }> = {}
  for (const row of attendance ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const date = (row.slot_instances as any)?.date as string | undefined
    if (!date) continue
    const wk = format(startOfWeek(new Date(date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    if (!weeklyMap[wk]) weeklyMap[wk] = { present: 0, absent: 0, cancelled: 0 }
    if (row.status === 'present') weeklyMap[wk].present++
    else if (row.status === 'no_show') weeklyMap[wk].absent++
    else weeklyMap[wk].cancelled++
  }

  const weeklyData = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, counts]) => ({ week, ...counts }))

  // Distribución de pagos
  const paymentDist = {
    current:       paymentStats?.filter(p => p.payment_status === 'current').length ?? 0,
    owes_month:    paymentStats?.filter(p => p.payment_status === 'owes_month').length ?? 0,
    owes_previous: paymentStats?.filter(p => p.payment_status === 'owes_previous').length ?? 0,
  }

  return <EstadisticasClient weeklyData={weeklyData} paymentDist={paymentDist} />
}
