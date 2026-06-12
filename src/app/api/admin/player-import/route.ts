import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

interface ImportRow {
  dni: string
  nombre_completo: string
  telefono?: string
  email?: string
  frecuencia?: string
  turnos?: string
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const values: string[] = []
    let cur = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { values.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    values.push(cur.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row as ImportRow
  })
}

export async function POST(req: NextRequest) {
  const authClient = createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: account } = await authClient
    .from('user_accounts').select('roles').eq('id', user.id).single()
  const isAdmin = account?.roles?.includes('admin') || account?.roles?.includes('collaborator')
  if (!isAdmin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (!rows.length) return NextResponse.json({ error: 'El archivo está vacío o tiene formato incorrecto' }, { status: 400 })

  const service = createServiceClient()

  // Cargar todos los slots para resolver labels → ids
  const { data: slots } = await service
    .from('training_slots')
    .select('id, label')
    .eq('is_active', true)

  const slotByLabel = new Map((slots ?? []).map(s => [s.label?.trim(), s.id]))

  const today = new Date().toISOString().split('T')[0]
  const results = { imported: 0, skipped: 0, errors: [] as string[] }

  for (const row of rows) {
    const dni = row.dni?.trim()
    const nombre = row.nombre_completo?.trim()
    if (!dni || !nombre) {
      results.errors.push(`Fila sin DNI o nombre: ${JSON.stringify(row)}`)
      continue
    }

    // Verificar duplicado por DNI
    const { data: existing } = await service
      .from('player_profiles').select('id').eq('dni', dni).maybeSingle()
    if (existing) {
      results.skipped++
      continue
    }

    const parts = nombre.split(' ')
    const first_name = parts[0] ?? ''
    const last_name  = parts.slice(1).join(' ') || ''
    const frecuencia = parseInt(row.frecuencia ?? '1', 10) || 1

    const { data: profile, error } = await service
      .from('player_profiles')
      .insert({
        full_name: nombre,
        first_name,
        last_name,
        dni,
        phone: row.telefono?.trim() || null,
        email: row.email?.trim() || null,
        frequency: frecuencia,
      })
      .select('id')
      .single()

    if (error || !profile) {
      results.errors.push(`Error al crear ${nombre}: ${error?.message}`)
      continue
    }

    // Asignar turnos por label
    const turnosStr = row.turnos?.trim()
    if (turnosStr) {
      const labels = turnosStr.split('|').map(l => l.trim())
      const assignments = labels
        .map(label => slotByLabel.get(label))
        .filter(Boolean)
        .map(slot_id => ({ slot_id, profile_id: profile.id, player_id: null, valid_from: today }))
      if (assignments.length) {
        await service.from('slot_assignments').insert(assignments)
      }
    }

    results.imported++
  }

  return NextResponse.json(results)
}
