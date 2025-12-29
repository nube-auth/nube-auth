# Local Development Setup Summary

**Date**: December 29, 2024  
**Status**: ✅ Complete

---

## Overview

Implemented a comprehensive local development environment with Docker containers for PostgreSQL and Redis, along with a two-tier environment configuration system.

---

## What Was Implemented

### 1. Docker Compose Configuration ✅

Updated `docker-compose.yml` with:

**Services:**
- **PostgreSQL 16** - Main database (port 5432)
- **Redis 7** - Cache and sessions (port 6379)
- **Redis Commander** - Web UI for Redis debugging (port 8081, debug profile)
- **Mailpit** - Local email testing (ports 8025/1025, email profile)

**Features:**
- Health checks for all services
- Persistent volumes for data
- Named network (proofa-network)
- Profile support for optional services
- Auto-restart policies

**Removed:**
- LibSQL/Turso server (migrated to PostgreSQL)
- Upstash Redis REST proxy (using native Redis)

### 2. Environment Configuration System ✅

**Two-Tier System:**
1. **`.env`** - Base configuration (team defaults)
2. **`.env.local`** - Local overrides (personal settings, gitignored)

**Loading Order:**
- `.env` loads first (base values)
- `.env.local` loads second (overrides base values)

**Files Created:**
- `.env.example` - Template for base configuration
- `.env.local.example` - Template for local overrides

### 3. Environment Loader Package ✅

**New File:** `packages/shared/src/env-loader.ts`

**Functions:**
- `loadEnv()` - Loads `.env` and `.env.local` in order
- `getRequiredEnv()` - Get required environment variable with validation
- `getOptionalEnv()` - Get optional environment variable with default
- `validateEnv()` - Validate multiple required variables at once

**Features:**
- Automatic detection and loading of both env files
- Clear console output for debugging
- Error handling and warnings
- Exported from `@proofa/shared` package

### 4. Updated Gateway Configuration ✅

**File:** `apps/gateway/src/config/env.ts`

**Changes:**
- Now uses `loadEnv()` from `@proofa/shared`
- Automatically loads both `.env` and `.env.local`
- Improved error messages
- Better validation

### 5. Automated Setup Script ✅

**File:** `scripts/dev-setup.sh`

**Features:**
- Checks prerequisites (Node.js, pnpm, Docker)
- Installs dependencies
- Creates environment files from templates
- Starts Docker services
- Waits for services to be healthy
- Runs database migrations
- Builds core packages
- Provides helpful success message

**Usage:**
```bash
./scripts/dev-setup.sh
```

### 6. Comprehensive Documentation ✅

**New File:** `LOCAL_DEVELOPMENT.md`

**Contents:**
- Complete setup guide
- Environment configuration details
- Docker service management
- Database operations
- Redis usage
- Email testing with Mailpit
- Development workflow
- Troubleshooting guide
- Team workflow best practices

**Updated Files:**
- `README.md` - Added automated setup option and local dev reference
- `QUICKSTART.md` - Updated environment setup section
- `.gitignore` - Already configured to ignore `.env.local`

---

## File Structure

```
proofa-core/
├── .env.example                      # Base configuration template
├── .env.local.example                # Local overrides template
├── docker-compose.yml                # Updated with PostgreSQL & Redis
├── LOCAL_DEVELOPMENT.md              # Comprehensive local dev guide
├── LOCAL_DEV_SETUP_SUMMARY.md        # This file
├── scripts/
│   └── dev-setup.sh                  # Automated setup script
└── packages/
    └── shared/
        └── src/
            ├── env-loader.ts         # Environment loader utility
            └── index.ts              # Exports env-loader functions
```

---

## Environment Variables

### Required Variables
```bash
DATABASE_URL=postgresql://proofa:proofa@localhost:5432/proofa
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=re_your_api_key
ENCRYPTION_KEY=<64_char_hex_string>
```

### Optional Variables
```bash
# OAuth Platform Defaults
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Application URLs
GATEWAY_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:5173
USER_PORTAL_URL=http://localhost:5174

# Node Environment
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

---

## Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **postgres** | postgres:16-alpine | 5432 | Main database |
| **redis** | redis:7-alpine | 6379 | Cache & sessions |
| **redis-commander** | rediscommander/redis-commander | 8081 | Redis Web UI (debug profile) |
| **mailpit** | axllent/mailpit | 8025, 1025 | Email testing (email profile) |

### Service Management

```bash
# Start core services
docker compose up -d

# Start with Redis Commander
docker compose --profile debug up -d

# Start with Mailpit
docker compose --profile email up -d

# Start everything
docker compose --profile debug --profile email up -d

# View status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove data
docker compose down -v
```

---

## Development Workflow

### Quick Start
```bash
# 1. Automated setup
./scripts/dev-setup.sh

# 2. Edit .env with your values
# ENCRYPTION_KEY and RESEND_API_KEY

# 3. Start development
pnpm dev
```

### Manual Setup
```bash
# 1. Install
pnpm install

# 2. Environment
cp .env.example .env
cp .env.local.example .env.local
# Edit .env

# 3. Docker
docker compose up -d

# 4. Database
cd packages/db && pnpm run db:push && cd ../..

# 5. Build
pnpm --filter @proofa/db run build
pnpm --filter @proofa/cache run build
pnpm --filter @proofa/shared run build

# 6. Develop
pnpm dev
```

---

## Team Workflow

### Best Practices

1. **Commit `.env.example`** ✅
   - Contains team defaults
   - No secrets
   - Well documented

2. **Each developer creates `.env`** ✅
   - Copy from `.env.example`
   - Add real values
   - Never commit

3. **Each developer creates `.env.local`** ✅
   - Personal overrides only
   - Local testing settings
   - Never commit
   - Optional (not required)

4. **Update `.env.example` for new variables** ✅
   - Add placeholder values
   - Document purpose
   - Commit changes

### Example Workflow

**Adding a new environment variable:**
```bash
# 1. Add to .env.example
echo "NEW_API_KEY=your_api_key_here" >> .env.example

# 2. Commit
git add .env.example
git commit -m "Add NEW_API_KEY environment variable"

# 3. Team members update their .env
# Each developer adds their own value to .env
```

**Personal overrides:**
```bash
# Developer A uses local Mailpit
echo "RESEND_API_KEY=re_test_key" >> .env.local

# Developer B uses real Resend
# (keeps RESEND_API_KEY from .env)

# Developer C uses different Redis
echo "REDIS_URL=redis://localhost:6380" >> .env.local
```

---

## Key Benefits

### 1. Security ✅
- Secrets never committed to git
- `.env.local` is gitignored
- Team can share configuration without sharing secrets

### 2. Flexibility ✅
- Base configuration in `.env`
- Personal overrides in `.env.local`
- Easy to switch between environments

### 3. Docker-Based ✅
- Consistent environment across team
- Easy to start/stop services
- Persistent data with volumes
- Health checks ensure readiness

### 4. Developer Experience ✅
- Automated setup script
- Comprehensive documentation
- Clear error messages
- Easy troubleshooting

### 5. Team Collaboration ✅
- Shared defaults in `.env.example`
- Personal settings in `.env.local`
- No secret sharing needed
- Easy onboarding

---

## Migration Notes

### From Previous Setup

**Database:**
- ❌ LibSQL/Turso server → ✅ PostgreSQL 16
- ❌ `DATABASE_AUTH_TOKEN` → ✅ Standard PostgreSQL connection

**Redis:**
- ❌ Upstash REST API → ✅ Native Redis protocol
- ❌ `UPSTASH_REDIS_REST_URL` → ✅ `REDIS_URL`
- ❌ `UPSTASH_REDIS_REST_TOKEN` → (removed)

**Environment:**
- ❌ Single `.env` file → ✅ `.env` + `.env.local`
- ❌ Manual loading → ✅ Automatic loading with `loadEnv()`

---

## Testing

### Verify Setup

```bash
# 1. Check Docker services
docker compose ps
# All services should be "running"

# 2. Test PostgreSQL
psql postgresql://proofa:proofa@localhost:5432/proofa -c "SELECT version();"

# 3. Test Redis
redis-cli -h localhost -p 6379 ping
# Should return: PONG

# 4. Test API
curl http://localhost:3000/health
# Should return: {"status":"ok"}

# 5. Check environment loading
cd apps/gateway
node -e "require('./dist/config/env.js')"
# Should load without errors
```

---

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's using the port
lsof -ti:5432
lsof -ti:6379

# Kill process
lsof -ti:5432 | xargs kill -9
```

**Environment not loading:**
```bash
# Check files exist
ls -la .env .env.local

# Check syntax
cat .env | grep -v '^#' | grep '='
```

**Docker services not starting:**
```bash
# View logs
docker compose logs postgres
docker compose logs redis

# Restart service
docker compose restart postgres
```

**Build errors:**
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

---

## Documentation References

- **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** - Complete local development guide
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide
- **[ENV_SETUP.md](./ENV_SETUP.md)** - Environment configuration details
- **[README.md](./README.md)** - Project overview
- **[docker-compose.yml](./docker-compose.yml)** - Docker services configuration
- **[.env.example](./.env.example)** - Environment template
- **[.env.local.example](./.env.local.example)** - Local overrides template

---

## Next Steps

Developers should:

1. **Run setup script:**
   ```bash
   ./scripts/dev-setup.sh
   ```

2. **Edit `.env`:**
   - Set `ENCRYPTION_KEY`
   - Set `RESEND_API_KEY`
   - Optional: Set OAuth credentials

3. **Create `.env.local` (optional):**
   - Add personal overrides
   - Local testing settings

4. **Start developing:**
   ```bash
   pnpm dev
   ```

5. **Access services:**
   - Admin Dashboard: http://localhost:5173
   - API Gateway: http://localhost:3000
   - Redis Commander: http://localhost:8081 (with `--profile debug`)
   - Mailpit: http://localhost:8025 (with `--profile email`)

---

## Summary

✅ **Complete local development environment**  
✅ **Docker Compose with PostgreSQL & Redis**  
✅ **Two-tier environment configuration**  
✅ **Automated setup script**  
✅ **Comprehensive documentation**  
✅ **Team-friendly workflow**  
✅ **Built and tested**  

**All features implemented and ready to use!** 🎉

---

**Maintained by**: Proofa Team  
**Last Updated**: December 29, 2024  
**Version**: 1.0.0
