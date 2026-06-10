import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  // Verificar que el usuario es admin o collab
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: account } = await supabase
    .from('user_accounts')
    .select('roles')
    .eq('id', user.id)
    .single()

  const roles: string[] = account?.roles ?? []
  if (!roles.includes('admin') && !roles.includes('collaborator')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { action, option, admin_notes } = body

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  // Obtener la solicitud
  const { data: req, error: reqError } = await supabase
    .from('registration_requests')
    .select('*')
    .eq('id', params.id)
    .single()

  if (reqError || !req) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  }

  if (req.status !== 'pending') {
    return NextResponse.json({ error: 'La solicitud ya fue procesada' }, { status: 409 })
  }

  if (action === 'approve') {
    if (!['a', 'b'].includes(option)) {
      return NextResponse.json({ error: 'Opción inválida' }, { status: 400 })
    }

    const slots: string[] = option === 'a' ? req.option_a : req.option_b

    // Insertar slot_assignments
    const today = new Date().toISOString().split('T')[0]
    const assignments = slots.map((slot_id: string) => ({
      player_id:  req.player_id,
      slot_id,
      valid_from: today,
      valid_until: null,
    }))

    const { error: assignError } = await supabase
      .from('slot_assignments')
      .insert(assignments)

    if (assignError) {
      return NextResponse.json({ error: 'Error al asignar turnos: ' + assignError.message }, { status: 500 })
    }

    // Activar la cuenta del jugador
    const { error: activateError } = await supabase
      .from('user_accounts')
      .update({ status: 'active' })
      .eq('id', req.player_id)

    if (activateError) {
      return NextResponse.json({ error: 'Error al activar cuenta: ' + activateError.message }, { status: 500 })
    }

    // Actualizar la solicitud
    const { error: updateError } = await supabase
      .from('registration_requests')
      .update({
        status:         'approved',
        assigned_slots: slots,
        reviewed_by:    user.id,
        reviewed_at:    new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar solicitud: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, action: 'approved', option })
  }

  // action === 'reject'
  const { error: rejectError } = await supabase
    .from('registration_requests')
    .update({
      status:      'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: admin_notes ?? null,
    })
    .eq('id', params.id)

  if (rejectError) {
    return NextResponse.json({ error: 'Error al rechazar solicitud: ' + rejectError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, action: 'rejected' })
}
