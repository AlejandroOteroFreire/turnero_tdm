#!/bin/bash
set -e

echo "⏳ Esperando que PostgreSQL acepte conexiones..."
until psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT 1" > /dev/null 2>&1; do
  echo "   ...no disponible todavía, reintentando en 2s"
  sleep 2
done
echo "✅ PostgreSQL disponible."

echo "⏳ Esperando que el schema 'auth' exista (inicialización interna de Supabase)..."
until psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -tAc "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'" \
  2>/dev/null | grep -q 1; do
  echo "   ...schema auth no existe todavía, reintentando en 2s"
  sleep 2
done
echo "✅ Schema auth listo."

echo "⏳ Esperando que el rol 'supabase_auth_admin' exista..."
until psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin'" \
  2>/dev/null | grep -q 1; do
  echo "   ...rol no existe todavía, reintentando en 2s"
  sleep 2
done
echo "✅ Roles de Supabase listos."

echo "🔑 Sincronizando passwords de roles de servicio con POSTGRES_PASSWORD..."
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL
ALTER ROLE supabase_auth_admin      WITH PASSWORD '${POSTGRES_PASSWORD}';
ALTER ROLE authenticator            WITH PASSWORD '${POSTGRES_PASSWORD}';
ALTER ROLE supabase_admin           WITH PASSWORD '${POSTGRES_PASSWORD}';
ALTER ROLE supabase_storage_admin   WITH PASSWORD '${POSTGRES_PASSWORD}';
ALTER ROLE pgbouncer                WITH PASSWORD '${POSTGRES_PASSWORD}' LOGIN;
SQL
echo "✅ Passwords actualizadas."

PSQL="psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB --set ON_ERROR_STOP=1"

echo "🔧 Aplicando migraciones..."
$PSQL -f /docker-entrypoint-initdb.d/migrations/20240001_schema.sql
$PSQL -f /docker-entrypoint-initdb.d/migrations/20240002_rls.sql

# El seed de usuarios se corre en auth-seed (después de que GoTrue esté up)
# Los seeds 02-05 también corren en auth-seed para garantizar orden correcto

echo "✅ Base de datos inicializada correctamente."
