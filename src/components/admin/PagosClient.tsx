'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlayerPaymentStatus, Payment } from '@/types'

interface Props {
  paymentStatuses: PlayerPaymentStatus[]
  recentPayments: (Payment & { user_accounts: { display_name: string } | null })[]
}

const STATUS_CONFIG = {
  current:       { label: 'Al día',               cls: 'badge-current',  dot: '🟢' },
  owes_month:    { label: 'Debe el mes',           cls: 'badge-month',    dot: '🟡' },
  owes_previous: { label: 'Debe meses anteriores', cls: 'badge-previous', dot: '🔴' },
}

export function PagosClient({ paymentStatuses, recentPayments: initial }: Props) {
  const [payments, setPayments] = useState(initial)
  const [filter, setFilter]     = useState<'all' | 'current' | 'owes_month' | 'owes_previous'>('all')
  const [showForm, setShowForm] = useState<string | null>(null)  // player_id
  const [formData, setFormData] = useState({ amount: '5000', notes: '' })
  const [saving, setSaving]     = useState(false)
  const supabase = createClient()

  const filtered = filter === 'all'
    ? paymentStatuses
    : paymentStatuses.filter(p => p.payment_status === filter)

  const counts = {
    current:       paymentStatuses.filter(p => p.payment_status === 'current').length,
    owes_month:    paymentStatuses.filter(p => p.payment_status === 'owes_month').length,
    owes_previous: paymentStatuses.filter(p => p.payment_status === 'owes_previous').length,
  }

  async function registerPayment(playerId: string) {
    setSaving(true)
    try {
      const now   = new Date()
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('payments').insert({
        player_id:     playerId,
        type:          'monthly',
        amount:        parseFloat(formData.amount),
        period_month:  now.getMonth() + 1,
        period_year:   now.getFullYear(),
        paid_at:       now.toISOString().split('T')[0],
        registered_by: user!.id,
        notes:         formData.notes || null,
      }).select('*, user_accounts!player_id(display_name)').single()

      if (data) setPayments(prev => [data as typeof prev[0], ...prev])
      setShowForm(null)
      // Refrescar la página para actualizar semáforo
      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Pagos</h1>
        <button
          onClick={() => {
            const csv = paymentStatuses
              .map(p => `${p.display_name},${STATUS_CONFIG[p.payment_status].label}`)
              .join('\n')
            const blob = new Blob([`Jugador,Estado\n${csv}`], { type: 'text/csv' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `pagos-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
          }}
          className="btn-secondary text-xs"
        >
          Exportar CSV
        </button>
      </div>

      {/* Resumen semáforo */}
      <div className="grid grid-cols-3 gap-3">
        {(['current', 'owes_month', 'owes_previous'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(filter === status ? 'all' : status)}
            className={`card text-center transition-all ${filter === status ? 'border-club-green' : ''}`}
          >
            <p className="text-2xl font-bold text-white">{counts[status]}</p>
            <span className={STATUS_CONFIG[status].cls}>{STATUS_CONFIG[status].label}</span>
          </button>
        ))}
      </div>

      {/* Lista de jugadores */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-400">
          {filter === 'all' ? 'Todos los jugadores' : STATUS_CONFIG[filter].label}
          <span className="ml-2 text-gray-600">({filtered.length})</span>
        </h2>

        {filtered.map(player => (
          <div key={player.player_id} className="card flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg">{STATUS_CONFIG[player.payment_status].dot}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{player.display_name}</p>
                <span className={STATUS_CONFIG[player.payment_status].cls + ' mt-0.5'}>
                  {STATUS_CONFIG[player.payment_status].label}
                </span>
              </div>
            </div>

            {showForm === player.player_id ? (
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  className="input w-24 text-xs py-1"
                  value={formData.amount}
                  onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                  placeholder="Monto"
                />
                <button onClick={() => registerPayment(player.player_id)} disabled={saving} className="btn-primary text-xs py-1 px-3">
                  {saving ? '…' : 'Guardar'}
                </button>
                <button onClick={() => setShowForm(null)} className="btn-ghost text-xs py-1 px-2">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowForm(player.player_id)}
                className="btn-secondary text-xs py-1 px-3 shrink-0"
              >
                + Pago
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Últimos pagos registrados */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-2">Últimos pagos registrados</h2>
        <div className="space-y-1">
          {payments.slice(0, 10).map(p => (
            <div key={p.id} className="flex items-center justify-between text-xs text-gray-400 py-1 border-b border-white/5">
              <span>{p.user_accounts?.display_name ?? '—'}</span>
              <span>${p.amount.toLocaleString('es-AR')}</span>
              <span>{p.paid_at}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
