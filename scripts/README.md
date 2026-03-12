# Scripts

Utility scripts for development, Docker management, and deployment.

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-dev.sh` | One-time local dev setup | `pnpm setup` |
| `docker-local.sh` | Docker service management | `pnpm docker:up` |
| `deploy-fly.sh` | Fly.io production deployment | `./scripts/deploy-fly.sh deploy` |

---

## setup-dev.sh

One-time setup for new developers. Run once after cloning the repo.

```bash
pnpm setup
```

**What it does:**
1. Checks prerequisites (Node.js 22+, pnpm, Docker)
2. Creates `.env.local` from `.env.example` with generated secrets
3. Installs dependencies (`pnpm install`)
4. Starts PostgreSQL and Redis via Docker
5. Runs database migrations (`pnpm db:push`)
6. Builds shared packages

---

## docker-local.sh

Manages local Docker services (PostgreSQL, Redis, Mailpit).

```bash
# Start core services (PostgreSQL + Redis)
pnpm docker:up

# Start all services (+ Mailpit for email testing)
pnpm docker:up:all

# Stop all services
pnpm docker:down

# View logs
pnpm docker:logs

# Show container status
pnpm docker:status

# Stop and remove all volumes (deletes data)
pnpm docker:clean
```

### Docker Services

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| PostgreSQL | `postgres:17-alpine` | 5432 | Primary database |
| Redis | `redis:7-alpine` | 6379 | Sessions, cache, rate limiting, queue |
| Mailpit | `axllent/mailpit:latest` | 1025 (SMTP), 8025 (Web UI) | Dev email testing |

### Direct Database Access

```bash
# PostgreSQL shell
docker compose exec postgres psql -U nube-auth -d nube-auth

# Redis CLI
docker compose exec redis redis-cli
```

---

## deploy-fly.sh

Production deployment to Fly.io.

```bash
./scripts/deploy-fly.sh [command]
```

| Command | Description |
|---------|-------------|
| `setup` | Full first-time setup (create apps, secrets, deploy, domains) |
| `secrets` | Set/update secrets for both apps |
| `secrets-core` | Set/update secrets for Core only |
| `secrets-gw` | Set/update secrets for Gateway only |
| `deploy` | Deploy both apps |
| `deploy-core` | Deploy Core only |
| `deploy-gw` | Deploy Gateway only |
| `domains` | Add custom domains |
| `status` | Show app status |
| `logs` / `logs-core` / `logs-gw` | Show logs |

**Requires:** `fly` CLI installed (`brew install flyctl`) and `.env` with production secrets.

---

## Development Tools

### Drizzle Studio (Database GUI)
```bash
pnpm db:studio
# Opens at https://local.drizzle.studio
```

### Mailpit (Email Testing)
Start with `pnpm docker:up:all`, then open http://localhost:8025.
All emails sent in development mode are captured here instead of being delivered.

---

## Database Scripts

Located in `apps/packages/db/scripts/`. See [the DB scripts README](../apps/packages/db/scripts/README.md) for details.

```bash
# Create demo project with user, app, and OAuth config
pnpm seed:project

# Push schema changes to database
pnpm db:push

# Generate a new migration
pnpm db:generate

# Open Drizzle Studio
pnpm db:studio
```
