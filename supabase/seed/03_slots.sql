-- ============================================================
-- Seed 03: Turnos de entrenamiento + instancias + historial
-- Horarios reales del club:
--   Lun–Jue : 16:30–18:30 / 18:30–20:15 / 20:15–22:00
--   Viernes : 17:00–19:00
--   Sábado  : 10:00–11:30 / 11:30–13:30
-- ============================================================

DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';

    -- IDs fijos para poder referenciar en el historial
    v_lun_1 UUID := 'a0000000-0000-0000-0000-000000000001';
    v_lun_2 UUID := 'a0000000-0000-0000-0000-000000000002';
    v_lun_3 UUID := 'a0000000-0000-0000-0000-000000000003';
    v_mar_1 UUID := 'a0000000-0000-0000-0000-000000000004';
    v_mar_2 UUID := 'a0000000-0000-0000-0000-000000000005';
    v_mar_3 UUID := 'a0000000-0000-0000-0000-000000000006';
    v_mie_1 UUID := 'a0000000-0000-0000-0000-000000000007';
    v_mie_2 UUID := 'a0000000-0000-0000-0000-000000000008';
    v_mie_3 UUID := 'a0000000-0000-0000-0000-000000000009';
    v_jue_1 UUID := 'a0000000-0000-0000-0000-000000000010';
    v_jue_2 UUID := 'a0000000-0000-0000-0000-000000000011';
    v_jue_3 UUID := 'a0000000-0000-0000-0000-000000000012';
    v_vie_1 UUID := 'a0000000-0000-0000-0000-000000000013';
    v_sab_1 UUID := 'a0000000-0000-0000-0000-000000000014';
    v_sab_2 UUID := 'a0000000-0000-0000-0000-000000000015';

    v_week_start DATE;
    v_day_offset INTEGER;
    w INTEGER;
    s RECORD;
    v_instance_id UUID;
    i INTEGER;
    v_active_players UUID[];
    v_booking_status booking_status;
    v_attendance_status attendance_status;
BEGIN
    -- --------------------------------------------------------
    -- Turnos semanales recurrentes
    -- --------------------------------------------------------
    INSERT INTO training_slots (id, day_of_week, start_time, end_time, capacity, label, created_by) VALUES
    -- Lunes
    (v_lun_1, 'monday',    '16:30', '18:30', 8,  'Lunes 16:30',     v_admin_id),
    (v_lun_2, 'monday',    '18:30', '20:15', 8,  'Lunes 18:30',     v_admin_id),
    (v_lun_3, 'monday',    '20:15', '22:00', 8,  'Lunes 20:15',     v_admin_id),
    -- Martes
    (v_mar_1, 'tuesday',   '16:30', '18:30', 8,  'Martes 16:30',    v_admin_id),
    (v_mar_2, 'tuesday',   '18:30', '20:15', 8,  'Martes 18:30',    v_admin_id),
    (v_mar_3, 'tuesday',   '20:15', '22:00', 8,  'Martes 20:15',    v_admin_id),
    -- Miércoles
    (v_mie_1, 'wednesday', '16:30', '18:30', 8,  'Miércoles 16:30', v_admin_id),
    (v_mie_2, 'wednesday', '18:30', '20:15', 8,  'Miércoles 18:30', v_admin_id),
    (v_mie_3, 'wednesday', '20:15', '22:00', 8,  'Miércoles 20:15', v_admin_id),
    -- Jueves
    (v_jue_1, 'thursday',  '16:30', '18:30', 8,  'Jueves 16:30',    v_admin_id),
    (v_jue_2, 'thursday',  '18:30', '20:15', 8,  'Jueves 18:30',    v_admin_id),
    (v_jue_3, 'thursday',  '20:15', '22:00', 8,  'Jueves 20:15',    v_admin_id),
    -- Viernes
    (v_vie_1, 'friday',    '17:00', '19:00', 8,  'Viernes 17:00',   v_admin_id),
    -- Sábado
    (v_sab_1, 'saturday',  '10:00', '11:30', 8,  'Sábado 10:00',    v_admin_id),
    (v_sab_2, 'saturday',  '11:30', '13:30', 12, 'Sábado 11:30',    v_admin_id)
    ON CONFLICT (id) DO NOTHING;

    -- Jugadores activos para el historial de reservas
    v_active_players := ARRAY[
        '00000000-0000-0000-0000-000000000002'::UUID,  -- profe
        '00000000-0000-0000-0000-000000000003'::UUID,  -- colaborador
        '00000000-0000-0000-0000-000000000004'::UUID,  -- jugador1
        '00000000-0000-0000-0000-000000000005'::UUID,  -- jugador2
        '00000000-0000-0000-0000-000000000006'::UUID,  -- jugador3
        '00000000-0000-0000-0000-000000000101'::UUID,
        '00000000-0000-0000-0000-000000000102'::UUID,
        '00000000-0000-0000-0000-000000000103'::UUID,
        '00000000-0000-0000-0000-000000000104'::UUID,
        '00000000-0000-0000-0000-000000000105'::UUID,
        '00000000-0000-0000-0000-000000000106'::UUID,
        '00000000-0000-0000-0000-000000000107'::UUID,
        '00000000-0000-0000-0000-000000000108'::UUID
    ];

    -- --------------------------------------------------------
    -- Instancias futuras (próximas 4 semanas)
    -- --------------------------------------------------------
    PERFORM generate_slot_instances(4);

    -- --------------------------------------------------------
    -- Historial: 8 semanas pasadas
    -- --------------------------------------------------------
    FOR w IN 1..8 LOOP
        v_week_start := date_trunc('week', CURRENT_DATE)::DATE - (w * 7);

        FOR s IN SELECT * FROM training_slots WHERE is_active = TRUE LOOP
            v_day_offset := CASE s.day_of_week
                WHEN 'monday'    THEN 0 WHEN 'tuesday'   THEN 1
                WHEN 'wednesday' THEN 2 WHEN 'thursday'  THEN 3
                WHEN 'friday'    THEN 4 WHEN 'saturday'  THEN 5
            END;

            INSERT INTO slot_instances (id, slot_id, date, status)
            VALUES (uuid_generate_v4(), s.id, v_week_start + v_day_offset, 'active')
            ON CONFLICT (slot_id, date) DO NOTHING
            RETURNING id INTO v_instance_id;

            IF v_instance_id IS NULL THEN
                SELECT id INTO v_instance_id FROM slot_instances
                WHERE slot_id = s.id AND date = v_week_start + v_day_offset;
            END IF;

            FOR i IN 1..LEAST(array_length(v_active_players, 1), s.capacity) LOOP
                v_booking_status := CASE
                    WHEN random() < 0.05 THEN 'cancelled_late'
                    WHEN random() < 0.08 THEN 'no_show'
                    ELSE 'confirmed'
                END;

                v_attendance_status := CASE v_booking_status
                    WHEN 'confirmed'      THEN 'present'
                    WHEN 'no_show'        THEN 'no_show'
                    WHEN 'cancelled_late' THEN 'cancelled_late'
                    ELSE 'present'
                END;

                INSERT INTO bookings (instance_id, player_id, status, booked_at)
                VALUES (v_instance_id, v_active_players[i], v_booking_status,
                        (v_week_start + v_day_offset - INTERVAL '2 days'))
                ON CONFLICT (instance_id, player_id) DO NOTHING;

                INSERT INTO attendance (instance_id, player_id, status, marked_by, marked_at)
                VALUES (v_instance_id, v_active_players[i], v_attendance_status, v_admin_id,
                        (v_week_start + v_day_offset + INTERVAL '1 hour')::TIMESTAMPTZ)
                ON CONFLICT (instance_id, player_id) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
