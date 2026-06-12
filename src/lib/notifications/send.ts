import { createServiceClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'account_approved'
  | 'account_rejected'
  | 'account_pending'
  | 'booking_cancelled'
  | 'booking_cancelled_late'
  | 'password_reset'
  | 'slot_assigned'

export interface NotificationPayload {
  type:      NotificationType
  recipient: string          // email o teléfono
  subject?:  string
  body:      string
  metadata?: Record<string, unknown>
}

const SUBJECTS: Record<NotificationType, string> = {
  account_approved:        'Tu cuenta fue aprobada — Club Jorge Newbery',
  account_rejected:        'Actualización sobre tu solicitud — Club Jorge Newbery',
  account_pending:         'Solicitud recibida — Club Jorge Newbery',
  booking_cancelled:       'Turno cancelado — Club Jorge Newbery',
  booking_cancelled_late:  'Cancelación tardía registrada — Club Jorge Newbery',
  password_reset:          'Restablecer contraseña — Club Jorge Newbery',
  slot_assigned:           'Turno asignado — Club Jorge Newbery',
}

// Cuerpos de mensaje por defecto para cada tipo
export function buildBody(type: NotificationType, data: Record<string, string> = {}): string {
  const name = data.name ?? 'Jugador'
  switch (type) {
    case 'account_approved':
      return `Hola ${name}, tu cuenta fue aprobada. Ya podés iniciar sesión en el sistema de turnos.`
    case 'account_rejected':
      return `Hola ${name}, tu solicitud de cuenta no pudo ser aprobada. Contactate con el equipo para más información.`
    case 'account_pending':
      return `Hola ${name}, recibimos tu solicitud de registro. El equipo la revisará y recibirás una confirmación a la brevedad.`
    case 'booking_cancelled':
      return `Hola ${name}, tu turno del ${data.date ?? ''} fue cancelado correctamente.`
    case 'booking_cancelled_late':
      return `Hola ${name}, se registró una cancelación tardía para el turno del ${data.date ?? ''}. Recordá cancelar con al menos 2 horas de anticipación.`
    case 'password_reset':
      return `Hola ${name}, se solicitó un restablecimiento de contraseña para tu cuenta.`
    case 'slot_assigned':
      return `Hola ${name}, se te asignó el turno: ${data.slot ?? ''}. Podés verlo en Mi Plan.`
  }
}

/**
 * Registra una notificación en notification_log.
 * Hoy solo persiste (channel='mock'). Cuando se integre email/WhatsApp,
 * esta función llamará al proveedor y actualizará el status.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('notification_log').insert({
      type:      payload.type,
      channel:   'mock',
      recipient: payload.recipient,
      subject:   payload.subject ?? SUBJECTS[payload.type],
      body:      payload.body,
      status:    'pending',
      metadata:  payload.metadata ?? null,
    })
  } catch (err) {
    // No es fatal — la acción principal ya ocurrió
    console.error('[sendNotification] error al registrar:', err)
  }
}
