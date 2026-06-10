'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import type { TrainingSlot, SlotDay } from '@/types'
import { DAY_LABELS } from '@/types'

const DAY_ORDER: Record<SlotDay, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}

interface SimplePref {
  reminder_24h:  boolean
  open_spots:    boolean
}

interface Props {
  userId:        string
  waOptIn:       boolean
  hasPhone:      boolean
  simplePref:    SimplePref
  favoriteSlots: string[]
  allSlots:      Pick<TrainingSlot, 'id' | 'day_of_week' | 'start_time' | 'end_time' | 'label'>[]
}

export function PreferenciasClient({ userId, waOptIn, hasPhone, simplePref, favoriteSlots, allSlots }: Props) {
  const supabase = createClient()
  const push     = usePushNotifications()

  const [reminder, setReminder]   = useState(simplePref.reminder_24h)
  const [openSpots, setOpenSpots] = useState(simplePref.open_spots)
  const [favorites, setFavorites] = useState<string[]>(favoriteSlots)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savedPrefs, setSavedPrefs]   = useState(false)

  const waActive = waOptIn && hasPhone

  async function toggleSimplePref(key: 'reminder' | 'openSpots') {
    if (key === 'reminder') {
      const newVal = !reminder
      setReminder(newVal)
      await upsertPref('whatsapp', 'booking_confirmed', newVal)
    } else {
      const newVal = !openSpots
      setOpenSpots(newVal)
      await upsertPref('whatsapp', 'slot_open_spots', newVal)
    }
  }

  async function upsertPref(channel: string, event_type: string, enabled: boolean) {
    await supabase.from('notification_prefs').upsert({
      player_id: userId,
      channel,
      event_type,
      enabled,
      overridden: true,
    }, { onConflict: 'player_id,channel,event_type' })
  }

  function toggleFavorite(slotId: string) {
    setFavorites(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    )
  }

  async function saveFavorites() {
    setSavingPrefs(true)
    setSavedPrefs(false)
    try {
      // Borrar todos los favoritos actuales del usuario y reinsertar los seleccionados
      await supabase.from('favorite_slots').delete().eq('player_id', userId)
      if (favorites.length > 0) {
        await supabase.from('favorite_slots').insert(
          favorites.map(slot_id => ({ player_id: userId, slot_id }))
        )
      }
      setSavedPrefs(true)
      setTimeout(() => setSavedPrefs(false), 2000)
    } finally {
      setSavingPrefs(false)
    }
  }

  const slotsByDay = allSlots.reduce<Record<SlotDay, typeof allSlots>>((acc, s) => {
    const day = s.day_of_week as SlotDay
    if (!acc[day]) acc[day] = []
    acc[day].push(s)
    return acc
  }, {} as Record<SlotDay, typeof allSlots>)

  const orderedDays = (Object.keys(slotsByDay) as SlotDay[]).sort(
    (a, b) => DAY_ORDER[a] - DAY_ORDER[b]
  )

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-bold text-white">Preferencias</h1>

      {/* WhatsApp */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Avisos por WhatsApp</h2>
          {!waActive && (
            <span className="text-xs text-amber-400">
              Agregá tu teléfono en <a href="/perfil" className="underline">Perfil</a>
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-300">Recordatorio 24hs antes</p>
              <p className="text-xs text-gray-500">Te avisa el día anterior a cada turno.</p>
            </div>
            <button
              onClick={() => waActive && toggleSimplePref('reminder')}
              disabled={!waActive}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors
                ${!waActive ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                ${reminder && waActive ? 'bg-club-green' : 'bg-white/20'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${reminder && waActive ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-300">Avisos de cupo libre en favoritos</p>
              <p className="text-xs text-gray-500">Te avisa cuando se libera un lugar en tus turnos favoritos.</p>
            </div>
            <button
              onClick={() => waActive && toggleSimplePref('openSpots')}
              disabled={!waActive}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors
                ${!waActive ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                ${openSpots && waActive ? 'bg-club-green' : 'bg-white/20'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${openSpots && waActive ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Push */}
      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-white">Notificaciones push</h2>
        {!push.supported ? (
          <p className="text-xs text-gray-500">Tu navegador no soporta notificaciones push.</p>
        ) : (
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

      {/* Turnos favoritos */}
      <section className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Turnos favoritos</h2>
          <p className="text-xs text-gray-500 mt-0.5">Recibís un aviso cuando se libera un cupo en estos turnos.</p>
        </div>

        {allSlots.length === 0 ? (
          <p className="text-xs text-gray-500">No hay turnos activos.</p>
        ) : (
          <div className="space-y-4">
            {orderedDays.map(day => (
              <div key={day}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {DAY_LABELS[day]}
                </p>
                <div className="space-y-1">
                  {slotsByDay[day].map(slot => {
                    const isFav = favorites.includes(slot.id)
                    return (
                      <button
                        key={slot.id}
                        onClick={() => toggleFavorite(slot.id)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-colors text-left ${
                          isFav
                            ? 'border-club-green/50 bg-club-green/10'
                            : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                        }`}
                      >
                        <div>
                          <span className="text-sm text-white">
                            {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                          </span>
                          {slot.label && (
                            <span className="text-xs text-gray-500 ml-2">{slot.label}</span>
                          )}
                        </div>
                        <span className={`text-lg leading-none ${isFav ? 'text-yellow-400' : 'text-gray-700'}`}>
                          ★
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={saveFavorites}
          disabled={savingPrefs}
          className="btn-primary w-full"
        >
          {savingPrefs ? 'Guardando…' : savedPrefs ? '✓ Guardado' : 'Guardar favoritos'}
        </button>
      </section>
    </div>
  )
}
