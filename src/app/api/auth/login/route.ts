import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PUBLIC_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!
const INTERNAL_URL = process.env.SUPABASE_INTERNAL_URL ?? PUBLIC_URL

export async function POST(req: Request) {
  const { email, password } = await req.json()
  const cookieStore = cookies()

  // Auth goes server→Supabase (internal Docker URL), no browser CORS issue
  const supabase = createServerClient(
    PUBLIC_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, init) => {
          const rewritten = typeof url === 'string'
            ? url.replace(PUBLIC_URL, INTERNAL_URL)
            : url
          return fetch(rewritten, init)
        },
      },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: error.message }, { status: 401 })

  // Clear any saved active role — always start fresh as 'player' on each login
  cookieStore.set('_active_role', '', { path: '/', maxAge: 0 })

  const { data: account } = await supabase
    .from('user_accounts').select('roles').eq('id', data.user.id).single()
  const roles: string[] = account?.roles ?? []

  // Landing: player role → /calendario, no player role (pure admin) → /asistencia
  const destination = roles.includes('player') ? '/calendario' : '/asistencia'
  return NextResponse.json({ destination })
}
