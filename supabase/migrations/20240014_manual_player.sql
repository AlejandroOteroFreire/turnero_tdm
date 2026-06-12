-- ============================================================
-- Migración 014: Jugadores sin cuenta (alta manual por admin)
-- ============================================================

-- 1. player_profiles: user_id nullable + nuevos campos
ALTER TABLE player_profiles
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS nickname    TEXT,
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS first_name  TEXT,
  ADD COLUMN IF NOT EXISTS last_name   TEXT;

-- 2. slot_assignments: profile_id para jugadores sin user_accounts
ALTER TABLE slot_assignments
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE;

ALTER TABLE slot_assignments
  ALTER COLUMN player_id DROP NOT NULL;

-- Al menos uno de los dos debe estar presente
ALTER TABLE slot_assignments
  ADD CONSTRAINT slot_assignments_player_or_profile
  CHECK (player_id IS NOT NULL OR profile_id IS NOT NULL);

-- Índice para buscar por profile_id
CREATE INDEX IF NOT EXISTS idx_assignments_profile ON slot_assignments(profile_id);
