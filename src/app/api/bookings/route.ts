import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { instance_id } = await req.json()
  if (!instance_id) return NextResponse.json({ error: 'Falta instance_id' }, { status: 400 })

  const service = createServiceClient()

  // Verificar que la instancia existe y está activa
  const { data: inst } = await service
    .from('slot_instance_availability')
    .select('*')
    .eq('instance_id', instance_id)
    .single()

  if (!inst) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
  if (inst.instance_status !== 'active') return NextResponse.json({ error: 'Turno cancelado' }, { status: 409 })

  // Verificar que no tiene ya una reserva activa
  const { data: existing } = await service
    .from('bookings')
    .select('id, status')
    .eq('instance_id', instance_id)
    .eq('player_id', user.id)
    .in('status', ['confirmed', 'waitlisted'])
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Ya tenés una reserva para este turno' }, { status: 409 })

  // Determinar si va como confirmado o en lista de espera
  const onWaitlist = inst.available_spots <= 0
  let waitlistPos: number | null = null

  if (onWaitlist) {
    waitlistPos = (inst.waitlist_count ?? 0) + 1
  }

  const { data: booking, error } = await service
    .from('bookings')
    .insert({
      instance_id,
      player_id:   user.id,
      status:      onWaitlist ? 'waitlisted' : 'confirmed',
      waitlist_pos: waitlistPos,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificar al worker si corresponde
  if (!onWaitlist) {
    // Confirmación directa — notificar al jugador (fire & forget)
    fetch(`${process.env.WORKER_URL}/notify/booking-confirmed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: booking.id }),
    }).catch(() => {})
  }

  return NextResponse.json({ booking, onWaitlist }, { status: 201 })
}
