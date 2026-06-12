-- Permite a cada usuario autenticado leer su propia fila en user_accounts.
-- Sin esto, la política admin (que hace subquery a la misma tabla) causa
-- un problema circular y bloquea todas las lecturas.
CREATE POLICY "Users can read own account"
  ON user_accounts FOR SELECT TO authenticated
  USING (id = auth.uid());
