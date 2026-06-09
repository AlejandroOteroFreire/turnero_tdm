import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { endpoint, keys: { p256dh, auth }, userAgent } = await req.json()

  const service = createServiceClient()
  const { error } = await service.from('push_subscriptions').upsert({
    player_id:  user.id,
    endpoint,
    p256dh,
    auth,
    user_agent: userAgent ?? null,
  }, { onConflict: 'endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { endpoint } = await req.json()
  const service = createServiceClient()
  await service.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('player_id', user.id)
  return NextResponse.json({ ok: true })
}
