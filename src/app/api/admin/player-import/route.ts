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

  // Cargar slots y DNIs existentes en paralelo
  const [{ data: slots }, { data: existingProfiles }] = await Promise.all([
    service.from('training_slots').select('id, label').eq('is_active', true),
    service.from('player_profiles').select('dni'),
  ])

  const slotByLabel  = new Map((slots ?? []).map(s => [s.label?.trim(), s.id]))
  const existingDNIs = new Set((existingProfiles ?? []).map(p => p.dni))

  const today   = new Date().toISOString().split('T')[0]
  const errors: string[] = []
  let skipped = 0

  // Separar filas válidas de inválidas/duplicadas
  const toInsert = rows.filter(row => {
    const dni    = row.dni?.trim()
    const nombre = row.nombre_completo?.trim()
    if (!dni || !nombre) { errors.push(`Fila sin DNI o nombre omitida`); return false }
    if (existingDNIs.has(dni)) { skipped++; return false }
    return true
  })

  if (!toInsert.length) {
    return NextResponse.json({ imported: 0, skipped, errors })
  }

  // Bulk insert profiles
  const profileRows = toInsert.map(row => {
    const nombre = row.nombre_completo.trim()
    const parts  = nombre.split(' ')
    return {
      full_name:  nombre,
      first_name: parts[0] ?? '',
      last_name:  parts.slice(1).join(' ') || '',
      dni:        row.dni.trim(),
      phone:      row.telefono?.trim() || null,
      email:      row.email?.trim()    || null,
      frequency:  parseInt(row.frecuencia ?? '1', 10) || 1,
    }
  })

  const { data: created, error: bulkError } = await service
    .from('player_profiles')
    .insert(profileRows)
    .select('id, dni')

  if (bulkError || !created) {
    return NextResponse.json({ error: `Error al insertar perfiles: ${bulkError?.message}` }, { status: 500 })
  }

  // Mapear dni → profile id para asignar turnos
  const profileByDni = new Map(created.map(p => [p.dni, p.id]))

  const assignments = toInsert.flatMap(row => {
    const profileId = profileByDni.get(row.dni.trim())
    if (!profileId || !row.turnos?.trim()) return []
    return row.turnos.split('|')
      .map(l => slotByLabel.get(l.trim()))
      .filter(Boolean)
      .map(slot_id => ({ slot_id, profile_id: profileId, player_id: null, valid_from: today }))
  })

  if (assignments.length) {
    await service.from('slot_assignments').insert(assignments)
  }

  return NextResponse.json({ imported: created.length, skipped, errors })
}
