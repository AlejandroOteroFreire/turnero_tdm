-- ============================================================
-- PASO 3: Usuarios de prueba (profesor y jugador)
-- Solo para entorno de pruebas, NO correr en producción real
-- ============================================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, role, aud, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES
  (
    'a1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'profesor@newbery.com',
    crypt('password123', gen_salt('bf')),
    NOW(), 'authenticated', 'authenticated', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}', false
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'jugador@newbery.com',
    crypt('password123', gen_salt('bf')),
    NOW(), 'authenticated', 'authenticated', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}', false
  )
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = NOW();

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
VALUES
  (
    gen_random_uuid(),
    'a1000000-0000-0000-0000-000000000002',
    'profesor@newbery.com', 'email',
    '{"sub":"a1000000-0000-0000-0000-000000000002","email":"profesor@newbery.com"}',
    NOW(), NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'a1000000-0000-0000-0000-000000000003',
    'jugador@newbery.com', 'email',
    '{"sub":"a1000000-0000-0000-0000-000000000003","email":"jugador@newbery.com"}',
    NOW(), NOW(), NOW()
  )
ON CONFLICT (provider_id, provider) DO NOTHING;

INSERT INTO user_accounts (id, email, display_name, roles, status) VALUES
  (
    'a1000000-0000-0000-0000-000000000002',
    'profesor@newbery.com',
    'Profesor TDM',
    ARRAY['collaborator']::user_role[],
    'active'
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'jugador@newbery.com',
    'Jugador Prueba',
    ARRAY['player']::user_role[],
    'active'
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  roles = EXCLUDED.roles,
  status = EXCLUDED.status;

INSERT INTO player_profiles (user_id, full_name, first_name, last_name, dni, frequency) VALUES
  (
    'a1000000-0000-0000-0000-000000000003',
    'Jugador Prueba', 'Jugador', 'Prueba', '99999999', 2
  )
ON CONFLICT (user_id) DO NOTHING;
