-- ============================================================
-- Seed 07: registration_requests de ejemplo
-- Jugador pending: Teodoro Iglesias (índice 20 en 02_players.sql)
-- ============================================================

DO $$
DECLARE
  v_pending_id UUID;
  v_slots      UUID[];
BEGIN
  -- Obtener el jugador con status pending
  SELECT id INTO v_pending_id
  FROM user_accounts
  WHERE status = 'pending'
  LIMIT 1;

  IF v_pending_id IS NULL THEN
    RAISE NOTICE 'No hay jugadores pending — saltando seed 07';
    RETURN;
  END IF;

  -- Verificar que no tenga ya una solicitud
  IF EXISTS (SELECT 1 FROM registration_requests WHERE player_id = v_pending_id) THEN
    RAISE NOTICE 'El jugador ya tiene registration_request — saltando seed 07';
    RETURN;
  END IF;

  -- Obtener slots activos
  SELECT ARRAY_AGG(id ORDER BY day_of_week, start_time) INTO v_slots
  FROM training_slots
  WHERE is_active = TRUE;

  IF array_length(v_slots, 1) < 4 THEN
    RAISE NOTICE 'No hay suficientes slots activos — saltando seed 07';
    RETURN;
  END IF;

  -- Insertar solicitud con 2 días/semana
  INSERT INTO registration_requests (
    player_id,
    days_per_week,
    option_a,
    option_b,
    status
  ) VALUES (
    v_pending_id,
    2,
    ARRAY[v_slots[1], v_slots[2]],
    ARRAY[v_slots[3], v_slots[4]],
    'pending'
  );

  RAISE NOTICE 'Seed 07: registration_request creado para jugador %', v_pending_id;
END $$;
