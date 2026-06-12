'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Shield } from '@/components/ui/Shield'
import type { TrainingSlot, SlotDay } from '@/types'
import { DAY_LABELS } from '@/types'

interface SlotAssignmentRow {
  slot_id: string
  training_slots: TrainingSlot | null
}

const DAYS_ORDER: SlotDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export default function RegisterTurnosPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading]       = useState(true)
  const [userStatus, setUserStatus] = useState<string | null>(null)
  const [userId, setUserId]         = useState<string | null>(null)
  const [existingRequest, setExistingRequest] = useState<boolean>(false)
  const [existingSlots, setExistingSlots]     = useState<SlotAssignmentRow[]>([])
  const [availableSlots, setAvailableSlots]   = useState<TrainingSlot[]>([])

  const [daysPerWeek, setDaysPerWeek]   = useState<number>(2)
  const [optionA, setOptionA]           = useState<string[]>([])
  const [optionB, setOptionB]           = useState<string[]>([])
  const [selectingFor, setSelectingFor] = useState<'a' | 'b'>('a')
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: account } = await supabase
        .from('user_accounts')
        .select('status')
        .eq('id', user.id)
        .single()

      const status = account?.status ?? 'pending'
      setUserStatus(status)

      if (status === 'active') {
        // Ver si tiene slot_assignments
        const { data: assignments } = await supabase
          .from('slot_assignments')
          .select('slot_id, training_slots(*)')
          .eq('player_id', user.id)
          .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().split('T')[0])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setExistingSlots((assignments ?? []) as any)
      } else if (status === 'pending') {
        // Ver si ya tiene una solicitud pendiente
        const { data: existing } = await supabase
          .from('registration_requests')
          .select('id')
          .eq('player_id', user.id)
          .eq('status', 'pending')
          .maybeSingle()
        if (existing) {
          setExistingRequest(true)
        } else {
          // Cargar slots disponibles
          const { data: slots } = await supabase
            .from('training_slots')
            .select('*')
            .eq('is_active', true)
            .order('day_of_week')
            .order('start_time')
          setAvailableSlots((slots ?? []) as TrainingSlot[])
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  function toggleSlot(slotId: string, which: 'a' | 'b') {
    const setter = which === 'a' ? setOptionA : setOptionB
    const current = which === 'a' ? optionA : optionB
    const other   = which === 'a' ? optionB : optionA

    if (current.includes(slotId)) {
      setter(current.filter(id => id !== slotId))
    } else if (current.length < daysPerWeek && !other.includes(slotId)) {
      setter([...current, slotId])
    }
  }

  async function handleSubmit() {
    if (!userId) return
    if (optionA.length !== daysPerWeek || optionB.length !== daysPerWeek) return
    setSaving(true)
    setError(null)
    try {
      const { error: insertError } = await supabase
        .from('registration_requests')
        .insert({
          player_id:    userId,
          days_per_week: daysPerWeek,
          option_a:     optionA,
          option_b:     optionB,
          status:       'pending',
        })
      if (insertError) throw insertError
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud')
    } finally {
      setSaving(false)
    }
  }

  // Cuando cambia daysPerWeek, limpiar selecciones que superen el nuevo límite
  function changeDays(n: number) {
    setDaysPerWeek(n)
    setOptionA(prev => prev.slice(0, n))
    setOptionB(prev => prev.slice(0, n))
  }

  const slotsByDay = DAYS_ORDER.reduce<Record<SlotDay, TrainingSlot[]>>((acc, day) => {
    acc[day] = availableSlots.filter(s => s.day_of_week === day)
    return acc
  }, {} as Record<SlotDay, TrainingSlot[]>)

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-club-black">
        <p className="text-gray-400 text-sm">Cargando…</p>
      </div>
    )
  }

  // Usuario activo con slots asignados
  if (userStatus === 'active') {
    const slotsList = existingSlots.map(a => a.training_slots).filter(Boolean) as TrainingSlot[]
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3">
            <Shield size={56} />
            <h1 className="text-xl font-bold text-white">Tus turnos asignados</h1>
          </div>
          <div className="card space-y-3">
            {slotsList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center">No tenés turnos asignados aún.</p>
            ) : (
              slotsList.map(slot => (
                <div key={slot.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                  <span className="text-sm text-white font-medium">{DAY_LABELS[slot.day_of_week]}</span>
                  <span className="text-xs text-gray-400">
                    {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                    {slot.label ? ` · ${slot.label}` : ''}
                  </span>
                </div>
              ))
            )}
          </div>
          <Link href="/calendario" className="btn-primary w-full text-center block">
            Ver mi calendario
          </Link>
        </div>
      </div>
    )
  }

  // Usuario pending con solicitud ya enviada
  if (userStatus === 'pending' && existingRequest) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
        <div className="w-full max-w-sm card text-center space-y-4">
          <Shield size={56} />
          <h2 className="text-lg font-bold text-white">Preferencias enviadas</h2>
          <p className="text-sm text-gray-400">
            Ya enviaste tus preferencias. Esperá la respuesta del equipo.
          </p>
          <Link href="/pendiente" className="btn-primary w-full block text-center">
            Ver estado de solicitud
          </Link>
        </div>
      </div>
    )
  }

  // Mensaje de solicitud enviada exitosamente
  if (saved) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
        <div className="w-full max-w-sm card text-center space-y-4">
          <Shield size={56} />
          <h2 className="text-lg font-bold text-white">¡Solicitud enviada!</h2>
          <p className="text-sm text-gray-400">
            El equipo revisará tus preferencias y te asignará los turnos.
          </p>
          <Link href="/pendiente" className="btn-primary w-full block text-center">
            Entendido
          </Link>
        </div>
      </div>
    )
  }

  // Formulario de selección de turnos
  const canSubmit = optionA.length === daysPerWeek && optionB.length === daysPerWeek

  return (
    <div className="min-h-dvh flex flex-col items-center px-4 py-8 bg-club-black">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Shield size={48} />
          <h1 className="text-xl font-bold text-white">Elegí tus turnos preferidos</h1>
          <p className="text-sm text-gray-400 text-center">
            Seleccioná dos opciones de horarios. El equipo te asignará la que mejor se adapte.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Días por semana */}
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-white">¿Cuántos días por semana querés entrenar?</p>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => changeDays(n)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  daysPerWeek === n
                    ? 'bg-club-green text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs Opción A / B */}
        <div className="flex gap-2">
          {(['a', 'b'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setSelectingFor(opt)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                selectingFor === opt
                  ? 'bg-club-green text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Opción {opt.toUpperCase()}
              <span className="ml-2 text-xs">
                ({opt === 'a' ? optionA.length : optionB.length}/{daysPerWeek})
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 -mt-2">
          {selectingFor === 'a'
            ? `Seleccioná ${daysPerWeek} turno${daysPerWeek > 1 ? 's' : ''} para la Opción A`
            : `Seleccioná ${daysPerWeek} turno${daysPerWeek > 1 ? 's' : ''} distintos para la Opción B`
          }
        </p>

        {/* Slots por día */}
        {DAYS_ORDER.filter(day => slotsByDay[day].length > 0).map(day => (
          <div key={day} className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{DAY_LABELS[day]}</p>
            <div className="space-y-1">
              {slotsByDay[day].map(slot => {
                const inA     = optionA.includes(slot.id)
                const inB     = optionB.includes(slot.id)
                const current = selectingFor === 'a' ? inA : inB
                const inOther = selectingFor === 'a' ? inB : inA
                const currentList = selectingFor === 'a' ? optionA : optionB
                const atLimit = currentList.length >= daysPerWeek && !current

                return (
                  <button
                    key={slot.id}
                    onClick={() => !inOther && toggleSlot(slot.id, selectingFor)}
                    disabled={inOther || (atLimit && !current)}
                    className={`w-full card text-left flex items-center justify-between gap-3 transition-colors ${
                      current
                        ? 'border-club-green bg-club-green/10'
                        : inOther
                        ? 'opacity-40 cursor-not-allowed'
                        : atLimit
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-club-green/40'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                        {slot.label ? ` · ${slot.label}` : ''}
                      </p>
                      <p className="text-xs text-gray-500">Cupo: {slot.capacity} lugares</p>
                    </div>
                    {current && <span className="text-club-green text-sm font-bold">✓</span>}
                    {inOther && (
                      <span className="text-xs text-gray-500">
                        En opción {selectingFor === 'a' ? 'B' : 'A'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Resumen y confirmar */}
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-gray-400">Resumen de selección</p>
          <div className="grid grid-cols-2 gap-3">
            {(['a', 'b'] as const).map(opt => {
              const slots = opt === 'a' ? optionA : optionB
              return (
                <div key={opt}>
                  <p className="text-xs text-gray-500 mb-1">Opción {opt.toUpperCase()}</p>
                  {slots.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">Sin seleccionar</p>
                  ) : (
                    slots.map(id => {
                      const s = availableSlots.find(sl => sl.id === id)
                      return s ? (
                        <p key={id} className="text-xs text-white">
                          {DAY_LABELS[s.day_of_week]} {s.start_time.slice(0, 5)}
                        </p>
                      ) : null
                    })
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="btn-primary w-full"
        >
          {saving ? 'Enviando…' : 'Confirmar preferencias'}
        </button>

        {!canSubmit && (
          <p className="text-xs text-gray-500 text-center">
            Completá ambas opciones con {daysPerWeek} turno{daysPerWeek > 1 ? 's' : ''} cada una para continuar.
          </p>
        )}
      </div>
    </div>
  )
}
