-- ============================================================
-- SEED DE PRUEBA — Turnero TDM
-- Para usar en Supabase Cloud (entorno de testing externo)
-- Todos los usuarios tienen contraseña: password123
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Usuarios en auth.users ─────────────────────────────────
-- El trigger handle_new_auth_user crea user_accounts automáticamente

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, instance_id
) VALUES
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
    'profe@tdm.com', crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Martínez"}',
    false, '00000000-0000-0000-0000-000000000000'),

  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
    'lucas.silva@gmail.com', crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Lucas Silva"}',
    false, '00000000-0000-0000-0000-000000000000'),

  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
    'ana.gomez@hotmail.com', crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Ana Gómez"}',
    false, '00000000-0000-0000-0000-000000000000'),

  ('00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
    'martin.lopez@gmail.com', crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Martín López"}',
    false, '00000000-0000-0000-0000-000000000000'),

  ('00000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
    'sofia.ramos@gmail.com', crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Sofía Ramos"}',
    false, '00000000-0000-0000-0000-000000000000'),

  ('00000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated',
    'diego.fernandez@outlook.com', crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Diego Fernández"}',
    false, '00000000-0000-0000-0000-000000000000'),

  -- Pendiente de aprobación
  ('00000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated',
    'nuevo.jugador@gmail.com', crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Roberto Díaz"}',
    false, '00000000-0000-0000-0000-000000000000'),

  -- Suspendido
  ('00000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated',
    'suspendido@gmail.com', crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Pablo Torres"}',
    false, '00000000-0000-0000-0000-000000000000')

ON CONFLICT (id) DO NOTHING;

-- ── 2. Completar user_accounts ────────────────────────────────
-- El trigger los crea como 'pending', los actualizamos al estado correcto

UPDATE user_accounts SET display_name='Carlos Martínez', dni='20111111', phone='+5491133330001',
  roles=ARRAY['player','admin']::user_role[], status='active', wa_opt_in=true
WHERE id='00000000-0000-0000-0000-000000000001';

UPDATE user_accounts SET display_name='Lucas Silva', dni='30222222', phone='+5491133330002',
  status='active', wa_opt_in=true
WHERE id='00000000-0000-0000-0000-000000000002';

UPDATE user_accounts SET display_name='Ana Gómez', dni='32333333', phone='+5491133330003',
  status='active', wa_opt_in=true
WHERE id='00000000-0000-0000-0000-000000000003';

UPDATE user_accounts SET display_name='Martín López', dni='28444444', phone='+5491133330004',
  status='active', wa_opt_in=false
WHERE id='00000000-0000-0000-0000-000000000004';

UPDATE user_accounts SET display_name='Sofía Ramos', dni='35555555', phone='+5491133330005',
  status='active', wa_opt_in=true
WHERE id='00000000-0000-0000-0000-000000000005';

UPDATE user_accounts SET display_name='Diego Fernández', dni='27666666', phone='+5491133330006',
  status='active', wa_opt_in=false
WHERE id='00000000-0000-0000-0000-000000000006';

UPDATE user_accounts SET display_name='Roberto Díaz', dni='41777777', phone='+5491133330007',
  status='pending'
WHERE id='00000000-0000-0000-0000-000000000007';

UPDATE user_accounts SET display_name='Pablo Torres', dni='25888888', phone='+5491133330008',
  status='suspended'
WHERE id='00000000-0000-0000-0000-000000000008';

-- ── 3. Perfiles de jugadores ──────────────────────────────────

INSERT INTO player_profiles (user_id, full_name, dni, birth_date, phone, frequency, medical_cert, joined_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Carlos Martínez', '20111111', '1975-03-15', '+5491133330001', 3, true,  '2023-01-10'),
  ('00000000-0000-0000-0000-000000000002', 'Lucas Silva',     '30222222', '1990-07-22', '+5491133330002', 2, true,  '2023-03-05'),
  ('00000000-0000-0000-0000-000000000003', 'Ana Gómez',       '32333333', '1992-11-08', '+5491133330003', 3, true,  '2023-04-12'),
  ('00000000-0000-0000-0000-000000000004', 'Martín López',    '28444444', '1987-05-30', '+5491133330004', 2, false, '2023-06-01'),
  ('00000000-0000-0000-0000-000000000005', 'Sofía Ramos',     '35555555', '1995-09-14', '+5491133330005', 3, true,  '2023-08-20'),
  ('00000000-0000-0000-0000-000000000006', 'Diego Fernández', '27666666', '1985-02-28', '+5491133330006', 1, true,  '2024-01-15'),
  ('00000000-0000-0000-0000-000000000007', 'Roberto Díaz',    '41777777', '2000-12-01', '+5491133330007', 2, false, CURRENT_DATE),
  ('00000000-0000-0000-0000-000000000008', 'Pablo Torres',    '25888888', '1982-04-17', '+5491133330008', 1, false, '2023-02-01')
ON CONFLICT (user_id) DO NOTHING;

-- ── 4. Pre-registraciones (sin cuenta aún) ────────────────────

INSERT INTO pre_registrations (dni, full_name, phone, email, frequency, claimed) VALUES
  ('38100001', 'Valentina Cruz',  '+5491155550001', 'vale.cruz@gmail.com',   2, false),
  ('33100002', 'Hernán Castillo', '+5491155550002', 'hernan.c@hotmail.com',  3, false),
  ('29100003', 'Gabriela Moreno', '+5491155550003', 'gabi.moreno@gmail.com', 1, false)
ON CONFLICT (dni) DO NOTHING;

-- ── 5. Turnos de entrenamiento (exportados del sistema real) ──

INSERT INTO training_slots (id, day_of_week, start_time, end_time, label, capacity, is_active, created_by) VALUES
  ('d22a53bc-b377-4be0-84bf-213caeca0033', 'monday',    '08:00:00', '09:30:00', NULL,              11, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'monday',    '16:30:00', '18:30:00', 'Lunes 16:30',     14, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'monday',    '18:30:00', '20:15:00', 'Lunes 18:30',     12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'monday',    '20:15:00', '22:00:00', 'Lunes 20:15',     12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', 'tuesday',   '16:30:00', '18:30:00', 'Martes 16:30',    12, false, '00000000-0000-0000-0000-000000000001'),
  ('542f69ad-44a1-45cf-98f1-a81ff01f4fcf', 'tuesday',   '16:30:00', '18:30:00', 'Martes 1630',     14, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000005', 'tuesday',   '18:30:00', '20:15:00', 'Martes 18:30',    12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000006', 'tuesday',   '20:15:00', '22:00:00', 'Martes 20:15',    12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000007', 'wednesday', '16:30:00', '18:30:00', 'Miércoles 16:30', 12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000008', 'wednesday', '18:30:00', '20:15:00', 'Miércoles 18:30', 12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000009', 'wednesday', '20:15:00', '22:00:00', 'Miércoles 20:15', 12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000010', 'thursday',  '16:30:00', '18:30:00', 'Jueves 16:30',    12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000011', 'thursday',  '18:30:00', '20:15:00', 'Jueves 18:30',    12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000012', 'thursday',  '20:15:00', '22:00:00', 'Jueves 20:15',    12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000013', 'friday',    '17:00:00', '19:00:00', 'Viernes 17:00',   12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000014', 'saturday',  '10:00:00', '11:30:00', 'Sábado 10:00',    12, true,  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000015', 'saturday',  '11:30:00', '13:30:00', 'Sábado 11:30',    12, true,  '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── 6. Plan fijo de los jugadores activos ─────────────────────

INSERT INTO slot_assignments (slot_id, player_id, valid_from, valid_until) VALUES
  -- Lucas: lunes 18:30 y miércoles 18:30
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', CURRENT_DATE - 30, NULL),
  ('a0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', CURRENT_DATE - 30, NULL),
  -- Ana: lunes, miércoles y viernes 16:30/17:00
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 60, NULL),
  ('a0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 60, NULL),
  ('a0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000003', CURRENT_DATE - 60, NULL),
  -- Martín: martes y jueves 18:30
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 90, NULL),
  ('a0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000004', CURRENT_DATE - 90, NULL),
  -- Sofía: lunes 20:15, miércoles 20:15 y sábado 10:00
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 45, NULL),
  ('a0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 45, NULL),
  ('a0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000005', CURRENT_DATE - 45, NULL),
  -- Diego: sábado 11:30
  ('a0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000006', CURRENT_DATE - 15, NULL)
ON CONFLICT DO NOTHING;

-- ── 7. Historial de pagos ─────────────────────────────────────

INSERT INTO payments (player_id, type, amount, period_month, period_year, paid_at, registered_by, notes) VALUES
  -- Lucas: al día (pagó mes actual y anterior)
  ('00000000-0000-0000-0000-000000000002', 'monthly', 8000,
    EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
    CURRENT_DATE, '00000000-0000-0000-0000-000000000001', 'Método: efectivo.'),
  ('00000000-0000-0000-0000-000000000002', 'monthly', 8000,
    EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::int,
    EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::int,
    CURRENT_DATE - 30, '00000000-0000-0000-0000-000000000001', 'Método: transferencia.'),
  -- Ana: pagó este mes
  ('00000000-0000-0000-0000-000000000003', 'monthly', 8000,
    EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
    CURRENT_DATE - 5, '00000000-0000-0000-0000-000000000001', 'Método: efectivo.'),
  -- Martín: debe el mes actual (solo pagó el anterior)
  ('00000000-0000-0000-0000-000000000004', 'monthly', 8000,
    EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::int,
    EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::int,
    CURRENT_DATE - 35, '00000000-0000-0000-0000-000000000001', 'Método: transferencia.'),
  -- Sofía: pagó este mes
  ('00000000-0000-0000-0000-000000000005', 'monthly', 8000,
    EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
    CURRENT_DATE - 2, '00000000-0000-0000-0000-000000000001', 'Método: efectivo.')
  -- Diego: sin pagos (debe desde que se registró)
ON CONFLICT DO NOTHING;

-- ── 8. Generar instancias de turnos (próximas 4 semanas) ──────

SELECT generate_slot_instances(4);

-- ── Resumen ───────────────────────────────────────────────────
-- Admin:      profe@tdm.com         / password123
-- Activos:    lucas.silva@gmail.com / password123  (Nro. 2)
--             ana.gomez@hotmail.com / password123  (Nro. 3)
--             martin.lopez@gmail.com / password123 (Nro. 4)
--             sofia.ramos@gmail.com / password123  (Nro. 5)
--             diego.fernandez@outlook.com / password123 (Nro. 6)
-- Pendiente:  nuevo.jugador@gmail.com / password123
-- Suspendido: suspendido@gmail.com  / password123
-- Sin cuenta: DNI 38100001, 33100002, 29100003 (para probar registro)
