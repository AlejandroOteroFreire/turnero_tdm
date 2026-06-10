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
  { href: '/configuracion', label: 'Config',       icon: '⚙️' },
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

  const [menuOpen, setMenuOpen] = useState(false)

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

          {/* Avatar / menú usuario */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {account.avatar_url ? (
                <img src={account.avatar_url} alt="" className="w-7 h-7 rounded-full" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-club-green/30 flex items-center justify-center text-xs font-bold text-club-green">
                  {account.display_name[0].toUpperCase()}
                </span>
              )}
              <span className="hidden sm:block truncate max-w-[120px]">{account.display_name}</span>
              <span className="text-xs text-gray-600 hidden sm:block">▾</span>
            </button>

            {menuOpen && (
              <>
                {/* Overlay para cerrar al hacer clic afuera */}
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-gray-900 border border-white/10 shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/10">
                    <p className="text-xs font-semibold text-white truncate">{account.display_name}</p>
                    <p className="text-[11px] text-gray-500">
                      {activeRole === 'admin' ? 'Administrador' : activeRole === 'collaborator' ? 'Colaborador' : 'Jugador'}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/perfil"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <span>👤</span> Perfil
                    </Link>
                    <Link
                      href="/preferencias"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <span>⚙️</span> Preferencias
                    </Link>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                    >
                      <span>🚪</span> Salir
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
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
