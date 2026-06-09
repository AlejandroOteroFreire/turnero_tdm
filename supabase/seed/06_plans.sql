-- ============================================================
-- Seed 06: Planes fijos + escenarios de prueba
--
-- Jugadores activos disponibles:
--   Principales : admin(01), profe(02), colab(03), jug1(04), jug2(05), jug3(06)
--   Ficticios   : p01–p08 (activos), p09–p10 (pre_reg → SALTAR),
--                 p11–p19 (activos), p20 (pending), p21–p30 (activos)
--   Total útiles: 6 + 27 = 33
--
-- Escenarios por slot (capacity = 12):
--
--   Lunes 16:30  → 🔴 LLENO + LISTA ESPERA  (14 asig: 12 confirmed, jug1 #1, profe #2)
--   Lunes 18:30  → 🔴 LLENO exacto          (12 asig: jug3 + 11 ficticios)
--   Lunes 20:15  → 🟠 POCO CUPO  (9/12)
--   Martes 16:30 → 🟢 DISPONIBLE (8/12)     (jug1 confirmado aquí)
--   Martes 18:30 → 🟠 POCO CUPO (10/12)     (profe + colab confirmados)
--   Martes 20:15 → 🟢 DISPONIBLE (6/12)
--   Mié 16:30    → 🟡 CASI LLENO (11/12)    (jug2 confirmada)
--   Mié 18:30    → 🟢 DISPONIBLE (8/12)     (profe confirmado)
--   Mié 20:15    → 🟢 DISPONIBLE (5/12)
--   Jue 16:30    → 🟢 DISPONIBLE (7/12)     (colab confirmado)
--   Jue 18:30    → 🟠 POCO CUPO  (9/12)     (jug2 confirmada)
--   Jue 20:15    → 🟢 DISPONIBLE (4/12)
--   Vie 17:00    → 🟢 DISPONIBLE (7/12)     (jug3 confirmado)
--   Sáb 10:00    → 🟠 POCO CUPO (10/12)     (jug3 confirmado)
--   Sáb 11:30    → 🟢 DISPONIBLE (6/12)     (profe confirmado)
-- ============================================================

DO $$
DECLARE
    -- Usuarios principales
    v_admin UUID := '00000000-0000-0000-0000-000000000001';
    v_profe UUID := '00000000-0000-0000-0000-000000000002';
    v_colab UUID := '00000000-0000-0000-0000-000000000003';
    v_jug1  UUID := '00000000-0000-0000-0000-000000000004'; -- Lucas  → waitlisted Lun16, confirmado Mar16
    v_jug2  UUID := '00000000-0000-0000-0000-000000000005'; -- Sofía  → confirmada Mié16 + Jue18
    v_jug3  UUID := '00000000-0000-0000-0000-000000000006'; -- Tomás  → confirmado Lun18 + Vie + Sáb

    -- Slots
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

    -- Lunes de esta semana como base de valid_from
    v_start DATE := date_trunc('week', CURRENT_DATE)::DATE;

BEGIN

    -- ============================================================
    -- LUNES 16:30 → LLENO + LISTA DE ESPERA
    -- 12 ficticios primero → confirmed; jug1 y profe → waitlisted
    -- generate_auto_bookings ordena por created_at ASC
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (('00000000-0000-0000-0000-0000000001' || '01')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '02')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '03')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '04')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '05')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '06')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '07')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '08')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '11')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '12')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '13')::UUID, v_lun_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '14')::UUID, v_lun_1, v_start)
    ON CONFLICT DO NOTHING;
    PERFORM pg_sleep(0.05);  -- asegura created_at posterior
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_jug1,  v_lun_1, v_start),   -- Lucas  → waitlisted #1
    (v_profe, v_lun_1, v_start)    -- Profe  → waitlisted #2
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- LUNES 18:30 → LLENO exacto (12/12)
    -- jug3 entre los primeros → CONFIRMADO
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_jug3,  v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '15')::UUID, v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '16')::UUID, v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '17')::UUID, v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '18')::UUID, v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '19')::UUID, v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '21')::UUID, v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '22')::UUID, v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '23')::UUID, v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '24')::UUID, v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '25')::UUID, v_lun_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '26')::UUID, v_lun_2, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- LUNES 20:15 → POCO CUPO (9/12)
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_colab, v_lun_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '01')::UUID, v_lun_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '02')::UUID, v_lun_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '03')::UUID, v_lun_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '04')::UUID, v_lun_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '27')::UUID, v_lun_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '28')::UUID, v_lun_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '29')::UUID, v_lun_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '30')::UUID, v_lun_3, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- MARTES 16:30 → DISPONIBLE (8/12)
    -- jug1 aquí → CONFIRMADO (su segundo slot en el plan)
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_jug1,  v_mar_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '05')::UUID, v_mar_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '06')::UUID, v_mar_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '07')::UUID, v_mar_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '08')::UUID, v_mar_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '13')::UUID, v_mar_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '14')::UUID, v_mar_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '15')::UUID, v_mar_1, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- MARTES 18:30 → POCO CUPO (10/12)
    -- profe + colab confirmados
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_profe, v_mar_2, v_start),
    (v_colab, v_mar_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '16')::UUID, v_mar_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '17')::UUID, v_mar_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '18')::UUID, v_mar_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '19')::UUID, v_mar_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '21')::UUID, v_mar_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '22')::UUID, v_mar_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '23')::UUID, v_mar_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '24')::UUID, v_mar_2, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- MARTES 20:15 → DISPONIBLE (6/12)
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (('00000000-0000-0000-0000-0000000001' || '25')::UUID, v_mar_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '26')::UUID, v_mar_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '27')::UUID, v_mar_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '28')::UUID, v_mar_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '29')::UUID, v_mar_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '30')::UUID, v_mar_3, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- MIÉRCOLES 16:30 → CASI LLENO (11/12)
    -- jug2 confirmada — queda 1 spot libre
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_jug2,  v_mie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '01')::UUID, v_mie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '02')::UUID, v_mie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '03')::UUID, v_mie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '04')::UUID, v_mie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '05')::UUID, v_mie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '06')::UUID, v_mie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '07')::UUID, v_mie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '08')::UUID, v_mie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '11')::UUID, v_mie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '12')::UUID, v_mie_1, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- MIÉRCOLES 18:30 → DISPONIBLE (8/12)
    -- profe confirmado
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_profe, v_mie_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '13')::UUID, v_mie_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '14')::UUID, v_mie_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '15')::UUID, v_mie_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '16')::UUID, v_mie_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '17')::UUID, v_mie_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '18')::UUID, v_mie_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '19')::UUID, v_mie_2, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- MIÉRCOLES 20:15 → DISPONIBLE (5/12)
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (('00000000-0000-0000-0000-0000000001' || '21')::UUID, v_mie_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '22')::UUID, v_mie_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '23')::UUID, v_mie_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '24')::UUID, v_mie_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '25')::UUID, v_mie_3, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- JUEVES 16:30 → DISPONIBLE (7/12)
    -- colab confirmado
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_colab, v_jue_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '26')::UUID, v_jue_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '27')::UUID, v_jue_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '28')::UUID, v_jue_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '29')::UUID, v_jue_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '30')::UUID, v_jue_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '01')::UUID, v_jue_1, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- JUEVES 18:30 → POCO CUPO (9/12)
    -- jug2 confirmada
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_jug2,  v_jue_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '02')::UUID, v_jue_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '03')::UUID, v_jue_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '04')::UUID, v_jue_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '05')::UUID, v_jue_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '06')::UUID, v_jue_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '07')::UUID, v_jue_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '08')::UUID, v_jue_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '11')::UUID, v_jue_2, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- JUEVES 20:15 → DISPONIBLE (4/12)
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (('00000000-0000-0000-0000-0000000001' || '12')::UUID, v_jue_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '13')::UUID, v_jue_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '14')::UUID, v_jue_3, v_start),
    (('00000000-0000-0000-0000-0000000001' || '15')::UUID, v_jue_3, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- VIERNES 17:00 → DISPONIBLE (7/12)
    -- jug3 confirmado
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_jug3,  v_vie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '16')::UUID, v_vie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '17')::UUID, v_vie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '18')::UUID, v_vie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '19')::UUID, v_vie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '21')::UUID, v_vie_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '22')::UUID, v_vie_1, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- SÁBADO 10:00 → POCO CUPO (10/12)
    -- jug3 confirmado
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_jug3,  v_sab_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '23')::UUID, v_sab_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '24')::UUID, v_sab_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '25')::UUID, v_sab_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '26')::UUID, v_sab_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '27')::UUID, v_sab_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '28')::UUID, v_sab_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '29')::UUID, v_sab_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '30')::UUID, v_sab_1, v_start),
    (('00000000-0000-0000-0000-0000000001' || '01')::UUID, v_sab_1, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- SÁBADO 11:30 → DISPONIBLE (6/12)
    -- profe confirmado
    -- ============================================================
    INSERT INTO slot_assignments (player_id, slot_id, valid_from) VALUES
    (v_profe, v_sab_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '02')::UUID, v_sab_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '03')::UUID, v_sab_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '04')::UUID, v_sab_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '05')::UUID, v_sab_2, v_start),
    (('00000000-0000-0000-0000-0000000001' || '06')::UUID, v_sab_2, v_start)
    ON CONFLICT DO NOTHING;

    -- ============================================================
    -- Generar instancias y bookings
    -- 4 semanas; ORDER BY created_at en la función garantiza
    -- que los 12 primeros asignados sean confirmed y el resto waitlisted
    -- ============================================================
    PERFORM generate_slot_instances(4);
    PERFORM generate_auto_bookings(4);

    -- ============================================================
    -- Solicitudes de cambio de plan
    -- ============================================================

    -- PENDIENTE: Lucas quiere dejar Lunes 16:30 (donde está en espera)
    -- y sumar Miércoles 18:30, desde la próxima semana
    INSERT INTO plan_change_requests (
        id, player_id,
        slots_to_drop, slots_to_add,
        proposed_start_date, status
    ) VALUES (
        'b0000000-0000-0000-0000-000000000001',
        v_jug1,
        ARRAY[v_lun_1],
        ARRAY[v_mie_2],
        date_trunc('week', CURRENT_DATE + 7)::DATE,
        'pending'
    ) ON CONFLICT DO NOTHING;

    -- APROBADA: Sofía agregó Sábado 11:30 hace 2 semanas
    INSERT INTO plan_change_requests (
        id, player_id,
        slots_to_drop, slots_to_add,
        proposed_start_date, status,
        reviewed_by, reviewed_at, admin_notes
    ) VALUES (
        'b0000000-0000-0000-0000-000000000002',
        v_jug2,
        ARRAY[]::UUID[],
        ARRAY[v_sab_2],
        v_start - 14,
        'approved',
        v_admin,
        NOW() - INTERVAL '12 days',
        'Aprobado. Cupo disponible.'
    ) ON CONFLICT DO NOTHING;

    -- RECHAZADA: Tomás pidió Lunes 16:30 pero estaba lleno
    INSERT INTO plan_change_requests (
        id, player_id,
        slots_to_drop, slots_to_add,
        proposed_start_date, status,
        reviewed_by, reviewed_at, admin_notes
    ) VALUES (
        'b0000000-0000-0000-0000-000000000003',
        v_jug3,
        ARRAY[]::UUID[],
        ARRAY[v_lun_1],
        v_start,
        'rejected',
        v_admin,
        NOW() - INTERVAL '5 days',
        'Slot lleno. Te podemos anotar en lista de espera si preferís.'
    ) ON CONFLICT DO NOTHING;

END $$;
