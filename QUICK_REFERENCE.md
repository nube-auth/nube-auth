# 🚀 Quick Reference Guide

## Ports & URLs

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Core | 3001 | http://localhost:3001 | OAuth, Email/OTP |
| Gateway | 3002 | http://localhost:3002 | BFF, Profile, Admin |
| User Dashboard | 3000 | http://localhost:3000 | User Profile UI |
| Admin Dashboard | 3003 | http://localhost:3003 | Admin CRUD UI |

## Quick Commands

```bash
# Install all dependencies
pnpm install

# Run all services (in separate terminals)
pnpm -F @proofa/core dev
pnpm -F @proofa/gateway dev
pnpm -F @proofa/user-dashboard dev
pnpm -F @proofa/admin-dashboard dev

# Build everything
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Directory Navigation

```bash
# Core service files
cd apps/core/src/routes

# Gateway service files
cd apps/gateway/src/routes

# Database schema & queries
cd packages/db/src

# Shared types & constants
cd packages/shared/src

# Auth helpers
cd packages/auth/src

# User dashboard components
cd apps/user-dashboard/src/pages

# Admin dashboard components
cd apps/admin-dashboard/src/pages
```

## ID Format Examples

| Entity | Example | Pattern |
|--------|---------|---------|
| User | `U0sFFDmgde` | U + digit + 9 chars |
| Session | `S0mK9pQxCa` | S + digit + 10 chars |
| Project | `P0kMn7pQx2` | P + digit + 9 chars |
| App | `A0xKmP9n5d` | A + digit + 9 chars |
| License | `L0jK3mP8qW` | L + digit + 9 chars |

## Database Tables

```
users
  ├─ id (TEXT, PK)
  ├─ email (TEXT, UNIQUE)
  ├─ name (TEXT)
  └─ picture (TEXT)

identities
  ├─ id (TEXT, PK)
  ├─ user_id (FK)
  ├─ provider (google|github|email)
  └─ provider_user_id (TEXT, UNIQUE per provider)

sessions
  ├─ id (TEXT, PK)
  ├─ user_id (FK)
  └─ expires_at (INTEGER)

projects
  ├─ id (TEXT, PK)
  ├─ owner_id (FK)
  └─ name (TEXT)

project_members
  ├─ id (TEXT, PK)
  ├─ project_id (FK)
  ├─ user_id (FK)
  └─ role (owner|member)

apps
  ├─ id (TEXT, PK)
  ├─ project_id (FK)
  ├─ name (TEXT)
  ├─ secret (TEXT)
  └─ app_session_ttl_days (INTEGER)

licenses
  ├─ id (TEXT, PK)
  ├─ user_id (FK)
  ├─ app_id (FK)
  ├─ max_requests_per_day (INTEGER)
  └─ active (BOOLEAN)

email_verifications
  ├─ id (TEXT, PK)
  ├─ email (TEXT, UNIQUE)
  ├─ code_hash (TEXT)
  └─ attempts (INTEGER)

auth_codes
  ├─ id (TEXT, PK)
  ├─ user_id (FK)
  ├─ code (TEXT, UNIQUE)
  └─ consumed (BOOLEAN)

audit_logs
  ├─ id (TEXT, PK)
  ├─ project_id (FK)
  ├─ action (TEXT)
  └─ user_id (FK)
```

## API Endpoints

### Core (3001)

```
GET  /v1/auth/start?provider=google
GET  /v1/auth/callback/:provider?code=...
POST /v1/auth/exchange

POST /v1/email/start
POST /v1/email/verify
```

### Gateway (3002)

```
POST /v1/auth/login
POST /v1/auth/logout
GET  /v1/auth/status

GET  /v1/me
PATCH /v1/me
GET  /v1/me/sessions
DELETE /v1/me/sessions

GET  /v1/admin/projects
POST /v1/admin/projects
GET  /v1/admin/projects/:projectId

GET  /v1/admin/projects/:projectId/apps
POST /v1/admin/projects/:projectId/apps

GET  /v1/admin/projects/:projectId/members

GET  /v1/admin/licenses
```

## Key Configuration

### Session TTLs
- Core: 7 days (fixed, non-configurable)
- App: 1-365 days (default 28, per-app configurable)

### Rate Limits
- OTP Request: 5 per hour per email
- OTP Verify: 5 per 5 minutes per email
- Account Lockout: 3 failures = 30 minutes

### OTP Settings
- Format: 6 digits
- TTL: 10 minutes
- Hashing: PBKDF2-SHA256 (100k iterations)

### Supported Providers
- Google OAuth
- GitHub OAuth
- Email/OTP

## Environment Variables

```
# Database
TURSO_CONNECTION_URL=...
TURSO_AUTH_TOKEN=...

# OAuth
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...

# Cache & Sessions
REDIS_URL=...

# Email
RESEND_API_KEY=...

# Service-to-Service
CORE_S2S_TOKEN=secret-token-core
GATEWAY_S2S_TOKEN=secret-token-gateway
```

## Common Tasks

### Add a new query helper

1. Edit `packages/db/src/queries.ts`
2. Add method to appropriate query object (e.g., `userQueries`)
3. Export from `packages/db/src/index.ts`
4. Use in routes

### Add a new API endpoint

1. Create route handler in `apps/gateway/src/routes/`
2. Import in `apps/gateway/src/index.ts`
3. Mount route: `app.route('/v1/route', routeHandler)`
4. Test with curl or client

### Add a new database table

1. Define schema in `packages/db/src/schema.ts`
2. Create query helpers in `packages/db/src/queries.ts`
3. Export from `packages/db/src/index.ts`
4. Run migration: `drizzle-kit generate:sqlite`

### Add React page component

1. Create component in `apps/user-dashboard/src/pages/`
2. Add query hook in `apps/user-dashboard/src/hooks/api.ts`
3. Import in `apps/user-dashboard/src/App.tsx`
4. Add route: `<Route path="/page" element={<ProtectedLayout><Page /></ProtectedLayout>} />`

## Security Checklist

- ✅ All OTP hashed with PBKDF2-SHA256
- ✅ All cookies signed with HMAC-SHA256
- ✅ 3-attempt lockout on failed OTP
- ✅ Rate limiting on OTP endpoints
- ✅ S2S token validation on Core calls
- ✅ Project member access control
- ✅ Protected routes with auth redirects
- ✅ Email uniqueness enforced
- ✅ Provider identity uniqueness enforced

## Troubleshooting

### "Not authenticated" error
→ Core session might be expired
→ Check redis for app session
→ Redirect to login

### "Access denied" on admin routes
→ User not a project member
→ Check project_members table
→ Add user to project first

### OTP not received
→ Check RESEND_API_KEY
→ Check Resend email limits
→ Verify email in database

### Database connection error
→ Check TURSO_CONNECTION_URL
→ Check TURSO_AUTH_TOKEN
→ Verify database exists

### Redis connection error
→ Check REDIS_URL
→ Verify Upstash account
→ Check rate limit quota

## Performance Tips

1. Use `getDb()` singleton for database access
2. Cache expensive queries with Redis
3. Use TanStack Query's `staleTime` option
4. Batch database operations when possible
5. Index frequently queried columns (already done)

## Deploy Checklist

- [ ] Set all environment variables
- [ ] Build with `pnpm build`
- [ ] Test all endpoints
- [ ] Verify database migrations
- [ ] Check Redis connection
- [ ] Set CORS origins in app config
- [ ] Enable HTTPS in production
- [ ] Configure rate limits per app
- [ ] Set up monitoring/logging
- [ ] Test OAuth redirects
