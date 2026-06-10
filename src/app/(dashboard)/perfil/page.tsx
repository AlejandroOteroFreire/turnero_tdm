'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PerfilPage() {
  const supabase = createClient()

  const [userId, setUserId]   = useState('')
  const [email, setEmail]     = useState('')

  // Datos personales (player_profiles)
  const [name, setName]             = useState('')
  const [lastname, setLastname]     = useState('')
  const [nickname, setNickname]     = useState('')
  const [birthDate, setBirthDate]   = useState('')
  const [locality, setLocality]     = useState('')
  const [phone, setPhone]           = useState('')
  const [waOptIn, setWaOptIn]       = useState(false)

  // Datos deportivos
  const [tmtCode, setTmtCode]           = useState('')
  const [fetembaCode, setFetembaCode]   = useState('')

  const [saving, setSaving]         = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)

  // Cambiar contraseña
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPass, setSavingPass]   = useState(false)
  const [passError, setPassError]     = useState<string | null>(null)
  const [passSaved, setPassSaved]     = useState(false)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email ?? '')

      const [{ data: account }, { data: profile }] = await Promise.all([
        supabase
          .from('user_accounts')
          .select('phone, wa_opt_in')
          .eq('id', user.id)
          .single(),
        supabase
          .from('player_profiles')
          .select('name, lastname, nickname, birth_date, locality, phone_whatsapp, tmt_code, fetemba_code')
          .eq('user_id', user.id)
          .single(),
      ])

      if (account) {
        setPhone(account.phone ?? '')
        setWaOptIn(account.wa_opt_in)
      }
      if (profile) {
        setName(profile.name ?? '')
        setLastname(profile.lastname ?? '')
        setNickname(profile.nickname ?? '')
        setBirthDate(profile.birth_date ?? '')
        setLocality(profile.locality ?? '')
        if (profile.phone_whatsapp) setPhone(profile.phone_whatsapp)
        setTmtCode(profile.tmt_code ?? '')
        setFetembaCode(profile.fetemba_code ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSavedProfile(false)
    setSaveError(null)
    try {
      const [r1, r2] = await Promise.all([
        supabase.from('user_accounts').update({
          display_name: `${name} ${lastname}`.trim(),
          phone:        phone || null,
          wa_opt_in:    waOptIn,
        }).eq('id', userId),
        supabase.from('player_profiles').update({
          name:           name || null,
          lastname:       lastname || null,
          nickname:       nickname || null,
          birth_date:     birthDate || null,
          locality:       locality || null,
          phone_whatsapp: phone || null,
          tmt_code:       tmtCode || null,
          fetemba_code:   fetembaCode || null,
        }).eq('user_id', userId),
      ])
      if (r1.error) throw r1.error
      if (r2.error) throw r2.error
      setSavedProfile(true)
      setTimeout(() => setSavedProfile(false), 2500)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPassError(null)
    setPassSaved(false)
    if (newPassword !== confirmPassword) {
      setPassError('Las contraseñas no coinciden.')
      return
    }
    if (newPassword.length < 8) {
      setPassError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setSavingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPassSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPassSaved(false), 3000)
    } catch (err: unknown) {
      setPassError(err instanceof Error ? err.message : 'Error al cambiar la contraseña')
    } finally {
      setSavingPass(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500 text-sm">Cargando…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-bold text-white">Mi perfil</h1>

      <form onSubmit={saveProfile} className="space-y-6">
        {/* Datos personales */}
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold text-white">Datos personales</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre <span className="text-red-400">*</span></label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Apellido <span className="text-red-400">*</span></label>
              <input
                type="text"
                className="input"
                value={lastname}
                onChange={e => setLastname(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Apodo <span className="text-gray-600 font-normal">(opcional)</span></label>
            <input
              type="text"
              className="input"
              placeholder="Como te conocen en el club"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Fecha de nacimiento</label>
            <input
              type="date"
              className="input"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Localidad</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: Córdoba Capital"
              value={locality}
              onChange={e => setLocality(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Teléfono / WhatsApp <span className="text-red-400">*</span></label>
            <input
              type="tel"
              className="input"
              placeholder="+549 351 123-4567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
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
        </section>

        {/* Datos deportivos */}
        <section className="card space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Datos deportivos</h2>
            <p className="text-xs text-gray-500 mt-0.5">Usados para inscripciones en torneos.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código TMT</label>
              <input
                type="text"
                className="input"
                placeholder="Ej: 12345"
                value={tmtCode}
                onChange={e => setTmtCode(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Código Fetemba</label>
              <input
                type="text"
                className="input"
                placeholder="Ej: FET-9876"
                value={fetembaCode}
                onChange={e => setFetembaCode(e.target.value)}
              />
            </div>
          </div>
        </section>

        {saveError && (
          <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-xs text-red-300">
            {saveError}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Guardando…' : savedProfile ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </form>

      {/* Acceso */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-white">Acceso</h2>

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input opacity-60 cursor-not-allowed"
            value={email}
            readOnly
          />
          <p className="text-[11px] text-gray-600 mt-0.5">El email no se puede cambiar.</p>
        </div>

        <form onSubmit={changePassword} className="space-y-3 pt-2 border-t border-white/10">
          <p className="text-xs font-semibold text-gray-400">Cambiar contraseña</p>
          {passError && (
            <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-xs text-red-300">
              {passError}
            </div>
          )}
          {passSaved && (
            <div className="rounded-lg bg-green-900/30 border border-green-700/50 px-3 py-2 text-xs text-green-300">
              ✓ Contraseña actualizada.
            </div>
          )}
          <div>
            <label className="label">Nueva contraseña</label>
            <input
              type="password"
              className="input"
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirmar contraseña</label>
            <input
              type="password"
              className="input"
              placeholder="Repetí la nueva contraseña"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={savingPass || !newPassword || !confirmPassword}
            className="btn-primary"
          >
            {savingPass ? 'Cambiando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </section>
    </div>
  )
}
