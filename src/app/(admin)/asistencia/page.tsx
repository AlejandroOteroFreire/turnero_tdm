import { createClient } from '@/lib/supabase/server'
import { AsistenciaClient } from '@/components/admin/AsistenciaClient'
import { toZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'

const TZ = 'America/Argentina/Buenos_Aires'

export default async function AsistenciaPage() {
  const supabase = createClient()
  const today    = format(toZonedTime(new Date(), TZ), 'yyyy-MM-dd')

  // Instancias de hoy con sus reservas confirmadas
  const { data: instances } = await supabase
    .from('slot_instances')
    .select(`
      id, date, status,
      training_slots ( id, label, start_time, end_time, capacity )
    `)
    .eq('date', today)
    .eq('status', 'active')
    .order('training_slots(start_time)')

  // Para cada instancia, traer reservas + asistencia ya marcada
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
      instances={instances ?? []}
      bookings={bookings ?? []}
      attendance={attendance ?? []}
      today={today}
    />
  )
}
