# Proofa Development Guide

This guide covers everything you need to set up and develop on the Proofa monorepo.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Docker Services](#docker-services)
- [Environment Configuration](#environment-configuration)
- [Running the Applications](#running-the-applications)
- [Development Workflow](#development-workflow)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Node.js**: v22+ (check `.nvmrc`)
- **pnpm**: v8+ (`npm install -g pnpm`)
- **Docker**: For local Redis and database
- **Git**: For version control

## Initial Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd proofa-core
pnpm install
```

### 2. Start Docker Services

```bash
# Start core services (Redis, LibSQL)
pnpm docker:up

# Or start with debug tools (Redis Commander, Mailpit)
pnpm docker:up:all

# Check status
pnpm docker:status

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down
```

**Docker Services:**

| Service | Port | Purpose |
|---------|------|---------|
| Redis | 6379 | Cache server |
| Redis REST | 8079 | Upstash-compatible REST API |
| LibSQL | 8080 | Turso-compatible database |
| Redis Commander | 8081 | Redis GUI (debug profile) |
| Mailpit Web | 8025 | Email testing UI (debug profile) |
| Mailpit SMTP | 1025 | Email testing SMTP (debug profile) |

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Database (Local Docker)
DATABASE_URL=http://localhost:8080
DATABASE_AUTH_TOKEN=

# Redis (Local Docker)
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=local-dev-token

# OAuth - Google (Required)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth - GitHub (Optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Secrets (generate with: openssl rand -hex 32)
JWT_SECRET=your-32-char-jwt-secret
SESSION_SECRET=your-32-char-session-secret
S2S_SECRET=your-s2s-secret-for-service-calls
```

### 4. Set Up OAuth Apps

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URI: `http://localhost:3003/v1/auth/callback/google`
6. Copy Client ID and Client Secret

**GitHub OAuth:**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set callback URL: `http://localhost:3003/v1/auth/callback/github`
4. Copy Client ID and Client Secret

### 5. Run Migrations

```bash
pnpm db:migrate
```

## Running the Applications

### Start All Services

```bash
pnpm dev
```

This starts all applications with hot reload.

### Start Individual Services

```bash
# Core - Authentication service (Port 3003)
pnpm --filter @proofa/core dev

# Gateway - BFF server (Port 3004)
pnpm --filter @proofa/gateway dev

# User Dashboard (Port 3001)
pnpm --filter @proofa/dashboard-user dev

# Admin Dashboard (Port 3002)
pnpm --filter @proofa/dashboard-admin dev

# Home Page (Port 4321)
pnpm --filter @proofa/dashboard-home dev
```

### Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| User Dashboard | http://localhost:3001 | Profile & sessions |
| Admin Dashboard | http://localhost:3002 | Projects & apps management |
| Core API | http://localhost:3003 | OAuth & identity |
| Gateway API | http://localhost:3004 | BFF for dashboards |
| Home Page | http://localhost:4321 | Landing page |

## Development Workflow

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│           Frontend (React/Astro)                         │
│  User Dashboard │ Admin Dashboard │ Home Page            │
│     :3001       │     :3002       │   :4321              │
└─────────────────┼─────────────────┴──────────────────────┘
                  │
        ┌─────────┴─────────┐
        │   Gateway BFF     │
        │      :3004        │ ← Session bridge, Admin CRUD
        └─────────┬─────────┘
                  │ S2S (X-Proofa-Service-Token)
        ┌─────────┴─────────┐
        │   Core Service    │
        │      :3003        │ ← OAuth, OTP, Identities
        └─────────┬─────────┘
                  │
        ┌─────────┴─────────┐
        │ Turso │ Redis     │
        │ :8080 │ :8079     │
        └───────────────────┘
```

### Package Structure

```
packages/
├── shared/     # Types, constants, ID generators
├── db/         # Drizzle schema + queries
├── auth/       # OAuth adapters, crypto, sessions
└── redis/      # Cache, rate limiting, session store

apps/
├── core/       # Authentication service
├── gateway/    # BFF server
└── dashboard/
    ├── user/   # User profile UI
    ├── admin/  # Admin CRUD UI
    └── home/   # Astro landing page
```

### Code Quality

```bash
# Type checking
pnpm typecheck

# Linting (Biome)
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Format code
pnpm format

# Check all (lint + format + typecheck)
pnpm biome check --write .
```

## Common Tasks

### Add a New Database Table

1. Define schema in `packages/db/src/schema.ts`
2. Create queries in `packages/db/src/queries.ts`
3. Export from `packages/db/src/index.ts`
4. Run migration: `pnpm db:migrate`

### Add a New API Endpoint

1. Create route in `apps/gateway/src/routes/` or `apps/core/src/routes/`
2. Import and mount in the app's `index.ts`
3. Add types if needed in `packages/shared/src/types/`

### Add a React Page

1. Create component in `apps/dashboard/*/src/pages/`
2. Add query hook in `apps/dashboard/*/src/hooks/`
3. Add route in `apps/dashboard/*/src/App.tsx`

### Generate Secure Secrets

```bash
# Generate 32-byte hex secret
openssl rand -hex 32
```

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port
lsof -ti :3003 | xargs kill -9
```

### Docker Services Not Running

```bash
# Check status
pnpm docker:status

# View logs for issues
pnpm docker:logs

# Restart services
pnpm docker:down && pnpm docker:up
```

### Database Connection Error

```bash
# Check LibSQL is running
curl http://localhost:8080/health

# Verify DATABASE_URL in .env.local
echo $DATABASE_URL
```

### Redis Connection Error

```bash
# Check Redis REST is running
curl http://localhost:8079/

# Verify Redis config in .env.local
```

### OAuth Not Working

1. Verify callback URLs match in OAuth provider settings
2. Check OAuth client ID/secret in `.env.local`
3. Clear browser cookies and retry
4. Check Core logs for OAuth errors

### Session Issues

1. Check Redis is running: `pnpm docker:status`
2. Clear Redis cache if needed (use Redis Commander at :8081)
3. Verify SESSION_SECRET is set in `.env.local`

### Build Errors

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### TypeScript Errors

```bash
# Check all packages
pnpm typecheck

# Check specific package
pnpm --filter @proofa/core typecheck
```

## Quick Reference

### ID Format

| Entity | Example | Length |
|--------|---------|--------|
| User | `U0sFFDmgde` | 11 |
| Session | `S0mK9pQxCa` | 13 |
| Project | `P0kMn7pQx2` | 11 |
| App | `A0xKmP9n5d` | 11 |
| Auth Code | `C0pN7mKqXc9A` | 14 |

### Session TTLs

- **Core session**: 7 days rolling
- **App session**: 1-365 days (configurable per app, default 28)

### Rate Limits

- **OTP request**: 5 per hour per email
- **OTP verify**: 5 per 5 minutes per email
- **Lockout**: 3 failures = 30-minute ban

### API Endpoints

**Core (3003):**
```
GET  /v1/auth/start          # Start OAuth flow
GET  /v1/auth/callback/:p    # OAuth callback
POST /v1/auth/exchange       # Exchange auth code (S2S)
POST /v1/email/start         # Send OTP
POST /v1/email/verify        # Verify OTP
```

**Gateway (3004):**
```
GET  /auth/start             # Redirect to Core
GET  /auth/callback          # Handle code exchange
POST /v1/auth/logout         # Logout
GET  /v1/me                  # User profile
PATCH /v1/me                 # Update profile
GET  /v1/me/sessions         # List sessions
DELETE /v1/me/sessions       # Logout all
GET/POST /v1/admin/projects  # Project CRUD
```

## Additional Resources

- [Hono Documentation](https://hono.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Turso Documentation](https://docs.turso.tech)
- [Upstash Documentation](https://upstash.com/docs)
- [Biome Documentation](https://biomejs.dev)
