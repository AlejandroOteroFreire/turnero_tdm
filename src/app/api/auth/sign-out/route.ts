import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  await supabase.auth.signOut()

  const reason = request.nextUrl.searchParams.get('reason')
  const url    = request.nextUrl.clone()
  url.pathname = '/login'
  url.search   = reason ? `?reason=${reason}` : ''

  const response = NextResponse.redirect(url)
  response.cookies.delete('ss_exp')
  return response
}
