import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/cron/generate-weekly
// Llamar con header Authorization: Bearer <CRON_SECRET>
// Genera instancias y bookings para las próximas 2 semanas
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const supabase = createClient()

  // Generar instancias para las próximas 2 semanas
  const { data: instanceCount, error: e1 } = await supabase
    .rpc('generate_slot_instances', { p_weeks: 2 })
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  // Generar bookings automáticos
  const { data: bookingCount, error: e2 } = await supabase
    .rpc('generate_auto_bookings', { p_weeks: 2 })
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    instances_created: instanceCount,
    bookings_created: bookingCount,
    run_at: new Date().toISOString(),
  })
}
