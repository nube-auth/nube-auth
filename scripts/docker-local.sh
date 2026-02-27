#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
CORE_SERVICES="postgres redis"

# Load env file for docker compose
ENV_FILE=""
if [[ -f ".env.local" ]]; then
  ENV_FILE="--env-file .env.local"
elif [[ -f ".env" ]]; then
  ENV_FILE="--env-file .env"
fi

usage() {
  cat <<EOF
Usage: $0 <command>

Commands:
  up        Start core services (postgres, redis)
  up:all    Start all services including mailpit
  down      Stop all services
  logs      Tail logs for all running services
  status    Show status of all services
  clean     Stop services and remove volumes

EOF
}

case "${1:-}" in
  up)
    echo "Starting core services: $CORE_SERVICES"
    docker compose -f "$COMPOSE_FILE" $ENV_FILE up -d $CORE_SERVICES
    ;;
  up:all)
    echo "Starting all services..."
    docker compose -f "$COMPOSE_FILE" $ENV_FILE up -d
    ;;
  down)
    echo "Stopping all services..."
    docker compose -f "$COMPOSE_FILE" $ENV_FILE down
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" $ENV_FILE logs -f
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" $ENV_FILE ps
    ;;
  clean)
    echo "Stopping services and removing volumes..."
    docker compose -f "$COMPOSE_FILE" $ENV_FILE down -v
    ;;
  *)
    usage
    exit 1
    ;;
esac
