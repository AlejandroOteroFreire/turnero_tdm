'use client'

import { useState } from 'react'

interface Props {
  configMap: Record<string, string>
}

// ── Config general ──────────────────────────────────────────────────────────

interface ConfigField {
  key:         string
  label:       string
  type:        'toggle' | 'number'
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
    description: 'Horas antes del turno hasta las que se permite cancelar sin penalidad.',
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
    description: 'Jugadores por defecto que puede tener un turno nuevo al crearse.',
  },
]

// ── Notificaciones ──────────────────────────────────────────────────────────

type Channel = 'wa_individual' | 'wa_grupo' | 'web_push' | 'email'

interface NotifEvent {
  key:            string
  label:          string
  dest:           string
  defaultEnabled: boolean
  defaultChannels: Channel[]
}

const CHANNEL_LABELS: Record<Channel, string> = {
  wa_individual: 'WA individual',
  wa_grupo:      'WA grupo',
  web_push:      'Web Push',
  email:         'Email',
}
const ALL_CHANNELS: Channel[] = ['wa_individual', 'wa_grupo', 'web_push', 'email']

const NOTIF_EVENTS: NotifEvent[] = [
  { key: 'nuevo_registro_admin',    label: 'Nuevo registro recibido',       dest: 'Admin',          defaultEnabled: true,  defaultChannels: ['wa_individual'] },
  { key: 'registro_aprobado',       label: 'Registro aprobado',             dest: 'Jugador',        defaultEnabled: true,  defaultChannels: ['wa_individual', 'email'] },
  { key: 'registro_rechazado',      label: 'Registro rechazado',            dest: 'Jugador',        defaultEnabled: true,  defaultChannels: ['email'] },
  { key: 'cupo_liberado_espera',    label: 'Cupo liberado (en espera)',     dest: 'Jugador espera', defaultEnabled: true,  defaultChannels: ['wa_individual', 'web_push'] },
  { key: 'turno_libre_sin_espera',  label: 'Turno libre sin lista espera',  dest: 'Activos',        defaultEnabled: true,  defaultChannels: ['wa_grupo'] },
  { key: 'recordatorio_24hs',       label: 'Recordatorio 24hs antes',       dest: 'Jugador',        defaultEnabled: false, defaultChannels: ['wa_individual'] },
  { key: 'cambio_plan_solicitado',  label: 'Cambio de plan solicitado',     dest: 'Admin',          defaultEnabled: true,  defaultChannels: ['wa_individual'] },
  { key: 'cambio_plan_aprobado',    label: 'Cambio de plan aprobado',       dest: 'Jugador',        defaultEnabled: true,  defaultChannels: ['wa_individual', 'email'] },
  { key: 'cambio_plan_rechazado',   label: 'Cambio de plan rechazado',      dest: 'Jugador',        defaultEnabled: false, defaultChannels: ['email'] },
  { key: 'turno_cancelado_club',    label: 'Turno cancelado por el club',   dest: 'Anotados',       defaultEnabled: true,  defaultChannels: ['wa_individual', 'wa_grupo', 'web_push'] },
  { key: 'turno_modificado',        label: 'Turno modificado',              dest: 'Afectados',      defaultEnabled: true,  defaultChannels: ['wa_individual', 'web_push'] },
  { key: 'registro_pago',           label: 'Registro de pago',              dest: 'Jugador',        defaultEnabled: false, defaultChannels: ['email'] },
]

function enabledKey(ev: string)  { return `notif_${ev}_enabled` }
function channelsKey(ev: string) { return `notif_${ev}_channels` }

function parseChannels(raw: string | undefined, defaults: Channel[]): Channel[] {
  if (!raw) return defaults
  try { return JSON.parse(raw) as Channel[] } catch { return defaults }
}

// ── Helpers UI ──────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-club-green' : 'bg-gray-700'}`}
      role="switch"
      aria-checked={on}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function ConfiguracionClient({ configMap }: Props) {
  const [values,    setValues]    = useState<Record<string, string>>(configMap)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())

  function setValue(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }))
    setDirtyKeys(prev => new Set(prev).add(key))
    setSaved(false)
  }

  function setNotifEnabled(ev: string, on: boolean) {
    setValue(enabledKey(ev), on ? 'true' : 'false')
  }

  function setNotifChannels(ev: string, ch: Channel, checked: boolean) {
    const current = parseChannels(values[channelsKey(ev)], NOTIF_EVENTS.find(e => e.key === ev)!.defaultChannels)
    const next = checked ? [...new Set([...current, ch])] : current.filter(c => c !== ch)
    setValue(channelsKey(ev), JSON.stringify(next))
  }

  async function handleSave() {
    if (dirtyKeys.size === 0) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      for (const key of Array.from(dirtyKeys)) {
        const res = await fetch('/api/admin/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: values[key] ?? '' }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? `Error al guardar ${key}`)
        }
      }
      setDirtyKeys(new Set())
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-bold text-white">Configuración</h1>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300">{error}</div>
      )}
      {saved && (
        <div className="rounded-lg bg-green-900/30 border border-green-700/50 px-3 py-2 text-sm text-green-300">Configuración guardada correctamente.</div>
      )}

      {/* ── Sección: General ── */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-white">General</h2>
        {CONFIG_FIELDS.map(field => (
          <div key={field.key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-white">{field.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
            </div>
            {field.type === 'toggle' ? (
              <Toggle
                on={values[field.key] === 'true'}
                onChange={on => setValue(field.key, on ? 'true' : 'false')}
              />
            ) : (
              <input
                type="number"
                className="input w-20 text-sm py-1 text-right"
                value={values[field.key] ?? ''}
                onChange={e => setValue(field.key, e.target.value)}
                min="0"
              />
            )}
          </div>
        ))}
      </section>

      {/* ── Sección: Notificaciones ── */}
      <section className="card space-y-0 overflow-x-auto">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">Notificaciones</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Activá o desactivá cada evento y elegí los canales por los que se envía. Los jugadores pueden
            desactivar canales a nivel personal, pero no pueden activar los que el admin tiene apagados.
          </p>
        </div>

        {/* Header */}
        <div className="grid text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 border-b border-white/10 pb-1"
          style={{ gridTemplateColumns: '1fr 80px 40px 88px 72px 64px 56px' }}>
          <span>Evento</span>
          <span>Destinatario</span>
          <span className="text-center">ON</span>
          <span className="text-center">WA ind.</span>
          <span className="text-center">WA grp.</span>
          <span className="text-center">Push</span>
          <span className="text-center">Email</span>
        </div>

        {/* Filas */}
        {NOTIF_EVENTS.map(ev => {
          const enabled  = values[enabledKey(ev.key)] !== undefined
            ? values[enabledKey(ev.key)] === 'true'
            : ev.defaultEnabled
          const channels = parseChannels(values[channelsKey(ev.key)], ev.defaultChannels)

          return (
            <div
              key={ev.key}
              className="grid items-center py-2 border-b border-white/5 last:border-0 gap-x-1"
              style={{ gridTemplateColumns: '1fr 80px 40px 88px 72px 64px 56px' }}
            >
              <div className="min-w-0 pr-2">
                <p className="text-xs text-white truncate">{ev.label}</p>
              </div>

              <span className="text-[10px] text-gray-500 truncate">{ev.dest}</span>

              {/* Toggle ON/OFF */}
              <div className="flex justify-center">
                <Toggle on={enabled} onChange={on => setNotifEnabled(ev.key, on)} />
              </div>

              {/* Checkboxes de canales */}
              {(ALL_CHANNELS).map(ch => (
                <div key={ch} className="flex justify-center">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 accent-club-green"
                    checked={channels.includes(ch)}
                    disabled={!enabled}
                    onChange={e => setNotifChannels(ev.key, ch, e.target.checked)}
                  />
                </div>
              ))}
            </div>
          )
        })}

        <p className="text-[10px] text-gray-600 mt-3">
          Los canales deshabilitados se ignoran aunque el evento esté activo.
        </p>
      </section>

      <button
        onClick={handleSave}
        disabled={saving || dirtyKeys.size === 0}
        className="btn-primary w-full"
      >
        {saving ? 'Guardando…' : 'Guardar configuración'}
      </button>

      {dirtyKeys.size === 0 && !saving && (
        <p className="text-xs text-gray-600 text-center">Sin cambios pendientes.</p>
      )}
    </div>
  )
}
