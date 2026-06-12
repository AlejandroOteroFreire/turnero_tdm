import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendNotification, buildBody } from '@/lib/notifications/send'

const PUBLIC_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!
const INTERNAL_URL = process.env.SUPABASE_INTERNAL_URL ?? PUBLIC_URL

function internalFetch(url: string | URL | Request, init?: RequestInit) {
  const rewritten = typeof url === 'string'
    ? url.replace(PUBLIC_URL, INTERNAL_URL)
    : url instanceof URL
      ? new URL(url.toString().replace(PUBLIC_URL, INTERNAL_URL))
      : url
  return fetch(rewritten, init)
}

export async function POST(req: Request) {
  const {
    dni, name, lastname, nickname, birthDate, locality,
    phone, email, password, preRegId,
    daysPerWeek, optionA, optionB,
  } = await req.json()

  if (!email || !password || !name || !lastname || !dni) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    PUBLIC_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: internalFetch },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          )
        },
      },
    }
  )

  const displayName = `${name} ${lastname}`.trim()

  // Crear cuenta en auth (GoTrue — no pasa por PostgREST, no afecta JWT issue)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: displayName } },
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Error al crear la cuenta' },
      { status: 400 }
    )
  }

  if (preRegId) {
    // Jugador pre-cargado: usar función SECURITY DEFINER para evitar conflicto de DNI
    // y activar la cuenta en un solo paso. La sesión ya está activa (signUp la setea),
    // por lo que este RPC usa el JWT del usuario recién creado.
    const { error: rpcError } = await supabase.rpc('claim_pre_registration', {
      p_pre_reg_id:   preRegId,
      p_dni:          dni,
      p_display_name: displayName,
      p_phone:        phone ?? '',
    })

    if (rpcError) {
      console.error('[register] claim_pre_registration error:', rpcError.message)
      // No es fatal — la cuenta quedó creada, el admin puede completar los datos
    }

    // Crear player_profile (no existía para pre-registrados)
    await supabase.from('player_profiles').insert({
      user_id:        authData.user.id,
      full_name:      displayName,
      dni,
      name,
      lastname,
      nickname:       nickname  || null,
      birth_date:     birthDate || null,
      locality:       locality  || null,
      phone:          phone     || null,
      phone_whatsapp: phone     || null,
      frequency:      1,
      medical_cert:   false,
    })

    // Guardar preferencias de turnos si se enviaron
    if (daysPerWeek && optionA?.length && optionB?.length) {
      await supabase.from('registration_requests').insert({
        player_id:    authData.user.id,
        days_per_week: daysPerWeek,
        option_a:     optionA,
        option_b:     optionB,
        status:       'pending',
      })
    }

    await sendNotification({
      type:      'account_approved',
      recipient: email,
      body:      buildBody('account_approved', { name: displayName }),
      metadata:  { player_id: authData.user.id },
    })

    return NextResponse.json({ ok: true, preRegistered: true })
  }

  // Nuevo jugador desconocido → trigger ya creó user_accounts con status='pending'
  // Completamos los datos faltantes usando el JWT de sesión recién creado
  await supabase
    .from('user_accounts')
    .update({ dni, display_name: displayName, phone: phone ?? null, status: 'pending' })
    .eq('id', authData.user.id)

  await supabase.from('player_profiles').insert({
    user_id:        authData.user.id,
    full_name:      displayName,
    dni,
    name,
    lastname,
    nickname:       nickname  || null,
    birth_date:     birthDate || null,
    locality:       locality  || null,
    phone:          phone     || null,
    phone_whatsapp: phone     || null,
    frequency:      1,
    medical_cert:   false,
  })

  // Guardar preferencias de turnos
  if (daysPerWeek && optionA?.length && optionB?.length) {
    await supabase.from('registration_requests').insert({
      player_id:    authData.user.id,
      days_per_week: daysPerWeek,
      option_a:     optionA,
      option_b:     optionB,
      status:       'pending',
    })
  }

  await sendNotification({
    type:      'account_pending',
    recipient: email,
    body:      buildBody('account_pending', { name: displayName }),
    metadata:  { player_id: authData.user.id },
  })

  return NextResponse.json({ ok: true, preRegistered: false })
}
