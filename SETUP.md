# Setup & Development Guide

Complete guide for setting up and running Proofa locally.

---

## Quick Start (5 Minutes)

### Prerequisites

- **Node.js** 22+
- **pnpm** 8+
- **Docker** with Docker Compose

### Automated Setup

```bash
# 1. Clone and install
git clone https://github.com/0xdps/proofa-core.git
cd proofa-core
pnpm install

# 2. Start infrastructure (PostgreSQL + Redis)
docker-compose up -d

# 3. Setup database
cd packages/db && pnpm db:push && cd ../..

# 4. Build packages
pnpm build:packages

# 5. Start development
pnpm dev
```

### Access Applications

| Service | URL | Port |
|---------|-----|------|
| Admin Dashboard | http://localhost:5174 | 5174 |
| User Dashboard | http://localhost:5173 | 5173 |
| API Gateway | http://localhost:3004 | 3004 |
| Core Service | http://localhost:3003 | 3003 |
| Marketing Site | http://localhost:4321 | 4321 |
| Documentation | http://localhost:4322 | 4322 |
| PostgreSQL | localhost | 5432 |
| Redis | localhost | 6379 |

---

## Detailed Setup

### 1. Environment Configuration

```bash
# Copy environment templates
cp .env.example .env
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```bash
# Required: Generate encryption keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to ENCRYPTION_KEY

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to SESSION_SECRET
```

#### Core Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/proofa"

# Redis
REDIS_URL="redis://localhost:6379"

# Security (REQUIRED)
ENCRYPTION_KEY="<64-char hex string>"
SESSION_SECRET="<128-char hex string>"

# API URLs
CORE_API_URL="http://localhost:3003"
GATEWAY_API_URL="http://localhost:3004"

# Service-to-Service Authentication
X_PROOFA_SERVICE_TOKEN="<32+ char token>"

# Session Configuration
# Users: 365 days rolling
CORE_SESSION_TTL_SECONDS=31536000
# Admins: 2 hours + 15-min inactivity timeout (Auto extended to 7 days in dev mode)
CORE_ADMIN_SESSION_TTL_SECONDS=7200
CORE_ADMIN_INACTIVITY_TIMEOUT_SECONDS=900
# Gateway: 30 days default (1-365 days configurable per-app)
GATEWAY_SESSION_DEFAULT_TTL_SECONDS=2592000
```

#### Optional: OAuth Providers

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify services
docker-compose ps
```

### 3. Database Setup

```bash
# Navigate to database package
cd packages/db

# Run migrations
pnpm db:push

# (Optional) Open Drizzle Studio
pnpm db:studio
# Opens at http://localhost:4983

cd ../..
```

### 4. Build Packages

```bash
# Build all shared packages
pnpm build:packages

# Or build individually
pnpm --filter @proofa/db build
pnpm --filter @proofa/cache build
pnpm --filter @proofa/shared build
pnpm --filter @proofa/auth build
```

### 5. Start Development

```bash
# Start all services
pnpm dev

# Or start specific services
pnpm dev:gateway     # API Gateway only
pnpm dev:core        # Core service only
pnpm dev:admin       # Admin dashboard only
pnpm dev:user        # User dashboard only
```

---

## Development Workflow

### Running Services

```bash
# All services
pnpm dev

# Specific service
pnpm --filter @proofa/gateway dev
pnpm --filter @proofa/core dev
pnpm --filter @proofa/dashboard-admin dev
pnpm --filter @proofa/dashboard-user dev
```

### Database Operations

```bash
# Run migrations
pnpm db:migrate

# Push schema changes (development)
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm db:studio

# Generate new migration
cd packages/db
pnpm drizzle-kit generate

# Check schema drift
pnpm drizzle-kit check
```

### Building

```bash
# Build everything
pnpm build

# Build packages only
pnpm build:packages

# Build specific package
pnpm --filter @proofa/db build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Code Quality

```bash
# Lint all packages
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type check
pnpm typecheck
```

---

## Project Structure

```
proofa-core/
├── apps/
│   ├── services/
│   │   ├── gateway/          # API Gateway (Hono)
│   │   ├── core/             # Core Service (Hono)
│   │   └── workers/          # Background workers
│   └── dashboard/
│       ├── admin/            # Admin Dashboard (React)
│       ├── user/             # User Dashboard (React)
│       ├── home/             # Marketing Site (Astro)
│       └── docs/             # Documentation (Starlight)
├── packages/
│   ├── db/                   # Database layer (Drizzle ORM)
│   ├── cache/                # Redis client
│   ├── auth/                 # Auth utilities
│   ├── client/               # TypeScript SDK
│   ├── react/                # React components
│   ├── components/           # UI components
│   ├── shared/               # Shared utilities
│   └── styles/               # Shared styles
├── docs/                     # Documentation
└── scripts/                  # Development scripts
```

---

## Common Tasks

### Adding a Database Table

1. Add table schema in `packages/db/src/schema.ts`
2. Add query helpers in `packages/db/src/queries.ts`
3. Export from `packages/db/src/index.ts`
4. Generate migration: `pnpm drizzle-kit generate`
5. Run migration: `pnpm db:push`
6. Rebuild: `pnpm --filter @proofa/db build`

### Adding an API Route

1. Create route file in `apps/services/gateway/src/routes/` or `apps/services/core/src/routes/`
2. Define route handlers with Hono
3. Add validation schemas in `packages/shared/src/types/schemas/`
4. Register route in main router
5. Add tests

### Debugging

#### VS Code Debugger

1. Set breakpoints in your code
2. Press F5 or use "Run and Debug" panel
3. Select configuration:
   - "Debug Gateway" - Debug API Gateway
   - "Debug Core" - Debug Core Service
   - "Debug Admin" - Debug Admin Dashboard

#### Structured Logging

```typescript
import { createLogger } from '@proofa/shared';

const log = createLogger('my-module');

log.info('Information message');
log.error({ err }, 'Error message');
log.debug({ data }, 'Debug message');
```

---

## Docker Services

### Managing Docker

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres

# Stop all services
docker-compose down

# View logs
docker-compose logs -f postgres

# Restart service
docker-compose restart redis

# Remove all data (CAUTION)
docker-compose down -v
```

### Database Access

```bash
# Using psql
docker-compose exec postgres psql -U postgres -d proofa

# Connection details for external client:
# Host: localhost
# Port: 5432
# Database: proofa
# User: postgres
# Password: postgres
```

### Redis Access

```bash
# Using redis-cli
docker-compose exec redis redis-cli

# Common commands:
> KEYS *
> GET session:abc123
> DEL session:abc123
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3004

# Kill process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Build Failures

```bash
# Clean all node_modules
pnpm clean:all

# Reinstall dependencies
pnpm install

# Rebuild packages
pnpm build:packages
```

### TypeScript Errors

```bash
# Rebuild packages in correct order
pnpm build:packages

# Clear TypeScript cache
rm -rf packages/*/dist
rm -rf apps/*/dist
pnpm build
```

---

## Rate Limiting

Rate limiting is automatically disabled in development mode (`NODE_ENV=development`).

Production limits:
- Authentication: 10 requests per 5 minutes
- API: 100 requests per minute (configurable per-app)
- Admin: 60 requests per minute
- Webhooks: 100 requests per minute

---

## Performance Tips

### Speed Up Builds

1. Use Turborepo cache (already configured)
2. Only build what changed: `pnpm build --filter=...[HEAD]`
3. Use `--no-deps` flag when building single package

### Speed Up Development

1. Only run services you need
2. Use `pnpm dev:gateway` instead of `pnpm dev`
3. Disable source maps in production mode

---

## Getting Help

- **Documentation**: See `/docs` directory
- **Architecture**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Security**: [docs/ADMIN_SESSION_SECURITY.md](./docs/ADMIN_SESSION_SECURITY.md)
- **GitHub Issues**: https://github.com/0xdps/proofa-core/issues

---

**Last Updated**: January 22, 2026
