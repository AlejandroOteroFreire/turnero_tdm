import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// IMPORTANTE: usar NEXT_PUBLIC_SUPABASE_URL como supabaseUrl para que los nombres
// de cookies coincidan con los del browser client (sb-localhost-auth-token).
// Los HTTP requests reales se redirigen a SUPABASE_INTERNAL_URL (kong:8000) via
// custom fetch, ya que desde el container "localhost:54321" no es accesible.
const PUBLIC_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!
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

// Cliente con service_role para operaciones de servidor privilegiadas
export function createServiceClient() {
  const cookieStore = cookies()

  return createServerClient(
    PUBLIC_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: { fetch: makeInternalFetch() },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}
