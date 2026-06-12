import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const INTERNAL_URL = process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function GET() {
  const res = await fetch(
    `${INTERNAL_URL}/rest/v1/training_slots?is_active=eq.true&select=id,day_of_week,start_time,end_time,label,capacity&order=day_of_week,start_time`,
    { headers: { Accept: 'application/json' } }
  )

  if (!res.ok) return NextResponse.json([], { status: 200 })

  const data = await res.json()
  return NextResponse.json(data)
}
