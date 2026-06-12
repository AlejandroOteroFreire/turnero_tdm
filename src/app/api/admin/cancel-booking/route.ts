import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: account } = await supabase
    .from('user_accounts').select('roles').eq('id', user.id).single()
  if (!account?.roles?.includes('admin') && !account?.roles?.includes('collaborator')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { booking_id } = await req.json()
  const sc = createServiceClient()
  const { error } = await sc
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
