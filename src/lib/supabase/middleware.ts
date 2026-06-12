import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
let supabaseResponse = NextResponse.next({ request })

  // IMPORTANTE: usar NEXT_PUBLIC_SUPABASE_URL como "supabaseUrl" para que el nombre
  // de la cookie coincida con el que genera el browser client (sb-localhost-auth-token).
  // Para los requests HTTP reales usamos SUPABASE_INTERNAL_URL (kong:8000) vía custom fetch,
  // ya que desde dentro del container "localhost:54321" no es accesible.
  const publicUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const internalUrl = process.env.SUPABASE_INTERNAL_URL ?? publicUrl

  const internalFetch: typeof fetch = (url, init) => {
    const rewritten = typeof url === 'string'
      ? url.replace(publicUrl, internalUrl)
      : url instanceof URL
        ? new URL(url.toString().replace(publicUrl, internalUrl))
        : url
    return fetch(rewritten, init)
  }

  const supabase = createServerClient(
    publicUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: internalFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {
    console.error('[middleware] getUser error:', e)
  }

  const SESSION_MINUTES = 30
  const SESSION_MS      = SESSION_MINUTES * 60 * 1000
  const COOKIE_NAME     = 'ss_exp'
  const pathname        = request.nextUrl.pathname

  // Rutas protegidas
  const protectedPaths = ['/calendario', '/mis-turnos', '/preferencias', '/jugadores', '/asistencia', '/pagos', '/editor-turnos', '/estadisticas']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Gestión del timeout de sesión (solo para usuarios autenticados)
  // Excluir rutas de sign-out y assets para evitar bucles o renovaciones por service worker
  const isAuthRoute  = pathname === '/api/auth/sign-out'
  const isAssetRoute = pathname.startsWith('/_next') || pathname.startsWith('/api/auth/callback') || pathname === '/sw.js'

  if (user && !isAuthRoute && !isAssetRoute) {
    const expCookie = request.cookies.get(COOKIE_NAME)?.value
    const now       = Date.now()

    if (expCookie && now > parseInt(expCookie, 10)) {
      // Sin cookie (navegador cerrado/reabierto) o expirada → sesión vencida, sign out
      const url = request.nextUrl.clone()
      url.pathname = '/api/auth/sign-out'
      url.searchParams.set('reason', 'expired')
      const redirect = NextResponse.redirect(url)
      redirect.cookies.delete(COOKIE_NAME)
      return redirect
    }

    // Renovar la cookie: ventana deslizante de SESSION_MINUTES
    supabaseResponse.cookies.set(COOKIE_NAME, String(now + SESSION_MS), {
      httpOnly: true,
      sameSite: 'lax',
      path:     '/',
      maxAge:   SESSION_MINUTES * 60,
    })
  }

  // Si no hay usuario activo, limpiar la cookie
  if (!user) {
    supabaseResponse.cookies.delete(COOKIE_NAME)
  }

  return supabaseResponse
}
