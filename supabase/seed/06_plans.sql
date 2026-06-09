-- ============================================================
-- Seed 06: Planes fijos + solicitudes de cambio de plan
-- ============================================================
DO $$
DECLARE
    v_admin_id    UUID := '00000000-0000-0000-0000-000000000001';
    v_jugador1    UUID := '00000000-0000-0000-0000-000000000004'; -- Lucas
    v_jugador2    UUID := '00000000-0000-0000-0000-000000000005'; -- Sofía
    v_jugador3    UUID := '00000000-0000-0000-0000-000000000006'; -- Tomás
    v_profe       UUID := '00000000-0000-0000-0000-000000000002';
    v_colab       UUID := '00000000-0000-0000-0000-000000000003';

    -- Slot IDs
    v_lun_1 UUID := 'a0000000-0000-0000-0000-000000000001';
    v_lun_2 UUID := 'a0000000-0000-0000-0000-000000000002';
    v_mar_1 UUID := 'a0000000-0000-0000-0000-000000000004';
    v_mar_2 UUID := 'a0000000-0000-0000-0000-000000000005';
    v_mie_1 UUID := 'a0000000-0000-0000-0000-000000000007';
    v_mie_2 UUID := 'a0000000-0000-0000-0000-000000000008';
    v_jue_1 UUID := 'a0000000-0000-0000-0000-000000000010';
    v_jue_2 UUID := 'a0000000-0000-0000-0000-000000000011';
    v_vie_1 UUID := 'a0000000-0000-0000-0000-000000000013';
    v_sab_1 UUID := 'a0000000-0000-0000-0000-000000000014';
    v_sab_2 UUID := 'a0000000-0000-0000-0000-000000000015';

    v_start DATE := date_trunc('week', CURRENT_DATE)::DATE; -- lunes de esta semana
BEGIN
    -- --------------------------------------------------------
    -- Planes fijos actuales
    -- --------------------------------------------------------

    -- Lucas: Lunes 16:30 + Martes 16:30
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_jugador1, v_lun_1, v_start),
    (v_jugador1, v_mar_1, v_start)
    ON CONFLICT DO NOTHING;

    -- Sofía: Miércoles 16:30 + Jueves 18:30
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_jugador2, v_mie_1, v_start),
    (v_jugador2, v_jue_2, v_start)
    ON CONFLICT DO NOTHING;

    -- Tomás: Lunes 18:30 + Viernes 17:00 + Sábado 10:00
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_jugador3, v_lun_2, v_start),
    (v_jugador3, v_vie_1, v_start),
    (v_jugador3, v_sab_1, v_start)
    ON CONFLICT DO NOTHING;

    -- Profe: Lunes 16:30 + Miércoles 18:30 + Sábado 11:30
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_profe, v_lun_1, v_start),
    (v_profe, v_mie_2, v_start),
    (v_profe, v_sab_2, v_start)
    ON CONFLICT DO NOTHING;

    -- Colab: Martes 18:30 + Jueves 16:30
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_colab, v_mar_2, v_start),
    (v_colab, v_jue_1, v_start)
    ON CONFLICT DO NOTHING;

    -- Jugadores extra: distribuir en varios slots
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    ('00000000-0000-0000-0000-000000000101', v_lun_1,  v_start),
    ('00000000-0000-0000-0000-000000000101', v_mie_1,  v_start),
    ('00000000-0000-0000-0000-000000000102', v_lun_2,  v_start),
    ('00000000-0000-0000-0000-000000000102', v_jue_1,  v_start),
    ('00000000-0000-0000-0000-000000000103', v_mar_1,  v_start),
    ('00000000-0000-0000-0000-000000000103', v_vie_1,  v_start),
    ('00000000-0000-0000-0000-000000000104', v_mie_2,  v_start),
    ('00000000-0000-0000-0000-000000000104', v_sab_1,  v_start),
    ('00000000-0000-0000-0000-000000000105', v_lun_1,  v_start),
    ('00000000-0000-0000-0000-000000000105', v_jue_2,  v_start),
    ('00000000-0000-0000-0000-000000000106', v_mar_2,  v_start),
    ('00000000-0000-0000-0000-000000000106', v_sab_2,  v_start),
    ('00000000-0000-0000-0000-000000000107', v_lun_1,  v_start),
    ('00000000-0000-0000-0000-000000000107', v_mie_1,  v_start),
    ('00000000-0000-0000-0000-000000000108', v_mar_1,  v_start),
    ('00000000-0000-0000-0000-000000000108', v_vie_1,  v_start)
    ON CONFLICT DO NOTHING;

    -- --------------------------------------------------------
    -- Generar instancias y bookings para las próximas 2 semanas
    -- --------------------------------------------------------
    PERFORM generate_slot_instances(2);
    PERFORM generate_auto_bookings(2);

    -- --------------------------------------------------------
    -- plan_change_requests de prueba
    -- --------------------------------------------------------

    -- Solicitud PENDIENTE: Lucas quiere dejar Martes 16:30 y agregar Jueves 16:30
    INSERT INTO plan_change_requests (
        id, player_id, slots_to_drop, slots_to_add,
        proposed_start_date, status
    ) VALUES (
        'b0000000-0000-0000-0000-000000000001',
        v_jugador1,
        ARRAY[v_mar_1],
        ARRAY[v_jue_1],
        date_trunc('week', CURRENT_DATE + 7)::DATE,
        'pending'
    )
    ON CONFLICT DO NOTHING;

    -- Solicitud APROBADA: Sofía agregó Sábado 11:30 (ya aplicada)
    INSERT INTO plan_change_requests (
        id, player_id, slots_to_drop, slots_to_add,
        proposed_start_date, status, reviewed_by, reviewed_at, admin_notes
    ) VALUES (
        'b0000000-0000-0000-0000-000000000002',
        v_jugador2,
        ARRAY[]::UUID[],
        ARRAY[v_sab_2],
        v_start - 14,
        'approved',
        v_admin_id,
        NOW() - INTERVAL '10 days',
        'Aprobado sin observaciones'
    )
    ON CONFLICT DO NOTHING;

END $$;
