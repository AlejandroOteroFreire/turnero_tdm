import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const authClient = createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: account } = await authClient
    .from('user_accounts').select('roles').eq('id', user.id).single()
  const isAdmin = account?.roles?.includes('admin') || account?.roles?.includes('collaborator')
  if (!isAdmin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { dni, first_name, last_name, nickname, phone, email, slot_ids } = await req.json()

  if (!dni || !first_name || !last_name) {
    return NextResponse.json({ error: 'DNI, nombre y apellido son requeridos' }, { status: 400 })
  }

  const service = createServiceClient()

  // Verificar DNI único
  const { data: existing } = await service
    .from('player_profiles').select('id').eq('dni', dni).maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un jugador con ese DNI' }, { status: 409 })
  }

  // Crear player_profile sin user_id
  const full_name = `${first_name} ${last_name}`.trim()
  const { data: profile, error: profileError } = await service
    .from('player_profiles')
    .insert({ full_name, first_name, last_name, nickname, dni, phone, email, frequency: 1 })
    .select()
    .single()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // Crear slot_assignments con profile_id
  if (slot_ids?.length) {
    const assignments = slot_ids.map((slot_id: string) => ({
      slot_id,
      profile_id: profile.id,
      player_id: null,
      valid_from: new Date().toISOString().split('T')[0],
    }))
    await service.from('slot_assignments').insert(assignments)
  }

  return NextResponse.json({ profile_id: profile.id })
}
