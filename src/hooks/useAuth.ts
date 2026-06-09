'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser, UserRole } from '@/types'

export function useAuth() {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  // Para rol dual: vista activa
  const [activeRole, setActiveRole] = useState<UserRole>('player')

  const supabase = createClient()

  const loadUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setUser(null); setLoading(false); return }

    const { data: account } = await supabase
      .from('user_accounts')
      .select('id, email, display_name, roles, status, avatar_url')
      .eq('id', authUser.id)
      .single()

    if (account) {
      setUser({
        id: account.id,
        email: account.email,
        roles: account.roles as UserRole[],
        status: account.status,
        display_name: account.display_name,
        avatar_url: account.avatar_url,
      })
      // Restaurar rol activo guardado en localStorage
      const saved = localStorage.getItem(`active_role_${account.id}`) as UserRole | null
      if (saved && (account.roles as string[]).includes(saved)) {
        setActiveRole(saved)
      } else {
        setActiveRole(account.roles[0] as UserRole)
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadUser())
    return () => subscription.unsubscribe()
  }, [loadUser, supabase])

  function switchRole(role: UserRole) {
    if (!user?.roles.includes(role)) return
    setActiveRole(role)
    localStorage.setItem(`active_role_${user.id}`, role)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return { user, loading, activeRole, switchRole, signOut }
}
