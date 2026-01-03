# Scripts

This directory contains utility scripts for the Proofa project.

## Development

### Start Complete Development Environment
```bash
pnpm dev
```

This command automatically:
- Starts Docker services (PostgreSQL, Redis, CloudBeaver, RedisInsight, Mailpit)
- Starts all dev servers (Core, Gateway, Dashboards)
- Launches Drizzle Studio for database management

**Services Available:**
- **Core Service**: http://localhost:3003
- **Gateway Service**: http://localhost:3004
- **Admin Dashboard**: http://localhost:5174
- **User Dashboard**: http://localhost:5173
- **Home Site**: http://localhost:4321
- **Docs Site**: http://localhost:4322
- **Drizzle Studio**: https://local.drizzle.studio
- **CloudBeaver (DB UI)**: http://localhost:8978
- **RedisInsight (Redis UI)**: http://localhost:5540
- **Mailpit (Email Testing)**: http://localhost:8025

## Available Scripts

### setup-dev.sh
Complete local development environment setup script (one-time). Handles:
- Prerequisites checking (Node.js, pnpm, Docker)
- Environment file generation with secure secrets
- Docker services startup (PostgreSQL, Redis)
- Database migrations
- Package building

**Usage:**
```bash
./scripts/setup-dev.sh
```

## Docker Commands

Manually manage Docker services:

```bash
# Start all services
docker compose --env-file .env.local up

# Start services in background
docker compose --env-file .env.local up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Check status
docker compose ps

# Clean volumes (deletes all data)
docker compose down -v

# Connect to Redis CLI
docker compose exec redis redis-cli

# Connect to PostgreSQL
docker compose exec postgres psql -U proofa -d proofa
```

## Development Tools

### Drizzle Studio
Visual database explorer for PostgreSQL.
- **Starts automatically** with `pnpm dev`
- **Manual start**: `pnpm db:studio`
- **Access**: https://local.drizzle.studio

### CloudBeaver
Database web UI for managing PostgreSQL.
- **Web UI**: http://localhost:8978
- **Auto-starts** with Docker services
- Connect to your database:
  - **Host**: postgres
  - **Port**: 5432
  - **Username**: proofa
  - **Password**: Check `.env.local`

### RedisInsight
Redis web UI for cache management.
- **Web UI**: http://localhost:5540
- **Auto-starts** with Docker services
- Auto-discovers Redis at `localhost:6379`

### Mailpit
Email testing tool that captures all SMTP emails.
- **Web UI**: http://localhost:8025
- **SMTP**: localhost:1025
- Automatically enabled when `NODE_ENV=development`

### deploy-fly.sh
Production deployment script for Fly.io.

**Usage:**
```bash
./scripts/deploy-fly.sh [command]

Commands:
  setup         - Full first-time setup
  secrets       - Update secrets for both apps
  deploy        - Deploy both apps
  deploy-core   - Deploy Core only
  deploy-gw     - Deploy Gateway only
  status        - Show app status
  logs          - Show logs
```

## Database Scripts

Database-related scripts are located in `packages/db/scripts/`.

### seed-project-app.ts

Creates a complete project setup with:
- A demo user (if no users exist)
- A new project for the user
- An app within that project
- A payment provider configuration (Stripe test mode)

**Usage:**
```bash
pnpm seed:project
```
