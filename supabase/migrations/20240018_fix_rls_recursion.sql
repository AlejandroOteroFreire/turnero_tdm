-- Reemplaza todas las políticas admin que causaban recursión infinita.
-- La función is_admin() debe ser SECURITY DEFINER para bypassear RLS
-- cuando verifica el rol del usuario actual.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_accounts
    WHERE id = auth.uid()
      AND roles @> ARRAY['admin']::user_role[]
  );
$$;

CREATE OR REPLACE FUNCTION is_collaborator_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_accounts
    WHERE id = auth.uid()
      AND (roles @> ARRAY['admin']::user_role[] OR roles @> ARRAY['collaborator']::user_role[])
  );
$$;

-- Reemplazar políticas admin en user_accounts usando is_admin()
DROP POLICY IF EXISTS "Admin full access on user_accounts" ON user_accounts;
CREATE POLICY "Admin full access on user_accounts"
  ON user_accounts FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Reemplazar políticas admin en player_profiles
DROP POLICY IF EXISTS "Admin full access on player_profiles" ON player_profiles;
CREATE POLICY "Admin full access on player_profiles"
  ON player_profiles FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Reemplazar políticas admin en training_slots
DROP POLICY IF EXISTS "Admin full access on training_slots" ON training_slots;
CREATE POLICY "Admin full access on training_slots"
  ON training_slots FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Reemplazar políticas admin en slot_assignments
DROP POLICY IF EXISTS "Admin full access on slot_assignments" ON slot_assignments;
CREATE POLICY "Admin full access on slot_assignments"
  ON slot_assignments FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Reemplazar políticas admin en bookings
DROP POLICY IF EXISTS "Admin full access on bookings" ON bookings;
CREATE POLICY "Admin full access on bookings"
  ON bookings FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Reemplazar políticas admin en payments
DROP POLICY IF EXISTS "Admin full access on payments" ON payments;
CREATE POLICY "Admin full access on payments"
  ON payments FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Reemplazar políticas admin en app_config
DROP POLICY IF EXISTS "Admin full access on app_config" ON app_config;
CREATE POLICY "Admin full access on app_config"
  ON app_config FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
