import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const service = createServiceClient()

  // Verificar ownership
  const { data: booking } = await service
    .from('bookings')
    .select('id, player_id, instance_id, status')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  if (booking.player_id !== user.id) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (!['confirmed', 'waitlisted'].includes(booking.status)) {
    return NextResponse.json({ error: 'Esta reserva no puede cancelarse' }, { status: 409 })
  }

  // Verificar si es cancelación tardía
  const { data: isLate } = await service
    .rpc('is_late_cancellation', { p_instance_id: booking.instance_id })

  // Cancelar via función SQL
  const { error } = await service
    .rpc('cancel_booking', {
      p_booking_id:  booking.id,
      p_cancelled_by: user.id,
      p_late: isLate ?? false,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificar al worker para que ofrezca el cupo al siguiente en lista de espera
  if (booking.status === 'confirmed') {
    fetch(`${process.env.WORKER_URL}/waitlist/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance_id: booking.instance_id }),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, late_cancel: isLate })
}
