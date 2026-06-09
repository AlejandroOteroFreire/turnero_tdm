import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/plan-change — crear solicitud de cambio de plan
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const { slots_to_drop, slots_to_add, proposed_start_date } = body

  if (!proposed_start_date) {
    return NextResponse.json({ error: 'Fecha de inicio requerida' }, { status: 400 })
  }
  if ((!slots_to_drop || slots_to_drop.length === 0) && (!slots_to_add || slots_to_add.length === 0)) {
    return NextResponse.json({ error: 'Debes indicar al menos un cambio' }, { status: 400 })
  }

  // Verificar no hay solicitud pendiente
  const { data: existing } = await supabase
    .from('plan_change_requests')
    .select('id')
    .eq('player_id', user.id)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Ya tenés una solicitud pendiente' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('plan_change_requests')
    .insert({
      player_id: user.id,
      slots_to_drop: slots_to_drop ?? [],
      slots_to_add: slots_to_add ?? [],
      proposed_start_date,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Si auto_approve está activo, aprobar automáticamente
  const { data: config } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'auto_approve_plan_change')
    .single()

  if (config?.value === 'true') {
    await supabase.rpc('apply_plan_change', {
      p_request_id: data.id,
      p_reviewed_by: user.id,
    })
    return NextResponse.json({ request: { ...data, status: 'approved' }, auto_approved: true })
  }

  return NextResponse.json({ request: data })
}
