'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Shield } from '@/components/ui/Shield'

export default function PendientePage() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
      <div className="w-full max-w-sm card text-center space-y-4">
        <Shield size={56} />
        <h1 className="text-lg font-bold text-white">Cuenta pendiente</h1>
        <p className="text-sm text-gray-400">
          Tu cuenta está siendo revisada por la administración del club.
          Recibirás una notificación cuando sea aprobada.
        </p>
        <button onClick={handleSignOut} className="btn-ghost w-full text-xs">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
