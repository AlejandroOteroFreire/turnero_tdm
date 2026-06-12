-- Migración 009: vincular player_profiles con user_accounts
-- account_id NULL = jugador pre-cargado sin cuenta aún
-- account_id NOT NULL = jugador con cuenta registrada

ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS account_id UUID UNIQUE REFERENCES user_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS locality   TEXT;

-- Índice para lookup por account_id
CREATE INDEX IF NOT EXISTS idx_player_profiles_account_id ON player_profiles(account_id);
