'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield } from '@/components/ui/Shield'
import type { TrainingSlot, SlotDay } from '@/types'
import { DAY_LABELS } from '@/types'

type Step = 'dni' | 'datos' | 'turnos' | 'done'

interface PreReg {
  pre_reg_id: string
  name: string
  lastname: string
  phone_whatsapp: string
}

const DAYS_ORDER: SlotDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export default function RegisterPage() {
  const [step,      setStep]      = useState<Step>('dni')
  const [dniFound,  setDniFound]  = useState(false)
  const [preReg,    setPreReg]    = useState<PreReg | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)

  // Campos personales
  const [dni,       setDni]       = useState('')
  const [name,      setName]      = useState('')
  const [lastname,  setLastname]  = useState('')
  const [nickname,  setNickname]  = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [locality,  setLocality]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // Preferencias de turnos
  const [slots,       setSlots]       = useState<TrainingSlot[]>([])
  const [daysPerWeek, setDaysPerWeek] = useState(2)
  const [optionA,     setOptionA]     = useState<string[]>([])
  const [optionB,     setOptionB]     = useState<string[]>([])
  const [selecting,   setSelecting]   = useState<'a' | 'b'>('a')

  // Cargar slots al pasar al paso 3
  useEffect(() => {
    if (step !== 'turnos' || slots.length > 0) return
    fetch('/api/auth/slots')
      .then(r => r.json())
      .then((data: TrainingSlot[]) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setSlots([]))
  }, [step])

  // ── Paso 1: verificar DNI ──────────────────────────────────────
  async function handleDni(e: React.FormEvent) {
    e.preventDefault()
    const clean = dni.replace(/\D/g, '')
    if (clean.length < 7) { setError('DNI inválido (mínimo 7 dígitos)'); return }
    setError(null)
    setLoading(true)

    try {
      const res  = await fetch(`/api/auth/check-dni?dni=${clean}`)
      const data = await res.json()
      if (data.found) {
        setPreReg(data)
        setName(data.name ?? '')
        setLastname(data.lastname ?? '')
        setPhone(data.phone_whatsapp ?? '')
        setDniFound(true)
      } else {
        setPreReg(null)
        setDniFound(false)
      }
      setStep('datos')
    } finally {
      setLoading(false)
    }
  }

  const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/

  // ── Paso 2 → 3 (o directo a registrar si es pre-cargado) ──────
  async function handleDatos(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!PASSWORD_REGEX.test(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    // Jugadores pre-cargados ya tienen turnos asignados → registrar directo
    if (preReg) {
      setLoading(true)
      try {
        const res  = await fetch('/api/auth/register', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dni: dni.replace(/\D/g, ''),
            name, lastname, nickname, birthDate, locality, phone, email, password,
            preRegId: preReg.pre_reg_id,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error al registrarse')
        setStep('done')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al registrarse')
      } finally {
        setLoading(false)
      }
      return
    }

    setStep('turnos')
  }

  // ── Selección de turnos ────────────────────────────────────────
  function toggleSlot(id: string, which: 'a' | 'b') {
    const set     = which === 'a' ? setOptionA : setOptionB
    const current = which === 'a' ? optionA    : optionB
    const other   = which === 'a' ? optionB    : optionA
    if (current.includes(id)) {
      set(current.filter(x => x !== id))
    } else if (current.length < daysPerWeek && !other.includes(id)) {
      set([...current, id])
    }
  }

  function changeDays(n: number) {
    setDaysPerWeek(n)
    setOptionA(p => p.slice(0, n))
    setOptionB(p => p.slice(0, n))
  }

  // ── Paso 3 → registrar ─────────────────────────────────────────
  async function handleTurnos(e: React.FormEvent) {
    e.preventDefault()
    if (optionA.length !== daysPerWeek || optionB.length !== daysPerWeek) {
      setError(`Completá ambas opciones con ${daysPerWeek} turno${daysPerWeek > 1 ? 's' : ''} cada una.`)
      return
    }
    setError(null)
    setLoading(true)

    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: dni.replace(/\D/g, ''),
          name, lastname, nickname, birthDate, locality, phone, email, password,
          preRegId:    preReg?.pre_reg_id ?? null,
          daysPerWeek,
          optionA,
          optionB,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al registrarse')
      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  // ── Pantalla de éxito ──────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
        <div className="w-full max-w-sm card text-center space-y-4">
          <Shield size={56} />
          <h2 className="text-lg font-bold text-white">
            {preReg ? '¡Cuenta activada!' : 'Registro recibido'}
          </h2>
          <p className="text-sm text-gray-400">
            {preReg
              ? 'Tu cuenta está lista. Iniciá sesión para empezar.'
              : 'Tu solicitud y tus preferencias de turnos fueron enviadas. El equipo te confirma a la brevedad.'}
          </p>
          <Link href="/login" className="btn-primary w-full block text-center">
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  // ── Paso 3: selección de turnos ────────────────────────────────
  if (step === 'turnos') {
    const slotsByDay = DAYS_ORDER.reduce<Record<SlotDay, TrainingSlot[]>>((acc, day) => {
      acc[day] = slots.filter(s => s.day_of_week === day)
      return acc
    }, {} as Record<SlotDay, TrainingSlot[]>)

    const canSubmit = optionA.length === daysPerWeek && optionB.length === daysPerWeek

    return (
      <div className="min-h-dvh flex flex-col items-center px-4 py-8 bg-club-black">
        <div className="w-full max-w-lg space-y-5">
          <div className="flex flex-col items-center gap-2">
            <Shield size={48} />
            <h1 className="text-xl font-bold text-white">Preferencias de turnos</h1>
            <p className="text-xs text-gray-500">Paso 3 de 3</p>
            <p className="text-sm text-gray-400 text-center">
              Seleccioná dos opciones de horarios. El equipo te asignará la que mejor se adapte.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleTurnos} className="space-y-4">
            {/* Días por semana */}
            <div className="card space-y-3">
              <p className="text-sm font-semibold text-white">¿Cuántos días por semana?</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => changeDays(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      daysPerWeek === n ? 'bg-club-green text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs A / B */}
            <div className="flex gap-2">
              {(['a', 'b'] as const).map(opt => (
                <button key={opt} type="button" onClick={() => setSelecting(opt)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    selecting === opt ? 'bg-club-green text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}>
                  Opción {opt.toUpperCase()}
                  <span className="ml-2 text-xs opacity-70">
                    ({(opt === 'a' ? optionA : optionB).length}/{daysPerWeek})
                  </span>
                </button>
              ))}
            </div>

            {/* Slots por día */}
            {slots.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Cargando horarios…</p>
            )}
            {DAYS_ORDER.filter(d => slotsByDay[d].length > 0).map(day => (
              <div key={day} className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{DAY_LABELS[day]}</p>
                {slotsByDay[day].map(slot => {
                  const inA     = optionA.includes(slot.id)
                  const inB     = optionB.includes(slot.id)
                  const current = selecting === 'a' ? inA : inB
                  const inOther = selecting === 'a' ? inB : inA
                  const list    = selecting === 'a' ? optionA : optionB
                  const atLimit = list.length >= daysPerWeek && !current

                  return (
                    <button key={slot.id} type="button"
                      onClick={() => !inOther && toggleSlot(slot.id, selecting)}
                      disabled={inOther || (atLimit && !current)}
                      className={`w-full card text-left flex items-center justify-between gap-3 transition-colors ${
                        current   ? 'border-club-green bg-club-green/10'
                        : inOther ? 'opacity-40 cursor-not-allowed'
                        : atLimit ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:border-club-green/40'
                      }`}>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                          {slot.label ? ` · ${slot.label}` : ''}
                        </p>
                        <p className="text-xs text-gray-500">Cupo: {slot.capacity}</p>
                      </div>
                      {current  && <span className="text-club-green font-bold text-sm">✓</span>}
                      {inOther  && <span className="text-xs text-gray-500">En opción {selecting === 'a' ? 'B' : 'A'}</span>}
                    </button>
                  )
                })}
              </div>
            ))}

            <button type="submit" disabled={loading || !canSubmit}
              className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Registrando…' : 'Confirmar y registrarse'}
            </button>
            {!canSubmit && (
              <p className="text-xs text-gray-500 text-center">
                Completá las dos opciones con {daysPerWeek} turno{daysPerWeek > 1 ? 's' : ''} cada una.
              </p>
            )}

            <button type="button" onClick={() => { setStep('datos'); setError(null) }}
              className="btn-secondary w-full text-sm">
              ← Volver a datos personales
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Paso 1: solo DNI ───────────────────────────────────────────
  if (step === 'dni') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3">
            <Shield size={56} />
            <h1 className="text-xl font-bold text-white">Crear cuenta</h1>
            <p className="text-sm text-gray-500 text-center">
              Ingresá tu DNI para verificar si ya estás en el club.
            </p>
          </div>
          <div className="card">
            {error && (
              <div className="mb-3 rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}
            <form onSubmit={handleDni} className="space-y-3">
              <div>
                <label className="label">DNI</label>
                <input type="text" inputMode="numeric" className="input"
                  placeholder="Sin puntos ni guiones"
                  value={dni} onChange={e => { setDni(e.target.value); setError(null) }}
                  required autoFocus />
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary w-full disabled:opacity-50">
                {loading ? 'Verificando…' : 'Continuar'}
              </button>
              <Link href="/login" className="btn-secondary w-full text-center block text-sm">
                Cancelar
              </Link>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── Paso 2: datos personales ───────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Shield size={56} />
          <h1 className="text-xl font-bold text-white">Datos personales</h1>
          <p className="text-xs text-gray-500">Paso 2 de 3</p>
          {dniFound
            ? <p className="text-xs text-green-400 text-center">✓ DNI encontrado — podés editar los datos</p>
            : <p className="text-xs text-amber-400 text-center">DNI no encontrado — completá tus datos</p>
          }
        </div>

        <div className="card">
          <form onSubmit={handleDatos} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre</label>
                <input type="text" className="input" value={name}
                  onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Apellido</label>
                <input type="text" className="input" value={lastname}
                  onChange={e => setLastname(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="label">Apodo <span className="text-gray-600 font-normal">(opcional)</span></label>
              <input type="text" className="input" placeholder="Como te conocen en el club"
                value={nickname} onChange={e => setNickname(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha de nacimiento</label>
                <input type="date" className="input" value={birthDate}
                  onChange={e => setBirthDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Localidad</label>
                <input type="text" className="input" placeholder="Ej: Wilde"
                  value={locality} onChange={e => setLocality(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Teléfono / WhatsApp</label>
              <input type="tel" className="input" placeholder="+549 11 1234-5678"
                value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div className="pt-2 border-t border-white/10 space-y-3">
              <p className="text-xs text-gray-500">Acceso</p>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="tu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <input type="password" className="input" placeholder="Mín. 8 caracteres, 1 mayúscula y 1 número"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="new-password" />
              </div>
              <div>
                <label className="label">Confirmar contraseña</label>
                <input type="password" className="input" placeholder="Repetí la contraseña"
                  value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
                  required autoComplete="new-password" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1 disabled:opacity-50">
              {loading ? 'Registrando…' : preReg ? 'Registrarse' : 'Continuar →'}
            </button>
            <button type="button" onClick={() => setStep('dni')}
              className="btn-secondary w-full text-sm">
              ← Cambiar DNI
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
