import { createClient } from '@/lib/supabase/server'
import { SolicitudesClient } from '@/components/admin/SolicitudesClient'

export default async function SolicitudesPage() {
  const supabase = createClient()

  // Obtener registration_requests pendientes con datos del jugador
  const { data: registrationRequests } = await supabase
    .from('registration_requests')
    .select(`
      *,
      user_accounts!player_id ( display_name, email, dni )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  // Obtener plan_change_requests pendientes con datos del jugador
  const { data: planChangeRequests } = await supabase
    .from('plan_change_requests')
    .select(`
      *,
      user_accounts!player_id ( display_name, email )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  // Obtener todos los training_slots activos para mostrar nombres en las opciones
  const { data: slots } = await supabase
    .from('training_slots')
    .select('*')
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time')

  // Conteo de slot_assignments activos por slot (para ver disponibilidad)
  const today = new Date().toISOString().split('T')[0]
  const { data: assignmentCounts } = await supabase
    .from('slot_assignments')
    .select('slot_id')
    .or(`valid_until.is.null,valid_until.gte.${today}`)

  const assignCountMap: Record<string, number> = {}
  for (const a of assignmentCounts ?? []) {
    assignCountMap[a.slot_id] = (assignCountMap[a.slot_id] ?? 0) + 1
  }

  return (
    <SolicitudesClient
      registrationRequests={registrationRequests ?? []}
      planChangeRequests={planChangeRequests ?? []}
      slots={slots ?? []}
      assignCountMap={assignCountMap}
    />
  )
}
