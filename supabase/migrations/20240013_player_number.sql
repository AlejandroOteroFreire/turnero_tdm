-- Número de socio secuencial para URLs limpias (sin UUIDs)
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS player_number SERIAL;

-- Crear índice único
CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_player_number_idx ON user_accounts (player_number);

-- RLS: cualquier admin/colaborador puede leer player_number
-- (ya cubierto por las políticas existentes de user_accounts)
