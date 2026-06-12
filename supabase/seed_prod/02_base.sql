-- ============================================================
-- PASO 2: Configuración + Usuario admin + Turnos reales
-- ============================================================

-- ── Configuración ─────────────────────────────────────────

INSERT INTO app_config (key, value, description) VALUES
  ('waitlist_timeout_minutes', '30',    'Minutos para responder oferta de lista de espera'),
  ('late_cancel_hours',        '2',     'Horas antes del turno que define cancelación tardía'),
  ('cancel_cutoff_hours',      '2',     'Horas límite para cancelación normal'),
  ('booking_window_days',      '7',     'Días de anticipación para reservas extra'),
  ('waitlist_offer_minutes',   '30',    'Minutos para confirmar cupo liberado'),
  ('default_slot_capacity',    '10',    'Cupo default para nuevos turnos'),
  ('auto_approve_plan_change', 'false', 'Cambios de plan requieren aprobación del admin')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── Usuario admin ──────────────────────────────────────────

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, role, aud, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  'a1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@newbery.com',
  crypt('password123', gen_salt('bf')),
  NOW(), 'authenticated', 'authenticated', NOW(), NOW(),
  '{"provider":"email","providers":["email"]}', '{}', false
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = NOW();

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
VALUES (
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',
  'admin@newbery.com',
  'email',
  '{"sub":"a1000000-0000-0000-0000-000000000001","email":"admin@newbery.com"}',
  NOW(), NOW(), NOW()
)
ON CONFLICT (provider_id, provider) DO NOTHING;

INSERT INTO user_accounts (id, email, display_name, roles, status) VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'admin@newbery.com',
  'Administrador',
  ARRAY['admin','collaborator']::user_role[],
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  roles = EXCLUDED.roles,
  status = EXCLUDED.status;

-- ── Turnos reales ──────────────────────────────────────────

INSERT INTO training_slots (id, day_of_week, start_time, end_time, label, capacity, is_active, created_by) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'monday',    '16:30:00', '18:30:00', 'Lunes 16:30',    10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'monday',    '18:30:00', '20:15:00', 'Lunes 18:30',    10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003', 'monday',    '20:15:00', '22:00:00', 'Lunes 20:15',    10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000004', 'tuesday',   '16:30:00', '18:30:00', 'Martes 16:30',   10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000005', 'tuesday',   '18:30:00', '20:15:00', 'Martes 18:30',   10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000006', 'tuesday',   '20:15:00', '22:00:00', 'Martes 20:15',   10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000007', 'wednesday', '16:30:00', '18:30:00', 'Miércoles 16:30',10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000008', 'wednesday', '18:30:00', '20:15:00', 'Miércoles 18:30',10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000009', 'wednesday', '20:15:00', '22:00:00', 'Miércoles 20:15',10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000010', 'thursday',  '16:30:00', '18:30:00', 'Jueves 16:30',   10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000011', 'thursday',  '18:30:00', '20:15:00', 'Jueves 18:30',   10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000012', 'thursday',  '20:15:00', '22:00:00', 'Jueves 20:15',   10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000013', 'friday',    '17:00:00', '19:00:00', 'Viernes 17:00',  10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000014', 'saturday',  '10:00:00', '11:30:00', 'Sábado 10:00',   10, true, 'a1000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000015', 'saturday',  '11:30:00', '13:30:00', 'Sábado 11:30',   10, true, 'a1000000-0000-0000-0000-000000000001');

-- ── Generar instancias para las próximas 8 semanas ─────────

SELECT generate_slot_instances(8);
