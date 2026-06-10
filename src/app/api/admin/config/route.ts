import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: account } = await supabase
    .from('user_accounts').select('roles').eq('id', user.id).single()
  if (!account?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { key, value } = await req.json()
  const { error } = await supabase
    .from('app_config')
    .upsert({ key, value, updated_by: user.id, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
