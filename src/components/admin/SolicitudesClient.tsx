'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TrainingSlot } from '@/types'
import { DAY_LABELS } from '@/types'

interface RegRequest {
  id: string
  player_id: string
  days_per_week: number
  option_a: string[]
  option_b: string[]
  status: string
  created_at: string
  user_accounts: { display_name: string; email: string; dni: string | null } | null
}

interface PlanChangeRequest {
  id: string
  player_id: string
  slots_to_drop: string[]
  slots_to_add: string[]
  proposed_start_date: string
  status: string
  created_at: string
  admin_notes: string | null
  user_accounts: { display_name: string; email: string } | null
}

interface Props {
  registrationRequests: RegRequest[]
  planChangeRequests:   PlanChangeRequest[]
  slots:                TrainingSlot[]
  assignCountMap:       Record<string, number>
}

export function SolicitudesClient({ registrationRequests, planChangeRequests, slots, assignCountMap }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'registros' | 'planes'>('registros')
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [rejectId, setRejectId]   = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [processing, setProcessing]   = useState<string | null>(null)
  const [localReg, setLocalReg]   = useState(registrationRequests)
  const [localPlan, setLocalPlan] = useState(planChangeRequests)
  const [error, setError]         = useState<string | null>(null)

  const slotMap = Object.fromEntries(slots.map(s => [s.id, s]))

  function slotLabel(id: string) {
    const s = slotMap[id]
    if (!s) return id
    return `${DAY_LABELS[s.day_of_week]} ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}${s.label ? ` (${s.label})` : ''}`
  }

  function slotCapacityWarning(id: string) {
    const s = slotMap[id]
    if (!s) return null
    const count = assignCountMap[id] ?? 0
    const avail = s.capacity - count
    if (avail <= 2) return `⚠ Turno casi lleno (${count}/${s.capacity})`
    return null
  }

  function slotAvailabilityLine(id: string) {
    const s = slotMap[id]
    if (!s) return { label: id, avail: null, full: false }
    const label = `${DAY_LABELS[s.day_of_week]} ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}${s.label ? ` (${s.label})` : ''}`
    const count = assignCountMap[id] ?? 0
    const avail = s.capacity - count
    const full  = avail <= 0
    return { label, avail, full, count, cap: s.capacity }
  }

  async function handlePlanReview(id: string, action: 'approve' | 'reject', notes?: string) {
    setProcessing(id)
    setError(null)
    try {
      const res = await fetch(`/api/plan-change/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_notes: notes }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error')
      }
      setLocalPlan(prev => prev.filter(r => r.id !== id))
      setExpanded(null)
      setRejectId(null)
      setRejectNotes('')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar solicitud')
    } finally {
      setProcessing(null)
    }
  }

  async function handleApprove(id: string, option: 'a' | 'b') {
    setProcessing(id)
    setError(null)
    try {
      const res = await fetch(`/api/registration-requests/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', option }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al aprobar')
      }
      setLocalReg(prev => prev.filter(r => r.id !== id))
      setExpanded(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al aprobar solicitud')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(id: string) {
    setProcessing(id)
    setError(null)
    try {
      const res = await fetch(`/api/registration-requests/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', admin_notes: rejectNotes }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al rechazar')
      }
      setLocalReg(prev => prev.filter(r => r.id !== id))
      setRejectId(null)
      setRejectNotes('')
      setExpanded(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al rechazar solicitud')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Solicitudes</h1>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('registros')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'registros'
              ? 'bg-club-green text-white'
              : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          Nuevos registros
          {localReg.length > 0 && (
            <span className="bg-amber-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {localReg.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('planes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'planes'
              ? 'bg-club-green text-white'
              : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          Cambios de plan
          {localPlan.length > 0 && (
            <span className="bg-amber-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {localPlan.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Nuevos registros */}
      {activeTab === 'registros' && (
        <div className="space-y-3">
          {localReg.length === 0 && (
            <div className="card text-center py-8 text-gray-500 text-sm">
              No hay solicitudes de registro pendientes.
            </div>
          )}

          {localReg.map(req => {
            const isExpanded = expanded === req.id
            const isRejecting = rejectId === req.id
            const isProcessing = processing === req.id
            const date = new Date(req.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

            return (
              <div key={req.id} className="card space-y-3">
                {/* Header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : req.id)}
                  className="w-full flex items-center justify-between text-left gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {req.user_accounts?.display_name ?? 'Jugador'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {req.user_accounts?.email} · {req.days_per_week} día/s por semana · {date}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div className="space-y-4 pt-2 border-t border-white/10">
                    {/* Datos jugador */}
                    <div className="text-xs space-y-1">
                      <p className="text-gray-400">DNI: <span className="text-white">{req.user_accounts?.dni ?? '—'}</span></p>
                    </div>

                    {/* Opciones */}
                    {(['a', 'b'] as const).map(opt => {
                      const slotIds = opt === 'a' ? req.option_a : req.option_b
                      return (
                        <div key={opt}>
                          <p className="text-xs font-semibold text-gray-400 mb-1">
                            Opción {opt.toUpperCase()}
                          </p>
                          <div className="space-y-1">
                            {slotIds.map(id => {
                              const warning = slotCapacityWarning(id)
                              return (
                                <div key={id} className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-white">{slotLabel(id)}</span>
                                  {warning && (
                                    <span className="text-xs text-amber-400">{warning}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    {/* Acciones */}
                    {!isRejecting ? (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          onClick={() => handleApprove(req.id, 'a')}
                          disabled={isProcessing}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          {isProcessing ? '…' : '✓ Aprobar con Opción A'}
                        </button>
                        <button
                          onClick={() => handleApprove(req.id, 'b')}
                          disabled={isProcessing}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          {isProcessing ? '…' : '✓ Aprobar con Opción B'}
                        </button>
                        <button
                          onClick={() => setRejectId(req.id)}
                          disabled={isProcessing}
                          className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800"
                        >
                          ✗ Rechazar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2">
                        <textarea
                          className="input w-full text-xs"
                          rows={2}
                          placeholder="Motivo del rechazo (opcional)"
                          value={rejectNotes}
                          onChange={e => setRejectNotes(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={isProcessing}
                            className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800"
                          >
                            {isProcessing ? '…' : 'Confirmar rechazo'}
                          </button>
                          <button
                            onClick={() => { setRejectId(null); setRejectNotes('') }}
                            className="btn-ghost text-xs py-1.5 px-3"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Cambios de plan */}
      {activeTab === 'planes' && (
        <div className="space-y-3">
          {localPlan.length === 0 && (
            <div className="card text-center py-8 text-gray-500 text-sm">
              No hay solicitudes de cambio de plan pendientes.
            </div>
          )}

          {localPlan.map(req => {
            const isExpanded = expanded === req.id
            const date = new Date(req.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            const startDate = new Date(req.proposed_start_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

            return (
              <div key={req.id} className="card space-y-3">
                <button
                  onClick={() => setExpanded(isExpanded ? null : req.id)}
                  className="w-full flex items-center justify-between text-left gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {req.user_accounts?.display_name ?? 'Jugador'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Inicio: {startDate} · Solicitado el {date}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    {req.slots_to_drop.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-400 mb-1">Turnos a dar de baja</p>
                        {req.slots_to_drop.map(id => (
                          <p key={id} className="text-xs text-gray-300">{slotLabel(id)}</p>
                        ))}
                      </div>
                    )}
                    {req.slots_to_add.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-green-400 mb-1">Turnos a agregar</p>
                        <div className="space-y-1">
                          {req.slots_to_add.map(id => {
                            const { label, full, avail, count, cap } = slotAvailabilityLine(id)
                            return (
                              <div key={id} className="flex items-center justify-between gap-2 text-xs">
                                <span className={full ? 'text-red-300' : 'text-gray-300'}>
                                  {full ? '⚠ ' : ''}{label}
                                </span>
                                <span className={full ? 'text-red-400' : 'text-gray-500'}>
                                  {full
                                    ? `Lleno (${cap}/${cap})`
                                    : avail !== null ? `${avail}/${cap} disponibles` : ''}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {req.admin_notes && (
                      <p className="text-xs text-gray-500">Notas: {req.admin_notes}</p>
                    )}

                    {/* Acciones plan change */}
                    {rejectId === req.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          className="input w-full text-xs"
                          rows={2}
                          placeholder="Motivo del rechazo (opcional)"
                          value={rejectNotes}
                          onChange={e => setRejectNotes(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePlanReview(req.id, 'reject', rejectNotes)}
                            disabled={processing === req.id}
                            className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800"
                          >
                            {processing === req.id ? '…' : 'Confirmar rechazo'}
                          </button>
                          <button
                            onClick={() => { setRejectId(null); setRejectNotes('') }}
                            className="btn-ghost text-xs py-1.5 px-3"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handlePlanReview(req.id, 'approve')}
                          disabled={processing === req.id}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          {processing === req.id ? '…' : '✓ Aprobar'}
                        </button>
                        <button
                          onClick={() => setRejectId(req.id)}
                          disabled={processing === req.id}
                          className="btn-secondary text-xs py-1.5 px-3 text-red-400 border-red-800"
                        >
                          ✗ Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
