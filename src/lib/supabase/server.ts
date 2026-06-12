import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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

// Usa @supabase/supabase-js directamente (no @supabase/ssr) para garantizar
// que la service role key se use siempre y RLS sea bypaseado completamente.
export function createServiceClient() {
  return createSupabaseClient(
    PUBLIC_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
