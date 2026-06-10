-- ============================================================
-- Migración 002: Row Level Security (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE user_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_registrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_slots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_instances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_offers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_slots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_prefs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config            ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPERS
-- ============================================================

-- Rol del usuario actual
CREATE OR REPLACE FUNCTION current_user_roles()
RETURNS user_role[] AS $$
    SELECT roles FROM user_accounts WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT 'admin' = ANY(current_user_roles());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_collaborator_or_admin()
RETURNS BOOLEAN AS $$
    SELECT 'admin' = ANY(current_user_roles())
        OR 'collaborator' = ANY(current_user_roles());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_player()
RETURNS BOOLEAN AS $$
    SELECT 'player' = ANY(current_user_roles());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- user_accounts
-- ============================================================

-- Cada usuario ve su propio registro
CREATE POLICY "users_select_own"
    ON user_accounts FOR SELECT
    USING (id = auth.uid() OR is_collaborator_or_admin());

-- Solo admin puede ver/editar todos; usuario edita su propio registro
CREATE POLICY "users_update_own"
    ON user_accounts FOR UPDATE
    USING (id = auth.uid() OR is_admin())
    WITH CHECK (id = auth.uid() OR is_admin());

-- Solo el trigger (SECURITY DEFINER) inserta
CREATE POLICY "users_insert_trigger"
    ON user_accounts FOR INSERT
    WITH CHECK (id = auth.uid() OR is_admin());

-- ============================================================
-- player_profiles
-- ============================================================

CREATE POLICY "profiles_select"
    ON player_profiles FOR SELECT
    USING (user_id = auth.uid() OR is_collaborator_or_admin());

CREATE POLICY "profiles_insert"
    ON player_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update"
    ON player_profiles FOR UPDATE
    USING (user_id = auth.uid() OR is_admin())
    WITH CHECK (user_id = auth.uid() OR is_admin());

-- ============================================================
-- pre_registrations
-- ============================================================

-- Solo admin y colaborador gestionan pre-registros
CREATE POLICY "pre_reg_select"
    ON pre_registrations FOR SELECT
    USING (is_collaborator_or_admin());

CREATE POLICY "pre_reg_insert"
    ON pre_registrations FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "pre_reg_update"
    ON pre_registrations FOR UPDATE
    USING (is_admin());

-- ============================================================
-- training_slots
-- ============================================================

-- Todos los autenticados ven los slots activos; admin ve todos
CREATE POLICY "slots_select"
    ON training_slots FOR SELECT
    USING (is_active = TRUE OR is_admin());

CREATE POLICY "slots_insert"
    ON training_slots FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "slots_update"
    ON training_slots FOR UPDATE
    USING (is_admin());

CREATE POLICY "slots_delete"
    ON training_slots FOR DELETE
    USING (is_admin());

-- ============================================================
-- slot_instances
-- ============================================================

CREATE POLICY "instances_select"
    ON slot_instances FOR SELECT
    USING (TRUE);  -- Todos los autenticados ven instancias

CREATE POLICY "instances_insert"
    ON slot_instances FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "instances_update"
    ON slot_instances FOR UPDATE
    USING (is_admin());

-- ============================================================
-- slot_assignments
-- ============================================================

-- Jugadores ven sus propias asignaciones; colabs/admins ven todas
CREATE POLICY "assignments_select"
    ON slot_assignments FOR SELECT
    USING (player_id = auth.uid() OR is_collaborator_or_admin());

CREATE POLICY "assignments_insert"
    ON slot_assignments FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "assignments_update"
    ON slot_assignments FOR UPDATE
    USING (is_admin());

CREATE POLICY "assignments_delete"
    ON slot_assignments FOR DELETE
    USING (is_admin());

-- ============================================================
-- bookings
-- ============================================================

-- Jugadores ven sus propias reservas
-- Colaboradores/admins ven todas
CREATE POLICY "bookings_select_player"
    ON bookings FOR SELECT
    USING (player_id = auth.uid() OR is_collaborator_or_admin());

-- Jugador puede reservar para sí mismo
CREATE POLICY "bookings_insert_player"
    ON bookings FOR INSERT
    WITH CHECK (player_id = auth.uid() OR is_collaborator_or_admin());

-- Jugador puede cancelar su propia reserva; admin cualquiera
CREATE POLICY "bookings_update"
    ON bookings FOR UPDATE
    USING (player_id = auth.uid() OR is_collaborator_or_admin());

-- ============================================================
-- waitlist_offers
-- ============================================================

CREATE POLICY "waitlist_offers_select"
    ON waitlist_offers FOR SELECT
    USING (player_id = auth.uid() OR is_collaborator_or_admin());

-- Solo el worker (service_role) inserta/actualiza
CREATE POLICY "waitlist_offers_insert"
    ON waitlist_offers FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "waitlist_offers_update"
    ON waitlist_offers FOR UPDATE
    USING (is_admin() OR player_id = auth.uid());

-- ============================================================
-- attendance
-- ============================================================

CREATE POLICY "attendance_select"
    ON attendance FOR SELECT
    USING (player_id = auth.uid() OR is_collaborator_or_admin());

CREATE POLICY "attendance_insert"
    ON attendance FOR INSERT
    WITH CHECK (is_collaborator_or_admin());

CREATE POLICY "attendance_update"
    ON attendance FOR UPDATE
    USING (is_collaborator_or_admin());

-- ============================================================
-- payments
-- ============================================================

-- Jugadores solo ven sus propios pagos
CREATE POLICY "payments_select"
    ON payments FOR SELECT
    USING (player_id = auth.uid() OR is_collaborator_or_admin());

-- Solo admin/colaborador registra pagos
CREATE POLICY "payments_insert"
    ON payments FOR INSERT
    WITH CHECK (is_collaborator_or_admin());

CREATE POLICY "payments_update"
    ON payments FOR UPDATE
    USING (is_admin());

-- ============================================================
-- favorite_slots
-- ============================================================

CREATE POLICY "favorites_select"
    ON favorite_slots FOR SELECT
    USING (player_id = auth.uid() OR is_collaborator_or_admin());

CREATE POLICY "favorites_insert"
    ON favorite_slots FOR INSERT
    WITH CHECK (player_id = auth.uid());

CREATE POLICY "favorites_delete"
    ON favorite_slots FOR DELETE
    USING (player_id = auth.uid());

-- ============================================================
-- notification_prefs
-- ============================================================

CREATE POLICY "notif_prefs_select"
    ON notification_prefs FOR SELECT
    USING (player_id = auth.uid() OR is_admin());

CREATE POLICY "notif_prefs_insert"
    ON notification_prefs FOR INSERT
    WITH CHECK (player_id = auth.uid() OR is_admin());

CREATE POLICY "notif_prefs_update"
    ON notification_prefs FOR UPDATE
    USING (player_id = auth.uid() OR is_admin());

-- ============================================================
-- notification_defaults
-- ============================================================

CREATE POLICY "notif_defaults_select"
    ON notification_defaults FOR SELECT
    USING (TRUE);  -- Todos ven los defaults

CREATE POLICY "notif_defaults_insert"
    ON notification_defaults FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "notif_defaults_update"
    ON notification_defaults FOR UPDATE
    USING (is_admin());

-- ============================================================
-- push_subscriptions
-- ============================================================

CREATE POLICY "push_subs_select"
    ON push_subscriptions FOR SELECT
    USING (player_id = auth.uid() OR is_admin());

CREATE POLICY "push_subs_insert"
    ON push_subscriptions FOR INSERT
    WITH CHECK (player_id = auth.uid());

CREATE POLICY "push_subs_delete"
    ON push_subscriptions FOR DELETE
    USING (player_id = auth.uid() OR is_admin());

-- ============================================================
-- app_config
-- ============================================================

CREATE POLICY "config_select"
    ON app_config FOR SELECT
    USING (TRUE);  -- Todos ven la config

CREATE POLICY "config_update"
    ON app_config FOR UPDATE
    USING (is_admin());

CREATE POLICY "config_insert"
    ON app_config FOR INSERT
    WITH CHECK (is_admin());

-- ============================================================
-- GRANTs para roles de PostgREST
-- Sin estos, el API REST devuelve "permission denied" aunque existan políticas RLS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon, service_role;

-- Asegura que tablas creadas DESPUÉS también hereden los permisos
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO authenticated, service_role;

-- ============================================================
-- Publicar tablas para Supabase Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE slot_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE waitlist_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
