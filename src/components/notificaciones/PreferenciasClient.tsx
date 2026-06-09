'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import type { NotificationChannel } from '@/types'

interface DefaultRow {
  channel: NotificationChannel
  event_type: string
  enabled: boolean
}
interface PrefRow {
  id: string
  channel: NotificationChannel
  event_type: string
  enabled: boolean
  overridden: boolean
}
interface Props {
  userId:   string
  defaults: DefaultRow[]
  prefs:    PrefRow[]
  phone:    string | null
  waOptIn:  boolean
}

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  whatsapp:       'WhatsApp individual',
  whatsapp_group: 'Grupo de WhatsApp',
  web_push:       'Notificaciones push',
  email:          'Email',
}

const EVENT_LABELS: Record<string, string> = {
  booking_confirmed:  'Reserva confirmada',
  booking_cancelled:  'Reserva cancelada',
  slot_cancelled:     'Turno cancelado',
  waitlist_offer:     'Oferta de lista de espera',
  waitlist_expired:   'Oferta expirada',
  slot_open_spots:    'Cupos libres',
  payment_reminder:   'Recordatorio de pago',
}

export function PreferenciasClient({ userId, defaults, prefs, phone: initialPhone, waOptIn: initialWaOptIn }: Props) {
  const supabase = createClient()
  const push     = usePushNotifications()

  const [phone, setPhone]       = useState(initialPhone ?? '')
  const [waOptIn, setWaOptIn]   = useState(initialWaOptIn)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  // Estado local de overrides: Map<`channel:event`, boolean>
  const initialOverrides = Object.fromEntries(
    prefs.filter(p => p.overridden).map(p => [`${p.channel}:${p.event_type}`, p.enabled])
  )
  const [overrides, setOverrides] = useState<Record<string, boolean>>(initialOverrides)

  function getEffectiveValue(channel: NotificationChannel, eventType: string): boolean {
    const key = `${channel}:${eventType}`
    if (key in overrides) return overrides[key]
    return defaults.find(d => d.channel === channel && d.event_type === eventType)?.enabled ?? true
  }

  function isOverridden(channel: NotificationChannel, eventType: string): boolean {
    return `${channel}:${eventType}` in overrides
  }

  async function togglePref(channel: NotificationChannel, eventType: string) {
    const key      = `${channel}:${eventType}`
    const current  = getEffectiveValue(channel, eventType)
    const newValue = !current

    // Si vuelve al default, quitar el override
    const defaultVal = defaults.find(d => d.channel === channel && d.event_type === eventType)?.enabled ?? true
    if (newValue === defaultVal) {
      const { [key]: _, ...rest } = overrides
      setOverrides(rest)
      await supabase.from('notification_prefs')
        .delete()
        .eq('player_id', userId)
        .eq('channel', channel)
        .eq('event_type', eventType)
    } else {
      setOverrides(prev => ({ ...prev, [key]: newValue }))
      await supabase.from('notification_prefs').upsert({
        player_id:  userId,
        channel,
        event_type: eventType,
        enabled:    newValue,
        overridden: true,
      }, { onConflict: 'player_id,channel,event_type' })
    }
  }

  async function saveContact() {
    setSaving(true)
    setSaved(false)
    try {
      await supabase.from('user_accounts').update({
        phone:      phone || null,
        wa_opt_in:  waOptIn,
      }).eq('id', userId)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  // Agrupar defaults por canal
  const channels = [...new Set(defaults.map(d => d.channel))] as NotificationChannel[]

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-bold text-white">Preferencias</h1>

      {/* Datos de contacto */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-white">Datos de contacto</h2>

        <div>
          <label className="label">Teléfono (para WhatsApp)</label>
          <input
            type="tel"
            className="input"
            placeholder="+549 11 1234-5678"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setWaOptIn(v => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${waOptIn ? 'bg-club-green' : 'bg-white/20'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${waOptIn ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm text-gray-300">Acepto recibir mensajes de WhatsApp del club</span>
        </label>

        <button onClick={saveContact} disabled={saving} className="btn-primary">
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar datos'}
        </button>
      </section>

      {/* Web Push */}
      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-white">Notificaciones push</h2>
        {!push.supported && (
          <p className="text-xs text-gray-500">Tu navegador no soporta notificaciones push.</p>
        )}
        {push.supported && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">
                {push.subscribed ? 'Activadas en este dispositivo' : 'Desactivadas en este dispositivo'}
              </p>
              {push.permission === 'denied' && (
                <p className="text-xs text-red-400 mt-0.5">
                  Permiso denegado. Habilitalo desde la configuración del navegador.
                </p>
              )}
            </div>
            <button
              onClick={push.subscribed ? push.unsubscribe : push.subscribe}
              disabled={push.loading || push.permission === 'denied'}
              className={push.subscribed ? 'btn-ghost text-sm' : 'btn-primary text-sm'}
            >
              {push.loading ? '…' : push.subscribed ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        )}
      </section>

      {/* Preferencias por canal/evento */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Qué querés recibir</h2>
        <p className="text-xs text-gray-500">
          Los valores marcados con punto siguen el default del club. Podés personalizarlos.
        </p>

        {channels.map(channel => {
          const channelDefaults = defaults.filter(d => d.channel === channel)
          if (channelDefaults.length === 0) return null

          // Deshabilitar todo el canal WA si no tiene teléfono o no dio opt-in
          const waDisabled = (channel === 'whatsapp' || channel === 'whatsapp_group') && (!phone || !waOptIn)

          return (
            <div key={channel} className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">{CHANNEL_LABELS[channel]}</h3>
                {waDisabled && (
                  <span className="text-xs text-amber-500">Requiere teléfono y opt-in</span>
                )}
              </div>

              <div className="space-y-2">
                {channelDefaults.map(d => {
                  const enabled    = getEffectiveValue(channel, d.event_type)
                  const overridden = isOverridden(channel, d.event_type)
                  return (
                    <div key={d.event_type} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm text-gray-300 truncate">
                          {EVENT_LABELS[d.event_type] ?? d.event_type}
                        </span>
                        {!overridden && (
                          <span className="text-[10px] text-gray-600 shrink-0">·club</span>
                        )}
                      </div>
                      <button
                        onClick={() => !waDisabled && togglePref(channel, d.event_type)}
                        disabled={waDisabled}
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors
                          ${waDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                          ${enabled ? 'bg-club-green' : 'bg-white/20'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
