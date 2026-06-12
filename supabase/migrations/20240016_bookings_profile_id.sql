-- ============================================================
-- Migración 016: Soporte de jugadores manuales en bookings y attendance
-- ============================================================

-- 1. bookings: player_id nullable + profile_id
ALTER TABLE bookings
  ALTER COLUMN player_id DROP NOT NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_player_or_profile
  CHECK (player_id IS NOT NULL OR profile_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_bookings_profile ON bookings(profile_id);

-- 2. attendance: player_id nullable + profile_id
ALTER TABLE attendance
  ALTER COLUMN player_id DROP NOT NULL;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_player_or_profile
  CHECK (player_id IS NOT NULL OR profile_id IS NOT NULL);

-- Unique constraint actualizado para soportar ambos tipos
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_instance_id_player_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_idx
  ON attendance (instance_id, COALESCE(player_id::text, profile_id::text));

-- 3. Actualizar generate_auto_bookings para incluir jugadores manuales
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
            SELECT sa.player_id, sa.profile_id
            FROM slot_assignments sa
            WHERE sa.slot_id = v_instance.slot_id
              AND sa.valid_from <= v_instance.date
              AND (sa.valid_until IS NULL OR sa.valid_until >= v_instance.date)
            ORDER BY sa.valid_from ASC, sa.created_at ASC
        LOOP
            SELECT COUNT(*) INTO v_confirmed
            FROM bookings
            WHERE instance_id = v_instance.instance_id AND status = 'confirmed';

            SELECT COALESCE(MAX(waitlist_pos), 0) INTO v_waitlist_max
            FROM bookings
            WHERE instance_id = v_instance.instance_id AND status = 'waitlisted';

            INSERT INTO bookings (instance_id, player_id, profile_id, status, type, waitlist_pos)
            VALUES (
                v_instance.instance_id,
                v_assignment.player_id,
                v_assignment.profile_id,
                CASE WHEN v_confirmed >= v_instance.capacity
                     THEN 'waitlisted'::booking_status
                     ELSE 'confirmed'::booking_status END,
                'auto'::booking_type,
                CASE WHEN v_confirmed >= v_instance.capacity
                     THEN v_waitlist_max + 1
                     ELSE NULL END
            )
            ON CONFLICT DO NOTHING;

            v_count := v_count + 1;
        END LOOP;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
