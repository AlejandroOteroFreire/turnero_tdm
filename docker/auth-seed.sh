#!/bin/bash
set -e

DB_HOST="${POSTGRES_HOST:-db}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-postgres}"

export PGPASSWORD="${POSTGRES_PASSWORD}"
PSQL="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --set ON_ERROR_STOP=1"

# GoTrue ya está healthy (auth-seed depende de auth: service_healthy)
# Todas las migraciones de GoTrue ya corrieron — email_confirmed_at existe
echo "✅ GoTrue y migraciones listas. Insertando usuarios..."

$PSQL << 'SQL'
DO $$
DECLARE
    v_admin_id      UUID := '00000000-0000-0000-0000-000000000001';
    v_profe_id      UUID := '00000000-0000-0000-0000-000000000002';
    v_colab_id      UUID := '00000000-0000-0000-0000-000000000003';
    v_jugador1_id   UUID := '00000000-0000-0000-0000-000000000004';
    v_jugador2_id   UUID := '00000000-0000-0000-0000-000000000005';
    v_jugador3_id   UUID := '00000000-0000-0000-0000-000000000006';
BEGIN
    -- auth.users (GoTrue ya creó email_confirmed_at y todas las columnas)
    -- IMPORTANTE: instance_id debe ser '00000000-0000-0000-0000-000000000000' (GoTrue filtra por este valor)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, aud, role,
        confirmation_token, recovery_token,
        email_change_token_new, email_change,
        is_sso_user, is_anonymous
    ) VALUES
    (v_admin_id,    '00000000-0000-0000-0000-000000000000', 'admin@newbery.com',       crypt('Admin1234',   gen_salt('bf',10)), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin Newbery"}'::jsonb,      NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', '', FALSE, FALSE),
    (v_profe_id,    '00000000-0000-0000-0000-000000000000', 'profe@newbery.com',        crypt('Profe1234',   gen_salt('bf',10)), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Prof. Carlos Vera"}'::jsonb,  NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', '', FALSE, FALSE),
    (v_colab_id,    '00000000-0000-0000-0000-000000000000', 'colaborador@newbery.com',  crypt('Colab1234',   gen_salt('bf',10)), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Maria Gonzalez"}'::jsonb,     NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', '', FALSE, FALSE),
    (v_jugador1_id, '00000000-0000-0000-0000-000000000000', 'jugador1@newbery.com',     crypt('Jugador1234', gen_salt('bf',10)), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Lucas Rodriguez"}'::jsonb,    NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', '', FALSE, FALSE),
    (v_jugador2_id, '00000000-0000-0000-0000-000000000000', 'jugador2@newbery.com',     crypt('Jugador1234', gen_salt('bf',10)), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sofia Martinez"}'::jsonb,     NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', '', FALSE, FALSE),
    (v_jugador3_id, '00000000-0000-0000-0000-000000000000', 'jugador3@newbery.com',     crypt('Jugador1234', gen_salt('bf',10)), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Tomas Fernandez"}'::jsonb,    NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', '', FALSE, FALSE)
    ON CONFLICT (id) DO NOTHING;

    -- auth.identities (requerido por GoTrue v2 para login email/password)
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES
    (gen_random_uuid(), v_admin_id,    jsonb_build_object('sub', v_admin_id::text,    'email', 'admin@newbery.com'),       'email', NOW(), NOW(), NOW(), v_admin_id::text),
    (gen_random_uuid(), v_profe_id,    jsonb_build_object('sub', v_profe_id::text,    'email', 'profe@newbery.com'),        'email', NOW(), NOW(), NOW(), v_profe_id::text),
    (gen_random_uuid(), v_colab_id,    jsonb_build_object('sub', v_colab_id::text,    'email', 'colaborador@newbery.com'),  'email', NOW(), NOW(), NOW(), v_colab_id::text),
    (gen_random_uuid(), v_jugador1_id, jsonb_build_object('sub', v_jugador1_id::text, 'email', 'jugador1@newbery.com'),    'email', NOW(), NOW(), NOW(), v_jugador1_id::text),
    (gen_random_uuid(), v_jugador2_id, jsonb_build_object('sub', v_jugador2_id::text, 'email', 'jugador2@newbery.com'),    'email', NOW(), NOW(), NOW(), v_jugador2_id::text),
    (gen_random_uuid(), v_jugador3_id, jsonb_build_object('sub', v_jugador3_id::text, 'email', 'jugador3@newbery.com'),    'email', NOW(), NOW(), NOW(), v_jugador3_id::text)
    ON CONFLICT DO NOTHING;

    -- user_accounts (el trigger handle_new_auth_user() ya los creó, los actualizamos)
    UPDATE public.user_accounts SET phone = '+5491100000001', dni = '20111111111', roles = ARRAY['admin']::user_role[],                status = 'active', wa_opt_in = FALSE, display_name = 'Admin Newbery'     WHERE id = v_admin_id;
    UPDATE public.user_accounts SET phone = '+5491100000002', dni = '20222222222', roles = ARRAY['player','admin']::user_role[],       status = 'active', wa_opt_in = TRUE,  display_name = 'Prof. Carlos Vera' WHERE id = v_profe_id;
    UPDATE public.user_accounts SET phone = '+5491100000003', dni = '20333333333', roles = ARRAY['player','collaborator']::user_role[], status = 'active', wa_opt_in = TRUE,  display_name = 'Maria Gonzalez'    WHERE id = v_colab_id;
    UPDATE public.user_accounts SET phone = '+5491100000004', dni = '20444444444', roles = ARRAY['player']::user_role[],               status = 'active', wa_opt_in = TRUE,  display_name = 'Lucas Rodriguez'   WHERE id = v_jugador1_id;
    UPDATE public.user_accounts SET phone = '+5491100000005', dni = '20555555555', roles = ARRAY['player']::user_role[],               status = 'active', wa_opt_in = TRUE,  display_name = 'Sofia Martinez'    WHERE id = v_jugador2_id;
    UPDATE public.user_accounts SET phone = '+5491100000006', dni = '20666666666', roles = ARRAY['player']::user_role[],               status = 'active', wa_opt_in = TRUE,  display_name = 'Tomas Fernandez'   WHERE id = v_jugador3_id;
END $$;
SQL

echo "👤 Usuarios creados."

echo "🌱 Cargando seed de jugadores, turnos, pagos y config..."
$PSQL -f /seed/02_players.sql
$PSQL -f /seed/03_slots.sql
$PSQL -f /seed/04_payments.sql
$PSQL -f /seed/05_config.sql

echo "✅ Auth seed completado."
