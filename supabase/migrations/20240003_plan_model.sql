-- ============================================================
-- Migración 003: Modelo Plan Fijo + Solicitudes de Cambio
-- ============================================================

-- 1. Nuevo enum booking_type
CREATE TYPE booking_type AS ENUM ('auto', 'manual_extra', 'manual_cancel_recovery');

-- 2. Nuevo enum plan_change_status
CREATE TYPE plan_change_status AS ENUM ('pending', 'approved', 'rejected');

-- 3. Agregar columna type a bookings (default manual_extra para no romper datos existentes)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS type booking_type NOT NULL DEFAULT 'manual_extra';

-- 4. Recrear slot_assignments con nuevo modelo
--    (DROP CASCADE elimina índices y policies viejas)
DROP TABLE IF EXISTS slot_assignments CASCADE;

CREATE TABLE slot_assignments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id   UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    slot_id     UUID NOT NULL REFERENCES training_slots(id) ON DELETE CASCADE,
    valid_from  DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, slot_id, valid_from)
);

CREATE INDEX idx_assignments_player ON slot_assignments(player_id);
CREATE INDEX idx_assignments_slot ON slot_assignments(slot_id);
CREATE INDEX idx_assignments_valid ON slot_assignments(valid_from, valid_until);

ALTER TABLE slot_assignments ENABLE ROW LEVEL SECURITY;

-- Players ven sus propias asignaciones; colabs/admins ven todas
CREATE POLICY "assignments_select" ON slot_assignments FOR SELECT
    USING (player_id = auth.uid() OR is_collaborator_or_admin());
-- Solo admin inserta asignaciones directas; el sistema también puede via SECURITY DEFINER
CREATE POLICY "assignments_insert" ON slot_assignments FOR INSERT
    WITH CHECK (is_admin());
CREATE POLICY "assignments_update" ON slot_assignments FOR UPDATE
    USING (is_admin());
CREATE POLICY "assignments_delete" ON slot_assignments FOR DELETE
    USING (is_admin());

-- 5. Tabla plan_change_requests
CREATE TABLE IF NOT EXISTS plan_change_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    slots_to_drop       UUID[] NOT NULL DEFAULT '{}',
    slots_to_add        UUID[] NOT NULL DEFAULT '{}',
    proposed_start_date DATE NOT NULL,
    status              plan_change_status NOT NULL DEFAULT 'pending',
    reviewed_by         UUID REFERENCES user_accounts(id),
    reviewed_at         TIMESTAMPTZ,
    admin_notes         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_change_player ON plan_change_requests(player_id);
CREATE INDEX idx_plan_change_status ON plan_change_requests(status);

CREATE TRIGGER trg_plan_change_updated_at
    BEFORE UPDATE ON plan_change_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE plan_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_changes_select" ON plan_change_requests FOR SELECT
    USING (player_id = auth.uid() OR is_collaborator_or_admin());
CREATE POLICY "plan_changes_insert" ON plan_change_requests FOR INSERT
    WITH CHECK (player_id = auth.uid());
-- Player puede cancelar su propio request pendiente; admin puede todo
CREATE POLICY "plan_changes_update" ON plan_change_requests FOR UPDATE
    USING (is_admin() OR (player_id = auth.uid() AND status = 'pending'));

-- Publicar para Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE plan_change_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE slot_assignments;

-- 6. Config: auto_approve_plan_change
INSERT INTO app_config (key, value, description) VALUES
    ('auto_approve_plan_change', 'false', 'Aprobar cambios de plan automáticamente sin revisión del admin')
ON CONFLICT (key) DO NOTHING;

-- 7. Función: generar bookings automáticos desde slot_assignments
CREATE OR REPLACE FUNCTION generate_auto_bookings(p_weeks INTEGER DEFAULT 2)
RETURNS INTEGER AS $$
DECLARE
    v_instance    RECORD;
    v_assignment  RECORD;
    v_confirmed   INTEGER;
    v_waitlist_max INTEGER;
    v_count       INTEGER := 0;
BEGIN
    FOR v_instance IN
        SELECT si.id AS instance_id, si.slot_id, si.date, ts.capacity
        FROM slot_instances si
        JOIN training_slots ts ON ts.id = si.slot_id
        WHERE si.date >= CURRENT_DATE
          AND si.date < CURRENT_DATE + (p_weeks * 7)
          AND si.status = 'active'
    LOOP
        FOR v_assignment IN
            SELECT sa.player_id
            FROM slot_assignments sa
            WHERE sa.slot_id = v_instance.slot_id
              AND sa.valid_from <= v_instance.date
              AND (sa.valid_until IS NULL OR sa.valid_until >= v_instance.date)
            ORDER BY sa.valid_from ASC, sa.created_at ASC  -- determinista: primero asignados, primero confirmados
        LOOP
            SELECT COUNT(*) INTO v_confirmed
            FROM bookings
            WHERE instance_id = v_instance.instance_id AND status = 'confirmed';

            SELECT COALESCE(MAX(waitlist_pos), 0) INTO v_waitlist_max
            FROM bookings
            WHERE instance_id = v_instance.instance_id AND status = 'waitlisted';

            INSERT INTO bookings (instance_id, player_id, status, type, waitlist_pos)
            VALUES (
                v_instance.instance_id,
                v_assignment.player_id,
                CASE WHEN v_confirmed >= v_instance.capacity
                     THEN 'waitlisted'::booking_status
                     ELSE 'confirmed'::booking_status END,
                'auto'::booking_type,
                CASE WHEN v_confirmed >= v_instance.capacity
                     THEN v_waitlist_max + 1
                     ELSE NULL END
            )
            ON CONFLICT (instance_id, player_id) DO NOTHING;

            v_count := v_count + 1;
        END LOOP;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. Función: aprobar cambio de plan
CREATE OR REPLACE FUNCTION apply_plan_change(p_request_id UUID, p_reviewed_by UUID)
RETURNS VOID AS $$
DECLARE
    v_req     RECORD;
    v_slot_id UUID;
BEGIN
    SELECT * INTO v_req
    FROM plan_change_requests
    WHERE id = p_request_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud no encontrada o ya procesada';
    END IF;

    -- Cerrar slots a abandonar (valid_until = proposed_start_date - 1 día)
    FOREACH v_slot_id IN ARRAY v_req.slots_to_drop LOOP
        UPDATE slot_assignments
        SET valid_until = v_req.proposed_start_date - INTERVAL '1 day'
        WHERE slot_id = v_slot_id
          AND player_id = v_req.player_id
          AND (valid_until IS NULL OR valid_until >= v_req.proposed_start_date);
    END LOOP;

    -- Agregar nuevos slots
    FOREACH v_slot_id IN ARRAY v_req.slots_to_add LOOP
        INSERT INTO slot_assignments (player_id, slot_id, valid_from)
        VALUES (v_req.player_id, v_slot_id, v_req.proposed_start_date)
        ON CONFLICT (player_id, slot_id, valid_from) DO NOTHING;
    END LOOP;

    -- Marcar como aprobada
    UPDATE plan_change_requests
    SET status = 'approved',
        reviewed_by = p_reviewed_by,
        reviewed_at = NOW()
    WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
