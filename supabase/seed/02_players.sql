-- ============================================================
-- Seed 02: 30 jugadores ficticios con DNI
-- 10 × 1x/semana (8 activos, 2 pre_registered)
-- 10 × 2x/semana (9 activos, 1 pending)
-- 10 × 3x+/semana (10 activos)
-- ============================================================

DO $$
DECLARE
    -- IDs base para jugadores ficticios (offset 100)
    v_ids UUID[];
    v_id  UUID;
    i     INTEGER;

    -- Datos de jugadores
    v_names TEXT[] := ARRAY[
        -- 1x/semana (índices 1-10)
        'Alejandro Pérez','Beatriz López','Carlos García','Diana Sosa','Eduardo Ruiz',
        'Florencia Díaz','Gonzalo Torres','Hernán Blanco','Inés Castro','Javier Moreno',
        -- 2x/semana (índices 11-20)
        'Karen Romero','Luis Jiménez','Marcela Suárez','Nicolás Herrera','Olga Medina',
        'Pablo Ríos','Quiteria Vargas','Roberto Núñez','Silvia Paredes','Teodoro Iglesias',
        -- 3x+/semana (índices 21-30)
        'Úrsula Molina','Valentín Cruz','Wanda Ortega','Xavier Mendez','Yolanda Peña',
        'Zacarías Rojas','Adriana Silva','Bernardo Vega','Cecilia Aguilar','Daniel Reyes'
    ];

    v_dnis TEXT[] := ARRAY[
        '27100001','27100002','27100003','27100004','27100005',
        '27100006','27100007','27100008','27100009','27100010',
        '27100011','27100012','27100013','27100014','27100015',
        '27100016','27100017','27100018','27100019','27100020',
        '27100021','27100022','27100023','27100024','27100025',
        '27100026','27100027','27100028','27100029','27100030'
    ];

    v_freqs INTEGER[] := ARRAY[
        1,1,1,1,1,1,1,1,1,1,    -- 1x/semana
        2,2,2,2,2,2,2,2,2,2,    -- 2x/semana
        3,3,4,3,4,3,4,3,4,3     -- 3x+/semana
    ];

    v_statuses account_status[] := ARRAY[
        'active','active','active','active','active','active','active','active','pre_registered','pre_registered',   -- 1x: 8 activos, 2 pre_reg
        'active','active','active','active','active','active','active','active','active','pending',                  -- 2x: 9 activos, 1 pending
        'active','active','active','active','active','active','active','active','active','active'                    -- 3x: 10 activos
    ]::account_status[];

    v_user_id UUID;
    v_email   TEXT;
    v_phone   TEXT;
BEGIN
    FOR i IN 1..30 LOOP
        v_user_id := ('00000000-0000-0000-0000-0000000001' || LPAD(i::TEXT, 2, '0'))::UUID;
        v_email   := 'player' || LPAD(i::TEXT, 2, '0') || '@fake.newbery.com';
        v_phone   := '+54911' || LPAD((10000000 + i)::TEXT, 8, '0');

        -- auth.users
        -- IMPORTANTE: instance_id = '00000000-0000-0000-0000-000000000000' requerido por GoTrue
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_user_meta_data, created_at, updated_at, aud, role
        ) VALUES (
            v_user_id, '00000000-0000-0000-0000-000000000000', v_email,
            crypt('password123', gen_salt('bf', 10)),
            CASE WHEN v_statuses[i] IN ('active','pending') THEN NOW() ELSE NULL END,
            jsonb_build_object('full_name', v_names[i]),
            NOW() - ((31 - i) * INTERVAL '1 day'),
            NOW() - ((31 - i) * INTERVAL '1 day'),
            'authenticated', 'authenticated'
        ) ON CONFLICT (id) DO NOTHING;

        -- user_accounts
        INSERT INTO user_accounts (id, email, display_name, phone, dni, roles, status, wa_opt_in)
        VALUES (
            v_user_id, v_email, v_names[i], v_phone, v_dnis[i],
            ARRAY['player']::user_role[],
            v_statuses[i],
            v_statuses[i] = 'active'
        ) ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            roles = EXCLUDED.roles,
            status = EXCLUDED.status;

        -- player_profiles (solo para activos y pending, no pre_registered sin user)
        IF v_statuses[i] IN ('active', 'pending') THEN
            INSERT INTO player_profiles (
                user_id, full_name, dni, frequency, joined_at,
                name, lastname, nickname, birth_date, locality,
                phone_whatsapp, tmt_code, fetemba_code
            )
            VALUES (
                v_user_id, v_names[i], v_dnis[i], v_freqs[i],
                CURRENT_DATE - (31 - i),
                split_part(v_names[i], ' ', 1),
                split_part(v_names[i], ' ', 2),
                CASE WHEN i % 5 = 0 THEN split_part(v_names[i], ' ', 1) || 'ito' ELSE NULL END,
                CASE WHEN i % 3 = 0 THEN (CURRENT_DATE - ((25 + i) * 365))
                     ELSE NULL END,
                (ARRAY[
                    'Córdoba Capital','Buenos Aires','Rosario','Mendoza','La Plata',
                    'Córdoba Capital','San Luis','Tucumán','Salta','Mar del Plata'
                ])[((i - 1) % 10) + 1],
                v_phone,
                CASE WHEN i <= 15 THEN 'TMT-' || LPAD(i::TEXT, 5, '0') ELSE NULL END,
                CASE WHEN i % 4 = 0 THEN 'FET-' || LPAD((1000 + i)::TEXT, 4, '0') ELSE NULL END
            ) ON CONFLICT (user_id) DO UPDATE SET
                name           = EXCLUDED.name,
                lastname       = EXCLUDED.lastname,
                locality       = EXCLUDED.locality,
                phone_whatsapp = EXCLUDED.phone_whatsapp,
                tmt_code       = EXCLUDED.tmt_code,
                fetemba_code   = EXCLUDED.fetemba_code;
        END IF;
    END LOOP;

    -- Pre-registros (DNI de los 2 pre_registered que NO tienen user aún)
    INSERT INTO pre_registrations (dni, full_name, phone, frequency, claimed)
    VALUES
        ('27100009', 'Inés Castro',    '+5491110000009', 1, FALSE),
        ('27100010', 'Javier Moreno',  '+5491110000010', 1, FALSE)
    ON CONFLICT (dni) DO NOTHING;
END $$;
