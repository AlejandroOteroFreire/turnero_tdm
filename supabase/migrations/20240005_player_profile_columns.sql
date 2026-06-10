-- Migración 005: Columnas adicionales en player_profiles
-- Nombre/apellido separados, apodo, localidad, códigos deportivos

ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS name           TEXT,
  ADD COLUMN IF NOT EXISTS lastname       TEXT,
  ADD COLUMN IF NOT EXISTS nickname       TEXT,
  ADD COLUMN IF NOT EXISTS locality       TEXT,
  ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS tmt_code       TEXT,
  ADD COLUMN IF NOT EXISTS fetemba_code   TEXT;

-- GRANTs para PostgREST
GRANT SELECT, INSERT, UPDATE ON player_profiles TO authenticated;
GRANT SELECT ON player_profiles TO anon;
