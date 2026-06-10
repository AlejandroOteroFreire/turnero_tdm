'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountStatus, PaymentStatus } from '@/types'

interface Profile {
  full_name: string
  frequency: number
  medical_cert: boolean
  joined_at: string
}
interface Jugador {
  id: string
  display_name: string
  email: string
  phone: string | null
  dni: string | null
  status: AccountStatus
  roles: string[]
  wa_opt_in: boolean
  player_profiles: Profile | null
}
interface Props {
  jugadores:  Jugador[]
  paymentMap: Record<string, PaymentStatus>
}

const STATUS_CONFIG: Record<AccountStatus, { label: string; cls: string }> = {
  active:          { label: 'Activo',          cls: 'text-green-400'  },
  pending:         { label: 'Pendiente',        cls: 'text-amber-400'  },
  pre_registered:  { label: 'Pre-registrado',   cls: 'text-blue-400'   },
  suspended:       { label: 'Suspendido',        cls: 'text-red-400'    },
}

const PAYMENT_DOT: Record<PaymentStatus, string> = {
  current:       '🟢',
  owes_month:    '🟡',
  owes_previous: '🔴',
}

function freqBadge(f: number) {
  const label = f === 1 ? '1 clase/semana'
              : f === 2 ? '2 clases/semana'
              : f === 3 ? '3 clases/semana'
              : '4 o más clases/semana'
  return (
    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-club-green/15 text-club-green border border-club-green/30">
      {label}
    </span>
  )
}

export function JugadoresClient({ jugadores, paymentMap }: Props) {
  const router = useRouter()
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all')
  const [payFilter, setPayFilter]       = useState<PaymentStatus | 'all'>('all')
  const [localJugadores] = useState(jugadores)

  const filtered = localJugadores.filter(j => {
    const matchSearch = !search ||
      j.display_name.toLowerCase().includes(search.toLowerCase()) ||
      j.email.toLowerCase().includes(search.toLowerCase()) ||
      (j.dni ?? '').includes(search)
    const matchStatus = statusFilter === 'all' || j.status === statusFilter
    const pay = paymentMap[j.id]
    const matchPay = payFilter === 'all' || pay === payFilter
    return matchSearch && matchStatus && matchPay
  })

  function exportCsv() {
    const rows = filtered.map(j => [
      j.display_name, j.email, j.dni ?? '', j.phone ?? '',
      STATUS_CONFIG[j.status].label,
      PAYMENT_DOT[paymentMap[j.id]] ?? '—',
      j.player_profiles?.frequency ?? '',
    ].join(','))
    const csv  = `Nombre,Email,DNI,Teléfono,Estado,Pago,Frecuencia/semana\n${rows.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `jugadores-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Jugadores</h1>
        <button onClick={exportCsv} className="btn-secondary text-xs">Exportar CSV</button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          className="input max-w-xs text-sm py-1.5"
          placeholder="Buscar nombre, email, DNI…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input w-auto text-sm py-1.5"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as AccountStatus | 'all')}
        >
          <option value="all">Todos los estados</option>
          {(Object.keys(STATUS_CONFIG) as AccountStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <select
          className="input w-auto text-sm py-1.5"
          value={payFilter}
          onChange={e => setPayFilter(e.target.value as PaymentStatus | 'all')}
        >
          <option value="all">Todos los pagos</option>
          <option value="current">Al día 🟢</option>
          <option value="owes_month">Debe el mes 🟡</option>
          <option value="owes_previous">Debe anteriores 🔴</option>
        </select>
      </div>

      <p className="text-xs text-gray-500">{filtered.length} jugadores</p>

      {/* Tabla */}
      <div className="space-y-1">
        {filtered.map(j => {
          const pay = paymentMap[j.id]
          return (
            <button
              key={j.id}
              onClick={() => router.push(`/jugadores/${j.id}`)}
              className="w-full card flex items-center justify-between gap-3 text-left hover:border-club-green/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base shrink-0">{PAYMENT_DOT[pay] ?? '⚪'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{j.display_name}</p>
                  <p className="text-xs text-gray-500 truncate">{j.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-right">
                <span className={`text-xs ${STATUS_CONFIG[j.status].cls}`}>
                  {STATUS_CONFIG[j.status].label}
                </span>
                {j.player_profiles && freqBadge(j.player_profiles.frequency)}
              </div>
            </button>
          )
        })}

        {filtered.length === 0 && (
          <div className="card text-center py-8 text-gray-500 text-sm">
            Sin resultados para la búsqueda.
          </div>
        )}
      </div>

    </div>
  )
}
