'use client'

import { useState } from 'react'
import { format, parseISO, addDays, nextMonday } from 'date-fns'
import { es } from 'date-fns/locale'
import type { SlotAssignmentWithSlot, PlanChangeRequest, TrainingSlot, SlotDay } from '@/types'

const DAY_ORDER: Record<SlotDay, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}

const DAY_LABELS: Record<SlotDay, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado',
}

interface Props {
  userId: string
  assignments: SlotAssignmentWithSlot[]
  requests: PlanChangeRequest[]
  allSlots: Pick<TrainingSlot, 'id' | 'day_of_week' | 'start_time' | 'end_time' | 'label' | 'capacity'>[]
}

type Step = 'view' | 'drop' | 'add' | 'date' | 'confirm'

export function MiPlanClient({ userId, assignments, requests, allSlots }: Props) {
  const today = new Date()

  // Plan actual: asignaciones vigentes
  const activeAssignments = assignments.filter(a => {
    const from = parseISO(a.valid_from)
    const until = a.valid_until ? parseISO(a.valid_until) : null
    return from <= today && (until === null || until >= today)
  })

  const sortedActive = [...activeAssignments].sort((a, b) =>
    (DAY_ORDER[a.training_slots.day_of_week] - DAY_ORDER[b.training_slots.day_of_week]) ||
    a.training_slots.start_time.localeCompare(b.training_slots.start_time)
  )

  const pendingRequest = requests.find(r => r.status === 'pending')

  // Flujo de solicitud de cambio
  const [step, setStep]             = useState<Step>('view')
  const [toDrop, setToDrop]         = useState<string[]>([])
  const [toAdd, setToAdd]           = useState<string[]>([])
  const [startDate, setStartDate]   = useState(() => {
    const next = nextMonday(addDays(today, 1))
    return format(next, 'yyyy-MM-dd')
  })
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [submitted, setSubmitted]   = useState(false)

  function resetFlow() {
    setStep('view')
    setToDrop([])
    setToAdd([])
    setError(null)
    setLoading(false)
  }

  async function handleSubmit() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/plan-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots_to_drop: toDrop, slots_to_add: toAdd, proposed_start_date: startDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar solicitud')
      setSubmitted(true)
      setStep('view')
      window.location.reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelRequest(id: string) {
    if (!confirm('¿Cancelar la solicitud pendiente?')) return
    await fetch(`/api/plan-change/${id}`, { method: 'DELETE' })
    window.location.reload()
  }

  // Slots disponibles para agregar (no están ya en el plan activo)
  const activeSlotIds = new Set(sortedActive.map(a => a.slot_id))
  const slotsToAddOptions = allSlots.filter(s => !activeSlotIds.has(s.id) || toAdd.includes(s.id))

  // Agrupar por día
  function groupByDay<T extends { day_of_week: SlotDay }>(items: T[]) {
    const groups: Record<SlotDay, T[]> = {} as Record<SlotDay, T[]>
    for (const item of items) {
      if (!groups[item.day_of_week]) groups[item.day_of_week] = []
      groups[item.day_of_week].push(item)
    }
    return groups
  }

  const slotsByDay = groupByDay(slotsToAddOptions.map(s => ({ ...s, day_of_week: s.day_of_week })))
  const days = Object.keys(slotsByDay).sort((a, b) => DAY_ORDER[a as SlotDay] - DAY_ORDER[b as SlotDay]) as SlotDay[]

  // ── Render ──────────────────────────────────────────────────

  if (step !== 'view') {
    return (
      <div className="space-y-4">
        {/* Header flujo */}
        <div className="flex items-center gap-3">
          <button onClick={resetFlow} className="text-gray-500 hover:text-white transition-colors text-sm">← Cancelar</button>
          <div className="flex gap-1">
            {(['drop','add','date','confirm'] as Step[]).map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? 'bg-club-green' :
                (['drop','add','date','confirm'] as Step[]).indexOf(step) > i ? 'bg-club-green/40' : 'bg-white/10'
              }`} />
            ))}
          </div>
        </div>

        {/* STEP: drop */}
        {step === 'drop' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">¿Qué turnos querés dejar?</h2>
              <p className="text-xs text-gray-500 mt-0.5">Seleccioná los turnos de tu plan actual que ya no vas a usar.</p>
            </div>
            {sortedActive.length === 0 ? (
              <p className="text-sm text-gray-500">No tenés turnos en tu plan actual.</p>
            ) : (
              <div className="space-y-2">
                {sortedActive.map(a => {
                  const checked = toDrop.includes(a.slot_id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => setToDrop(prev => checked ? prev.filter(x => x !== a.slot_id) : [...prev, a.slot_id])}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        checked ? 'border-red-500/60 bg-red-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? 'border-red-500 bg-red-500' : 'border-white/30'
                      }`}>
                        {checked && <span className="text-white text-xs">✕</span>}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{DAY_LABELS[a.training_slots.day_of_week]}</p>
                        <p className="text-xs text-gray-400">{a.training_slots.start_time.slice(0,5)} – {a.training_slots.end_time.slice(0,5)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            <button
              onClick={() => setStep('add')}
              className="w-full py-3 rounded-xl bg-club-green text-white font-medium text-sm hover:bg-club-green/90 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* STEP: add */}
        {step === 'add' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">¿Qué turnos querés agregar?</h2>
              <p className="text-xs text-gray-500 mt-0.5">Seleccioná los nuevos turnos para tu plan.</p>
            </div>
            <div className="space-y-3">
              {days.map(day => (
                <div key={day}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{DAY_LABELS[day]}</p>
                  <div className="space-y-1.5">
                    {slotsByDay[day].map(slot => {
                      const checked = toAdd.includes(slot.id)
                      const alreadyIn = activeSlotIds.has(slot.id) && !toDrop.includes(slot.id)
                      return (
                        <button
                          key={slot.id}
                          onClick={() => !alreadyIn && setToAdd(prev => checked ? prev.filter(x => x !== slot.id) : [...prev, slot.id])}
                          disabled={alreadyIn}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            alreadyIn ? 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed' :
                            checked ? 'border-club-green/60 bg-club-green/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            checked ? 'border-club-green bg-club-green' : 'border-white/30'
                          }`}>
                            {checked && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}</p>
                            <p className="text-xs text-gray-500">Cap. {slot.capacity} personas</p>
                          </div>
                          {alreadyIn && <span className="ml-auto text-xs text-gray-600">En tu plan</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep('date')}
              disabled={toDrop.length === 0 && toAdd.length === 0}
              className="w-full py-3 rounded-xl bg-club-green text-white font-medium text-sm hover:bg-club-green/90 transition-colors disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* STEP: date */}
        {step === 'date' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">¿Desde cuándo querés el cambio?</h2>
              <p className="text-xs text-gray-500 mt-0.5">Elegí la fecha de inicio del nuevo plan.</p>
            </div>
            <div>
              <label className="label">Fecha de inicio</label>
              <input
                type="date"
                className="input"
                value={startDate}
                min={format(addDays(today, 1), 'yyyy-MM-dd')}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <button
              onClick={() => setStep('confirm')}
              className="w-full py-3 rounded-xl bg-club-green text-white font-medium text-sm hover:bg-club-green/90 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* STEP: confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Confirmá la solicitud</h2>
              <p className="text-xs text-gray-500 mt-0.5">Revisá los cambios antes de enviar.</p>
            </div>
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
              {toDrop.length > 0 && (
                <div>
                  <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-2">Turnos a dejar</p>
                  {toDrop.map(sid => {
                    const a = sortedActive.find(x => x.slot_id === sid)
                    if (!a) return null
                    return (
                      <p key={sid} className="text-sm text-white">
                        ✕ {DAY_LABELS[a.training_slots.day_of_week]} {a.training_slots.start_time.slice(0,5)}
                      </p>
                    )
                  })}
                </div>
              )}
              {toAdd.length > 0 && (
                <div>
                  <p className="text-xs text-club-green font-semibold uppercase tracking-wider mb-2">Turnos a agregar</p>
                  {toAdd.map(sid => {
                    const s = allSlots.find(x => x.id === sid)
                    if (!s) return null
                    return (
                      <p key={sid} className="text-sm text-white">
                        ✓ {DAY_LABELS[s.day_of_week as SlotDay]} {s.start_time.slice(0,5)}
                      </p>
                    )
                  })}
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Desde</p>
                <p className="text-sm text-white">
                  {format(parseISO(startDate), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={resetFlow} className="flex-1 py-3 rounded-xl border border-white/20 text-gray-300 text-sm hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-club-green text-white font-medium text-sm hover:bg-club-green/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Vista principal ──────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Mi Plan</h1>
        <p className="text-xs text-gray-500 mt-0.5">Tus días y horarios de entrenamiento fijos</p>
      </div>

      {/* Plan actual */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Plan actual</p>
          <span className="text-xs text-gray-500">{sortedActive.length} turno{sortedActive.length !== 1 ? 's' : ''}/semana</span>
        </div>
        {sortedActive.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500">No tenés turnos asignados.</p>
            <p className="text-xs text-gray-600 mt-1">Contactá al administrador para que configure tu plan.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sortedActive.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg">📅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{DAY_LABELS[a.training_slots.day_of_week]}</p>
                  <p className="text-xs text-gray-400 font-mono">
                    {a.training_slots.start_time.slice(0,5)} – {a.training_slots.end_time.slice(0,5)}
                  </p>
                </div>
                <span className="text-xs text-gray-600 shrink-0">
                  Cap. {a.training_slots.capacity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solicitud pendiente */}
      {pendingRequest && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-yellow-400">⏳ Solicitud pendiente</p>
            <button
              onClick={() => handleCancelRequest(pendingRequest.id)}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Cancelar
            </button>
          </div>
          {pendingRequest.slots_to_drop.length > 0 && (
            <p className="text-xs text-gray-400">
              Dejar: {pendingRequest.slots_to_drop.map(sid => {
                const s = allSlots.find(x => x.id === sid)
                return s ? `${DAY_LABELS[s.day_of_week as SlotDay]} ${s.start_time.slice(0,5)}` : sid
              }).join(', ')}
            </p>
          )}
          {pendingRequest.slots_to_add.length > 0 && (
            <p className="text-xs text-gray-400">
              Agregar: {pendingRequest.slots_to_add.map(sid => {
                const s = allSlots.find(x => x.id === sid)
                return s ? `${DAY_LABELS[s.day_of_week as SlotDay]} ${s.start_time.slice(0,5)}` : sid
              }).join(', ')}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Desde {format(parseISO(pendingRequest.proposed_start_date), "d 'de' MMMM", { locale: es })} ·
            Enviada {format(parseISO(pendingRequest.created_at), "d MMM", { locale: es })}
          </p>
        </div>
      )}

      {/* Botón solicitar cambio */}
      {!pendingRequest && (
        <button
          onClick={() => setStep('drop')}
          className="w-full py-3.5 rounded-xl border border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <span>🔄</span> Solicitar cambio de días
        </button>
      )}

      {/* Historial */}
      {requests.filter(r => r.status !== 'pending').length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial de solicitudes</p>
          <div className="space-y-2">
            {requests.filter(r => r.status !== 'pending').map(req => (
              <div key={req.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    req.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {req.status === 'approved' ? '✓ Aprobada' : '✕ Rechazada'}
                  </span>
                  <span className="text-xs text-gray-600">
                    {format(parseISO(req.created_at), "d MMM yyyy", { locale: es })}
                  </span>
                </div>
                {req.admin_notes && (
                  <p className="text-xs text-gray-500 mt-1.5">{req.admin_notes}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  Desde {format(parseISO(req.proposed_start_date), "d 'de' MMMM", { locale: es })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
