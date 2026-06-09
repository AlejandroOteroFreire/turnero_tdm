import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Solo admin puede cancelar instancias
  const { data: account } = await supabase
    .from('user_accounts')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!(account?.roles as string[])?.includes('admin')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { reason } = await req.json().catch(() => ({ reason: '' }))

  const service = createServiceClient()

  const { error } = await service
    .from('slot_instances')
    .update({
      status:               'cancelled',
      cancellation_reason:  reason ?? null,
      cancelled_by:         user.id,
      cancelled_at:         new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificar al worker para que avise a los anotados
  fetch(`${process.env.WORKER_URL}/notify/slot-cancelled`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instance_id: params.id, reason }),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
