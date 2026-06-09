-- ============================================================
-- Seed 04: Pagos — semáforo por jugador
-- 10 al día, 10 deben el mes, 10 deben meses anteriores
-- ============================================================

DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_cur_year  INTEGER := EXTRACT(YEAR  FROM NOW())::INTEGER;
    v_cur_month INTEGER := EXTRACT(MONTH FROM NOW())::INTEGER;
    v_prev_month INTEGER;
    v_prev_year  INTEGER;

    -- Jugadores activos ordenados (30 + 5 principales = usamos los player IDs ficticios)
    -- Al día: players 01-10 tienen pago del mes actual
    -- Deben mes: players 11-20 tienen pago del mes anterior solamente
    -- Deben anteriores: players 21-30 no tienen pagos recientes

    v_player_id UUID;
    i INTEGER;
BEGIN
    v_prev_month := CASE WHEN v_cur_month = 1 THEN 12 ELSE v_cur_month - 1 END;
    v_prev_year  := CASE WHEN v_cur_month = 1 THEN v_cur_year - 1 ELSE v_cur_year END;

    -- AL DÍA: players 01-08 (activos 1x) + jugador1 + jugador2 = 10
    -- Insertar pago del mes actual
    FOR i IN 1..8 LOOP
        v_player_id := ('00000000-0000-0000-0000-0000000001' || LPAD(i::TEXT, 2, '0'))::UUID;
        INSERT INTO payments (player_id, type, amount, period_month, period_year, paid_at, registered_by)
        VALUES (v_player_id, 'monthly', 5000.00, v_cur_month, v_cur_year, CURRENT_DATE, v_admin_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- jugador1 y jugador2 también al día
    INSERT INTO payments (player_id, type, amount, period_month, period_year, paid_at, registered_by)
    VALUES
        ('00000000-0000-0000-0000-000000000004', 'monthly', 5000.00, v_cur_month, v_cur_year, CURRENT_DATE, v_admin_id),
        ('00000000-0000-0000-0000-000000000005', 'monthly', 5000.00, v_cur_month, v_cur_year, CURRENT_DATE, v_admin_id)
    ON CONFLICT DO NOTHING;

    -- DEBEN EL MES: players 11-19 (activos 2x) + colaborador = 10
    -- Solo tienen pago del mes anterior
    FOR i IN 11..19 LOOP
        v_player_id := ('00000000-0000-0000-0000-0000000001' || LPAD(i::TEXT, 2, '0'))::UUID;
        INSERT INTO payments (player_id, type, amount, period_month, period_year, paid_at, registered_by)
        VALUES (v_player_id, 'monthly', 5000.00, v_prev_month, v_prev_year, CURRENT_DATE - 32, v_admin_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- colaborador también debe el mes
    INSERT INTO payments (player_id, type, amount, period_month, period_year, paid_at, registered_by)
    VALUES ('00000000-0000-0000-0000-000000000003', 'monthly', 5000.00, v_prev_month, v_prev_year, CURRENT_DATE - 32, v_admin_id)
    ON CONFLICT DO NOTHING;

    -- DEBEN ANTERIORES: players 21-30 (activos 3x) — sin pagos recientes (ya no insertamos nada)
    -- La vista player_payment_status los detecta automáticamente como 'owes_previous'

END $$;
