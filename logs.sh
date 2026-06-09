#!/usr/bin/env bash
# logs.sh — Ver logs de uno o todos los servicios
# Uso:
#   bash logs.sh           → todos los servicios
#   bash logs.sh app       → solo la app Next.js
#   bash logs.sh worker    → solo el worker
#   bash logs.sh db        → solo PostgreSQL

ENV_FILE="docker/.env"
SERVICE="${1:-}"  # vacío = todos

if docker compose version > /dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

$COMPOSE --env-file "$ENV_FILE" logs -f --tail=50 $SERVICE
