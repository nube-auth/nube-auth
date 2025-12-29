#!/bin/bash

# Proofa Local Development Setup Script
# This script automates the local development environment setup

set -e

echo "🚀 Proofa Local Development Setup"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed${NC}"
    echo "Please install pnpm: npm install -g pnpm"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

echo -e "${GREEN}✓${NC} Prerequisites check passed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Setup environment files
echo "🔧 Setting up environment files..."

if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and set your values${NC}"
    echo -e "${YELLOW}   Generate encryption key: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"${NC}"
else
    echo -e "${GREEN}✓${NC} .env file already exists"
fi

if [ ! -f .env.local ]; then
    echo "Creating .env.local from .env.local.example..."
    cp .env.local.example .env.local
    echo -e "${GREEN}✓${NC} Created .env.local (you can customize this later)"
else
    echo -e "${GREEN}✓${NC} .env.local file already exists"
fi

echo ""

# Start Docker services
echo "🐳 Starting Docker services..."
docker compose up -d
echo -e "${GREEN}✓${NC} Docker services started"
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if PostgreSQL is ready
echo "Checking PostgreSQL..."
for i in {1..30}; do
    if docker exec proofa-postgres pg_isready -U proofa &> /dev/null; then
        echo -e "${GREEN}✓${NC} PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ PostgreSQL failed to start${NC}"
        docker compose logs postgres
        exit 1
    fi
    sleep 1
done

# Check if Redis is ready
echo "Checking Redis..."
for i in {1..30}; do
    if docker exec proofa-redis redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Redis failed to start${NC}"
        docker compose logs redis
        exit 1
    fi
    sleep 1
done

echo ""

# Run database migrations
echo "🗄️  Running database migrations..."
cd packages/db
pnpm run db:push
cd ../..
echo -e "${GREEN}✓${NC} Database migrations completed"
echo ""

# Build packages
echo "🔨 Building core packages..."
pnpm --filter @proofa/db run build
pnpm --filter @proofa/cache run build
pnpm --filter @proofa/shared run build
echo -e "${GREEN}✓${NC} Core packages built"
echo ""

# Success message
echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "Services running:"
echo "  - PostgreSQL:  localhost:5432"
echo "  - Redis:       localhost:6379"
echo ""
echo "Next steps:"
echo "  1. Edit .env and set ENCRYPTION_KEY and RESEND_API_KEY"
echo "  2. Run: pnpm dev"
echo "  3. Access Admin Dashboard: http://localhost:5173"
echo ""
echo "Useful commands:"
echo "  - View services:       docker compose ps"
echo "  - View logs:          docker compose logs -f"
echo "  - Stop services:       docker compose down"
echo "  - Database UI:         cd packages/db && pnpm run db:studio"
echo ""
echo "For more help, see LOCAL_DEVELOPMENT.md"
echo ""
