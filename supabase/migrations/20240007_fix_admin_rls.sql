-- Helper: comprueba si el usuario autenticado tiene rol 'admin'
-- Se usa en WITH CHECK y USING de todas las políticas admin.

-- ── player_profiles ────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin full access on player_profiles"  ON player_profiles;
DROP POLICY IF EXISTS "Players can update own profile"        ON player_profiles;

CREATE POLICY "Admin full access on player_profiles"
  ON player_profiles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  );

CREATE POLICY "Players can update own profile"
  ON player_profiles FOR UPDATE TO authenticated
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── training_slots ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin full access on training_slots"    ON training_slots;
DROP POLICY IF EXISTS "Authenticated can read active slots"    ON training_slots;

CREATE POLICY "Admin full access on training_slots"
  ON training_slots FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  );

CREATE POLICY "Authenticated can read active slots"
  ON training_slots FOR SELECT TO authenticated
  USING (is_active = true);

-- ── slot_assignments ───────────────────────────────────────────
DROP POLICY IF EXISTS "Admin full access on slot_assignments"  ON slot_assignments;

CREATE POLICY "Admin full access on slot_assignments"
  ON slot_assignments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  );

-- ── user_accounts (admin puede cambiar status de cualquier cuenta) ──
DROP POLICY IF EXISTS "Admin full access on user_accounts" ON user_accounts;

CREATE POLICY "Admin full access on user_accounts"
  ON user_accounts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts ua
      WHERE ua.id = auth.uid()
        AND ua.roles @> ARRAY['admin']::text[]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts ua
      WHERE ua.id = auth.uid()
        AND ua.roles @> ARRAY['admin']::text[]
    )
  );

-- ── bookings (admin puede cancelar cualquier booking) ─────────
DROP POLICY IF EXISTS "Admin full access on bookings" ON bookings;

CREATE POLICY "Admin full access on bookings"
  ON bookings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  );

-- ── payments (admin puede registrar y leer pagos) ─────────────
DROP POLICY IF EXISTS "Admin full access on payments" ON payments;

CREATE POLICY "Admin full access on payments"
  ON payments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  );

-- ── app_config (admin puede leer y escribir configuración) ────
DROP POLICY IF EXISTS "Admin full access on app_config" ON app_config;
DROP POLICY IF EXISTS "Authenticated can read app_config" ON app_config;

CREATE POLICY "Admin full access on app_config"
  ON app_config FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = auth.uid()
        AND user_accounts.roles @> ARRAY['admin']::text[]
    )
  );

CREATE POLICY "Authenticated can read app_config"
  ON app_config FOR SELECT TO authenticated
  USING (true);
