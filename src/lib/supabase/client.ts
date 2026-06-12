import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Build-time URL may be localhost; at runtime use the current hostname
  // so the app works from any device on the LAN (not only localhost)
  const buildUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  let supabaseUrl = buildUrl
  if (typeof window !== 'undefined') {
    try {
      const u = new URL(buildUrl)
      supabaseUrl = `${u.protocol}//${window.location.hostname}:${u.port}`
    } catch { /* keep buildUrl */ }
  }

  return createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
