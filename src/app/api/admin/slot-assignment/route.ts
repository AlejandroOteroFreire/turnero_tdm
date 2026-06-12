import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: account } = await supabase
    .from('user_accounts').select('roles').eq('id', user.id).single()
  if (!account?.roles?.includes('admin')) return null
  return user
}

// POST /api/admin/slot-assignment — asigna un jugador a un turno
export async function POST(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { slot_id, player_id, valid_from } = await req.json()
  const sc = createServiceClient()
  const { data, error } = await sc
    .from('slot_assignments')
    .insert({ slot_id, player_id, valid_from })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/admin/slot-assignment — soft-remove (valid_until = ayer)
export async function PATCH(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id, valid_until } = await req.json()
  const sc = createServiceClient()
  const { error } = await sc
    .from('slot_assignments')
    .update({ valid_until })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
