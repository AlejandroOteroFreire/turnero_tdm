'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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

export function JugadoresClient({ jugadores, paymentMap }: Props) {
  const supabase = createClient()
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all')
  const [payFilter, setPayFilter]       = useState<PaymentStatus | 'all'>('all')
  const [selected, setSelected]         = useState<Jugador | null>(null)
  const [activating, setActivating]     = useState<string | null>(null)
  const [localJugadores, setLocalJugadores] = useState(jugadores)

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

  async function activatePlayer(jugadorId: string) {
    setActivating(jugadorId)
    try {
      const { error } = await supabase
        .from('user_accounts')
        .update({ status: 'active' })
        .eq('id', jugadorId)
      if (!error) {
        setLocalJugadores(prev => prev.map(j => j.id === jugadorId ? { ...j, status: 'active' as AccountStatus } : j))
        if (selected?.id === jugadorId) setSelected(s => s ? { ...s, status: 'active' } : s)
      }
    } finally {
      setActivating(null)
    }
  }

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
              onClick={() => setSelected(j)}
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
                {j.player_profiles && (
                  <span className="text-xs text-gray-600 hidden sm:block">
                    {j.player_profiles.frequency}×/sem
                  </span>
                )}
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

      {/* Panel de detalle — drawer lateral */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="w-80 bg-[#1a1a1a] border-l border-white/10 overflow-y-auto animate-slide-up p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-base truncate">{selected.display_name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
            </div>

            <div className="space-y-2 text-sm">
              <Row label="Email"    value={selected.email} />
              <Row label="DNI"      value={selected.dni ?? '—'} />
              <Row label="Teléfono" value={selected.phone ?? '—'} />
              <Row label="Estado"   value={STATUS_CONFIG[selected.status].label} cls={STATUS_CONFIG[selected.status].cls} />
              <Row label="Roles"    value={selected.roles.join(', ')} />
              <Row label="WhatsApp" value={selected.wa_opt_in ? 'Sí' : 'No'} />
              {selected.player_profiles && (
                <>
                  <Row label="Frecuencia"  value={`${selected.player_profiles.frequency} día/s por semana`} />
                  <Row label="Alta"        value={selected.player_profiles.joined_at} />
                  <Row label="Cert. médico" value={selected.player_profiles.medical_cert ? 'Sí' : 'No'} />
                </>
              )}
              <Row label="Pago" value={
                paymentMap[selected.id] === 'current'       ? 'Al día 🟢' :
                paymentMap[selected.id] === 'owes_month'    ? 'Debe el mes 🟡' :
                paymentMap[selected.id] === 'owes_previous' ? 'Debe anteriores 🔴' : '—'
              } />
            </div>

            {(selected.status === 'pending' || selected.status === 'pre_registered') && (
              <button
                onClick={() => activatePlayer(selected.id)}
                disabled={activating === selected.id}
                className="btn-primary w-full"
              >
                {activating === selected.id ? 'Activando…' : 'Activar cuenta'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, cls = 'text-gray-300' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={`${cls} text-right truncate`}>{value}</span>
    </div>
  )
}
