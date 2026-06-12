'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield } from '@/components/ui/Shield'

export default function OlvidePasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar')
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar el mail')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Shield size={56} />
          <h1 className="text-xl font-bold text-white">Recuperar contraseña</h1>
        </div>

        <div className="card">
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-green-400">
                ✓ Te enviamos un mail con el enlace para restablecer tu contraseña.
              </p>
              <p className="text-xs text-gray-500">
                Revisá tu bandeja de entrada (y la carpeta de spam).
              </p>
              <Link href="/login" className="btn-primary w-full block text-center">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-sm text-gray-400">
                Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
              </p>
              {error && (
                <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </button>
              <Link href="/login" className="btn-secondary w-full text-center block text-sm">
                Cancelar
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
