import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/plan-change/[id]/review — admin aprueba o rechaza
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Verificar que es admin
  const { data: account } = await supabase
    .from('user_accounts')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!account?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { action, admin_notes } = await req.json() // action: 'approve' | 'reject'

  if (action === 'approve') {
    const { error } = await supabase.rpc('apply_plan_change', {
      p_request_id: params.id,
      p_reviewed_by: user.id,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (action === 'reject') {
    const { error } = await supabase
      .from('plan_change_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: admin_notes ?? null,
      })
      .eq('id', params.id)
      .eq('status', 'pending')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
