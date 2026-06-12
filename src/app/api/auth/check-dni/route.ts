import { NextRequest, NextResponse } from 'next/server'

const INTERNAL_URL = process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function GET(req: NextRequest) {
  const dni = req.nextUrl.searchParams.get('dni')?.replace(/\D/g, '')
  if (!dni || dni.length < 7) {
    return NextResponse.json({ found: false })
  }

  // Sin JWT → PostgREST usa rol anon, policy permite leer pre_registrations no reclamadas
  const res = await fetch(
    `${INTERNAL_URL}/rest/v1/pre_registrations?dni=eq.${dni}&claimed=eq.false&select=id,full_name,phone&limit=1`,
    { headers: { Accept: 'application/json' } }
  )

  if (!res.ok) {
    return NextResponse.json({ found: false }, { status: 500 })
  }

  const rows: { id: string; full_name: string; phone: string | null }[] = await res.json()
  const data = rows[0]

  if (!data) {
    return NextResponse.json({ found: false })
  }

  const parts = (data.full_name ?? '').trim().split(/\s+/)
  const name     = parts[0] ?? ''
  const lastname = parts.slice(1).join(' ')

  return NextResponse.json({
    found:          true,
    pre_reg_id:     data.id,
    name,
    lastname,
    phone_whatsapp: data.phone ?? '',
  })
}
