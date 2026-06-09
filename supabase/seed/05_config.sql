-- ============================================================
-- Seed 05: Configuración de notificaciones defaults + favoritos demo
-- ============================================================

-- Defaults de notificación (configurados por admin)
INSERT INTO notification_defaults (channel, event_type, enabled) VALUES
    ('whatsapp',       'booking_confirmed',    TRUE),
    ('whatsapp',       'booking_cancelled',    TRUE),
    ('whatsapp',       'slot_cancelled',       TRUE),
    ('whatsapp',       'waitlist_offer',       TRUE),
    ('whatsapp',       'waitlist_expired',     TRUE),
    ('whatsapp',       'payment_reminder',     FALSE),
    ('whatsapp_group', 'slot_open_spots',      TRUE),
    ('whatsapp_group', 'slot_cancelled',       TRUE),
    ('web_push',       'booking_confirmed',    TRUE),
    ('web_push',       'slot_cancelled',       TRUE),
    ('web_push',       'waitlist_offer',       TRUE),
    ('web_push',       'slot_open_spots',      FALSE),
    ('email',          'booking_confirmed',    TRUE),
    ('email',          'slot_cancelled',       TRUE),
    ('email',          'waitlist_offer',       FALSE),
    ('email',          'payment_reminder',     TRUE)
ON CONFLICT (channel, event_type) DO NOTHING;

-- Slots favoritos de jugadores demo
INSERT INTO favorite_slots (player_id, slot_id) VALUES
    ('00000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002'),  -- jugador1 → Lunes Tarde
    ('00000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004'),  -- jugador2 → Martes Tarde
    ('00000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008'),  -- jugador2 → Jueves Tarde
    ('00000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004'),  -- jugador3 → Martes Tarde
    ('00000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006'),  -- jugador3 → Miércoles Tarde
    ('00000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011')   -- jugador3 → Sábado
ON CONFLICT (player_id, slot_id) DO NOTHING;
