-- ============================================================
-- Seed 03: Turnos de entrenamiento + instancias + historial
-- ============================================================

DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';

    -- IDs de slots
    v_slot_lun_m UUID := 'a0000000-0000-0000-0000-000000000001';
    v_slot_lun_t UUID := 'a0000000-0000-0000-0000-000000000002';
    v_slot_mar_m UUID := 'a0000000-0000-0000-0000-000000000003';
    v_slot_mar_t UUID := 'a0000000-0000-0000-0000-000000000004';
    v_slot_mie_m UUID := 'a0000000-0000-0000-0000-000000000005';
    v_slot_mie_t UUID := 'a0000000-0000-0000-0000-000000000006';
    v_slot_jue_m UUID := 'a0000000-0000-0000-0000-000000000007';
    v_slot_jue_t UUID := 'a0000000-0000-0000-0000-000000000008';
    v_slot_vie_m UUID := 'a0000000-0000-0000-0000-000000000009';
    v_slot_vie_t UUID := 'a0000000-0000-0000-0000-000000000010';
    v_slot_sab   UUID := 'a0000000-0000-0000-0000-000000000011';

    v_week_start DATE;
    v_day_offset INTEGER;
    w INTEGER;
    s RECORD;
    v_instance_id UUID;
    v_player_id UUID;
    i INTEGER;
    v_players UUID[];
    v_active_players UUID[];
    v_booking_status booking_status;
    v_attendance_status attendance_status;
BEGIN
    -- --------------------------------------------------------
    -- Turnos semanales recurrentes
    -- --------------------------------------------------------
    INSERT INTO training_slots (id, day_of_week, start_time, end_time, capacity, label, created_by) VALUES
    (v_slot_lun_m, 'monday',    '08:00', '09:30', 8,  'Lunes Mañana',       v_admin_id),
    (v_slot_lun_t, 'monday',    '18:00', '19:30', 8,  'Lunes Tarde',        v_admin_id),
    (v_slot_mar_m, 'tuesday',   '08:00', '09:30', 8,  'Martes Mañana',      v_admin_id),
    (v_slot_mar_t, 'tuesday',   '18:00', '19:30', 10, 'Martes Tarde',       v_admin_id),
    (v_slot_mie_m, 'wednesday', '08:00', '09:30', 8,  'Miércoles Mañana',   v_admin_id),
    (v_slot_mie_t, 'wednesday', '18:00', '19:30', 8,  'Miércoles Tarde',    v_admin_id),
    (v_slot_jue_m, 'thursday',  '08:00', '09:30', 8,  'Jueves Mañana',      v_admin_id),
    (v_slot_jue_t, 'thursday',  '18:00', '19:30', 10, 'Jueves Tarde',       v_admin_id),
    (v_slot_vie_m, 'friday',    '08:00', '09:30', 8,  'Viernes Mañana',     v_admin_id),
    (v_slot_vie_t, 'friday',    '18:00', '19:30', 8,  'Viernes Tarde',      v_admin_id),
    (v_slot_sab,   'saturday',  '09:00', '11:00', 12, 'Sábado Abierto',     v_admin_id)
    ON CONFLICT (id) DO NOTHING;

    -- Jugadores activos (IDs 01-08 de 1x + 11-19 de 2x + 21-30 de 3x + profe + colab + jugadores demo)
    v_active_players := ARRAY[
        '00000000-0000-0000-0000-000000000002'::UUID,  -- profe
        '00000000-0000-0000-0000-000000000003'::UUID,  -- colaborador
        '00000000-0000-0000-0000-000000000004'::UUID,  -- jugador1 (1x)
        '00000000-0000-0000-0000-000000000005'::UUID,  -- jugador2 (2x)
        '00000000-0000-0000-0000-000000000006'::UUID,  -- jugador3 (3x)
        '00000000-0000-0000-0000-000000000101'::UUID,  -- player01 (1x activo)
        '00000000-0000-0000-0000-000000000102'::UUID,
        '00000000-0000-0000-0000-000000000103'::UUID,
        '00000000-0000-0000-0000-000000000104'::UUID,
        '00000000-0000-0000-0000-000000000105'::UUID,
        '00000000-0000-0000-0000-000000000106'::UUID,
        '00000000-0000-0000-0000-000000000107'::UUID,
        '00000000-0000-0000-0000-000000000108'::UUID   -- player08 (último 1x activo)
    ];

    -- --------------------------------------------------------
    -- Generar instancias para las próximas 4 semanas
    -- --------------------------------------------------------
    PERFORM generate_slot_instances(4);

    -- --------------------------------------------------------
    -- Historial: 8 semanas pasadas de instancias + bookings + asistencia
    -- --------------------------------------------------------
    FOR w IN 1..8 LOOP
        v_week_start := date_trunc('week', CURRENT_DATE)::DATE - (w * 7);

        FOR s IN SELECT * FROM training_slots WHERE is_active = TRUE LOOP
            v_day_offset := CASE s.day_of_week
                WHEN 'monday'    THEN 0 WHEN 'tuesday'   THEN 1
                WHEN 'wednesday' THEN 2 WHEN 'thursday'  THEN 3
                WHEN 'friday'    THEN 4 WHEN 'saturday'  THEN 5
            END;

            -- Crear instancia pasada
            INSERT INTO slot_instances (id, slot_id, date, status)
            VALUES (
                uuid_generate_v4(),
                s.id,
                v_week_start + v_day_offset,
                'active'
            )
            ON CONFLICT (slot_id, date) DO NOTHING
            RETURNING id INTO v_instance_id;

            IF v_instance_id IS NULL THEN
                SELECT id INTO v_instance_id FROM slot_instances
                WHERE slot_id = s.id AND date = v_week_start + v_day_offset;
            END IF;

            -- Agregar bookings para algunos jugadores (simulación simple)
            -- Hasta capacity o cantidad de activos, lo que sea menor
            FOR i IN 1..LEAST(array_length(v_active_players, 1), s.capacity) LOOP
                -- Simular asistencia con cierta aleatoriedad
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
                VALUES (
                    v_instance_id,
                    v_active_players[i],
                    v_booking_status,
                    (v_week_start + v_day_offset - INTERVAL '2 days')
                )
                ON CONFLICT (instance_id, player_id) DO NOTHING;

                -- Registrar asistencia
                INSERT INTO attendance (instance_id, player_id, status, marked_by, marked_at)
                VALUES (
                    v_instance_id,
                    v_active_players[i],
                    v_attendance_status,
                    v_admin_id,
                    (v_week_start + v_day_offset + INTERVAL '1 hour')::TIMESTAMPTZ
                )
                ON CONFLICT (instance_id, player_id) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
