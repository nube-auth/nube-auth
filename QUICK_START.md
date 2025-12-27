# Quick Reference: Local Development Setup

## TL;DR - Get Started in 3 Steps

```bash
# 1. Copy environment file
cp .env.example .env.local

# 2. Start Docker services
pnpm docker:up

# 3. Start everything
pnpm dev
```

Visit:
- **Admin Dashboard:** http://localhost:3002
- **User Dashboard:** http://localhost:3001
- **Core API:** http://localhost:3003
- **Gateway API:** http://localhost:3004
- **Home:** http://localhost:4321
- **Docs:** http://localhost:4322

---

## Service Architecture (Local Development)

```
┌─────────────────────────────────────────────────────┐
│         React Dashboards (Vite)                     │
│  Admin:3002 │ User:3001 │ Home:4321 │ Docs:4322    │
└──────────────────┬──────────────────────────────────┘
                   │ API Calls
        ┌──────────┴──────────┐
        │  Gateway BFF        │
        │  http://localhost:3004
        └──────────┬──────────┘
                   │ S2S Calls
        ┌──────────┴──────────┐
        │  Core API           │
        │  http://localhost:3003
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │ LibSQL (8080)       │ Redis (8079)
        │ Mailpit (1025)      │
        └─────────────────────┘
```

---

## Required Environment Variables

### For `.env.local`

```bash
# OAuth credentials (required)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Secrets (generate: openssl rand -hex 32)
JWT_SECRET=...
SESSION_SECRET=...
S2S_SECRET=...

# Database
DATABASE_URL=http://localhost:8080
DATABASE_AUTH_TOKEN=

# Redis
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=local-dev-token
```

### Frontend URLs (defaults work now!)

```bash
# These have been updated to use localhost by default
# You only need to set these if running on different ports:

VITE_GATEWAY_URL=http://localhost:3004       # Gateway API
VITE_CORE_URL=http://localhost:3003          # Core API
VITE_HOME_URL=http://localhost:4321          # Home page
VITE_DOCS_URL=http://localhost:4322          # Docs site
```

---

## Common Commands

```bash
# Start everything (dashboards + APIs)
pnpm dev

# Start individual services
pnpm --filter @proofa/core dev          # Core API on :3003
pnpm --filter @proofa/gateway dev       # Gateway on :3004
pnpm --filter @proofa/dashboard-admin dev    # Admin on :3002
pnpm --filter @proofa/dashboard-user dev     # User on :3001

# Docker services
pnpm docker:up              # Start Redis, LibSQL, Mailpit
pnpm docker:status          # Check service health
pnpm docker:logs            # View service logs
pnpm docker:down            # Stop all services

# Development tools
pnpm typecheck              # Check TypeScript errors
pnpm lint                   # Check code style
pnpm format                 # Auto-format code
```

---

## Troubleshooting

### "API calls going to production"
**Problem:** Dashboards calling `https://api.proofa.sh` instead of localhost

**Solution:**
1. Make sure `.env.local` exists
2. Restart dev server: `pnpm dev`
3. Check Network tab shows `localhost:3004` requests

See DEVELOPMENT.md troubleshooting section.

### "Port already in use"
```bash
lsof -ti :3004 | xargs kill -9  # Replace 3004 with your port
```

### "Database connection error"
```bash
pnpm docker:status          # Check if LibSQL is running
curl http://localhost:8080/health    # Should return 200
```

### "Redis connection error"
```bash
pnpm docker:status          # Check if Redis is running
curl http://localhost:8079/  # Should respond
```

---

## What Changed?

Previously, vite config and dashboard config files had hardcoded production URLs as defaults. Now they default to `http://localhost:PORT`, so:

- ✅ Local dev just works
- ✅ No need to set environment variables unless you customize ports
- ✅ Build for production still works with env vars

**Files updated:**
- `apps/dashboard/admin/vite.config.ts` and `src/config.ts`
- `apps/dashboard/user/vite.config.ts` and `src/config.ts`
- `.env.example` (documentation)
- `DEVELOPMENT.md` (troubleshooting guide)

See `SETUP_FIXES_SUMMARY.md` and `LOCAL_SETUP_ANALYSIS.md` for details.

---

## OAuth Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web application)
3. Add redirect URI: `http://localhost:3003/v1/auth/callback/google`
4. Copy Client ID & Secret to `.env.local`

### GitHub OAuth
1. Go to [GitHub Settings → Developers](https://github.com/settings/developers)
2. Create new OAuth App
3. Set callback URL: `http://localhost:3003/v1/auth/callback/github`
4. Copy Client ID & Secret to `.env.local`

---

## Next Steps

1. Copy `.env.example` → `.env.local`
2. Add OAuth credentials
3. Generate secrets: `openssl rand -hex 32`
4. Start Docker: `pnpm docker:up`
5. Start dev: `pnpm dev`
6. Login and enjoy! 🚀
