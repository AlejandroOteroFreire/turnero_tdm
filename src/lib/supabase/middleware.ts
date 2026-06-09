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

  const { data: { user } } = await supabase.auth.getUser()

  // Rutas protegidas
  const protectedPaths = ['/calendario', '/mis-turnos', '/preferencias', '/jugadores', '/asistencia', '/pagos', '/editor-turnos', '/estadisticas']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirigir usuarios autenticados fuera del login/register
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    // El login page ya maneja la redirección por rol; aquí solo aplica si llegan directo
    const url = request.nextUrl.clone()
    url.pathname = '/jugadores'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
