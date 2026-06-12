import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { error } = await createServiceClient()
    .from('app_config')
    .select('key')
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok', ts: new Date().toISOString() })
}
