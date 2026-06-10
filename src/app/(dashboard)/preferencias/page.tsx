import { createClient } from '@/lib/supabase/server'
import { PreferenciasClient } from '@/components/notificaciones/PreferenciasClient'

export default async function PreferenciasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: account },
    { data: prefs },
    { data: favSlots },
    { data: allSlots },
  ] = await Promise.all([
    supabase
      .from('user_accounts')
      .select('phone, wa_opt_in')
      .eq('id', user.id)
      .single(),
    supabase
      .from('notification_prefs')
      .select('channel, event_type, enabled')
      .eq('player_id', user.id)
      .in('event_type', ['booking_confirmed', 'slot_open_spots']),
    supabase
      .from('favorite_slots')
      .select('slot_id')
      .eq('player_id', user.id),
    supabase
      .from('training_slots')
      .select('id, day_of_week, start_time, end_time, label')
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time'),
  ])

  // Extraer prefs simples
  const prefMap = Object.fromEntries(
    (prefs ?? []).map(p => [`${p.channel}:${p.event_type}`, p.enabled])
  )

  return (
    <PreferenciasClient
      userId={user.id}
      waOptIn={account?.wa_opt_in ?? false}
      hasPhone={Boolean(account?.phone)}
      simplePref={{
        reminder_24h: prefMap['whatsapp:booking_confirmed'] ?? true,
        open_spots:   prefMap['whatsapp:slot_open_spots'] ?? true,
      }}
      favoriteSlots={(favSlots ?? []).map(f => f.slot_id)}
      allSlots={allSlots ?? []}
    />
  )
}
