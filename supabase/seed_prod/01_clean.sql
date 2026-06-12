-- ============================================================
-- PASO 1: Limpiar toda la base
-- Ejecutar primero, antes de cualquier otro seed
-- ============================================================

-- Primero las tablas que referencian user_accounts / auth.users
TRUNCATE TABLE attendance, bookings, slot_instances, slot_assignments,
  plan_change_requests, notification_log, payments,
  pre_registrations, registration_requests
CASCADE;

DELETE FROM player_profiles;
DELETE FROM training_slots;
DELETE FROM app_config;

-- Recién ahora los usuarios (ya no tienen dependencias)
DELETE FROM user_accounts;
DELETE FROM auth.identities;
DELETE FROM auth.users;
