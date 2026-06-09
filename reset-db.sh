#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="docker/.env"

if docker compose version > /dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

echo ""
echo -e "\033[33m⚠️  Esto va a BORRAR todos los datos y recrear la BD desde cero.\033[0m"
read -r -p "¿Confirmar? (s/n): " confirm
if [ "$confirm" != "s" ]; then
  echo "Cancelado."
  exit 0
fi

echo ""
echo "🗑  Deteniendo db, db-init, app y worker..."
$COMPOSE --env-file "$ENV_FILE" stop db db-init app worker 2>/dev/null || true
$COMPOSE --env-file "$ENV_FILE" rm -f db db-init 2>/dev/null || true

echo "🗑  Borrando volúmenes de BD..."
# Los nombres de volumen son: <nombre_del_directorio>_db_data y _db_init_done
PROJECT=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]_-')
docker volume rm "${PROJECT}_db_data" "${PROJECT}_db_init_done" 2>/dev/null || \
  echo "   (volúmenes no encontrados, puede que ya estuvieran borrados)"

echo ""
echo "▶  Reiniciando stack..."
$COMPOSE --env-file "$ENV_FILE" up -d

echo ""
echo -e "\033[32m✅ BD reseteada. Esperá unos segundos para que todo se reconecte.\033[0m"
echo ""
