import Link from 'next/link'
import { Shield } from '@/components/ui/Shield'

export default function PendientePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
      <div className="w-full max-w-sm card text-center space-y-4">
        <Shield size={56} />
        <h2 className="text-lg font-bold text-white">Cuenta en revisión</h2>
        <p className="text-sm text-gray-400">
          Tu solicitud está siendo revisada por el equipo. Te avisaremos cuando tu cuenta esté activada.
        </p>
        <p className="text-xs text-gray-600">
          Si ya enviaste tus preferencias de turnos, no hace falta que hagas nada más.
        </p>
        <Link
          href="/register/turnos"
          className="btn-secondary w-full block text-center text-sm"
        >
          Ver / enviar preferencias de turnos
        </Link>
        <Link
          href="/api/auth/sign-out"
          className="block text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Cerrar sesión
        </Link>
      </div>
    </div>
  )
}
