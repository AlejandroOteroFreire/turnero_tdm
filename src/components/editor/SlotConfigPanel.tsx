'use client'

import { useState, useEffect } from 'react'
import { DAY_LABELS } from '@/types'
import type { TrainingSlot, SlotDay } from '@/types'

const DAY_OPTIONS: SlotDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAY_ORDER:   SlotDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

interface EditForm {
  day_of_week: SlotDay
  start_time:  string
  end_time:    string
  capacity:    number
  label:       string
}

interface Props {
  slots:    TrainingSlot[]
  onUpdate: (slots: TrainingSlot[]) => void
}

export function SlotConfigPanel({ slots, onUpdate }: Props) {
  const [editing,      setEditing]      = useState<string | null>(null)   // slot id | 'new'
  const [form,         setForm]         = useState<EditForm>({ day_of_week: 'monday', start_time: '08:00', end_time: '09:30', capacity: 12, label: '' })
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [defaultCap,   setDefaultCap]   = useState(12)

  useEffect(() => {
    fetch('/api/admin/training-slot')
      .then(r => r.json())
      .then(d => { if (d.capacity) setDefaultCap(d.capacity) })
      .catch(() => {})
  }, [])

  function startNew() {
    setEditing('new')
    setForm({ day_of_week: 'monday', start_time: '08:00', end_time: '09:30', capacity: defaultCap, label: '' })
    setError(null)
  }

  function startEdit(slot: TrainingSlot) {
    setEditing(slot.id)
    setForm({
      day_of_week: slot.day_of_week,
      start_time:  slot.start_time.slice(0, 5),
      end_time:    slot.end_time.slice(0, 5),
      capacity:    slot.capacity,
      label:       slot.label ?? '',
    })
    setError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setError(null)
  }

  // Validación de superposición (BUG 13)
  function checkOverlap(): TrainingSlot | null {
    return slots.find(s =>
      s.id !== editing &&            // excluir el slot actual al editar
      s.is_active &&
      s.day_of_week === form.day_of_week &&
      s.start_time.slice(0, 5) < form.end_time &&
      s.end_time.slice(0, 5)   > form.start_time
    ) ?? null
  }

  async function saveSlot() {
    if (form.start_time >= form.end_time) {
      setError('La hora de inicio debe ser anterior a la de fin.')
      return
    }

    const overlap = checkOverlap()
    if (overlap) {
      setError(
        `Ya existe un turno el ${DAY_LABELS[overlap.day_of_week]} de ${overlap.start_time.slice(0, 5)} a ${overlap.end_time.slice(0, 5)}.`
      )
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, label: form.label || null }

      if (editing && editing !== 'new') {
        const res = await fetch('/api/admin/training-slot', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing, ...payload }),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
        const data: TrainingSlot = await res.json()
        onUpdate(slots.map(s => s.id === editing ? data : s))
      } else {
        const res = await fetch('/api/admin/training-slot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
        const data: TrainingSlot = await res.json()
        onUpdate([...slots, data])
      }
      cancelEdit()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(slot: TrainingSlot) {
    const res = await fetch('/api/admin/training-slot', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: slot.id, is_active: !slot.is_active }),
    })
    if (res.ok) {
      const data: TrainingSlot = await res.json()
      onUpdate(slots.map(s => s.id === slot.id ? data : s))
    }
  }

  async function deleteSlot(id: string) {
    if (!confirm('¿Eliminar este turno? Se borrarán también las instancias y reservas asociadas.')) return
    const res = await fetch('/api/admin/training-slot', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) onUpdate(slots.filter(s => s.id !== id))
  }

  const sorted = [...slots].sort((a, b) =>
    DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week) ||
    a.start_time.localeCompare(b.start_time)
  )

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-white/10">
              <th className="pb-2 pr-2">Día</th>
              <th className="pb-2 pr-2">Horario</th>
              <th className="pb-2 pr-2">Etiqueta</th>
              <th className="pb-2 pr-2 text-center">Cap.</th>
              <th className="pb-2 pr-2 text-center">Activo</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map(slot => {
              const isEditingThis = editing === slot.id

              if (isEditingThis) {
                // ── Fila en modo edición inline (BUG 11) ──
                return (
                  <tr key={slot.id} className="bg-white/5">
                    <td className="py-1.5 pr-2">
                      <select
                        className="input text-xs py-1 w-24"
                        value={form.day_of_week}
                        onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value as SlotDay }))}
                      >
                        {DAY_OPTIONS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          className="input text-xs py-1 w-24 font-mono"
                          value={form.start_time}
                          onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                        />
                        <span className="text-gray-500 text-xs">–</span>
                        <input
                          type="time"
                          className="input text-xs py-1 w-24 font-mono"
                          value={form.end_time}
                          onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                        />
                      </div>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        className="input text-xs py-1 w-28"
                        placeholder="Etiqueta"
                        value={form.label}
                        onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        className="input text-xs py-1 w-16 text-center font-mono"
                        min={1} max={50}
                        value={form.capacity}
                        onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
                      />
                    </td>
                    <td className="py-1.5 pr-2 text-center">
                      <button
                        onClick={() => toggleActive(slot)}
                        className={`w-5 h-5 rounded-full border-2 transition-colors ${
                          slot.is_active ? 'bg-club-green border-club-green' : 'border-gray-600 bg-transparent'
                        }`}
                      />
                    </td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-2 justify-end">
                        {error && <span className="text-[10px] text-red-400 max-w-[120px] truncate">{error}</span>}
                        <button
                          onClick={saveSlot}
                          disabled={saving}
                          className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium"
                          title="Guardar"
                        >
                          {saving ? '…' : '✓'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-gray-500 hover:text-white transition-colors"
                          title="Cancelar"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }

              // ── Fila normal ──
              return (
                <tr key={slot.id} className={`${!slot.is_active ? 'opacity-40' : ''}`}>
                  <td className="py-2 pr-2 text-white font-medium">{DAY_LABELS[slot.day_of_week]}</td>
                  <td className="py-2 pr-2 text-gray-300 font-mono text-xs">
                    {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                  </td>
                  <td className="py-2 pr-2 text-gray-400 text-xs">{slot.label ?? '—'}</td>
                  <td className="py-2 pr-2 text-center">
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded font-mono">{slot.capacity}</span>
                  </td>
                  <td className="py-2 pr-2 text-center">
                    <button
                      onClick={() => toggleActive(slot)}
                      className={`w-5 h-5 rounded-full border-2 transition-colors ${
                        slot.is_active ? 'bg-club-green border-club-green' : 'border-gray-600 bg-transparent'
                      }`}
                      title={slot.is_active ? 'Desactivar' : 'Activar'}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(slot)}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteSlot(slot.id)}
                        className="text-xs text-red-500 hover:text-red-400 transition-colors"
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {/* ── Fila para nuevo turno (inline) ── */}
            {editing === 'new' && (
              <tr className="bg-white/5">
                <td className="py-1.5 pr-2">
                  <select
                    className="input text-xs py-1 w-24"
                    value={form.day_of_week}
                    onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value as SlotDay }))}
                  >
                    {DAY_OPTIONS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                  </select>
                </td>
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      className="input text-xs py-1 w-24 font-mono"
                      value={form.start_time}
                      onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    />
                    <span className="text-gray-500 text-xs">–</span>
                    <input
                      type="time"
                      className="input text-xs py-1 w-24 font-mono"
                      value={form.end_time}
                      onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    />
                  </div>
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="text"
                    className="input text-xs py-1 w-28"
                    placeholder="Etiqueta"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="number"
                    className="input text-xs py-1 w-16 text-center font-mono"
                    min={1} max={50}
                    value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
                  />
                </td>
                <td className="py-1.5 pr-2 text-center text-gray-600 text-xs">—</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2 justify-end">
                    {error && <span className="text-[10px] text-red-400 max-w-[120px] truncate">{error}</span>}
                    <button
                      onClick={saveSlot}
                      disabled={saving}
                      className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium"
                      title="Guardar"
                    >
                      {saving ? '…' : '✓'}
                    </button>
                    <button onClick={cancelEdit} className="text-xs text-gray-500 hover:text-white transition-colors" title="Cancelar">
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {slots.length === 0 && editing !== 'new' && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-600 text-sm">
                  No hay turnos configurados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Error global (para cuando no hay fila de edición visible) */}
      {error && editing === null && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {editing !== 'new' && (
        <button onClick={startNew} className="btn-secondary text-sm">
          + Agregar turno
        </button>
      )}
    </div>
  )
}
