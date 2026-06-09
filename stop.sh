#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="docker/.env"

if docker compose version > /dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

echo ""
echo "⏹  Deteniendo servicios..."
$COMPOSE --env-file "$ENV_FILE" down
echo "✅ Servicios detenidos. Los datos persisten en los volúmenes."
echo ""
echo "  Para borrar también los datos:"
echo "    $COMPOSE --env-file $ENV_FILE down -v"
echo ""
