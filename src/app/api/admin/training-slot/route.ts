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

// GET — devuelve el cupo default de app_config
export async function GET() {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const sc = createServiceClient()
  const { data } = await sc
    .from('app_config')
    .select('value')
    .eq('key', 'default_slot_capacity')
    .maybeSingle()

  const capacity = parseInt(data?.value ?? '12') || 12
  return NextResponse.json({ capacity })
}

// POST — crea nuevo turno
export async function POST(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json()
  const sc = createServiceClient()
  const { data, error } = await sc
    .from('training_slots')
    .insert({ ...body, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT — actualiza turno existente
export async function PUT(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id, ...payload } = await req.json()
  const sc = createServiceClient()
  const { data, error } = await sc
    .from('training_slots')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — elimina turno
export async function DELETE(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await req.json()
  const sc = createServiceClient()
  const { error } = await sc
    .from('training_slots')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
