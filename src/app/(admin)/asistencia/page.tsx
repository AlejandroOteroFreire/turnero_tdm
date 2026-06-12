import { createClient } from '@/lib/supabase/server'
import { AsistenciaClient } from '@/components/admin/AsistenciaClient'
import { toZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'

const TZ = 'America/Argentina/Buenos_Aires'

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: { fecha?: string }
}) {
  const supabase = createClient()
  const today    = format(toZonedTime(new Date(), TZ), 'yyyy-MM-dd')
  const fecha    = searchParams.fecha ?? today

  // Validar formato de fecha
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  const selectedDate = dateRegex.test(fecha) ? fecha : today

  // Instancias de la fecha seleccionada con sus reservas confirmadas
  const { data: instances } = await supabase
    .from('slot_instances')
    .select(`
      id, date, status,
      training_slots ( id, label, start_time, end_time, capacity )
    `)
    .eq('date', selectedDate)
    .eq('status', 'active')
    .order('training_slots(start_time)')

  const instanceIds = (instances ?? []).map(i => i.id)

  const [{ data: bookings }, { data: attendance }] = await Promise.all([
    instanceIds.length > 0
      ? supabase
          .from('bookings')
          .select('id, instance_id, player_id, status, user_accounts!player_id(display_name, dni)')
          .in('instance_id', instanceIds)
          .eq('status', 'confirmed')
          .order('user_accounts(display_name)')
      : { data: [] },
    instanceIds.length > 0
      ? supabase
          .from('attendance')
          .select('id, instance_id, player_id, status')
          .in('instance_id', instanceIds)
      : { data: [] },
  ])

  return (
    <AsistenciaClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instances={(instances ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bookings={(bookings ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attendance={(attendance ?? []) as any}
      today={selectedDate}
    />
  )
}
