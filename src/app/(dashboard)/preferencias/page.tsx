import { createClient } from '@/lib/supabase/server'
import { PreferenciasClient } from '@/components/notificaciones/PreferenciasClient'

export default async function PreferenciasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: defaults }, { data: prefs }, { data: account }] = await Promise.all([
    supabase.from('notification_defaults').select('*').order('channel').order('event_type'),
    supabase.from('notification_prefs').select('*').eq('player_id', user.id),
    supabase.from('user_accounts').select('phone, wa_opt_in').eq('id', user.id).single(),
  ])

  return (
    <PreferenciasClient
      userId={user.id}
      defaults={defaults ?? []}
      prefs={prefs ?? []}
      phone={account?.phone ?? null}
      waOptIn={account?.wa_opt_in ?? false}
    />
  )
}
