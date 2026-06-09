#!/usr/bin/env node
// ============================================================
// Script: importar pre-registros desde CSV
// Uso: node scripts/import-csv.js <archivo.csv>
//
// Formato esperado del CSV:
//   dni,nombre_completo,telefono,email,frecuencia,notas
//   (la primera fila es encabezado)
//
// Validaciones:
//   - DNI: 7-8 dígitos numéricos
//   - nombre_completo: requerido
//   - telefono: formato +549XXXXXXXXXX (opcional)
//   - frecuencia: entero 1-7 (default 1)
// ============================================================

const fs      = require('fs')
const path    = require('path')
const readline = require('readline')
const { createClient } = require('@supabase/supabase-js')

// Leer .env.local (dotenv es opcional — si no está instalado, usar variables del entorno)
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') })
} catch {
  // dotenv no disponible, continuar con process.env
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CSV_FILE = process.argv[2]

if (!CSV_FILE) {
  console.error('Uso: node scripts/import-csv.js <archivo.csv>')
  process.exit(1)
}

if (!fs.existsSync(CSV_FILE)) {
  console.error(`Archivo no encontrado: ${CSV_FILE}`)
  process.exit(1)
}

// ============================================================
// Validaciones
// ============================================================

function validateDni(dni) {
  const clean = String(dni).replace(/\D/g, '')
  if (clean.length < 7 || clean.length > 8) return { ok: false, error: `DNI inválido (debe tener 7-8 dígitos): ${dni}` }
  return { ok: true, value: clean }
}

function validatePhone(phone) {
  if (!phone || phone.trim() === '') return { ok: true, value: null }
  const clean = String(phone).replace(/[\s\-\(\)]/g, '')
  // Aceptar +549XXXXXXXXXX o 11XXXXXXXX o 15XXXXXXXX
  if (/^\+?549?\d{10}$/.test(clean) || /^(11|15)\d{8}$/.test(clean)) {
    const normalized = clean.startsWith('+') ? clean : `+549${clean.replace(/^(0?54|549?)/, '')}`
    return { ok: true, value: normalized }
  }
  return { ok: false, error: `Teléfono inválido: ${phone}` }
}

function validateFrequency(freq) {
  if (!freq || freq.trim() === '') return { ok: true, value: 1 }
  const n = parseInt(freq)
  if (isNaN(n) || n < 1 || n > 7) return { ok: false, error: `Frecuencia inválida (debe ser 1-7): ${freq}` }
  return { ok: true, value: n }
}

// ============================================================
// Parsear CSV
// ============================================================

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines   = content.split('\n').filter(l => l.trim() !== '')
  const header  = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/[^a-z_]/g, ''))

  return lines.slice(1).map((line, idx) => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(header.map((h, i) => [h, values[i] ?? '']))
  })
}

// ============================================================
// Main
// ============================================================

async function main() {
  const rows   = parseCsv(CSV_FILE)
  const errors = []
  const valid  = []

  console.log(`\n📂 Leyendo ${rows.length} filas de ${CSV_FILE}...\n`)

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i]
    const lineNo = i + 2  // +1 por header, +1 base 1

    const dniRes  = validateDni(row.dni)
    const phoneRes = validatePhone(row.telefono ?? row.phone ?? '')
    const freqRes = validateFrequency(row.frecuencia ?? row.frequency ?? '')

    if (!row.nombre_completo && !row.full_name) {
      errors.push({ line: lineNo, error: 'Falta nombre_completo' })
      continue
    }

    if (!dniRes.ok)  { errors.push({ line: lineNo, error: dniRes.error  }); continue }
    if (!phoneRes.ok){ errors.push({ line: lineNo, error: phoneRes.error }); continue }
    if (!freqRes.ok) { errors.push({ line: lineNo, error: freqRes.error }); continue }

    valid.push({
      dni:        dniRes.value,
      full_name:  row.nombre_completo ?? row.full_name,
      phone:      phoneRes.value,
      email:      row.email || null,
      frequency:  freqRes.value,
      notes:      row.notas ?? row.notes ?? null,
    })
  }

  // Reporte de errores
  if (errors.length > 0) {
    console.log('⚠️  Filas con errores:')
    errors.forEach(e => console.log(`  Línea ${e.line}: ${e.error}`))
    console.log()
  }

  if (valid.length === 0) {
    console.log('❌ No hay filas válidas para importar.')
    process.exit(1)
  }

  // Confirmar antes de insertar
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise(resolve =>
    rl.question(`✅ ${valid.length} registros válidos. ¿Importar? (s/n): `, resolve)
  )
  rl.close()

  if (answer.toLowerCase() !== 's') {
    console.log('Cancelado.')
    process.exit(0)
  }

  // Insertar en pre_registrations
  let imported = 0
  let skipped  = 0

  for (const record of valid) {
    const { error } = await supabase
      .from('pre_registrations')
      .insert(record)
      .select()

    if (error) {
      if (error.code === '23505') {
        console.log(`  ⚠  DNI ${record.dni} ya existe — omitido`)
        skipped++
      } else {
        console.error(`  ❌ Error insertando DNI ${record.dni}: ${error.message}`)
      }
    } else {
      imported++
      console.log(`  ✓ ${record.full_name} (DNI: ${record.dni})`)
    }
  }

  console.log(`\n📊 Resultado: ${imported} importados, ${skipped} omitidos (duplicados), ${errors.length} errores de validación\n`)
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
