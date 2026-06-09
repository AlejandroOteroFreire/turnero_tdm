// ============================================================
// Worker: WhatsApp Cloud API + Web Push + Lista de espera FIFO
// Puerto: 3001
// ============================================================

const express   = require('express')
const { createClient } = require('@supabase/supabase-js')
const webpush   = require('web-push')
const { Redis } = require('@upstash/redis')

const app = express()
app.use(express.json())

// Supabase service client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Redis (Upstash en prod, local en dev)
const redis = process.env.REDIS_URL?.startsWith('redis://')
  ? new Redis({ url: process.env.REDIS_URL })
  : new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })

// Web Push VAPID
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Timeout de oferta de lista de espera (minutos)
const WAITLIST_TIMEOUT_MINUTES = parseInt(process.env.WAITLIST_TIMEOUT_MINUTES ?? '30')

// ============================================================
// WEBHOOK META — verificación
// ============================================================
app.get('/webhooks/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode']
  const token     = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[WA] Webhook verificado')
    res.status(200).send(challenge)
  } else {
    res.sendStatus(403)
  }
})

// ============================================================
// WEBHOOK META — mensajes entrantes (respuestas SI/NO)
// ============================================================
app.post('/webhooks/whatsapp', async (req, res) => {
  res.sendStatus(200)  // responder rápido a Meta

  try {
    const entry = req.body?.entry?.[0]
    const changes = entry?.changes?.[0]
    if (!changes?.value?.messages) return

    for (const message of changes.value.messages) {
      if (message.type !== 'text') continue

      const from = message.from   // número de teléfono remitente
      const text = message.text?.body?.trim().toUpperCase()
      const msgId = message.id

      console.log(`[WA] Mensaje de ${from}: "${text}"`)

      if (text === 'SI' || text === 'SÍ' || text === 'NO') {
        await handleWaitlistResponse(from, text.startsWith('S'))
      }
    }
  } catch (err) {
    console.error('[WA] Error procesando webhook:', err)
  }
})

// ============================================================
// POST /waitlist/process — al liberarse un cupo
// ============================================================
app.post('/waitlist/process', async (req, res) => {
  const { instance_id } = req.body
  if (!instance_id) return res.status(400).json({ error: 'Falta instance_id' })

  try {
    await processWaitlist(instance_id)
    res.json({ ok: true })
  } catch (err) {
    console.error('[Waitlist] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// POST /notify/booking-confirmed — notificar reserva confirmada
// ============================================================
app.post('/notify/booking-confirmed', async (req, res) => {
  const { booking_id } = req.body
  if (!booking_id) return res.status(400).json({ error: 'Falta booking_id' })

  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('player_id, instance_id, slot_instances(date, training_slots(start_time, label))')
      .eq('id', booking_id)
      .single()

    if (!booking) return res.status(404).json({ error: 'Booking no encontrado' })

    const inst  = booking.slot_instances
    const slot  = inst?.training_slots
    const label = slot?.label ?? slot?.start_time?.slice(0, 5) ?? 'turno'
    const date  = inst?.date ?? ''

    await notifyPlayer(booking.player_id, 'booking_confirmed', {
      text:     `✅ Reserva confirmada para el *${label}* del ${formatDate(date)}.\n\nLink: ${process.env.APP_URL}/mis-turnos`,
      title:    'Reserva confirmada',
      body:     `${label} — ${formatDate(date)}`,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Notify] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// POST /notify/slot-cancelled — cancelación de turno
// ============================================================
app.post('/notify/slot-cancelled', async (req, res) => {
  const { instance_id, reason } = req.body

  try {
    // Obtener todos los jugadores con reserva en el turno
    const { data: bookings } = await supabase
      .from('bookings')
      .select('player_id, instance_id, slot_instances(date, training_slots(label))')
      .eq('instance_id', instance_id)
      .in('status', ['confirmed', 'waitlisted'])

    const inst  = bookings?.[0]?.slot_instances
    const label = inst?.training_slots?.label ?? 'turno'
    const date  = inst?.date ?? ''

    for (const b of bookings ?? []) {
      await notifyPlayer(b.player_id, 'slot_cancelled', {
        text:  `⚠️ El *${label}* del ${formatDate(date)} fue cancelado.\n${reason ? `Motivo: ${reason}` : ''}`,
        title: 'Turno cancelado',
        body:  `${label} — ${formatDate(date)}`,
      })
    }

    res.json({ ok: true, notified: bookings?.length ?? 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// LÓGICA: procesar lista de espera FIFO
// ============================================================
async function processWaitlist(instance_id) {
  // Obtener disponibilidad actual
  const { data: avail } = await supabase
    .from('slot_instance_availability')
    .select('available_spots, instance_status')
    .eq('instance_id', instance_id)
    .single()

  if (!avail || avail.available_spots <= 0 || avail.instance_status !== 'active') return

  // Obtener siguiente en lista de espera
  const { data: rows } = await supabase
    .rpc('get_next_waitlisted', { p_instance_id: instance_id })

  if (!rows || rows.length === 0) {
    // Nadie en lista → broadcast al grupo + favoritos
    await broadcastOpenSpot(instance_id)
    return
  }

  const { booking_id, player_id, phone } = rows[0]

  // Crear oferta en BD
  const expiresAt = new Date(Date.now() + WAITLIST_TIMEOUT_MINUTES * 60 * 1000).toISOString()
  const redisKey  = `waitlist_offer:${booking_id}`

  const { data: offer } = await supabase
    .from('waitlist_offers')
    .insert({
      booking_id,
      instance_id,
      player_id,
      expires_at: expiresAt,
      redis_key:  redisKey,
    })
    .select()
    .single()

  // Guardar en Redis con TTL
  await redis.set(redisKey, JSON.stringify({ offer_id: offer.id, booking_id, instance_id, player_id }), {
    ex: WAITLIST_TIMEOUT_MINUTES * 60,
  })

  // Obtener info del turno
  const { data: inst } = await supabase
    .from('slot_instances')
    .select('date, training_slots(label, start_time)')
    .eq('id', instance_id)
    .single()

  const label   = inst?.training_slots?.label ?? inst?.training_slots?.start_time?.slice(0, 5) ?? 'turno'
  const date    = inst?.date ?? ''
  const appLink = `${process.env.APP_URL}/mis-turnos`

  // Enviar WA si tiene teléfono y opt-in
  if (phone) {
    const waBody = `🏓 *¡Hay un cupo disponible!*\n\nTurno: *${label}* — ${formatDate(date)}\n\nRespondé *SI* para confirmar o *NO* para rechazar.\n⏱ Tenés ${WAITLIST_TIMEOUT_MINUTES} minutos.\n\nLink: ${appLink}`
    const msgId  = await sendWhatsApp(phone, waBody)

    if (msgId) {
      await supabase
        .from('waitlist_offers')
        .update({ wa_message_id: msgId })
        .eq('id', offer.id)
    }
  }

  // También enviar web push
  await notifyPlayer(player_id, 'waitlist_offer', {
    title: '¡Cupo disponible!',
    body:  `${label} — ${formatDate(date)}. Tenés ${WAITLIST_TIMEOUT_MINUTES} min para confirmar.`,
  })

  // Setear job para expirar la oferta
  setTimeout(() => expireOffer(offer.id, instance_id, redisKey), WAITLIST_TIMEOUT_MINUTES * 60 * 1000)

  console.log(`[Waitlist] Oferta enviada a player ${player_id} para instancia ${instance_id}`)
}

// ============================================================
// Procesar respuesta SI/NO del jugador por WhatsApp
// ============================================================
async function handleWaitlistResponse(phone, accepted) {
  // Buscar oferta pendiente para este número
  const { data: player } = await supabase
    .from('user_accounts')
    .select('id')
    .eq('phone', phone)
    .single()

  if (!player) return console.log(`[WA] Jugador no encontrado para teléfono ${phone}`)

  const { data: offer } = await supabase
    .from('waitlist_offers')
    .select('id, booking_id, instance_id, redis_key')
    .eq('player_id', player.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('offered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!offer) return console.log(`[WA] Sin oferta activa para player ${player.id}`)

  if (accepted) {
    await confirmWaitlistOffer(offer)
  } else {
    await rejectWaitlistOffer(offer)
  }
}

async function confirmWaitlistOffer(offer) {
  // Verificar que el cupo sigue disponible
  const { data: avail } = await supabase
    .from('slot_instance_availability')
    .select('available_spots')
    .eq('instance_id', offer.instance_id)
    .single()

  if (!avail || avail.available_spots <= 0) {
    await supabase.from('waitlist_offers').update({ status: 'expired' }).eq('id', offer.id)
    await redis.del(offer.redis_key)
    console.log(`[Waitlist] Cupo ya ocupado cuando quiso confirmar offer ${offer.id}`)
    return
  }

  // Confirmar booking
  await supabase
    .from('bookings')
    .update({ status: 'confirmed', waitlist_pos: null })
    .eq('id', offer.booking_id)

  await supabase
    .from('waitlist_offers')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', offer.id)

  await redis.del(offer.redis_key)

  console.log(`[Waitlist] Oferta ${offer.id} aceptada`)

  // Notificar confirmación
  const { data: booking } = await supabase
    .from('bookings')
    .select('player_id')
    .eq('id', offer.booking_id)
    .single()

  if (booking) {
    await notifyPlayer(booking.player_id, 'booking_confirmed', {
      title: '¡Reserva confirmada!',
      body:  'Tu lugar fue confirmado.',
      text:  `✅ ¡Confirmado! Tenés tu lugar reservado.\nLink: ${process.env.APP_URL}/mis-turnos`,
    })
  }
}

async function rejectWaitlistOffer(offer) {
  await supabase
    .from('waitlist_offers')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', offer.id)

  await redis.del(offer.redis_key)

  console.log(`[Waitlist] Oferta ${offer.id} rechazada — procesando siguiente`)

  // Pasar al siguiente
  await processWaitlist(offer.instance_id)
}

async function expireOffer(offerId, instance_id, redisKey) {
  const exists = await redis.exists(redisKey)
  if (!exists) return  // Ya fue respondida

  await supabase
    .from('waitlist_offers')
    .update({ status: 'expired' })
    .eq('id', offerId)

  await redis.del(redisKey)

  console.log(`[Waitlist] Oferta ${offerId} expirada — procesando siguiente`)

  await processWaitlist(instance_id)
}

// ============================================================
// Broadcast cuando nadie está en lista de espera
// ============================================================
async function broadcastOpenSpot(instance_id) {
  const { data: inst } = await supabase
    .from('slot_instances')
    .select('slot_id, date, training_slots(label, start_time)')
    .eq('id', instance_id)
    .single()

  if (!inst) return

  const label  = inst.training_slots?.label ?? inst.training_slots?.start_time?.slice(0, 5) ?? 'turno'
  const date   = inst?.date ?? ''
  const text   = `🏓 ¡Hay un cupo libre en el *${label}* del ${formatDate(date)}!\n${process.env.APP_URL}/calendario`

  // 1. WA al grupo del club
  const groupId = process.env.META_WHATSAPP_GROUP_ID
  if (groupId) {
    await sendWhatsApp(groupId, text)
  }

  // 2. WA individual a jugadores con ese slot como favorito y con opt-in
  const { data: favPlayers } = await supabase
    .from('favorite_slots')
    .select('player_id, user_accounts!inner(phone, wa_opt_in)')
    .eq('slot_id', inst.slot_id)
    .eq('user_accounts.wa_opt_in', true)

  for (const fp of favPlayers ?? []) {
    const phone = fp.user_accounts?.phone
    if (phone) {
      await sendWhatsApp(phone, `🔔 *Favorito disponible:* ${text}`)
    }
  }

  console.log(`[Broadcast] Cupo libre notificado para instancia ${instance_id}`)
}

// ============================================================
// HELPERS: WhatsApp Cloud API
// ============================================================
async function sendWhatsApp(to, text) {
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.log(`[WA-DEV] Para: ${to} | Mensaje: ${text}`)
    return null
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text, preview_url: false },
        }),
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(data))
    return data.messages?.[0]?.id ?? null
  } catch (err) {
    console.error('[WA] Error enviando mensaje:', err.message)
    return null
  }
}

// ============================================================
// HELPERS: Web Push
// ============================================================
async function notifyPlayer(playerId, eventType, { title, body, text }) {
  try {
    // Obtener suscripciones push del jugador
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('player_id', playerId)

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body })
        )
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('endpoint', sub.endpoint)
      } catch (e) {
        if (e.statusCode === 410) {
          // Suscripción inválida — eliminar
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }

    // También enviar WA si aplica
    if (text) {
      const { data: account } = await supabase
        .from('user_accounts')
        .select('phone, wa_opt_in')
        .eq('id', playerId)
        .single()

      if (account?.wa_opt_in && account.phone) {
        await sendWhatsApp(account.phone, text)
      }
    }
  } catch (err) {
    console.error(`[Notify] Error notificando player ${playerId}:`, err)
  }
}

// ============================================================
// HELPERS: Formato de fecha
// ============================================================
function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} de ${months[parseInt(m) - 1]}`
}

// ============================================================
// Health check
// ============================================================
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`[Worker] Escuchando en puerto ${PORT}`))
