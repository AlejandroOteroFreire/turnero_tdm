'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SlotInstanceAvailability, Booking } from '@/types'

interface Props {
  instance: SlotInstanceAvailability
  booking:  Pick<Booking, 'id' | 'instance_id' | 'status' | 'waitlist_pos'> | null
  userId:   string | null
}

export function SlotCard({ instance, booking, userId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const supabase = createClient()

  const isCancelled = instance.instance_status === 'cancelled'
  const isFull      = instance.available_spots <= 0
  const isConfirmed = booking?.status === 'confirmed'
  const isWaiting   = booking?.status === 'waitlisted'

  async function book() {
    if (!userId) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id: instance.instance_id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al reservar')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function cancel() {
    if (!booking) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al cancelar')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`card transition-all ${isCancelled ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate">
            {instance.label ?? `${instance.start_time.slice(0, 5)} – ${instance.end_time.slice(0, 5)}`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {instance.start_time.slice(0, 5)} – {instance.end_time.slice(0, 5)}
          </p>
        </div>

        {/* Disponibilidad */}
        <div className="shrink-0 text-right">
          {isCancelled ? (
            <span className="text-xs text-red-400 font-medium">Cancelado</span>
          ) : (
            <div>
              <span className={`text-sm font-bold ${isFull ? 'text-amber-400' : 'text-green-400'}`}>
                {isFull ? 'Completo' : `${instance.available_spots} libre${instance.available_spots !== 1 ? 's' : ''}`}
              </span>
              <p className="text-xs text-gray-500">{instance.confirmed_count}/{instance.capacity}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lista de espera */}
      {!isCancelled && isFull && instance.waitlist_count > 0 && (
        <p className="text-xs text-amber-400/70 mt-1">
          {instance.waitlist_count} en lista de espera
        </p>
      )}

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      {/* Acciones */}
      {userId && !isCancelled && (
        <div className="mt-3">
          {isConfirmed ? (
            <button onClick={cancel} disabled={loading} className="btn-ghost w-full text-red-400 hover:bg-red-900/20 text-xs py-1.5">
              {loading ? 'Cancelando…' : '✕ Cancelar reserva'}
            </button>
          ) : isWaiting ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-400">
                Lista de espera #{booking!.waitlist_pos}
              </span>
              <button onClick={cancel} disabled={loading} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                {loading ? '…' : 'Salir'}
              </button>
            </div>
          ) : (
            <button
              onClick={book}
              disabled={loading}
              className={isFull ? 'btn-secondary w-full text-xs py-1.5' : 'btn-primary w-full text-xs py-1.5'}
            >
              {loading
                ? 'Procesando…'
                : isFull
                ? '+ Lista de espera'
                : '✓ Reservar'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
