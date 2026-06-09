'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield } from './Shield'
import { RoleSwitcher } from './RoleSwitcher'
import type { UserRole } from '@/types'

interface Account {
  id: string
  display_name: string
  roles: string[]
  status: string
  avatar_url: string | null
}

const NAV_PLAYER = [
  { href: '/calendario', label: 'Turnos',  icon: '📅' },
  { href: '/mi-plan',    label: 'Mi Plan', icon: '📋' },
]

const NAV_ADMIN = [
  { href: '/jugadores',     label: 'Jugadores',    icon: '👥' },
  { href: '/solicitudes',   label: 'Solicitudes',  icon: '📋' },
  { href: '/asistencia',    label: 'Asistencia',   icon: '✅' },
  { href: '/pagos',         label: 'Pagos',        icon: '💵' },
  { href: '/editor-turnos', label: 'Editor',       icon: '🔧' },
  { href: '/estadisticas',  label: 'Estadísticas', icon: '📊' },
]

const NAV_COLLAB = [
  { href: '/calendario',  label: 'Turnos',     icon: '📅' },
  { href: '/mi-plan',     label: 'Mi Plan',    icon: '📋' },
  { href: '/jugadores',   label: 'Jugadores',  icon: '👥' },
  { href: '/asistencia',  label: 'Asistencia', icon: '✅' },
  { href: '/pagos',       label: 'Pagos',      icon: '💵' },
]

export function DashboardShell({ account, children }: { account: Account; children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const roles    = account.roles as UserRole[]

  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`active_role_${account.id}`) as UserRole | null
      if (saved && roles.includes(saved)) return saved
    }
    return roles[0]
  })

  function switchRole(role: UserRole) {
    setActiveRole(role)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`active_role_${account.id}`, role)
    }
    // Redirigir a la ruta principal del rol
    router.push(role === 'player' ? '/calendario' : '/jugadores')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = activeRole === 'admin'
    ? NAV_ADMIN
    : activeRole === 'collaborator'
    ? NAV_COLLAB
    : NAV_PLAYER

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-club-black/95 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/calendario" className="flex items-center gap-2 shrink-0">
            <Shield size={32} />
            <span className="font-bold text-sm hidden sm:block text-club-green">
              TDM Newbery
            </span>
          </Link>

          {/* Nav links — desktop (ocultos en mobile, se usa la bottom nav) */}
          <nav className="hidden sm:flex items-center gap-1 flex-1">
            {navItems.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-club-green/20 text-club-green'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Selector de rol dual */}
          <RoleSwitcher roles={roles} activeRole={activeRole} onChange={switchRole} />

          {/* Avatar / logout */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            title="Cerrar sesión"
          >
            {account.avatar_url ? (
              <img src={account.avatar_url} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <span className="w-7 h-7 rounded-full bg-club-green/30 flex items-center justify-center text-xs font-bold text-club-green">
                {account.display_name[0].toUpperCase()}
              </span>
            )}
            <span className="hidden sm:block truncate max-w-[120px]">{account.display_name}</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Bottom nav — mobile */}
      <nav className="sm:hidden sticky bottom-0 z-40 bg-club-black/95 backdrop-blur border-t border-white/10">
        <div className="flex">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? 'text-club-green' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
