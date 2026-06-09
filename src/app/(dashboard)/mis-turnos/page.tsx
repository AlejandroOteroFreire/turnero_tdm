import { createClient } from '@/lib/supabase/server'
import { MisTurnosClient } from '@/components/calendario/MisTurnosClient'

export default async function MisTurnosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Próximas reservas activas (confirmadas o en espera)
  const { data: upcoming } = await supabase
    .from('bookings')
    .select(`
      id, status, waitlist_pos, booked_at, late_cancel,
      slot_instances!inner (
        id, date, status,
        training_slots ( label, start_time, end_time, day_of_week )
      )
    `)
    .eq('player_id', user.id)
    .in('status', ['confirmed', 'waitlisted'])
    .gte('slot_instances.date', new Date().toISOString().split('T')[0])
    .order('slot_instances(date)', { ascending: true })
    .limit(20)

  // Historial (últimas 8 semanas)
  const since = new Date()
  since.setDate(since.getDate() - 56)
  const { data: history } = await supabase
    .from('bookings')
    .select(`
      id, status, booked_at, late_cancel, cancelled_at,
      slot_instances!inner (
        id, date,
        training_slots ( label, start_time, end_time )
      )
    `)
    .eq('player_id', user.id)
    .in('status', ['confirmed', 'cancelled', 'cancelled_late', 'no_show'])
    .lt('slot_instances.date', new Date().toISOString().split('T')[0])
    .gte('slot_instances.date', since.toISOString().split('T')[0])
    .order('slot_instances(date)', { ascending: false })
    .limit(40)

  return (
    <MisTurnosClient
      upcoming={upcoming ?? []}
      history={history ?? []}
      userId={user.id}
    />
  )
}
