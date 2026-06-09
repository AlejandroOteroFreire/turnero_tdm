'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DAY_LABELS } from '@/types'
import type { TrainingSlot, SlotDay } from '@/types'

const DAY_OPTIONS: SlotDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

interface Props {
  slots:    TrainingSlot[]
  onUpdate: (slots: TrainingSlot[]) => void
}

const EMPTY_FORM = { day_of_week: 'monday' as SlotDay, start_time: '08:00', end_time: '09:30', capacity: 8, label: '' }

export function SlotConfigPanel({ slots, onUpdate }: Props) {
  const supabase = createClient()
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [editing, setEditing] = useState<string | null>(null)   // slot id en edición
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

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
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function saveSlot() {
    if (form.start_time >= form.end_time) {
      setError('La hora de inicio debe ser anterior a la de fin.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        const { data, error: err } = await supabase
          .from('training_slots')
          .update({ ...form, label: form.label || null })
          .eq('id', editing)
          .select()
          .single()
        if (err) throw err
        onUpdate(slots.map(s => s.id === editing ? data as TrainingSlot : s))
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error: err } = await supabase
          .from('training_slots')
          .insert({ ...form, label: form.label || null, created_by: user!.id })
          .select()
          .single()
        if (err) throw err
        onUpdate([...slots, data as TrainingSlot])
      }
      cancelEdit()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(slot: TrainingSlot) {
    const { data, error: err } = await supabase
      .from('training_slots')
      .update({ is_active: !slot.is_active })
      .eq('id', slot.id)
      .select()
      .single()
    if (!err && data) onUpdate(slots.map(s => s.id === slot.id ? data as TrainingSlot : s))
  }

  async function deleteSlot(id: string) {
    if (!confirm('¿Eliminar este turno? Se borrarán también las instancias y reservas asociadas.')) return
    const { error: err } = await supabase.from('training_slots').delete().eq('id', id)
    if (!err) onUpdate(slots.filter(s => s.id !== id))
  }

  const dayOrder: SlotDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const sorted = [...slots].sort((a, b) =>
    dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week) ||
    a.start_time.localeCompare(b.start_time)
  )

  return (
    <div className="space-y-4">
      {/* Lista de slots */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-white/10">
              <th className="pb-2 pr-4">Día</th>
              <th className="pb-2 pr-4">Horario</th>
              <th className="pb-2 pr-4">Etiqueta</th>
              <th className="pb-2 pr-4 text-center">Cap.</th>
              <th className="pb-2 pr-4 text-center">Activo</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map(slot => (
              <tr key={slot.id} className={`${!slot.is_active ? 'opacity-40' : ''}`}>
                <td className="py-2 pr-4 text-white font-medium">{DAY_LABELS[slot.day_of_week]}</td>
                <td className="py-2 pr-4 text-gray-300 font-mono text-xs">
                  {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}
                </td>
                <td className="py-2 pr-4 text-gray-400 text-xs">{slot.label ?? '—'}</td>
                <td className="py-2 pr-4 text-center">
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded font-mono">{slot.capacity}</span>
                </td>
                <td className="py-2 pr-4 text-center">
                  <button
                    onClick={() => toggleActive(slot)}
                    className={`w-5 h-5 rounded-full border-2 transition-colors ${
                      slot.is_active
                        ? 'bg-club-green border-club-green'
                        : 'border-gray-600 bg-transparent'
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
            ))}
            {slots.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-600 text-sm">
                  No hay turnos configurados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Formulario — nuevo o edición */}
      <div className="border border-white/10 rounded-lg p-4 bg-white/3 space-y-3">
        <h4 className="text-sm font-semibold text-white">
          {editing ? 'Editar turno' : 'Agregar turno'}
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Día</label>
            <select
              className="input"
              value={form.day_of_week}
              onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value as SlotDay }))}
            >
              {DAY_OPTIONS.map(d => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Inicio</label>
            <input
              type="time"
              className="input"
              value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Fin</label>
            <input
              type="time"
              className="input"
              value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Capacidad (jugadores)</label>
            <input
              type="number"
              className="input"
              min={1}
              max={50}
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Etiqueta (opcional)</label>
            <input
              type="text"
              className="input"
              placeholder="ej: Turno Mañana"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={saveSlot}
            disabled={saving}
            className="btn-primary text-sm"
          >
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar turno'}
          </button>
          {editing && (
            <button onClick={cancelEdit} className="btn-secondary text-sm">
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
