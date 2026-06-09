#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# start.sh — Levantar el stack completo de Turnero TDM
# Uso: bash start.sh
# Requiere: Docker (Desktop en Windows/Mac, Engine en Linux)
# Compatible: Linux, macOS, Git Bash (Windows)
# ============================================================

ENV_FILE="docker/.env"

green()  { echo -e "\033[32m$*\033[0m"; }
cyan()   { echo -e "\033[36m$*\033[0m"; }
yellow() { echo -e "\033[33m$*\033[0m"; }
gray()   { echo -e "\033[90m$*\033[0m"; }
red()    { echo -e "\033[31m$*\033[0m"; }

echo ""
green "🏓 Turnero TDM — Iniciando stack local..."
echo ""

# Verificar Docker
if ! docker info > /dev/null 2>&1; then
  red "❌ Docker no está corriendo. Iniciá Docker Desktop y volvé a intentar."
  exit 1
fi

# Verificar docker compose (plugin v2 o comando standalone v1)
if docker compose version > /dev/null 2>&1; then
  COMPOSE="docker compose"
elif docker-compose version > /dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  red "❌ No se encontró 'docker compose' ni 'docker-compose'. Actualizá Docker Desktop."
  exit 1
fi

cyan "▶  Iniciando servicios..."
$COMPOSE --env-file "$ENV_FILE" up --build -d

echo ""
yellow "⏳ Esperando que la app esté lista..."

MAX=120
elapsed=0
while [ $elapsed -lt $MAX ]; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -qE "^(200|307|308)$"; then
    break
  fi
  sleep 3
  elapsed=$((elapsed + 3))
  gray "   ...esperando (${elapsed}s)"
done

echo ""
green "✅ Stack levantado!"
echo ""
echo "  App Next.js:       http://localhost:3000"
echo "  Supabase Studio:   http://localhost:54323"
echo "  Inbucket (emails): http://localhost:54324"
echo "  Worker (webhook):  http://localhost:3001"
echo ""
cyan "  Usuarios de prueba:"
echo "    admin@newbery.com      / Admin123!"
echo "    profe@newbery.com      / Profe123!   (rol dual player+admin)"
echo "    colaborador@newbery.com/ Colab123!"
echo "    jugador1@newbery.com   / Jugador123!"
echo "    jugador2@newbery.com   / Jugador123!"
echo "    jugador3@newbery.com   / Jugador123!"
echo ""
gray "  Ver logs en tiempo real:"
gray "    bash logs.sh"
gray ""
gray "  Detener todo:"
gray "    bash stop.sh"
echo ""
