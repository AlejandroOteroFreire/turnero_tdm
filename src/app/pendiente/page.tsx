import Link from 'next/link'
import { Shield } from '@/components/ui/Shield'

export default function PendientePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-club-black">
      <div className="w-full max-w-sm card text-center space-y-4">
        <Shield size={56} />
        <h1 className="text-lg font-bold text-white">Cuenta pendiente</h1>
        <p className="text-sm text-gray-400">
          Tu cuenta está siendo revisada por la administración del club.
          Recibirás una notificación cuando sea aprobada.
        </p>
        <p className="text-xs text-gray-600">
          Si ya pagaste la cuota, acercate al club para que vinculen tu DNI.
        </p>
        <Link href="/login" className="btn-ghost w-full text-xs">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
