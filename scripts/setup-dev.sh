#!/bin/bash

# ============================================================================
# Proofa Development Setup Script
# ============================================================================
# This script sets up your local development environment in one command
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Generate random hex string
generate_secret() {
    local length=$1
    node -e "console.log(require('crypto').randomBytes($length).toString('hex'))"
}

# ============================================================================
# 1. Check Prerequisites
# ============================================================================
print_header "Checking Prerequisites"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 22+ from https://nodejs.org"
    exit 1
fi

# Check pnpm
if command_exists pnpm; then
    PNPM_VERSION=$(pnpm -v)
    print_success "pnpm $PNPM_VERSION"
else
    print_error "pnpm not found. Installing pnpm..."
    npm install -g pnpm
fi

# Check Docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    print_success "Docker $DOCKER_VERSION"
else
    print_error "Docker not found. Please install Docker from https://docker.com"
    exit 1
fi

# Check Docker Compose
if docker compose version >/dev/null 2>&1; then
    print_success "Docker Compose (plugin) available"
    DOCKER_COMPOSE="docker compose"
elif command_exists docker-compose; then
    print_success "Docker Compose (standalone) available"
    DOCKER_COMPOSE="docker-compose"
else
    print_error "Docker Compose not found"
    exit 1
fi

# ============================================================================
# 2. Setup Environment Files
# ============================================================================
print_header "Setting Up Environment Files"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    print_info "Creating .env.local from template..."
    cp .env.local.example .env.local
    print_success ".env.local created"
else
    print_warning ".env.local already exists, skipping..."
fi

# Generate secrets
print_info "Generating secure secrets..."

ENCRYPTION_KEY=$(generate_secret 32)
SESSION_SECRET=$(generate_secret 64)
GATEWAY_S2S_TOKEN=$(generate_secret 32)
CORE_S2S_TOKEN=$(generate_secret 32)

# Update .env.local with generated secrets
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env.local
    sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env.local
    sed -i '' "s/GATEWAY_S2S_TOKEN=.*/GATEWAY_S2S_TOKEN=$GATEWAY_S2S_TOKEN/" .env.local
    sed -i '' "s/CORE_S2S_TOKEN=.*/CORE_S2S_TOKEN=$CORE_S2S_TOKEN/" .env.local
else
    # Linux
    sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env.local
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env.local
    sed -i "s/GATEWAY_S2S_TOKEN=.*/GATEWAY_S2S_TOKEN=$GATEWAY_S2S_TOKEN/" .env.local
    sed -i "s/CORE_S2S_TOKEN=.*/CORE_S2S_TOKEN=$CORE_S2S_TOKEN/" .env.local
fi

print_success "Secrets generated and saved to .env.local"

# Export POSTGRES_PASSWORD for docker-compose
export POSTGRES_PASSWORD="proofa_dev_password"
print_info "Exported POSTGRES_PASSWORD for Docker Compose"

# ============================================================================
# 3. Install Dependencies
# ============================================================================
print_header "Installing Dependencies"

print_info "Running pnpm install..."
pnpm install

print_success "Dependencies installed"

# ============================================================================
# 4. Start Docker Services
# ============================================================================
print_header "Starting Docker Services"

print_info "Starting PostgreSQL and Redis..."
$DOCKER_COMPOSE up -d postgres redis

# Wait for PostgreSQL to be ready
print_info "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if $DOCKER_COMPOSE exec -T postgres pg_isready -U proofa >/dev/null 2>&1; then
        print_success "PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start"
        exit 1
    fi
    sleep 1
done

# Wait for Redis to be ready
print_info "Waiting for Redis to be ready..."
for i in {1..30}; do
    if $DOCKER_COMPOSE exec -T redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Redis failed to start"
        exit 1
    fi
    sleep 1
done

# ============================================================================
# 5. Setup Database
# ============================================================================
print_header "Setting Up Database"

print_info "Running database migrations..."
cd packages/db
pnpm run db:push
cd ../..

print_success "Database migrations complete"

# ============================================================================
# 6. Build Packages
# ============================================================================
print_header "Building Packages"

print_info "Building shared packages..."
pnpm run build:packages

print_success "Packages built successfully"

# ============================================================================
# 7. Summary
# ============================================================================
print_header "Setup Complete! 🎉"

echo -e "${GREEN}Your development environment is ready!${NC}\n"

echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Start all services:     ${YELLOW}pnpm dev${NC}"
echo -e "  2. Or start individually:"
echo -e "     - Gateway API:          ${YELLOW}pnpm dev:gateway${NC}"
echo -e "     - Core Service:         ${YELLOW}pnpm dev:core${NC}"
echo -e "     - Admin Dashboard:      ${YELLOW}pnpm dev:admin${NC}"
echo -e "     - User Dashboard:       ${YELLOW}pnpm dev:user${NC}\n"

echo -e "${BLUE}Service URLs:${NC}"
echo -e "  - Gateway API:            ${GREEN}http://localhost:3004${NC}"
echo -e "  - Core Service:           ${GREEN}http://localhost:3003${NC}"
echo -e "  - Admin Dashboard:        ${GREEN}http://localhost:5174${NC}"
echo -e "  - User Dashboard:         ${GREEN}http://localhost:5173${NC}"
echo -e "  - Marketing Site:         ${GREEN}http://localhost:4321${NC}"
echo -e "  - Documentation:          ${GREEN}http://localhost:4322${NC}\n"

echo -e "${BLUE}Database Tools:${NC}"
echo -e "  - Drizzle Studio:         ${YELLOW}pnpm db:studio${NC}"
echo -e "  - PostgreSQL (psql):      ${YELLOW}docker compose exec postgres psql -U proofa -d proofa${NC}"
echo -e "  - Redis CLI:              ${YELLOW}docker compose exec redis redis-cli${NC}\n"

echo -e "${BLUE}Optional:${NC}"
echo -e "  - Start email testing:    ${YELLOW}docker compose --profile email up -d mailpit${NC}"
echo -e "  - Start Redis Commander:  ${YELLOW}docker compose --profile debug up -d redis-commander${NC}\n"

echo -e "${YELLOW}Note:${NC} Don't forget to configure OAuth providers in the admin dashboard or .env.local\n"

print_success "Happy coding! 🚀"
