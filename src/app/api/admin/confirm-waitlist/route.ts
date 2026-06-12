import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const authClient = createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: account } = await authClient
    .from('user_accounts').select('roles').eq('id', user.id).single()
  const isAdmin = account?.roles?.includes('admin') || account?.roles?.includes('collaborator')
  if (!isAdmin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { booking_id } = await req.json()
  if (!booking_id) return NextResponse.json({ error: 'booking_id requerido' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('bookings')
    .update({ status: 'confirmed', waitlist_pos: null })
    .eq('id', booking_id)
    .eq('status', 'waitlisted')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
