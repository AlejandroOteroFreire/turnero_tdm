import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PUBLIC_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!
const INTERNAL_URL = process.env.SUPABASE_INTERNAL_URL ?? PUBLIC_URL

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const cookieStore = cookies()
  const supabase = createServerClient(
    PUBLIC_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url: string | URL | Request, init?: RequestInit) => {
          const rewritten = typeof url === 'string'
            ? url.replace(PUBLIC_URL, INTERNAL_URL)
            : url
          return fetch(rewritten, init)
        },
      },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list: { name: string; value: string; options?: object }[]) {
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          )
        },
      },
    }
  )

  // Verificar que el llamante es admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: account } = await supabase
    .from('user_accounts')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!account?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/actualizar-password`,
  })

  if (error) {
    console.error('[admin/reset-password]', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
