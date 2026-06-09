import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/ui/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: account } = await supabase
    .from('user_accounts')
    .select('id, display_name, roles, status, avatar_url')
    .eq('id', user.id)
    .single()

  if (!account) {
    // Sesión sin cuenta en DB (puede pasar tras un reset): cerrar sesión y mandar a login
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <DashboardShell account={account}>
      {children}
    </DashboardShell>
  )
}
