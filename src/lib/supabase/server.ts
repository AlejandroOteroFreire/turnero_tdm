import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// En Docker, el server-side usa la URL interna (kong:8000).
// El cliente browser siempre usa NEXT_PUBLIC_SUPABASE_URL (localhost:54321).
const SUPABASE_SERVER_URL =
  process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    SUPABASE_SERVER_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // En Server Components, set lanza si ya se envió la respuesta
          }
        },
      },
    }
  )
}

// Cliente con service_role para operaciones de servidor privilegiadas
export function createServiceClient() {
  const cookieStore = cookies()

  return createServerClient(
    SUPABASE_SERVER_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}
