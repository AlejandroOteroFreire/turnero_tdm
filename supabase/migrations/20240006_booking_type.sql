-- Migración 006: Tipo de booking para distinguir plan fijo vs reservas manuales
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'auto'
    CHECK (type IN ('auto', 'manual_extra', 'manual_cancel_recovery'));

COMMENT ON COLUMN bookings.type IS
  'auto=generado por plan fijo, manual_extra=reserva puntual extra, manual_cancel_recovery=recupero de clase';
