-- ============================================================
-- Seed 01: Usuarios de prueba
-- Ejecutar con: npx supabase db reset
-- ============================================================

-- ============================================================
-- Insertar usuarios en auth.users (Supabase maneja el hash)
-- ============================================================

-- Usamos las funciones internas de Supabase para crear usuarios con contraseña
-- En entorno local, el CLI crea los usuarios directamente

DO $$
DECLARE
    v_admin_id      UUID := '00000000-0000-0000-0000-000000000001';
    v_profe_id      UUID := '00000000-0000-0000-0000-000000000002';
    v_colab_id      UUID := '00000000-0000-0000-0000-000000000003';
    v_jugador1_id   UUID := '00000000-0000-0000-0000-000000000004';
    v_jugador2_id   UUID := '00000000-0000-0000-0000-000000000005';
    v_jugador3_id   UUID := '00000000-0000-0000-0000-000000000006';
BEGIN
    -- Insertar en auth.users
    INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        raw_user_meta_data, created_at, updated_at,
        aud, role
    ) VALUES
    (v_admin_id,    'admin@newbery.com',        crypt('Admin123!',    gen_salt('bf')), NOW(), '{"full_name":"Admin Newbery"}'::jsonb,      NOW(), NOW(), 'authenticated', 'authenticated'),
    (v_profe_id,    'profe@newbery.com',         crypt('Profe123!',    gen_salt('bf')), NOW(), '{"full_name":"Profesor Carlos Vera"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated'),
    (v_colab_id,    'colaborador@newbery.com',   crypt('Colab123!',    gen_salt('bf')), NOW(), '{"full_name":"María González"}'::jsonb,      NOW(), NOW(), 'authenticated', 'authenticated'),
    (v_jugador1_id, 'jugador1@newbery.com',      crypt('Jugador123!',  gen_salt('bf')), NOW(), '{"full_name":"Lucas Rodríguez"}'::jsonb,      NOW(), NOW(), 'authenticated', 'authenticated'),
    (v_jugador2_id, 'jugador2@newbery.com',      crypt('Jugador123!',  gen_salt('bf')), NOW(), '{"full_name":"Sofía Martínez"}'::jsonb,       NOW(), NOW(), 'authenticated', 'authenticated'),
    (v_jugador3_id, 'jugador3@newbery.com',      crypt('Jugador123!',  gen_salt('bf')), NOW(), '{"full_name":"Tomás Fernández"}'::jsonb,      NOW(), NOW(), 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;

    -- user_accounts (el trigger los crea, pero en seed los sobrescribimos con los datos correctos)
    INSERT INTO user_accounts (id, email, display_name, phone, dni, roles, status, wa_opt_in) VALUES
    (v_admin_id,    'admin@newbery.com',       'Admin Newbery',        '+5491100000001', '20111111111', ARRAY['admin']::user_role[],                   'active', FALSE),
    (v_profe_id,    'profe@newbery.com',        'Prof. Carlos Vera',    '+5491100000002', '20222222222', ARRAY['player','admin']::user_role[],           'active', TRUE),
    (v_colab_id,    'colaborador@newbery.com',  'María González',       '+5491100000003', '20333333333', ARRAY['player','collaborator']::user_role[],    'active', TRUE),
    (v_jugador1_id, 'jugador1@newbery.com',     'Lucas Rodríguez',      '+5491100000004', '20444444444', ARRAY['player']::user_role[],                   'active', TRUE),
    (v_jugador2_id, 'jugador2@newbery.com',     'Sofía Martínez',       '+5491100000005', '20555555555', ARRAY['player']::user_role[],                   'active', TRUE),
    (v_jugador3_id, 'jugador3@newbery.com',     'Tomás Fernández',      '+5491100000006', '20666666666', ARRAY['player']::user_role[],                   'active', TRUE)
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        roles = EXCLUDED.roles,
        status = EXCLUDED.status,
        dni = EXCLUDED.dni,
        phone = EXCLUDED.phone,
        wa_opt_in = EXCLUDED.wa_opt_in;

    -- Passwords: 'password123' (bcrypt cost 10, compatible con GoTrue v2)
    UPDATE auth.users SET encrypted_password = crypt('password123', gen_salt('bf', 10))
    WHERE id IN (v_admin_id, v_profe_id, v_colab_id, v_jugador1_id, v_jugador2_id, v_jugador3_id);

    -- Identities para login email/password (requerido por GoTrue v2)
    -- provider_id debe ser el UUID del usuario (no el email)
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES
    (gen_random_uuid(), v_admin_id,    jsonb_build_object('sub', v_admin_id::text,    'email', 'admin@newbery.com'),      'email', NOW(), NOW(), NOW(), v_admin_id::text),
    (gen_random_uuid(), v_profe_id,    jsonb_build_object('sub', v_profe_id::text,    'email', 'profe@newbery.com'),       'email', NOW(), NOW(), NOW(), v_profe_id::text),
    (gen_random_uuid(), v_colab_id,    jsonb_build_object('sub', v_colab_id::text,    'email', 'colaborador@newbery.com'), 'email', NOW(), NOW(), NOW(), v_colab_id::text),
    (gen_random_uuid(), v_jugador1_id, jsonb_build_object('sub', v_jugador1_id::text, 'email', 'jugador1@newbery.com'),   'email', NOW(), NOW(), NOW(), v_jugador1_id::text),
    (gen_random_uuid(), v_jugador2_id, jsonb_build_object('sub', v_jugador2_id::text, 'email', 'jugador2@newbery.com'),   'email', NOW(), NOW(), NOW(), v_jugador2_id::text),
    (gen_random_uuid(), v_jugador3_id, jsonb_build_object('sub', v_jugador3_id::text, 'email', 'jugador3@newbery.com'),   'email', NOW(), NOW(), NOW(), v_jugador3_id::text)
    ON CONFLICT DO NOTHING;

    -- player_profiles para jugadores de prueba
    INSERT INTO player_profiles (user_id, full_name, dni, frequency) VALUES
    (v_profe_id,    'Carlos Vera',       '20222222222', 5),
    (v_colab_id,    'María González',    '20333333333', 2),
    (v_jugador1_id, 'Lucas Rodríguez',   '20444444444', 1),
    (v_jugador2_id, 'Sofía Martínez',    '20555555555', 2),
    (v_jugador3_id, 'Tomás Fernández',   '20666666666', 3)
    ON CONFLICT (user_id) DO NOTHING;
END $$;
