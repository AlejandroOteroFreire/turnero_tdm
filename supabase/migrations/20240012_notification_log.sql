-- Tabla de log de notificaciones
-- Hoy solo registra (channel='mock'). En producción el worker actualiza status a 'sent'/'failed'.

CREATE TABLE IF NOT EXISTS notification_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type        TEXT        NOT NULL,  -- 'account_approved' | 'account_rejected' | 'booking_cancelled' | 'password_reset' | etc.
  channel     TEXT        NOT NULL DEFAULT 'mock',  -- 'mock' | 'email' | 'whatsapp'
  recipient   TEXT        NOT NULL,  -- email o número de teléfono
  subject     TEXT,
  body        TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed'
  error       TEXT,
  metadata    JSONB                  -- datos extra (player_id, booking_id, etc.)
);

-- Solo admins y colaboradores pueden leer el log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_log_admin_read"
  ON notification_log FOR SELECT
  USING (is_collaborator_or_admin());

-- La app inserta via service role (sin RLS)
