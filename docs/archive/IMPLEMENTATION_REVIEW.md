# Proofa Implementation Review

**Date:** December 14, 2025  
**Spec Version:** 1.0.0  
**Implementation Status:** ~60% Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What's Well Implemented](#whats-well-implemented)
3. [Critical Gaps & Issues](#critical-gaps--issues)
4. [Quick Wins (Easy Fixes)](#quick-wins-easy-fixes)
5. [Priority Implementation Order](#priority-implementation-order)
6. [Code Quality Issues](#code-quality-issues)
7. [Detailed Gap Analysis](#detailed-gap-analysis)
8. [Recommendations](#recommendations)

---

## Executive Summary

The Proofa implementation has a **solid foundation** with excellent database schema, ID generation system, and monorepo structure. However, there are **critical gaps** in the authentication flow that must be addressed before the system can function according to spec.

**Key Findings:**
- ✅ Database schema: 95% complete
- ✅ ID generation: 100% complete
- ✅ Email OTP flow: 90% complete
- ⚠️ **Auth flow: 40% complete (BLOCKER)**
- ⚠️ License management: 30% complete
- ⚠️ Session management: 50% complete
- ❌ Zod validation: 0% complete
- ❌ Identity collision handling: 0% complete

**Critical Blocker:** The auth-code exchange flow is not implemented. Current flow exposes session IDs to browsers instead of using short-lived auth codes with S2S exchange.

---

## What's Well Implemented

### ✅ Database Schema (95%)

All tables match the spec perfectly:
- ✅ `users` - correct structure, indexes, constraints
- ✅ `identities` - unique constraints on provider/provider_user_id
- ✅ `sessions` - proper TTL tracking with expires_at, last_seen_at
- ✅ `projects` - owner relationship
- ✅ `project_members` - role-based access
- ✅ `apps` - comprehensive config fields
- ✅ `auth_codes` - single-use, short-lived codes
- ✅ `licenses` - user/app uniqueness constraint
- ✅ `email_verifications` - OTP with lockout mechanism
- ✅ `audit_logs` - comprehensive audit trail

**Minor gaps:**
- Missing `slug` field in `projects` table
- Missing `allowed_hosts`, `redirect_uris`, `required_providers` usage

### ✅ ID Generation System (100%)

Perfect implementation:
```typescript
// packages/shared/src/id.ts
export const id = {
  user: () => `U0${nano9()}`,           // U0sFFDmgde
  session: () => `S0${nano11()}`,       // S0mK9pQxCa
  authCode: () => `C0${nano12()}`,      // C0pN7mKqXc9A
  // ... all entity types
};
```

- ✅ Letter+Digit prefix (U0, S0, etc.)
- ✅ Custom alphabet (excludes i/I/l/L/o/O)
- ✅ Validation patterns
- ✅ Compact format (11-14 chars)

### ✅ Core Infrastructure

- ✅ Monorepo with pnpm + Turbo
- ✅ TypeScript throughout
- ✅ Drizzle ORM + Turso
- ✅ Hono framework
- ✅ Package separation (`@proofa/shared`, `@proofa/db`, `@proofa/auth`, `@proofa/cache`)

### ✅ Email OTP Flow (90%)

```typescript
// apps/core/src/routes/email.ts
POST /v1/email/start  ✅ OTP generation and sending
POST /v1/email/verify ✅ OTP verification with lockout
```

- ✅ 6-digit OTP generation
- ✅ 10-minute expiry
- ✅ 3 attempts before 30-min lockout
- ✅ Rate limiting
- ✅ Bcrypt hashing
- ✅ Neutral responses (doesn't reveal if email exists)

**Minor gap:** User auto-creation in `verify` (spec says require provider in MVP)

---

## Critical Gaps & Issues

### 🚨 1. Auth-Code Exchange Flow Not Implemented (BLOCKER)

**Current implementation:**
```typescript
// Core /v1/auth/callback returns sessionId directly to browser
return c.json({
  sessionId: session.public_id,  // ❌ WRONG - exposed to browser
  userId: userPublicId,
  email: profile.email,
});
```

**Spec requirement:**
```typescript
// Core should:
1. Create auth_code (120s TTL)
2. Redirect to: gateway/auth/callback?code=C0xxx
3. Gateway exchanges code via S2S POST /v1/auth/exchange
4. Core validates, consumes code, returns user+license
5. Gateway creates app session in Redis
```

**Impact:** Security risk - session IDs exposed to browser, no S2S validation.

**Files affected:**
- `apps/core/src/routes/v1/auth/index.ts` - needs code generation
- `apps/gateway/src/routes/auth.ts` - needs S2S exchange
- Missing: `POST /v1/auth/exchange` endpoint in Core

---

### 🚨 2. Missing App Context in Auth Flow

**Current:**
```typescript
GET /v1/auth/start?provider=google&redirect_uri=...
// No app_id parameter
// No validation of redirect_uri against allowlist
```

**Spec requirement (§7.1):**
```typescript
GET /v1/auth/start?app_id=A0xxx&redirect_uri=...&provider=google

// Should:
1. Validate app exists and is_active
2. Validate redirect_uri is in app.redirect_uris (JSON array)
3. Auto-select provider if app.required_providers has only one
4. Store app_id for auth_code binding
```

**Impact:** Can't enforce per-app OAuth configuration, security risk.

---

### 🚨 3. License Auto-Provisioning Missing

**Spec (§6.3):**
> "Core ensures license exists for (user, app)"

**Current:** No automatic license creation during auth.

**Fix needed:**
```typescript
// After user creation/login in auth callback:
const license = await licenseQueries.findByUserAndApp(db, userId, appId);

if (!license) {
  await licenseQueries.upsert(db, userId, appId, {
    public_id: id.license(),
    plan: app.default_license_plan,  // 'free' or 'trial'
    status: 'active',
    source: 'internal',
    valid_from: now,
    valid_until: app.default_license_plan === 'trial' 
      ? now + app.trial_days * 86400 
      : null,
  });
}
```

**Impact:** Users would fail authentication - no license = can't access app.

---

### 🚨 4. S2S Token Validation Incomplete

**Current (apps/core/src/middleware/s2s.ts):**
```typescript
export async function s2sMiddleware(c: Context, next: Next) {
  const s2sToken = c.req.header('x-s2s-token');
  
  if (!s2sToken) {
    return c.json({ error: 'Missing S2S token' }, 401);
  }

  // TODO: Validate S2S token against environment secret
  // This is a stub for S2S validation logic
  
  (c as any).s2sTokenValid = true;
  await next();
}
```

**Fix:**
```typescript
export async function s2sMiddleware(c: Context, next: Next) {
  const s2sToken = c.req.header('X-Proofa-Service-Token');
  const expectedToken = process.env.X_PROOFA_SERVICE_TOKEN;
  
  if (!s2sToken || s2sToken !== expectedToken) {
    return c.json({ error: 'Invalid S2S token' }, 401);
  }
  
  await next();
}
```

**Impact:** Gateway can't securely call Core - authentication broken.

---

### ⚠️ 5. Missing Zod Validation

**Spec says:** "Zod validation" (§1, §2)

**Current:** Zero Zod usage. Manual validation everywhere:
```typescript
if (!email || !email.includes('@')) {
  return c.json({ error: 'Invalid email' }, 400);
}

if (!userId || !appId || !expiresAt) {
  return c.json({ error: 'Missing required fields' }, 400);
}
```

**Should be:**
```typescript
import { z } from 'zod';

const emailStartSchema = z.object({
  email: z.string().email(),
});

const licenseGrantSchema = z.object({
  userId: z.string().regex(/^U0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/),
  appId: z.string().regex(/^A0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/),
  expiresAt: z.number().int().positive(),
});

// Usage
try {
  const { email } = emailStartSchema.parse(await c.req.json());
} catch (error) {
  return c.json({ error: 'Validation failed', details: error.errors }, 400);
}
```

**Impact:** Poor error messages, inconsistent validation, harder to maintain.

---

### ⚠️ 6. Identity Collision Policy Not Implemented

**Spec §6.2** defines 4 rules for email/provider collisions:

**Rule 1: Provider Identity Match Always Wins**
```typescript
// After OAuth, lookup by (provider, provider_user_id)
// If exists → login that user (even if clicked "Create account")
```
✅ **Partially implemented** - basic lookup works

**Rule 2: Email Collision (New Account, Email Exists)**
```typescript
// User not logged in + clicked "Create account" + email exists
// Required flow:
1. Store "pending link" in Redis (5-10 min TTL)
2. Return: "Email exists. Verify OTP to link?"
3. Send OTP to email
4. After OTP verified → link provider to existing user
```
❌ **Not implemented** - creates duplicate users

**Rule 3: Auto-Link (Logged-In User, New Provider)**
```typescript
// User has valid core session + does OAuth with new provider
// Auto-link new provider (no OTP needed)
```
❌ **Not implemented** - no logged-in state checking

**Rule 4: No Collision (New Email)**
```typescript
// New email → create new user + identity
```
✅ **Implemented**

**Impact:** Users can create duplicate accounts, confusion about which account to use.

---

### ⚠️ 7. Core Session Rolling TTL Not Implemented

**Spec (§9.1):**
```
Rolling behavior:
- Expires 7 days after last **activity**
- Refresh throttling: only extend if `last_seen_at < now() - 1 hour`
- Prevents excessive DB writes
```

**Current:**
```typescript
// apps/core/src/routes/v1/auth/index.ts
const sessionData = {
  // ...
  expires_at: now + 7 * 24 * 60 * 60, // Fixed 7 days
};
```

Sessions never refreshed → expire after 7 days regardless of activity.

**Fix:**
```typescript
// In auth middleware
async function refreshSessionIfNeeded(session) {
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;
  
  if (session.last_seen_at < oneHourAgo) {
    await sessionQueries.update(session.id, {
      last_seen_at: now,
      expires_at: now + CORE_SESSION_TTL_SECONDS,
    });
  }
}
```

**Impact:** Users logged out after 7 days even if active daily.

---

### ⚠️ 8. App Session Management Incomplete

**Spec:** Gateway stores app sessions in Redis with per-app TTL from `apps.app_session_ttl_days`.

**Current (apps/gateway/src/routes/auth.ts):**
```typescript
const ttlSeconds = 7 * 24 * 60 * 60; // Hardcoded 7 days
await sessionStore.setAppSession(coreSessionId, user.userId, 'gateway', ttlSeconds);
```

**Should be:**
```typescript
// Get app config
const app = await getAppConfig(appId);

// Use app's configured TTL
const ttlSeconds = app.app_session_ttl_days * 86400;
await sessionStore.setAppSession(sessionId, user.userId, appId, ttlSeconds);
```

**Cache layer for /me endpoint missing:**
```typescript
// Spec: Cache user+license data for `cache_ttl_minutes` (default 10 min)
GET /me should:
1. Check Redis cache
2. If stale → fetch from Core
3. Update cache with app.cache_ttl_minutes TTL
```

**Impact:** Can't configure different session lengths per app, excessive Core API calls.

---

### ❌ 9. Missing Core API Endpoints

**Not implemented:**

| Endpoint | Status | Priority |
|----------|--------|----------|
| `POST /v1/auth/exchange` | ❌ Missing | **CRITICAL** |
| `GET /v1/license?app_id=xxx` | ❌ Missing | High |
| `POST /v1/admin/license/grant` | ⚠️ Stub only | High |
| `POST /v1/admin/project/create` | ❌ Missing | Medium |
| `POST /v1/admin/app/create` | ❌ Missing | Medium |

**POST /v1/auth/exchange (CRITICAL):**
```typescript
// Spec §7.1
router.post('/exchange', s2sMiddleware, async (c) => {
  const { code, app_id, redirect_uri } = await c.req.json();
  
  // 1. Find auth_code
  const authCode = await authCodeQueries.findByCode(db, code);
  
  // 2. Validate
  if (!authCode || authCode.consumed_at || authCode.expires_at < now) {
    return c.json({ error: 'Invalid code' }, 400);
  }
  
  if (authCode.app_id !== app_id || authCode.redirect_uri !== redirect_uri) {
    return c.json({ error: 'Binding mismatch' }, 400);
  }
  
  // 3. Mark consumed
  await authCodeQueries.markConsumed(authCode.id);
  
  // 4. Get user + license
  const user = await userQueries.findById(db, authCode.user_id);
  const license = await licenseQueries.findByUserAndApp(db, authCode.user_id, authCode.app_id);
  
  return c.json({ user, license });
});
```

---

### ⚠️ 10. Gateway Missing Key Routes

**User routes (account.proofa.com):**

| Route | Status | Spec §7.2 |
|-------|--------|-----------|
| `GET /me` | ✅ Basic | Needs cache layer |
| `GET /profile` | ❌ Missing | §7.2 |
| `PATCH /profile` | ❌ Missing | §7.2 |
| `GET /sessions` | ❌ Missing | §7.2 |
| `DELETE /sessions/:id` | ❌ Missing | §7.2 |
| `POST /logout` | ✅ Exists | Needs core session revoke |

**Admin routes (admin.proofa.com):**

Most endpoints are **stubs with TODO comments**:
```typescript
// apps/gateway/src/routes/admin.ts
adminRouter.post('/projects', async (c) => {
  const body = await c.req.json();
  // TODO: implement project creation
  return c.json({ message: 'Project created', data: body }, 201);
});
```

**Impact:** User/admin dashboards can't function.

---

### ⚠️ 11. Database Schema Mismatches

**projects table - missing field:**
```sql
-- Current schema
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  public_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  -- slug TEXT NOT NULL UNIQUE,  ❌ MISSING
  owner_user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Spec requires:** `slug` field for URL-safe identifiers.

**apps table - fields exist but not used:**
```typescript
// Schema has these fields:
allowed_hosts: text('allowed_hosts').notNull(), // JSON array
redirect_uris: text('redirect_uris').notNull(), // JSON array
required_providers: text('required_providers').notNull(), // JSON array

// But /v1/auth/start doesn't validate against them ❌
```

---

## Quick Wins (Easy Fixes)

### 1. Fix S2S Token Validation (5 minutes)

**File:** `apps/core/src/middleware/s2s.ts`
```typescript
export async function s2sMiddleware(c: Context, next: Next) {
  const s2sToken = c.req.header('X-Proofa-Service-Token');
  const expectedToken = process.env.X_PROOFA_SERVICE_TOKEN;
  
  if (!s2sToken || s2sToken !== expectedToken) {
    return c.json({ error: 'Invalid S2S token' }, 401);
  }
  
  await next();
}
```

### 2. Add project.slug Field (5 minutes)

**File:** Create migration
```typescript
// packages/db/src/migrations/add_project_slug.ts
export async function up(db) {
  await db.run('ALTER TABLE projects ADD COLUMN slug TEXT');
  await db.run('CREATE UNIQUE INDEX projects_slug_unique ON projects(slug)');
}
```

### 3. Fix ID Generator Import (10 minutes)

**Files:** Multiple auth routes use wrong import
```typescript
// ❌ Wrong
import { createId } from '@proofa/shared';
const publicId = createId('user');

// ✅ Correct
import { id } from '@proofa/shared';
const publicId = id.user();
```

### 4. Add Rolling Session TTL (30 minutes)

**File:** `apps/core/src/middleware/auth.ts`
```typescript
export async function refreshSessionIfNeeded(session) {
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;
  
  if (session.last_seen_at < oneHourAgo) {
    await sessionQueries.update(session.id, {
      last_seen_at: now,
      expires_at: now + CORE_SESSION_TTL_SECONDS,
    });
  }
}
```

### 5. Install and Configure Zod (15 minutes)

```bash
pnpm add zod
```

Create validation schemas:
```typescript
// packages/shared/src/validation.ts
import { z } from 'zod';
import { idPatterns } from './id';

export const schemas = {
  email: z.string().email(),
  userId: z.string().regex(idPatterns.user),
  appId: z.string().regex(idPatterns.app),
  // ... more schemas
};
```

---

## Priority Implementation Order

### Phase 1: Core Auth Flow (CRITICAL - 2-3 days)

**Goal:** Fix security and make auth work per spec.

1. ✅ Implement auth-code generation in Core `/v1/auth/callback`
2. ✅ Create `POST /v1/auth/exchange` endpoint (S2S only)
3. ✅ Update Gateway `/auth/callback` to exchange codes
4. ✅ Add app validation to `/v1/auth/start`
5. ✅ Auto-provision licenses on first login
6. ✅ Fix S2S token validation

**Deliverable:** Working OAuth flow with proper code exchange.

### Phase 2: Session Management (1-2 days)

**Goal:** Proper session lifecycle management.

1. ✅ Implement rolling TTL for core sessions
2. ✅ Per-app session TTL in Gateway
3. ✅ Cache layer for `/me` endpoint
4. ✅ Session refresh middleware

**Deliverable:** Sessions that stay alive with activity, configurable per app.

### Phase 3: Identity Collision (2-3 days)

**Goal:** Handle duplicate accounts gracefully.

1. ✅ Email collision detection
2. ✅ OTP step-up flow for linking
3. ✅ Pending link storage in Redis
4. ✅ Auto-link for logged-in users

**Deliverable:** Users can link multiple providers, no duplicates.

### Phase 4: Validation & Security (1-2 days)

**Goal:** Production-ready input validation.

1. ✅ Add Zod schemas for all endpoints
2. ✅ Global error handler with Zod integration
3. ✅ Rate limiting (mostly done, needs review)
4. ✅ Audit logging on state changes

**Deliverable:** Consistent validation, better error messages.

### Phase 5: User Management Routes (2 days)

**Goal:** User dashboard can function.

1. ✅ `GET /profile`
2. ✅ `PATCH /profile`
3. ✅ `GET /sessions` (list user sessions)
4. ✅ `DELETE /sessions/:id` (revoke session)
5. ✅ Identity linking/unlinking

**Deliverable:** Functional user dashboard.

### Phase 6: Admin Features (3-4 days)

**Goal:** Admin dashboard can function.

1. ✅ Complete Gateway admin routes
2. ✅ Project CRUD operations
3. ✅ App CRUD operations
4. ✅ License granting/revoking
5. ✅ Project member management

**Deliverable:** Functional admin dashboard.

---

## Code Quality Issues

### 1. Inconsistent Error Handling

**Problem:**
```typescript
// Some routes
try {
  // ...
} catch (error) {
  console.error('Error:', error);
  return c.json({ error: 'Failed' }, 500);
}

// Other routes - no try/catch at all
const user = await userQueries.findById(db, userId); // Could throw
```

**Fix:** Global error handler + consistent error responses.

### 2. Missing Type Safety

**Problem:**
```typescript
const { email, otp } = await c.req.json() as { email?: string; otp?: string };
// Manual null checks follow
```

**Fix:** Use Zod for parsing + type inference:
```typescript
const { email, otp } = emailVerifySchema.parse(await c.req.json());
// TypeScript knows these are strings
```

### 3. No Logging Strategy

**Problem:** `console.log` and `console.error` everywhere.

**Fix:** Structured logging with correlation IDs:
```typescript
import { logger } from '@proofa/shared';

logger.info('User logged in', {
  userId,
  appId,
  requestId: c.get('requestId'),
});
```

### 4. Duplicate Code

**Problem:** Auth middleware logic repeated across Core and Gateway.

**Fix:** Extract to `@proofa/auth` package:
```typescript
// packages/auth/src/middleware.ts
export function validateSession() { ... }
export function requireAuth() { ... }
```

### 5. No Tests

**Problem:** Zero test coverage.

**Fix:** Start with integration tests for auth flow:
```typescript
// apps/core/tests/auth.test.ts
describe('OAuth flow', () => {
  it('should create user and session on first login', async () => {
    // Test implementation
  });
});
```

### 6. Environment Variables Not Validated

**Problem:** `process.env.GOOGLE_CLIENT_ID || ''` - silently fails.

**Fix:**
```typescript
// packages/shared/src/env.ts
import { z } from 'zod';

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // ...
});

export const env = envSchema.parse(process.env);
```

---

## Detailed Gap Analysis

### Authentication Flow Comparison

**Spec Flow:**
```
1. User clicks "Login" on App
2. App → GET /auth/start (Gateway)
3. Gateway → GET /v1/auth/start?app_id=xxx (Core)
4. Core → Validate app, redirect to OAuth provider
5. Provider → User authenticates
6. Provider → Redirect to Core callback
7. Core → Process OAuth, create/find user
8. Core → Create auth_code (120s TTL)
9. Core → Redirect to Gateway callback?code=xxx
10. Gateway → POST /v1/auth/exchange (S2S to Core)
11. Core → Validate code, return user+license
12. Gateway → Create app session in Redis
13. Gateway → Set cookie, redirect to App
```

**Current Flow:**
```
1. User clicks "Login" on App
2. App → POST /auth/login (Gateway) with coreSessionId ❌
3. Gateway → POST /v1/auth/exchange (Core) ❌ Wrong payload
4. Gateway → Create session cookie
```

**Missing steps:**
- App context validation
- Auth code generation
- S2S code exchange
- License provisioning
- Proper redirects

### Session Management Comparison

| Feature | Spec | Current | Status |
|---------|------|---------|--------|
| Core session TTL | 7 days rolling | 7 days fixed | ⚠️ Partial |
| Refresh threshold | 1 hour | Never refreshes | ❌ Missing |
| App session TTL | Per-app config (1-365 days) | Hardcoded 7 days | ❌ Missing |
| Cache TTL (/me) | Per-app config (default 10 min) | No caching | ❌ Missing |
| Session revocation | DELETE /sessions/:id | Not implemented | ❌ Missing |

### License System Comparison

| Feature | Spec | Current | Status |
|---------|------|---------|--------|
| Auto-provision on login | Yes (free or trial) | No | ❌ Missing |
| Unique per user/app | UNIQUE constraint | ✅ Schema correct | ✅ Done |
| Trial expiration | valid_until check | No validation | ⚠️ Partial |
| Admin grant | POST /admin/license/grant | Stub only | ⚠️ Partial |
| Entitlements (JSON) | Custom per app | Field exists | ✅ Done |

---

## Recommendations

### Immediate Actions (Today)

1. ✅ Fix S2S token validation (5 min)
2. ✅ Add project.slug migration (10 min)
3. ✅ Fix ID generator imports (15 min)
4. ✅ Create task list for auth-code flow implementation

### This Week

1. ✅ Implement auth-code exchange flow (Phase 1)
2. ✅ Add Zod validation incrementally
3. ✅ Write integration test for OAuth flow
4. ✅ Add rolling session TTL

### Next Week

1. ✅ Implement identity collision handling
2. ✅ Complete user management routes
3. ✅ Add cache layer for /me endpoint
4. ✅ Set up structured logging

### Before Production

1. ✅ Complete admin routes
2. ✅ Add comprehensive test coverage (>80%)
3. ✅ Security audit (OWASP top 10)
4. ✅ Performance testing (load test auth flow)
5. ✅ Document API with OpenAPI spec
6. ✅ Set up monitoring (Sentry, DataDog, etc.)

### Development Process

**Workflow:**
1. Fix one critical issue at a time
2. Write test first (TDD where possible)
3. Implement fix
4. Update this review doc with ✅
5. Commit with clear message linking to issue

**Testing Strategy:**
```
Unit tests → packages/*/tests/
Integration tests → apps/*/tests/
E2E tests → tests/e2e/
```

**Git Workflow:**
```bash
# For each fix
git checkout -b fix/auth-code-exchange
# Implement
git commit -m "feat: implement auth-code exchange flow

Fixes critical gap #1 from implementation review.
Adds POST /v1/auth/exchange endpoint with S2S validation."
git push origin fix/auth-code-exchange
# Create PR
```

---

## Appendix

### Environment Variables Checklist

**Core (.env):**
```bash
# Database
DATABASE_URL=              # Turso connection string

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Security
X_PROOFA_SERVICE_TOKEN=    # S2S token (shared with Gateway)
SESSION_SECRET=             # For signing cookies

# Email
RESEND_API_KEY=
EMAIL_FROM=

# Environment
NODE_ENV=development
CALLBACK_URL=              # OAuth callback URL
```

**Gateway (.env):**
```bash
# Core API
CORE_URL=http://localhost:3000
X_PROOFA_SERVICE_TOKEN=    # Must match Core

# Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Environment
NODE_ENV=development
```

### Schema Migration Needed

**Migration: Add project.slug**
```sql
-- packages/db/migrations/0002_add_project_slug.sql
ALTER TABLE projects ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX projects_slug_unique ON projects(slug);

-- Backfill existing records
UPDATE projects SET slug = lower(replace(name, ' ', '-'));
```

### Useful Commands

```bash
# Run migrations
pnpm --filter @proofa/db db:migrate

# Start Core (dev mode)
pnpm --filter core dev

# Start Gateway (dev mode)
pnpm --filter gateway dev

# Run all tests
pnpm test

# Type check all packages
pnpm --recursive run type-check
```

---

**Last Updated:** December 14, 2025  
**Next Review:** After Phase 1 completion
