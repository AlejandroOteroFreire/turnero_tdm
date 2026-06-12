import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// SUPABASE_URL (sin NEXT_PUBLIC_) no se inlinea en el build — se lee en runtime
const PUBLIC_URL   = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
const INTERNAL_URL = process.env.SUPABASE_INTERNAL_URL ?? PUBLIC_URL

function makeInternalFetch(): typeof fetch {
  return (url, init) => {
    const rewritten = typeof url === 'string'
      ? url.replace(PUBLIC_URL, INTERNAL_URL)
      : url instanceof URL
        ? new URL(url.toString().replace(PUBLIC_URL, INTERNAL_URL))
        : url
    return fetch(rewritten, init)
  }
}

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    PUBLIC_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: makeInternalFetch() },
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
            // En Server Components set() lanza si ya se envió la respuesta
          }
        },
      },
    }
  )
}

// Las políticas RLS ya permiten operaciones admin vía is_admin(). Usamos el JWT
// del usuario autenticado (que sí es válido) en lugar del service_role key
// (que tiene firma incorrecta para el JWT_SECRET actual del setup local).
export function createServiceClient() {
  const cookieStore = cookies()
  return createServerClient(
    PUBLIC_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: makeInternalFetch() },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}
