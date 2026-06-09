'use client'

import type { UserRole } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  player:       'Jugador',
  collaborator: 'Colaborador',
  admin:        'Admin',
}

interface RoleSwitcherProps {
  roles: UserRole[]
  activeRole: UserRole
  onChange: (role: UserRole) => void
}

export function RoleSwitcher({ roles, activeRole, onChange }: RoleSwitcherProps) {
  // Solo mostrar si hay más de un rol
  if (roles.length <= 1) return null

  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
      {roles.map(role => (
        <button
          key={role}
          onClick={() => onChange(role)}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
            activeRole === role
              ? 'bg-club-green text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {ROLE_LABELS[role]}
        </button>
      ))}
    </div>
  )
}
