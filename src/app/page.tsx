import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: account } = await supabase
    .from('user_accounts')
    .select('roles')
    .eq('id', user.id)
    .single()

  const roles: string[] = account?.roles ?? []
  // Landing: has player role → /calendario, pure admin (no player) → /asistencia
  redirect(roles.includes('player') ? '/calendario' : '/asistencia')
}
