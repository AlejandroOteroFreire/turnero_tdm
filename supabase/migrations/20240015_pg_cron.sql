-- ============================================================
-- Migración 015: Cron job para generar bookings automáticos
-- ============================================================

-- Habilitar extensión pg_cron (requiere superuser, disponible en Supabase Cloud)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Generar bookings para las próximas 4 semanas, todos los días a las 3am (hora Argentina UTC-3 = 6am UTC)
SELECT cron.schedule(
  'generar-bookings-automaticos',
  '0 6 * * *',
  'SELECT generate_auto_bookings(4)'
);
