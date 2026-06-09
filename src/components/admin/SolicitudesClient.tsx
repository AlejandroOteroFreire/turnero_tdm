'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { PlanChangeRequestWithDetails, SlotDay } from '@/types'

const DAY_LABELS: Record<SlotDay, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado',
}

interface SlotMini {
  id: string
  day_of_week: string
  start_time: string
  end_time: string
  label: string | null
}

interface Props {
  requests: (PlanChangeRequestWithDetails & { user_accounts: { display_name: string; avatar_url: string | null } | null })[]
  allSlots: SlotMini[]
  autoApprove: boolean
}

export function SolicitudesClient({ requests, allSlots, autoApprove: initialAutoApprove }: Props) {
  const [autoApprove, setAutoApprove] = useState(initialAutoApprove)
  const [pendingReqs, setPendingReqs] = useState(requests.filter(r => r.status === 'pending'))
  const [historyReqs] = useState(requests.filter(r => r.status !== 'pending'))
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const slotMap = Object.fromEntries(allSlots.map(s => [s.id, s]))

  function slotLabel(id: string) {
    const s = slotMap[id]
    if (!s) return id.slice(0, 8) + '…'
    return `${DAY_LABELS[s.day_of_week as SlotDay]} ${s.start_time.slice(0,5)}`
  }

  async function handleToggleAutoApprove() {
    const newVal = !autoApprove
    await fetch('/api/admin/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'auto_approve_plan_change', value: String(newVal) }),
    })
    setAutoApprove(newVal)
  }

  async function handleReview(id: string, action: 'approve' | 'reject', notes?: string) {
    setLoading(id); setError(null)
    try {
      const res = await fetch(`/api/plan-change/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_notes: notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      setPendingReqs(prev => prev.filter(r => r.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Solicitudes de cambio de plan</h1>
          <p className="text-xs text-gray-500 mt-0.5">Revisá y aprobá los cambios de plan de los jugadores</p>
        </div>
        {/* Toggle auto-approve */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 text-right leading-tight max-w-[120px]">Auto-aprobar</span>
          <button
            onClick={handleToggleAutoApprove}
            className={`w-11 h-6 rounded-full transition-colors relative ${autoApprove ? 'bg-club-green' : 'bg-white/10'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoApprove ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

      {/* Pendientes */}
      {pendingReqs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-gray-500 text-sm">No hay solicitudes pendientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Pendientes · {pendingReqs.length}
          </p>
          {pendingReqs.map(req => (
            <div key={req.id} className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-club-green/30 flex items-center justify-center text-xs font-bold text-club-green shrink-0">
                  {req.user_accounts?.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {req.user_accounts?.display_name ?? 'Jugador'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Enviada {format(parseISO(req.created_at), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">
                  Desde {format(parseISO(req.proposed_start_date), "d MMM", { locale: es })}
                </p>
              </div>

              {/* Cambios */}
              <div className="bg-black/20 rounded-xl p-3 space-y-2">
                {req.slots_to_drop.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-red-400 font-medium w-full">Dejar:</span>
                    {req.slots_to_drop.map(sid => (
                      <span key={sid} className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300">
                        {slotLabel(sid)}
                      </span>
                    ))}
                  </div>
                )}
                {req.slots_to_add.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-green-400 font-medium w-full">Agregar:</span>
                    {req.slots_to_add.map(sid => (
                      <span key={sid} className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-300">
                        {slotLabel(sid)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(req.id, 'reject')}
                  disabled={loading === req.id}
                  className="flex-1 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm disabled:opacity-50"
                >
                  {loading === req.id ? '…' : '✕ Rechazar'}
                </button>
                <button
                  onClick={() => handleReview(req.id, 'approve')}
                  disabled={loading === req.id}
                  className="flex-1 py-2 rounded-xl bg-club-green text-white hover:bg-club-green/90 transition-colors text-sm disabled:opacity-50"
                >
                  {loading === req.id ? '…' : '✓ Aprobar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historial */}
      {historyReqs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Historial reciente</p>
          {historyReqs.map(req => (
            <div key={req.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-white font-medium">{req.user_accounts?.display_name ?? 'Jugador'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  req.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {format(parseISO(req.created_at), "d MMM yyyy", { locale: es })}
                {req.admin_notes && ` · ${req.admin_notes}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
