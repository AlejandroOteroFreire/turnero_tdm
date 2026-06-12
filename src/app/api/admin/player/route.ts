import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendNotification, buildBody } from '@/lib/notifications/send'

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: account } = await supabase
    .from('user_accounts').select('roles').eq('id', user.id).single()
  if (!account?.roles?.includes('admin')) return null
  return user
}

// PATCH /api/admin/player — actualiza cuenta y perfil de un jugador
export async function PATCH(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { playerId, account, profile, status } = await req.json()
  const sc = createServiceClient()
  const errors: string[] = []

  if (account) {
    const { error } = await sc.from('user_accounts').update(account).eq('id', playerId)
    if (error) errors.push('cuenta: ' + error.message)
  }

  if (profile) {
    const { error } = await sc.from('player_profiles').update(profile).eq('user_id', playerId)
    if (error) errors.push('perfil: ' + error.message)
  }

  if (status) {
    const { error } = await sc.from('user_accounts').update({ status }).eq('id', playerId)
    if (error) errors.push('estado: ' + error.message)
    else if (status === 'active' || status === 'suspended') {
      // Notificar al jugador del cambio de estado
      const { data: playerAccount } = await sc
        .from('user_accounts')
        .select('email, display_name')
        .eq('id', playerId)
        .single()
      if (playerAccount) {
        const name = playerAccount.display_name ?? ''
        const type = status === 'active' ? 'account_approved' : 'account_rejected'
        await sendNotification({
          type,
          recipient: playerAccount.email,
          body: buildBody(type, { name }),
          metadata: { player_id: playerId },
        })
      }
    }
  }

  if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 500 })
  return NextResponse.json({ ok: true })
}
