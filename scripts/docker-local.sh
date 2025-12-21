#!/bin/bash

# =============================================================================
# Docker Compose Helper Script for Local Development
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  up        Start all services (Redis, LibSQL)"
    echo "  up:all    Start all services including debug tools (Redis Commander, Mailpit)"
    echo "  down      Stop all services"
    echo "  restart   Restart all services"
    echo "  logs      Show logs from all services"
    echo "  status    Show status of all services"
    echo "  clean     Stop services and remove volumes (DELETES ALL DATA)"
    echo "  redis     Connect to Redis CLI"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 up           # Start core services"
    echo "  $0 up:all       # Start with Redis Commander and Mailpit"
    echo "  $0 logs         # View service logs"
}

case "${1:-help}" in
    up)
        print_info "Starting Proofa local services..."
        docker compose up -d
        echo ""
        print_status "Services started!"
        echo ""
        echo "  📦 Redis:      redis://localhost:6379"
        echo "  📦 Redis REST: http://localhost:8079 (Upstash-compatible)"
        echo "  🗄️  LibSQL:     http://localhost:8080"
        echo ""
        print_info "Run 'pnpm dev' to start the application"
        ;;
    
    up:all)
        print_info "Starting all Proofa local services (including debug tools)..."
        docker compose --profile debug --profile email up -d
        echo ""
        print_status "All services started!"
        echo ""
        echo "  📦 Redis:           redis://localhost:6379"
        echo "  📦 Redis REST:      http://localhost:8079 (Upstash-compatible)"
        echo "  🔍 Redis Commander: http://localhost:8081"
        echo "  🗄️  LibSQL:          http://localhost:8080"
        echo "  📧 Mailpit Web UI:  http://localhost:8025"
        echo "  📧 Mailpit SMTP:    localhost:1025"
        echo ""
        print_info "Run 'pnpm dev' to start the application"
        ;;
    
    down)
        print_info "Stopping all services..."
        docker compose --profile debug --profile email down
        print_status "Services stopped"
        ;;
    
    restart)
        print_info "Restarting services..."
        docker compose --profile debug --profile email restart
        print_status "Services restarted"
        ;;
    
    logs)
        docker compose --profile debug --profile email logs -f
        ;;
    
    status)
        echo ""
        print_info "Service Status:"
        echo ""
        docker compose --profile debug --profile email ps
        echo ""
        ;;
    
    clean)
        print_warning "This will delete all local data (Redis, LibSQL). Are you sure? [y/N]"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            docker compose --profile debug --profile email down -v
            print_status "Services stopped and volumes removed"
        else
            print_info "Cancelled"
        fi
        ;;
    
    redis)
        print_info "Connecting to Redis CLI..."
        docker compose exec redis redis-cli
        ;;
    
    help|*)
        show_help
        ;;
esac
