'use client'

import { useState } from 'react'

interface Props {
  configMap: Record<string, string>
}

interface ConfigField {
  key:   string
  label: string
  type:  'toggle' | 'number'
  description: string
}

const CONFIG_FIELDS: ConfigField[] = [
  {
    key:  'auto_approve_plan_change',
    label: 'Auto-aprobar cambios de plan',
    type:  'toggle',
    description: 'Si está activo, los cambios de plan se aprueban automáticamente sin revisión admin.',
  },
  {
    key:  'cancel_cutoff_hours',
    label: 'Horas límite para cancelación',
    type:  'number',
    description: 'Cantidad de horas antes del turno hasta las que se permite cancelar sin penalidad.',
  },
  {
    key:  'booking_window_days',
    label: 'Días de anticipación para reservas extra',
    type:  'number',
    description: 'Con cuántos días de anticipación se pueden hacer reservas de turnos extra.',
  },
  {
    key:  'waitlist_offer_minutes',
    label: 'Minutos para confirmar cupo liberado',
    type:  'number',
    description: 'Tiempo que tiene un jugador en lista de espera para confirmar un cupo liberado.',
  },
  {
    key:  'default_slot_capacity',
    label: 'Cupo default para nuevos turnos',
    type:  'number',
    description: 'Cuántos jugadores puede tener por defecto un turno nuevo al crearse.',
  },
]

export function ConfiguracionClient({ configMap }: Props) {
  const [values, setValues] = useState<Record<string, string>>(configMap)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function hasChanges() {
    return CONFIG_FIELDS.some(f => values[f.key] !== configMap[f.key])
  }

  async function handleSave() {
    if (!hasChanges()) return

    const changed = CONFIG_FIELDS.filter(f => values[f.key] !== configMap[f.key])

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      for (const field of changed) {
        const res = await fetch('/api/admin/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: field.key, value: values[field.key] }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? `Error al guardar ${field.label}`)
        }
      }
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-bold text-white">Configuración</h1>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg bg-green-900/30 border border-green-700/50 px-3 py-2 text-sm text-green-300">
          Configuración guardada correctamente.
        </div>
      )}

      <div className="space-y-4">
        {CONFIG_FIELDS.map(field => (
          <div key={field.key} className="card space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{field.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
              </div>

              {field.type === 'toggle' ? (
                <button
                  onClick={() =>
                    setValues(prev => ({
                      ...prev,
                      [field.key]: prev[field.key] === 'true' ? 'false' : 'true',
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                    values[field.key] === 'true' ? 'bg-club-green' : 'bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={values[field.key] === 'true'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      values[field.key] === 'true' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              ) : (
                <input
                  type="number"
                  className="input w-20 text-sm py-1 text-right"
                  value={values[field.key] ?? ''}
                  onChange={e =>
                    setValues(prev => ({ ...prev, [field.key]: e.target.value }))
                  }
                  min="0"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !hasChanges()}
        className="btn-primary w-full"
      >
        {saving ? 'Guardando…' : 'Guardar configuración'}
      </button>

      {!hasChanges() && !saving && (
        <p className="text-xs text-gray-600 text-center">Sin cambios pendientes.</p>
      )}
    </div>
  )
}
