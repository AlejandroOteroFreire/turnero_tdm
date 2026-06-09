'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  account:  { id: string; display_name: string; avatar_url: string | null }
  onClose:  () => void
  onSaved:  (newName: string) => void
}

export function EditProfileModal({ account, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [name,    setName]    = useState(account.display_name)
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)

  // Cargar teléfono actual al montar
  useEffect(() => {
    supabase
      .from('user_accounts')
      .select('phone')
      .eq('id', account.id)
      .single()
      .then(({ data }) => { if (data?.phone) setPhone(data.phone) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre no puede estar vacío.'); return }
    setLoading(true); setError(null)
    try {
      const { error: err } = await supabase
        .from('user_accounts')
        .update({ display_name: name.trim(), phone: phone.trim() || null })
        .eq('id', account.id)
      if (err) throw err
      onSaved(name.trim())
      setSaved(true)
      setTimeout(onClose, 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Editar perfil</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
          {/* Avatar placeholder */}
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-club-green/30 flex items-center justify-center text-lg font-bold text-club-green">
              {name[0]?.toUpperCase() ?? '?'}
            </span>
            <div>
              <p className="text-sm font-medium text-white">{name || '…'}</p>
              <p className="text-xs text-gray-500">Jugador</p>
            </div>
          </div>

          <div>
            <label className="label">Nombre completo</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              required
            />
          </div>

          <div>
            <label className="label">Teléfono</label>
            <input
              type="tel"
              className="input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+54 9 11 1234-5678"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm">
              {saved ? '✓ Guardado' : loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
