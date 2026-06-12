-- ============================================================
-- Turnero TDM — Club Jorge Newbery, Sección Tenis de Mesa
-- Migración 001: Esquema completo
-- Zona horaria: America/Argentina/Buenos_Aires
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE user_role            AS ENUM ('player', 'collaborator', 'admin');
CREATE TYPE account_status       AS ENUM ('active', 'pending', 'pre_registered', 'suspended');
CREATE TYPE slot_day             AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');
CREATE TYPE booking_status       AS ENUM ('confirmed', 'waitlisted', 'cancelled', 'cancelled_late', 'no_show');
CREATE TYPE instance_status      AS ENUM ('active', 'cancelled', 'holiday');
CREATE TYPE offer_status         AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE payment_status       AS ENUM ('current', 'owes_month', 'owes_previous');
CREATE TYPE payment_type         AS ENUM ('monthly', 'drop_in', 'adjustment');
CREATE TYPE notification_channel AS ENUM ('whatsapp', 'whatsapp_group', 'web_push', 'email');
CREATE TYPE attendance_status    AS ENUM ('present', 'absent', 'cancelled', 'cancelled_late', 'no_show');

-- ============================================================
-- TABLA: user_accounts
-- Extiende auth.users de Supabase
-- ============================================================

CREATE TABLE user_accounts (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL,
    phone           TEXT,                          -- formato +549XXXXXXXXXX
    dni             TEXT UNIQUE,                   -- puede ser NULL para pendientes
    roles           user_role[] NOT NULL DEFAULT ARRAY['player']::user_role[],
    status          account_status NOT NULL DEFAULT 'pending',
    avatar_url      TEXT,
    wa_opt_in       BOOLEAN NOT NULL DEFAULT FALSE, -- consentimiento WhatsApp
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: player_profiles
-- Relación 1:1 con user_accounts
-- ============================================================

CREATE TABLE player_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    dni             TEXT UNIQUE NOT NULL,
    birth_date      DATE,
    phone           TEXT,
    emergency_phone TEXT,
    frequency       INTEGER NOT NULL DEFAULT 1 CHECK (frequency BETWEEN 1 AND 7), -- días/semana
    medical_cert    BOOLEAN NOT NULL DEFAULT FALSE,
    notes           TEXT,
    joined_at       DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: pre_registrations
-- Registros importados via CSV antes de la activación del sistema
-- ============================================================

CREATE TABLE pre_registrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dni             TEXT UNIQUE NOT NULL,
    full_name       TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    frequency       INTEGER NOT NULL DEFAULT 1,
    notes           TEXT,
    claimed         BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_by      UUID REFERENCES user_accounts(id),
    claimed_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: training_slots
-- Definición recurrente de un turno (template)
-- ============================================================

CREATE TABLE training_slots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week     slot_day NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    capacity        INTEGER NOT NULL DEFAULT 8 CHECK (capacity > 0),
    label           TEXT,                          -- ej: "Turno Mañana"
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID NOT NULL REFERENCES user_accounts(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_time_overlap CHECK (start_time < end_time)
);

-- ============================================================
-- TABLA: slot_instances
-- Instancia concreta de un turno en una fecha específica
-- ============================================================

CREATE TABLE slot_instances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id         UUID NOT NULL REFERENCES training_slots(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    status          instance_status NOT NULL DEFAULT 'active',
    cancellation_reason TEXT,
    cancelled_by    UUID REFERENCES user_accounts(id),
    cancelled_at    TIMESTAMPTZ,
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (slot_id, date)
);

-- ============================================================
-- TABLA: slot_assignments
-- Asignación fija de un jugador a un slot por semana (drag & drop)
-- ============================================================

CREATE TABLE slot_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id         UUID NOT NULL REFERENCES training_slots(id) ON DELETE CASCADE,
    player_id       UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    week_start      DATE NOT NULL,                 -- lunes de la semana
    position        INTEGER,                       -- orden en el slot
    assigned_by     UUID NOT NULL REFERENCES user_accounts(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (slot_id, player_id, week_start)
);

-- ============================================================
-- TABLA: bookings
-- Reserva individual de un jugador a una instancia
-- ============================================================

CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id     UUID NOT NULL REFERENCES slot_instances(id) ON DELETE CASCADE,
    player_id       UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    status          booking_status NOT NULL DEFAULT 'confirmed',
    waitlist_pos    INTEGER,                       -- posición en lista espera (NULL = confirmado)
    booked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at    TIMESTAMPTZ,
    cancelled_by    UUID REFERENCES user_accounts(id),
    late_cancel     BOOLEAN NOT NULL DEFAULT FALSE, -- canceló con menos de 2hs
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (instance_id, player_id)
);

-- ============================================================
-- TABLA: waitlist_offers
-- Oferta activa a jugador en lista de espera (estado en Redis también)
-- ============================================================

CREATE TABLE waitlist_offers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    instance_id     UUID NOT NULL REFERENCES slot_instances(id) ON DELETE CASCADE,
    player_id       UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    status          offer_status NOT NULL DEFAULT 'pending',
    offered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,          -- offered_at + timeout configurable
    responded_at    TIMESTAMPTZ,
    wa_message_id   TEXT,                          -- ID del mensaje WA enviado
    redis_key       TEXT,                          -- clave en Redis para estado temporal
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: attendance
-- Registro de asistencia efectiva
-- ============================================================

CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id     UUID NOT NULL REFERENCES slot_instances(id) ON DELETE CASCADE,
    player_id       UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    status          attendance_status NOT NULL DEFAULT 'present',
    marked_by       UUID REFERENCES user_accounts(id),
    marked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (instance_id, player_id)
);

-- ============================================================
-- TABLA: payments
-- Registro manual de pagos por jugador
-- ============================================================

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id       UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    type            payment_type NOT NULL DEFAULT 'monthly',
    amount          NUMERIC(10,2) NOT NULL,
    period_month    INTEGER CHECK (period_month BETWEEN 1 AND 12),
    period_year     INTEGER CHECK (period_year >= 2020),
    paid_at         DATE NOT NULL DEFAULT CURRENT_DATE,
    registered_by   UUID NOT NULL REFERENCES user_accounts(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: favorite_slots
-- Slots favoritos de un jugador (para broadcast de cupos)
-- ============================================================

CREATE TABLE favorite_slots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id       UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    slot_id         UUID NOT NULL REFERENCES training_slots(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, slot_id)
);

-- ============================================================
-- TABLA: notification_prefs
-- Preferencias de notificación por jugador/canal/evento
-- ============================================================

CREATE TABLE notification_prefs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id       UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    channel         notification_channel NOT NULL,
    event_type      TEXT NOT NULL,                 -- 'booking_confirmed','slot_cancelled','waitlist_offer',etc.
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    -- Si NULL, usa el default del admin
    overridden      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, channel, event_type)
);

-- ============================================================
-- TABLA: notification_defaults
-- Defaults globales configurados por admin
-- ============================================================

CREATE TABLE notification_defaults (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel         notification_channel NOT NULL,
    event_type      TEXT NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by      UUID REFERENCES user_accounts(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (channel, event_type)
);

-- ============================================================
-- TABLA: push_subscriptions
-- Suscripciones Web Push VAPID por usuario/dispositivo
-- ============================================================

CREATE TABLE push_subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id       UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    endpoint        TEXT NOT NULL UNIQUE,
    p256dh          TEXT NOT NULL,
    auth            TEXT NOT NULL,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ
);

-- ============================================================
-- TABLA: app_config
-- Configuración global de la aplicación (admin)
-- ============================================================

CREATE TABLE app_config (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    description     TEXT,
    updated_by      UUID REFERENCES user_accounts(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Config defaults
INSERT INTO app_config (key, value, description) VALUES
    ('waitlist_timeout_minutes', '30', 'Minutos para responder oferta de lista de espera'),
    ('late_cancel_hours', '2', 'Horas antes del turno que define cancelación tardía'),
    ('wa_group_id', '', 'ID del grupo de WhatsApp del club'),
    ('club_timezone', 'America/Argentina/Buenos_Aires', 'Zona horaria del club'),
    ('booking_open_days', '7', 'Días de anticipación para abrir reservas');

-- ============================================================
-- ÍNDICES
-- ============================================================

-- user_accounts
CREATE INDEX idx_user_accounts_dni ON user_accounts(dni) WHERE dni IS NOT NULL;
CREATE INDEX idx_user_accounts_status ON user_accounts(status);
CREATE INDEX idx_user_accounts_roles ON user_accounts USING GIN(roles);

-- player_profiles
CREATE INDEX idx_player_profiles_dni ON player_profiles(dni);

-- pre_registrations
CREATE INDEX idx_pre_reg_dni ON pre_registrations(dni);
CREATE INDEX idx_pre_reg_claimed ON pre_registrations(claimed);

-- slot_instances
CREATE INDEX idx_slot_instances_date ON slot_instances(date);
CREATE INDEX idx_slot_instances_slot_date ON slot_instances(slot_id, date);
CREATE INDEX idx_slot_instances_status ON slot_instances(status);

-- bookings
CREATE INDEX idx_bookings_instance ON bookings(instance_id);
CREATE INDEX idx_bookings_player ON bookings(player_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_waitlist ON bookings(instance_id, waitlist_pos) WHERE status = 'waitlisted';

-- slot_assignments
CREATE INDEX idx_assignments_slot_week ON slot_assignments(slot_id, week_start);
CREATE INDEX idx_assignments_player ON slot_assignments(player_id);

-- waitlist_offers
CREATE INDEX idx_waitlist_offers_instance ON waitlist_offers(instance_id);
CREATE INDEX idx_waitlist_offers_player ON waitlist_offers(player_id);
CREATE INDEX idx_waitlist_offers_status ON waitlist_offers(status);
CREATE INDEX idx_waitlist_offers_expires ON waitlist_offers(expires_at) WHERE status = 'pending';

-- attendance
CREATE INDEX idx_attendance_instance ON attendance(instance_id);
CREATE INDEX idx_attendance_player ON attendance(player_id);
CREATE INDEX idx_attendance_status ON attendance(status);

-- payments
CREATE INDEX idx_payments_player ON payments(player_id);
CREATE INDEX idx_payments_period ON payments(period_year, period_month);

-- push_subscriptions
CREATE INDEX idx_push_subs_player ON push_subscriptions(player_id);

-- ============================================================
-- VISTAS
-- ============================================================

-- Vista: estado de pago por jugador (semáforo)
CREATE VIEW player_payment_status AS
WITH latest_payments AS (
    SELECT
        player_id,
        MAX(period_year * 100 + period_month) AS latest_period
    FROM payments
    WHERE type = 'monthly'
    GROUP BY player_id
),
current_period AS (
    SELECT
        EXTRACT(YEAR FROM NOW())::INTEGER AS cur_year,
        EXTRACT(MONTH FROM NOW())::INTEGER AS cur_month
)
SELECT
    ua.id AS player_id,
    ua.display_name,
    lp.latest_period,
    cp.cur_year * 100 + cp.cur_month AS current_period,
    CASE
        WHEN lp.latest_period IS NULL THEN 'owes_previous'
        WHEN lp.latest_period >= cp.cur_year * 100 + cp.cur_month THEN 'current'
        WHEN lp.latest_period = (cp.cur_year * 100 + cp.cur_month - 1) THEN 'owes_month'
        ELSE 'owes_previous'
    END AS payment_status
FROM user_accounts ua
LEFT JOIN latest_payments lp ON lp.player_id = ua.id
CROSS JOIN current_period cp
WHERE 'player' = ANY(ua.roles);

-- Vista: cupos disponibles por instancia
CREATE VIEW slot_instance_availability AS
SELECT
    si.id AS instance_id,
    si.slot_id,
    si.date,
    ts.day_of_week,
    ts.start_time,
    ts.end_time,
    ts.capacity,
    ts.label,
    si.status AS instance_status,
    COUNT(b.id) FILTER (WHERE b.status = 'confirmed') AS confirmed_count,
    ts.capacity - COUNT(b.id) FILTER (WHERE b.status = 'confirmed') AS available_spots,
    COUNT(b.id) FILTER (WHERE b.status = 'waitlisted') AS waitlist_count
FROM slot_instances si
JOIN training_slots ts ON ts.id = si.slot_id
LEFT JOIN bookings b ON b.instance_id = si.id
GROUP BY si.id, si.slot_id, si.date, ts.day_of_week, ts.start_time, ts.end_time, ts.capacity, ts.label, si.status;

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Función: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
CREATE TRIGGER trg_user_accounts_updated_at
    BEFORE UPDATE ON user_accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_player_profiles_updated_at
    BEFORE UPDATE ON player_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_training_slots_updated_at
    BEFORE UPDATE ON training_slots
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_notification_prefs_updated_at
    BEFORE UPDATE ON notification_prefs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Función: crear user_account al registrar en auth.users
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_accounts (id, email, display_name, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'pending'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Función: mantener posiciones de lista de espera
CREATE OR REPLACE FUNCTION reorder_waitlist(p_instance_id UUID)
RETURNS VOID AS $$
BEGIN
    WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY booked_at) AS new_pos
        FROM bookings
        WHERE instance_id = p_instance_id
          AND status = 'waitlisted'
    )
    UPDATE bookings b
    SET waitlist_pos = o.new_pos
    FROM ordered o
    WHERE b.id = o.id;
END;
$$ LANGUAGE plpgsql;

-- Función: cancelar booking y reordenar waitlist
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID,
    p_cancelled_by UUID,
    p_late BOOLEAN DEFAULT FALSE
)
RETURNS VOID SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_instance_id UUID;
    v_was_confirmed BOOLEAN;
BEGIN
    SELECT instance_id, (status = 'confirmed')
    INTO v_instance_id, v_was_confirmed
    FROM bookings
    WHERE id = p_booking_id;

    UPDATE bookings SET
        status       = CASE WHEN p_late
                            THEN 'cancelled_late'::booking_status
                            ELSE 'cancelled'::booking_status
                       END,
        cancelled_at = NOW(),
        cancelled_by = p_cancelled_by,
        late_cancel  = p_late,
        waitlist_pos = NULL
    WHERE id = p_booking_id;

    IF v_was_confirmed THEN
        PERFORM reorder_waitlist(v_instance_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función: obtener siguiente en lista de espera
CREATE OR REPLACE FUNCTION get_next_waitlisted(p_instance_id UUID)
RETURNS TABLE(booking_id UUID, player_id UUID, phone TEXT) AS $$
    SELECT b.id, b.player_id, ua.phone
    FROM bookings b
    JOIN user_accounts ua ON ua.id = b.player_id
    WHERE b.instance_id = p_instance_id
      AND b.status = 'waitlisted'
    ORDER BY b.waitlist_pos
    LIMIT 1;
$$ LANGUAGE sql;

-- Función: verificar si cancelación es tardía
CREATE OR REPLACE FUNCTION is_late_cancellation(p_instance_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_slot_datetime TIMESTAMPTZ;
    v_hours INTEGER;
BEGIN
    SELECT (si.date + ts.start_time) AT TIME ZONE 'America/Argentina/Buenos_Aires'
    INTO v_slot_datetime
    FROM slot_instances si
    JOIN training_slots ts ON ts.id = si.slot_id
    WHERE si.id = p_instance_id;

    SELECT value::INTEGER INTO v_hours FROM app_config WHERE key = 'late_cancel_hours';
    v_hours := COALESCE(v_hours, 2);

    RETURN NOW() > (v_slot_datetime - (v_hours || ' hours')::INTERVAL);
END;
$$ LANGUAGE plpgsql;

-- Función: generar instancias para las próximas N semanas
CREATE OR REPLACE FUNCTION generate_slot_instances(p_weeks INTEGER DEFAULT 4)
RETURNS INTEGER AS $$
DECLARE
    v_slot RECORD;
    v_date DATE;
    v_count INTEGER := 0;
    v_day_offset INTEGER;
BEGIN
    FOR v_slot IN SELECT * FROM training_slots WHERE is_active = TRUE LOOP
        -- Calcular offset de día (Monday=0 en slot_day, pero en DATE Monday=1)
        v_day_offset := CASE v_slot.day_of_week
            WHEN 'monday'    THEN 0
            WHEN 'tuesday'   THEN 1
            WHEN 'wednesday' THEN 2
            WHEN 'thursday'  THEN 3
            WHEN 'friday'    THEN 4
            WHEN 'saturday'  THEN 5
        END;

        FOR i IN 0..p_weeks - 1 LOOP
            -- Siguiente lunes + offset
            v_date := date_trunc('week', CURRENT_DATE)::DATE + (i * 7) + v_day_offset;

            INSERT INTO slot_instances (slot_id, date)
            VALUES (v_slot.id, v_date)
            ON CONFLICT (slot_id, date) DO NOTHING;

            v_count := v_count + 1;
        END LOOP;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
