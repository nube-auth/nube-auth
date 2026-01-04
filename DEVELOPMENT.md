# Development Guide

Complete guide for local development setup and workflows.

---

## Prerequisites

- **Node.js** 22+ ([Download](https://nodejs.org))
- **pnpm** 8+ (Install: `npm install -g pnpm`)
- **Docker** & **Docker Compose** ([Download](https://docker.com))
- **Git**

---

## Quick Start

### Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourorg/proofa-core.git
cd proofa-core

# Install dependencies
pnpm install

# Run the automated setup script
./scripts/dev-setup.sh

# Start all development servers
pnpm dev
```

The setup script will automatically:
- ✅ Check prerequisites
- ✅ Create `.env.local` with secure defaults
- ✅ Generate encryption keys and secrets
- ✅ Start Docker containers (PostgreSQL + Redis)
- ✅ Run database migrations
- ✅ Build all packages
- ✅ Show next steps

### Manual Setup

If you prefer to set things up manually:

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Setup Environment

```bash
# Copy environment templates
cp .env.example .env
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```bash
# Required: Generate a 32-byte encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to ENCRYPTION_KEY

# Required: Generate a 64-byte session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to SESSION_SECRET
```

#### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps
```

#### 4. Setup Database

```bash
# Navigate to db package
cd packages/db

# Run migrations
pnpm db:push

# (Optional) Seed sample data
pnpm db:seed

cd ../..
```

#### 5. Build Packages

```bash
# Build all shared packages
pnpm build:packages

# Or build individually
pnpm --filter @proofa/db build
pnpm --filter @proofa/cache build
pnpm --filter @proofa/shared build
pnpm --filter @proofa/auth build
pnpm --filter @proofa/client build
pnpm --filter @proofa/react build
```

#### 6. Start Development Servers

```bash
# Start all services
pnpm dev

# Or start individually:
pnpm --filter @proofa/gateway dev      # API Gateway (port 3004)
pnpm --filter @proofa/core dev         # Core Service (port 3003)
pnpm --filter @proofa/workers dev      # Workers Service (background jobs)
pnpm --filter @proofa/dashboard-admin dev  # Admin UI (port 5174)
pnpm --filter @proofa/dashboard-user dev   # User UI (port 5173)
pnpm --filter @proofa/dashboard-home dev   # Marketing (port 4321)
pnpm --filter @proofa/docs dev         # Documentation (port 4322)
```

---

## Environment Variables

### Core Configuration

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/proofa"

# Redis
REDIS_URL="redis://localhost:6379"

# Security (REQUIRED - Generate with crypto.randomBytes)
ENCRYPTION_KEY="<64-char hex string>"
SESSION_SECRET="<128-char hex string>"

# API URLs
CORE_API_URL="http://localhost:3003"
GATEWAY_API_URL="http://localhost:3004"

# CORS Origins (comma-separated)
CORS_ORIGINS="http://localhost:5173,http://localhost:5174"

# Service-to-Service (Core <-> Gateway)
# Must match between Core + Gateway
X_PROOFA_SERVICE_TOKEN="<32+ char token>"
```

### Session Configuration

```bash
# Session TTL in seconds (default: 31536000 = 365 days)
SESSION_TTL=31536000

# Session ID length in bytes (default: 32)
SESSION_ID_BYTES=32
```

### OAuth Providers (Optional)

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"
```

### Email Configuration (Optional)

```bash
# SMTP Settings
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Proofa <noreply@proofa.sh>"
```

---

## Development Workflow

### Running Services

```bash
# All services
pnpm dev

# Specific service
pnpm dev:gateway     # API Gateway only
pnpm dev:core        # Core service only
pnpm dev:admin       # Admin dashboard only
pnpm dev:user        # User dashboard only

# Stop all services
# Press Ctrl+C or kill the process
```

### Database Operations

```bash
# Run migrations
pnpm db:migrate

# Push schema changes (development only)
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

# Build apps only
pnpm build:apps

# Build specific package
pnpm --filter @proofa/db build
```

### Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run E2E tests
pnpm test:e2e

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

# Type check all packages
pnpm typecheck
```

---

## Project Structure

```
proofa-core/
├── apps/
│   ├── gateway/              # API Gateway (Hono)
│   │   ├── src/
│   │   │   ├── routes/       # API routes
│   │   │   ├── middleware/   # Auth, rate limit, CSRF
│   │   │   └── services/     # Business logic
│   │   └── package.json
│   ├── core/                 # Core Service (Hono)
│   │   ├── src/
│   │   │   ├── routes/       # API routes
│   │   │   └── lib/          # Core utilities
│   │   └── package.json
│   └── dashboard/
│       ├── admin/            # Admin Dashboard (React)
│       ├── user/             # User Dashboard (React)
│       ├── home/             # Marketing Site (Astro)
│       └── docs/             # Documentation (Starlight)
├── packages/
│   ├── db/                   # Database layer
│   │   ├── src/
│   │   │   ├── schema.ts     # Drizzle schema
│   │   │   └── queries.ts    # Query helpers
│   │   └── drizzle/          # Migrations
│   ├── cache/                # Redis client
│   ├── auth/                 # Auth utilities
│   ├── client/               # TypeScript SDK
│   ├── react/                # React components
│   └── shared/               # Shared utilities
├── docs/                     # Documentation
│   ├── security/             # Security docs
│   └── PRODUCT_SPEC.md       # Product specification
├── scripts/                  # Development scripts
├── docker-compose.yml        # Docker services
└── turbo.json               # Turborepo config
```

---

## Common Tasks

### Adding a New Package

```bash
# Create package directory
mkdir -p packages/new-package/src

# Create package.json
cd packages/new-package
pnpm init

# Add to workspace
# Edit pnpm-workspace.yaml to include new package

# Install dependencies in package
pnpm add <dependency>

# Build from root
cd ../..
pnpm --filter @proofa/new-package build
```

### Adding a New API Route

1. Create route file in `apps/gateway/src/routes/` or `apps/core/src/routes/`
2. Define route handlers with Hono
3. Add validation schemas in `packages/shared/src/types/schemas/`
4. Register route in main router
5. Add tests in `__tests__` directory

### Adding a Database Table

1. Add table schema in `packages/db/src/schema.ts`
2. Add query helpers in `packages/db/src/queries.ts`
3. Export from `packages/db/src/index.ts`
4. Generate migration: `pnpm drizzle-kit generate`
5. Run migration: `pnpm db:push`
6. Rebuild: `pnpm --filter @proofa/db build`

### Debugging

#### Using VS Code Debugger

1. Set breakpoints in your code
2. Press F5 or use "Run and Debug" panel
3. Select configuration:
   - "Debug Gateway" - Debug API Gateway
   - "Debug Core" - Debug Core Service
   - "Debug Admin" - Debug Admin Dashboard

#### Using Console Logs

```typescript
import { createLogger } from '@proofa/shared';

const log = createLogger('my-module');

log.info('Information message');
log.error({ err }, 'Error message');
log.debug({ data }, 'Debug message');
```

#### Viewing Logs

```bash
# Docker logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Application logs are in console output
```

---

## Docker Services

### Available Services

- **PostgreSQL** (port 5432) - Primary database
- **Redis** (port 6379) - Cache and sessions
- **Mailpit** (ports 1025/8025) - Email testing (optional)

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

# Using external client
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

# Commands
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

## Performance Tips

### Speed Up Builds

1. Use Turborepo cache: Already configured
2. Only build what changed: `pnpm build --filter=...[HEAD]`
3. Use `--no-deps` flag when building single package

### Speed Up Development

1. Only run services you need
2. Use `pnpm dev:gateway` instead of `pnpm dev`
3. Disable source maps in production mode

### Database Performance

1. Add indexes for frequently queried columns
2. Use connection pooling (already configured)
3. Monitor slow queries with `EXPLAIN ANALYZE`

---

## Getting Help

- **Documentation**: See `/docs` directory
- **Security**: See `/docs/security/README.md`
- **Issues**: Check existing issues or create new one
- **Discord**: Join our community
- **Email**: dev@proofa.sh

---

## Next Steps

After setup is complete:

1. ✅ Read the [Product Spec](./docs/PRODUCT_SPEC.md)
2. ✅ Check [Security Documentation](./docs/security/README.md)
3. ✅ Review [API Documentation](./apps/gateway/README.md)
4. ✅ Explore example code in `/examples`
5. ✅ Join our Discord community

---

**Last Updated**: January 1, 2026  
**Maintainers**: Proofa Team
