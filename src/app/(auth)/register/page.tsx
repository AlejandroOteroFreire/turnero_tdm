'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Shield } from '@/components/ui/Shield'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]             = useState<'form' | 'pending'>('form')
  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [dni, setDni]               = useState('')
  const [phone, setPhone]           = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [dniStatus, setDniStatus]   = useState<'idle' | 'found' | 'not_found'>('idle')
  const [preRegName, setPreRegName] = useState<string | null>(null)

  // Verificar DNI contra pre-registros
  async function checkDni() {
    if (dni.length < 7) return
    setDniStatus('idle')
    const { data } = await supabase
      .from('pre_registrations')
      .select('full_name, claimed')
      .eq('dni', dni)
      .eq('claimed', false)
      .maybeSingle()

    if (data) {
      setDniStatus('found')
      setPreRegName(data.full_name)
      setFullName(data.full_name)
    } else {
      setDniStatus('not_found')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Registrar en Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, dni, phone },
        },
      })
      if (signUpError) throw signUpError

      // Actualizar user_account con DNI y datos adicionales
      if (data.user) {
        const status = dniStatus === 'found' ? 'active' : 'pending'
        await supabase.from('user_accounts').upsert({
          id: data.user.id,
          email,
          display_name: fullName,
          dni,
          phone: phone || null,
          status,
        })

        // Si tiene pre-registro, vincular y crear perfil
        if (dniStatus === 'found') {
          await supabase
            .from('pre_registrations')
            .update({ claimed: true, claimed_by: data.user.id, claimed_at: new Date().toISOString() })
            .eq('dni', dni)

          await supabase.from('player_profiles').insert({
            user_id: data.user.id,
            full_name: fullName,
            dni,
            phone: phone || null,
          })
        }
      }

      setStep('pending')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'pending') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
        <div className="w-full max-w-sm card text-center space-y-4">
          <Shield size={56} />
          <h2 className="text-lg font-bold text-white">
            {dniStatus === 'found' ? '¡Bienvenido/a!' : 'Registro recibido'}
          </h2>
          <p className="text-sm text-gray-400">
            {dniStatus === 'found'
              ? 'Tu cuenta fue activada. Ya podés iniciar sesión.'
              : 'Tu solicitud está siendo revisada por la administración. Te avisaremos cuando esté aprobada.'}
          </p>
          <Link href="/login" className="btn-primary w-full">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Shield size={56} />
          <h1 className="text-xl font-bold text-white">Crear cuenta</h1>
        </div>

        <div className="card space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3">
            {/* DNI — primer campo, determina pre-registro */}
            <div>
              <label className="label">DNI</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  className="input flex-1"
                  placeholder="Sin puntos"
                  value={dni}
                  onChange={e => { setDni(e.target.value); setDniStatus('idle') }}
                  onBlur={checkDni}
                  required
                />
                <button type="button" onClick={checkDni} className="btn-secondary px-3 text-xs whitespace-nowrap">
                  Verificar
                </button>
              </div>
              {dniStatus === 'found' && (
                <p className="mt-1 text-xs text-green-400">
                  ✓ Pre-registro encontrado: {preRegName}
                </p>
              )}
              {dniStatus === 'not_found' && (
                <p className="mt-1 text-xs text-amber-400">
                  No se encontró pre-registro. Tu cuenta quedará pendiente de aprobación.
                </p>
              )}
            </div>

            <div>
              <label className="label">Nombre completo</label>
              <input
                type="text"
                className="input"
                placeholder="Nombre y apellido"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="label">Teléfono (opcional — para WhatsApp)</label>
              <input
                type="tel"
                className="input"
                placeholder="+549 11 1234-5678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? 'Registrando…' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-club-green hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
