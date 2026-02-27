# Proofa Implementation Specification (Final)

**Version:** 1.1.0  
**Last Updated:** January 1, 2026  
**Status:** MVP Implementation Contract — Ready for Development

> This is the **single source of truth** for building Proofa. It consolidates V0 (original flows) and V1 (structure decisions) with final architectural choices: multi-tenant projects, nanoid-based IDs, per-app configurable session TTLs + other settings, separate dashboards, OAuth-only auth (platform-level credentials), global API rate limiting, Zod validation, audit logging, and 7-day rolling core sessions.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Data Model](#4-data-model)
5. [ID Generation System](#5-id-generation-system)
6. [Authentication Flows](#6-authentication-flows)
7. [API Specifications](#7-api-specifications)
8. [Multi-Tenant Project Structure](#8-multi-tenant-project-structure)
9. [Session Management](#9-session-management)
10. [Licensing System](#10-licensing-system)
11. [Admin Access Control](#11-admin-access-control)
12. [Deployment Domains](#12-deployment-domains)
13. [Security Policies](#13-security-policies)
14. [Build Order (MVP)](#14-build-order-mvp)
15. [Resolved Decisions](#15-resolved-decisions)

---

## 1. Architecture Overview

### Components (MVP)

#### Apps (External Applications)
- **Never call Core directly**
- Call **Gateway** only
- Examples: `pingpong.codes`, `mockly.codes`, etc.

#### Gateway (`api.proofa.com`)
- Public BFF for external apps + user/admin dashboards
- Stores **app sessions** in **Upstash Redis** (per-app configurable TTL)
- Caches user+license data per app's `cache_ttl_minutes` (default 10 min)
- Calls Core via **S2S token** (`X-Proofa-Service-Token`)
- Routes:
  - `/auth/*` — authentication flows
  - `/me`, `/profile` — user profile
  - `/admin/*` — admin operations (for authorized users)

#### Core (`auth.proofa.com`)
- **Source of truth**: users, identities, core sessions, projects, apps, licenses
- **Hosts user login UI** (core-hosted authentication pages)
- OAuth provider integration (Google, GitHub, etc.)
- Project/app/license management APIs

#### User Dashboard (`account.proofa.com`)
- Account management: profile, linked identities, sessions
- View licenses across projects/apps
- **Simple, minimal scope** (no project/app creation)
- Talks to Gateway only

#### Admin Dashboard (`admin.proofa.com`)
- Project/app/user/license management
- Admin actions: create projects, manage members, grant licenses
- Talks to Gateway only

### Communication Rules

```
[Apps] → [Gateway] → [Core]
   ↓
[User Dashboard] → [Gateway] → [Core]
   ↓
[Admin Dashboard] → [Gateway] → [Core]
```

**Key constraints:**
- Apps + dashboards never call Core directly
- Gateway calls Core via S2S token (`X-Proofa-Service-Token`)
- Core owns identity & license truth
- No secrets in dashboards or client apps

---

## 2. Technology Stack

### Backend
- **Runtime**: Node.js v18+ + TypeScript
- **Framework**: Hono
- **Database**: PostgreSQL (Neon/Supabase/self-hosted)
- **ORM**: Drizzle
- **Cache/KV**: Upstash Redis
- **Email**: Resend (abstracted interface, swappable with Postmark later)

### Frontend
- **Builder**: Vite
- **Framework**: React 18+
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (recommended)
- **State Management**: TanStack Query (for server data)
- **Form Management**: React Hook Form + Zod

### Monorepo
- **Package Manager**: pnpm v8+
- **Build Orchestration**: Turbo

### Authentication
- **OAuth**: Google, GitHub (extendable) - **Platform-level credentials only**
- **Session Storage**: Cookie (Core) + Redis (Gateway)
- **Email Verification**: OTP-only (6-digit, **Core/Proofa login only**, not app verification)
- **Provider Selection**: Apps select which OAuth providers to enable (google, github, etc.)

---

## 3. Monorepo Structure

```
proofa/
├── apps/
│   ├── core/                    # Identity, sessions, licenses (source of truth)
│   ├── gateway/                 # BFF for apps + dashboards (user + admin)
│   ├── user-dashboard/          # Simple user account UI
│   └── admin-dashboard/         # Project/app/license admin UI
├── packages/
│   ├── shared/                  # Types, constants, ID generator
│   ├── db/                      # Drizzle schema + migrations
│   ├── auth/                    # Provider adapters (Google, GitHub)
│   └── redis/                   # Upstash client + cache helpers
├── turbo.json                   # Turbo build config
├── pnpm-workspace.yaml          # pnpm workspace config
├── package.json                 # Root manifest
├── PRODUCT_SPEC.md              # This file
└── INSTRUCTIONS.md              # Development setup guide
```

### Package Publishing

- All packages export types via `package.json#exports`
- `@proofa/shared` — types, constants, ID generator
- `@proofa/db` — Drizzle schema (for Core only, initially)
- `@proofa/auth` — Provider adapters
- `@proofa/cache` — Cache helpers (Redis/Upstash)

---

## 4. Data Model (Drizzle + Turso)

### Global Conventions

Every table includes:
- `id` (auto-increment integer/serial, internal only)
- `public_id` (nanoid-based string, externally exposed)
- `created_at`, `updated_at` (PostgreSQL timestamps with defaultNow())

Foreign keys reference internal `id`. Public IDs are for API responses and logging.

### Tables (MVP)

#### `users`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (U0xxx format) |
| `primary_email` | TEXT | YES | | Canonical email |
| `primary_email_verified` | BOOLEAN | NO | DEFAULT false | |
| `name` | TEXT | YES | | Display name |
| `avatar_url` | TEXT | YES | | Profile picture URL |
| `is_test` | BOOLEAN | NO | DEFAULT false | Test user flag |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

#### `identities`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (I0xxx format) |
| `user_id` | INTEGER | NO | FK → users.id | |
| `provider` | TEXT | NO | | Enum: google, github, email, etc. |
| `provider_user_id` | TEXT | NO | | OAuth/provider ID (stable) |
| `email` | TEXT | YES | | Email from provider |
| `email_verified` | BOOLEAN | NO | DEFAULT false | |
| `created_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: `UNIQUE(provider, provider_user_id)` — Prevent duplicate provider identities

#### `sessions` (Core Sessions)

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (SES0xxx format) |
| `user_id` | INTEGER | NO | FK → users.id | |
| `app_id` | INTEGER | YES | FK → apps.id | Optional app context |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `last_seen_at` | INTEGER | NO | | Updated on each activity |
| `expires_at` | INTEGER | NO | | Expiry time (epoch seconds) |
| `revoked_at` | INTEGER | YES | | NULL = active; set on logout |

**TTL**: 365 days rolling (user sessions), 2 hours + 15-min inactivity (admin sessions) (see §9.1)

**Session Type Identification**: Session type is determined by **cookie name**, not a database field:
- `proofa_user_session` → User session (365 days rolling)
- `proofa_admin_session` → Admin session (2hr absolute + 15min inactivity)

**Session Metadata** (stored in Redis):
- `sessionType`: "admin" or "user" (determines TTL enforcement)
- `createdAt`: Session creation timestamp (for absolute TTL check)
- `lastActivityAt`: Last activity timestamp (for inactivity check)
- Admin sessions validated on every request for both absolute and inactivity expiry

#### `projects` (Multi-Tenant)

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (P0xxx format) |
| `name` | TEXT | NO | | Project name |
| `slug` | TEXT | NO | UNIQUE | URL-safe identifier |
| `description` | TEXT | YES | | Project description |
| `owner_user_id` | INTEGER | NO | FK → users.id | Project owner |
| `is_active` | BOOLEAN | NO | DEFAULT true | Project active status |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

#### `project_members`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `project_id` | INTEGER | NO | FK → projects.id | |
| `user_id` | INTEGER | NO | FK → users.id | |
| `role` | TEXT | NO | Enum: owner/admin/member | |
| `created_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: `UNIQUE(project_id, user_id)` — One role per user per project

#### `apps`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (A0xxx format) |
| `project_id` | INTEGER | NO | FK → projects.id | |
| `name` | TEXT | NO | | Display name |
| `slug` | TEXT | NO | | URL-safe identifier |
| `description` | TEXT | YES | | App description |
| `enabled_providers` | TEXT | NO | DEFAULT '["google"]' | JSON array of enabled OAuth providers (e.g., ["google", "github"]) |
| `app_tokens` | TEXT | NO | | JSONB: API keys, secrets (currentKey, previousKey, rotatedAt) |
| `security_settings` | TEXT | NO | | JSONB: sessionTtlDays, redirectUris, allowedOrigins, maxSessions, oauth config |
| `plan_settings` | TEXT | NO | | JSONB: licensingRequired, defaultPlanId, autoCreateLicense |
| `selected_payment_provider_id` | INTEGER | YES | FK → payment_provider_configs.id | Active payment provider |
| `is_active` | BOOLEAN | NO | DEFAULT true | |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: `UNIQUE(project_id, slug)` — One slug per project

**JSONB Schema Details**:

**`security_settings`**:
```typescript
{
  sessionTtlDays: number;          // 1-365, default 30
  redirectUris: string[];           // Allowed OAuth redirect URIs
  allowedOrigins: string[];         // CORS allowed origins
  maxSessions: number;              // Max concurrent sessions per user
  sessionRefreshThresholdDays: number; // Refresh threshold
  oauth: {
    [provider]: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;         // Encrypted
    }
  }
}
```

**`app_tokens`**:
```typescript
{
  currentKey: {
    value: string;                   // API key
    createdAt: string;               // ISO timestamp
    rotatedAt?: string;
  };
  previousKey?: {
    value: string;
    createdAt: string;
    deprecatedAt: string;
  };
}
```

**`plan_settings`**:
```typescript
{
  licensingRequired: boolean;       // Enforce licensing
  defaultPlanId: string;            // Public ID of default plan
  autoCreateLicense: boolean;       // Auto-create on first login
  trialDays?: number;               // Trial duration if default is trial
}
```

**JSONB Update Policy** (Critical):
- ✅ **ALWAYS use atomic operations** (see [JSONB Operations](#jsonb-operations) below)
- ❌ **NEVER read-modify-write** (causes race conditions)
- ✅ Use `buildJsonbMergeClause()` for top-level updates
- ✅ Use `buildJsonbSetClause()` for nested paths
- ✅ Use `createJsonbUpdateChain()` for multiple updates
- ✅ Always set `updated_at` with JSONB updates

#### `auth_codes`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (C0xxx format) |
| `code` | TEXT | NO | UNIQUE | Random token (high entropy) |
| `user_id` | INTEGER | NO | FK → users.id | |
| `app_id` | INTEGER | NO | FK → apps.id | |
| `redirect_uri` | TEXT | NO | | Original redirect_uri (for validation) |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `expires_at` | INTEGER | NO | | TTL 120s from created_at |
| `consumed_at` | INTEGER | YES | | NULL = unused; set on exchange |

**TTL**: 120 seconds (single-use, consumed on exchange)

### JSONB Operations

**Critical Implementation Requirement**: All JSONB column updates MUST use atomic database operations to prevent race conditions.

#### Problem: Read-Modify-Write Anti-Pattern

```typescript
// ❌ BANNED - Race condition!
const app = await db.select().from(apps).where(eq(apps.id, appId));
const settings = app.security_settings;
settings.maxSessions = 10;  // Another request could update between read and write
await db.update(apps).set({ security_settings: settings });
```

#### Solution: Atomic Operations

**1. Top-level field updates** (1-3 fields):
```typescript
await db.update(apps)
  .set({
    security_settings: buildJsonbMergeClause(apps.security_settings, {
      sessionTtlDays: 60,
      maxSessions: 10,
    }),
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));
```

**2. Nested path updates** (single deep field):
```typescript
await db.update(apps)
  .set({
    security_settings: buildJsonbSetClause(apps.security_settings, {
      path: "oauth.github.clientId",
      value: "gh-client-123",
    }),
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));
```

**3. Multiple nested updates** (2-8 paths):
```typescript
const chain = createJsonbUpdateChain(apps.security_settings)
  .set("oauth.github.enabled", true)
  .set("oauth.github.clientId", "gh-123")
  .set("redirectUris", ["https://example.com"])
  .build();

await db.update(apps)
  .set({ security_settings: chain, updated_at: new Date() })
  .where(eq(apps.id, appId));
```

**Implementation Details**:
- Functions provided by `@proofa/db` package
- Uses PostgreSQL `||` (merge) and `jsonb_set()` operators
- Guarantees atomicity at database level
- Zero race conditions even with high concurrency
- See [docs/JSONB.md](../docs/JSONB.md) for complete guide

#### `licenses`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (L0xxx format) |
| `user_id` | INTEGER | NO | FK → users.id | |
| `app_id` | INTEGER | NO | FK → apps.id | |
| `plan` | TEXT | NO | | Enum: free, trial, pro, team, enterprise |
| `status` | TEXT | NO | | Enum: active, expired, canceled, suspended |
| `source` | TEXT | NO | | Enum: manual, promo, stripe, lemonsqueezy, internal |
| `valid_from` | INTEGER | NO | | License start date (epoch seconds) |
| `valid_until` | INTEGER | YES | | NULL = lifetime; epoch seconds if limited |
| `entitlements` | TEXT | YES | | JSON object (custom per app) |
| `provider` | TEXT | YES | | Payment provider (e.g., stripe, lemonsqueezy) |
| `provider_ref_id` | TEXT | YES | | Provider subscription/customer ID |
| `metadata` | TEXT | YES | | JSON object (notes, granted_by, etc.) |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: `UNIQUE(user_id, app_id)` — One license per user per app

#### `audit_logs`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (AL0xxx format) |
| `user_id` | INTEGER | NO | FK → users.id | Who performed the action |
| `app_id` | INTEGER | YES | FK → apps.id | Which app (if applicable) |
| `project_id` | INTEGER | YES | FK → projects.id | Which project (if applicable) |
| `action` | TEXT | NO | | Enum: create, update, delete, grant, revoke, login, logout |
| `entity_type` | TEXT | NO | | What was changed: user, app, project, license, etc. |
| `entity_id` | TEXT | YES | | ID of changed entity |
| `changes` | TEXT | YES | | JSON object (before/after for updates) |
| `ip_address` | TEXT | YES | | Requester IP |
| `created_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: None (audit trail, not operational)

#### `project_invitations`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (PI0xxx format) |
| `project_id` | INTEGER | NO | FK → projects.id | |
| `email` | TEXT | NO | | Email of invitee |
| `role` | TEXT | NO | DEFAULT 'member' | Enum: owner, admin, member |
| `invited_by_user_id` | INTEGER | NO | FK → users.id | |
| `status` | TEXT | NO | DEFAULT 'pending' | Enum: pending, accepted, expired |
| `expires_at` | INTEGER | NO | | Expiry timestamp (epoch seconds) |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `accepted_at` | INTEGER | YES | | NULL = not accepted; epoch seconds |
| `accepted_by_user_id` | INTEGER | YES | FK → users.id | User who accepted |
| `deleted_at` | INTEGER | YES | | Soft delete |

**Constraints**: Project-level team invitations

#### `plans`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (PL0xxx format) |
| `app_id` | INTEGER | NO | FK → apps.id | |
| `name` | TEXT | NO | | Display name |
| `slug` | TEXT | NO | | URL-safe identifier |
| `description` | TEXT | YES | | Plan description |
| `monthly_price` | INTEGER | YES | | Price in cents (null if not offered) |
| `yearly_price` | INTEGER | YES | | Price in cents (null if not offered) |
| `one_time_price` | INTEGER | YES | | Price in cents (null if not offered) |
| `duration_days` | INTEGER | YES | | License duration (null = lifetime) |
| `trial_enabled` | BOOLEAN | NO | DEFAULT false | Whether trial is enabled |
| `trial_days` | INTEGER | YES | | Trial duration |
| `features` | TEXT | YES | | JSON array of feature strings |
| `status` | TEXT | NO | DEFAULT 'active' | Enum: active, archived |
| `display_order` | INTEGER | NO | DEFAULT 0 | Sort order for display |
| `is_active` | BOOLEAN | NO | DEFAULT true | |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |
| `deleted_at` | INTEGER | YES | | Soft delete |

**Constraints**: Multiple pricing plans per app

#### `payment_provider_configs`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (PC0xxx format) |
| `project_id` | INTEGER | NO | FK → projects.id | |
| `provider` | TEXT | NO | | Enum: stripe, lemonsqueezy, dodo |
| `environment` | TEXT | NO | | Enum: test, production |
| `credentials` | TEXT | NO | | Encrypted JSON (API keys) |
| `webhook_secret` | TEXT | YES | | Provider webhook secret |
| `is_active` | BOOLEAN | NO | DEFAULT true | |
| `is_default` | BOOLEAN | NO | DEFAULT false | Default provider for project |
| `metadata` | TEXT | YES | | JSON object (custom config) |
| `created_by_user_id` | INTEGER | YES | FK → users.id | |
| `updated_by_user_id` | INTEGER | YES | FK → users.id | |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: `UNIQUE(project_id, provider, environment)` — One config per provider per environment

#### `plan_provider_prices`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (PP0xxx format) |
| `plan_id` | INTEGER | NO | FK → plans.id | |
| `provider_config_id` | INTEGER | NO | FK → payment_provider_configs.id | |
| `billing_type` | TEXT | NO | | Enum: recurring, one-time |
| `interval` | TEXT | YES | | Enum: month, year (null for one-time) |
| `amount_cents` | INTEGER | NO | | Price in cents |
| `currency` | TEXT | NO | DEFAULT 'usd' | ISO currency code |
| `provider_price_id` | TEXT | NO | | Provider's price ID (e.g., Stripe price ID) |
| `is_active` | BOOLEAN | NO | DEFAULT true | |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: `UNIQUE(provider_price_id)` — Provider price IDs are unique

#### `purchases`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (PU0xxx format) |
| `app_id` | INTEGER | NO | FK → apps.id | |
| `subject_type` | TEXT | NO | DEFAULT 'user' | Enum: user, organization |
| `subject_id` | INTEGER | NO | | user_id or organization_id |
| `plan_provider_price_id` | INTEGER | NO | FK → plan_provider_prices.id | |
| `provider_config_id` | INTEGER | NO | FK → payment_provider_configs.id | |
| `promotion_code_id` | INTEGER | YES | FK → promotion_codes.id | |
| `provider_session_id` | TEXT | NO | | Checkout session ID from provider |
| `status` | TEXT | NO | DEFAULT 'pending' | Enum: pending, completed, expired, abandoned, failed |
| `payment_transaction_id` | INTEGER | YES | | Set when completed (no FK to avoid circular dependency) |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: Tracks checkout sessions and links to transactions

#### `promotions`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (PR0xxx format) |
| `app_id` | INTEGER | NO | FK → apps.id | |
| `name` | TEXT | NO | | Internal label (e.g., "Launch 50% off") |
| `discount_type` | TEXT | NO | | Enum: percent, fixed |
| `discount_value` | INTEGER | NO | | 50 (for 50%) or cents (for $50) |
| `starts_at` | INTEGER | NO | | Campaign start (epoch seconds) |
| `ends_at` | INTEGER | YES | | Campaign end (null = no end) |
| `is_active` | BOOLEAN | NO | DEFAULT true | |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: Promotion campaigns

#### `promotion_codes`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (PM0xxx format) |
| `promotion_id` | INTEGER | NO | FK → promotions.id | |
| `app_id` | INTEGER | NO | FK → apps.id | |
| `code` | TEXT | NO | UNIQUE | Promo code string (e.g., "LAUNCH50") |
| `max_uses` | INTEGER | YES | | NULL = unlimited |
| `current_uses` | INTEGER | NO | DEFAULT 0 | Usage counter |
| `is_active` | BOOLEAN | NO | DEFAULT true | |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: `UNIQUE(code)` — Promo codes are globally unique

#### `promotion_redemptions`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (RD0xxx format) |
| `promotion_code_id` | INTEGER | NO | FK → promotion_codes.id | |
| `purchase_id` | INTEGER | NO | FK → purchases.id | |
| `app_id` | INTEGER | NO | FK → apps.id | |
| `subject_type` | TEXT | NO | | Enum: user, organization |
| `subject_id` | INTEGER | NO | | user_id or organization_id |
| `discount_cents` | INTEGER | NO | | Actual discount applied (cents) |
| `created_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: Tracks when promo codes are used

#### `payment_transactions`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (TX0xxx format) |
| `purchase_id` | INTEGER | NO | FK → purchases.id | |
| `license_id` | INTEGER | NO | FK → licenses.id | |
| `provider_config_id` | INTEGER | NO | FK → payment_provider_configs.id | |
| `provider` | TEXT | NO | | Denormalized: stripe, lemonsqueezy, dodo |
| `provider_transaction_id` | TEXT | NO | | Provider's transaction ID |
| `provider_customer_id` | TEXT | YES | | Provider's customer ID |
| `type` | TEXT | NO | | Enum: purchase, renewal, refund, chargeback, manual_adjustment |
| `status` | TEXT | NO | | Enum: success, failed, pending, disputed |
| `amount_cents` | INTEGER | NO | | Amount in cents |
| `currency` | TEXT | NO | DEFAULT 'usd' | ISO currency code |
| `discount_applied_cents` | INTEGER | NO | DEFAULT 0 | Discount amount applied (cents) |
| `discount_applied` | BOOLEAN | NO | DEFAULT false | Whether discount was applied |
| `promotion_id` | INTEGER | YES | FK → promotions.id | |
| `promotion_code_id` | INTEGER | YES | FK → promotion_codes.id | |
| `provider_discount_id` | TEXT | YES | | Provider's discount ID |
| `description` | TEXT | YES | | Transaction description |
| `metadata` | TEXT | YES | | JSON object (provider data snapshot) |
| `transaction_date` | INTEGER | NO | | When it happened (epoch seconds) |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `dispute_reason` | TEXT | YES | | For chargebacks |
| `resolved_at` | INTEGER | YES | | Dispute resolution timestamp |
| `created_by_user_id` | INTEGER | YES | FK → users.id | Admin who created |
| `notes` | TEXT | YES | | Admin notes |

**Constraints**: `UNIQUE(provider_config_id, provider_transaction_id)` — Prevent duplicate transactions

#### `subscriptions`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (SB0xxx format) |
| `purchase_id` | INTEGER | NO | FK → purchases.id | |
| `license_id` | INTEGER | NO | FK → licenses.id | |
| `provider_config_id` | INTEGER | NO | FK → payment_provider_configs.id | |
| `provider` | TEXT | NO | | Denormalized: stripe, lemonsqueezy, dodo |
| `provider_subscription_id` | TEXT | NO | | Provider's subscription ID |
| `provider_customer_id` | TEXT | YES | | Provider's customer ID |
| `plan_provider_price_id` | INTEGER | NO | FK → plan_provider_prices.id | |
| `status` | TEXT | NO | | Enum: active, canceled, past_due, unpaid, trialing, paused |
| `billing_interval` | TEXT | NO | | Enum: monthly, yearly, quarterly |
| `billing_period_start` | INTEGER | YES | | Current period start (epoch seconds) |
| `billing_period_end` | INTEGER | YES | | Current period end (epoch seconds) |
| `next_billing_date` | INTEGER | YES | | Next billing date (epoch seconds) |
| `cancel_at_period_end` | BOOLEAN | NO | DEFAULT false | |
| `canceled_at` | INTEGER | YES | | Cancellation timestamp |
| `ended_at` | INTEGER | YES | | Subscription end timestamp |
| `trial_start` | INTEGER | YES | | Trial start (epoch seconds) |
| `trial_end` | INTEGER | YES | | Trial end (epoch seconds) |
| `amount_cents` | INTEGER | NO | | Recurring amount in cents |
| `currency` | TEXT | NO | DEFAULT 'usd' | ISO currency code |
| `metadata` | TEXT | YES | | JSON object (provider data) |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: `UNIQUE(provider_config_id, provider_subscription_id)` — Prevent duplicate subscriptions

#### `webhook_logs`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (WH0xxx format) |
| `provider` | TEXT | NO | | Enum: stripe, lemonsqueezy, dodo |
| `event_type` | TEXT | NO | | Provider event type (e.g., checkout.session.completed) |
| `event_id` | TEXT | YES | | Provider's event ID (for deduplication) |
| `request_body` | TEXT | NO | | JSON webhook payload |
| `request_headers` | TEXT | YES | | JSON headers |
| `signature` | TEXT | YES | | Webhook signature |
| `ip_address` | TEXT | YES | | Sender IP |
| `status` | TEXT | NO | DEFAULT 'not_started' | Enum: not_started, processing, completed, failed, signature_failed, skipped |
| `received_at` | INTEGER | NO | | Webhook receipt timestamp (epoch seconds) |
| `processing_started_at` | INTEGER | YES | | Processing start timestamp |
| `processing_completed_at` | INTEGER | YES | | Processing completion timestamp |
| `processing_duration_ms` | INTEGER | YES | | Duration in milliseconds |
| `payment_transaction_id` | INTEGER | YES | FK → payment_transactions.id | |
| `license_id` | INTEGER | YES | FK → licenses.id | |
| `error_message` | TEXT | YES | | Error details |
| `error_stack` | TEXT | YES | | Error stack trace |
| `retry_count` | INTEGER | NO | DEFAULT 0 | Retry attempts |
| `last_retry_at` | INTEGER | YES | | Last retry timestamp |
| `response_status` | INTEGER | YES | | HTTP response code |
| `response_body` | TEXT | YES | | JSON response |
| `metadata` | TEXT | YES | | JSON extracted metadata |
| `notes` | TEXT | YES | | Admin notes |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: `UNIQUE(provider, event_id)` — Prevent duplicate webhook processing

#### `provider_usage_logs`

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `provider_type` | TEXT | NO | | Enum: oauth, payment |
| `provider_id` | INTEGER | NO | | ID of provider config |
| `app_id` | INTEGER | YES | FK → apps.id | |
| `user_id` | INTEGER | YES | FK → users.id | |
| `operation` | TEXT | NO | | Operation performed (e.g., token_exchange, create_checkout) |
| `status` | TEXT | NO | | Enum: success, failed |
| `error_message` | TEXT | YES | | Error details |
| `metadata` | TEXT | YES | | JSON metadata |
| `ip_address` | TEXT | YES | | Requester IP |
| `created_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: Monitors OAuth and payment provider usage

---

## 5. ID Generation System

### Format

`[3-letter prefix][0][nanoid(9-15 chars)]`

**Total length**: 13–19 characters (descriptive, URL-friendly)

| Entity | Prefix | Example | Length | Notes |
|--------|--------|---------|--------|-------|
| User | USR0 | USR0xY7mK9pQz | 13 | 9-char random |
| Project | PRJ0 | PRJ0kMn7pQx2t | 13 | 9-char random |
| App | APP0 | APP0aC7mK9pNx | 13 | 9-char random |
| License | LIC0 | LIC0kN2m7PqCa | 13 | 9-char random |
| Identity | IDN0 | IDN0aC9mKpNxy | 13 | 9-char random |
| Project Member | MEM0 | MEM0kN7pQmCab | 13 | 9-char random |
| Project Invitation | INV0 | INV0mK9pNqXcd | 13 | 9-char random |
| Email Verification | EML0 | EML0mK9pNqXce | 13 | 9-char random |
| Session | SES0 | SES0abc123xyz456789 | 19 | 15-char random (higher entropy) |
| Auth Code | AUT0 | AUT0pN7mKqXcf | 13 | 9-char random |
| Audit Log | AUD0 | AUD0mK9pNqXcg | 13 | 9-char random |
| Plan | PLN0 | PLN0mK9pNqXch | 13 | 9-char random |
| Payment Config | CFG0 | CFG0mK9pNqXci | 13 | 9-char random |
| Plan Provider Price | PPR0 | PPR0mK9pNqXcj | 13 | 9-char random |
| Purchase | PUR0 | PUR0mK9pNqXck | 13 | 9-char random |
| Promotion | PRM0 | PRM0mK9pNqXcl | 13 | 9-char random |
| Promotion Code | PMC0 | PMC0mK9pNqXcm | 13 | 9-char random |
| Promotion Redemption | RDM0 | RDM0mK9pNqXcn | 13 | 9-char random |
| Payment Transaction | TXN0 | TXN0mK9pNqXco | 13 | 9-char random |
| Subscription | SUB0 | SUB0mK9pNqXcp | 13 | 9-char random |
| Webhook Log | WHK0 | WHK0mK9pNqXcq | 13 | 9-char random |
| Provider Usage Log | PUL0 | PUL0mK9pNqXcr | 13 | 9-char random |
| Invitation | INV0 | INV0mK9pNqXcs | 13 | 9-char random |

### Rationale

**Why 3-letter + 0 (vs 1-letter + digit)?**
- **Descriptive**: `USR0` is immediately recognizable as a User ID
- **Scannable**: Easy to identify entity type at a glance in logs/debugging
- **Unambiguous**: 3-letter prefix can't occur naturally in nanoid random portion
- **Future-proof**: Digit 0-9 reserves variants (e.g., USR0 = regular user, USR1 = service account)
- **Still compact**: 13 chars for standard entities, 19 for sessions (acceptable tradeoff for clarity)

**Alphabet (56 characters)**:
```
0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ
```
Excludes: i, I, l, L, o, O (confusing in readability)

### Implementation

Location: `packages/shared/src/id.ts`

```typescript
import { customAlphabet } from 'nanoid';

const ALPHABET = '0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ';

// Create nanoid generators with specific lengths
const nano9 = customAlphabet(ALPHABET, 9);  // Standard IDs (13 chars total)
const nano15 = customAlphabet(ALPHABET, 15); // Sessions (19 chars total)

export const id = {
  user: () => `USR0${nano9()}`,
  project: () => `PRJ0${nano9()}`,
  app: () => `APP0${nano9()}`,
  license: () => `LIC0${nano9()}`,
  identity: () => `IDN0${nano9()}`,
  projectMember: () => `MEM0${nano9()}`,
  projectInvitation: () => `INV0${nano9()}`,
  emailVerification: () => `EML0${nano9()}`,
  session: () => `SES0${nano15()}`,
  authCode: () => `AUT0${nano9()}`,
  auditLog: () => `AUD0${nano9()}`,
  plan: () => `PLN0${nano9()}`,
  paymentConfig: () => `CFG0${nano9()}`,
  planProviderPrice: () => `PPR0${nano9()}`,
  purchase: () => `PUR0${nano9()}`,
  promotion: () => `PRM0${nano9()}`,
  promotionCode: () => `PMC0${nano9()}`,
  promotionRedemption: () => `RDM0${nano9()}`,
  paymentTransaction: () => `TXN0${nano9()}`,
  subscription: () => `SUB0${nano9()}`,
  webhookLog: () => `WHK0${nano9()}`,
  providerUsageLog: () => `PUL0${nano9()}`,
  invitation: () => `INV0${nano9()}`,
} as const;

// Validation regex (per-entity)
export const idPatterns = {
  user: /^USR0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  project: /^PRJ0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  app: /^APP0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  license: /^LIC0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  identity: /^IDN0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  projectMember: /^MEM0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  session: /^SES0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{15}$/,
  authCode: /^AUT0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  emailVerification: /^EML0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  auditLog: /^AUD0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  plan: /^PLN0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  paymentConfig: /^CFG0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  invitation: /^INV0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
} as const;
```

### Benefits

- ✅ **Descriptive**: 3-letter prefix immediately identifies entity type
- ✅ **Unambiguous**: `USR0`, `PRJ0`, `APP0` can't occur naturally in random portion
- ✅ **URL-friendly**: Clean URLs (`/projects/PRJ0kMn7pQx2t`)
- ✅ **Scannable**: Easy to grep logs (`grep "^USR0"`, `grep "^PRJ0"`)
- ✅ **Future-proof**: Digit 0-9 allows entity variants (USR0, USR1, etc.)
- ✅ **Type-safe**: Prefix indicates entity type at a glance
- ✅ **Debuggable**: Clear entity identification in logs and error messages

---

## 6. Authentication Flows (Authoritative)

### 6.1 User Login Decision

Proofa always checks `proofa_session` cookie on entry.

#### Case A: Core Session Valid

UI shows two actions:

##### 1. **Continue as `<username>`**
- **Fast path. No provider re-auth required.**
- Proceed directly to **App SSO** (auth-code flow).
- Provider OAuth only needed for **step-up actions**:
  - Linking a new provider
  - Security settings changes
  - Billing changes (Phase 2)

##### 2. **Switch Account**
Opens a screen with two options:
- **Sign in to another existing account** (OTP or provider)
- **Create a new account**

**Locked behavior when creating new account:**
- **Revoke/logout the current core session first**, then proceed
- **Rationale**: Keeps one active user per browser; avoids multi-persona confusion

#### Case B: No Core Session (Missing/Expired/Invalid)

UI shows two actions:

##### 1. **Sign in (existing account)**

**Flow:**
1. User enters email → send OTP (always return 200, neutral response)
2. User enters 6-digit OTP → verify
3. If user exists for that email:
   - Validate OTP
   - Create core session
   - Continue
4. If no user exists:
   - Return `{ ok: true, userExists: false }`
   - Show: _"No account found. Create a new account?"_

**Important**: Do **not** auto-create email-only accounts in MVP. Require provider or manual admin grant.

##### 2. **Create Account (new user)**

1. Show provider buttons (Google/GitHub based on app `enabled_providers`)
2. Complete provider OAuth
3. Create user + identity in Core
4. Create core session
5. Continue to app SSO flow

### 6.2 Identity Collision Policy (Provider + Email)

These rules prevent duplicate accounts and account takeover.

**Key Principle**: Collision only occurs when user is **trying to create a NEW account** with an email that already exists.

#### Rule 1: Provider Identity Match Always Wins

After OAuth, lookup identity by `(provider, provider_user_id)`.

- **If exists** → **login** that user (even if user clicked "Create account")
- Avoids creating duplicate accounts

#### Rule 2: Email Collision (Creating NEW Account, Email Exists)

**When collision is detected:**
- User has NO core session (not logged in)
- User clicked "Create account"
- Provider returned email that matches existing user

**Required flow (Phase 2 - Q2 2026):**
1. Store "pending link" in Redis (5-10 min TTL)
2. Return to frontend: "Email already exists. Verify OTP to link?"
3. Frontend shows OTP verification screen
4. User enters OTP (sent to that email)
5. After OTP verified:
   - Link new provider identity to existing user
   - Create core session
   - Issue auth_code
6. Continue to app login

#### Rule 3: Auto-Link (Logged-In User, New Provider)

**When user is already logged in** (has valid core session):
- User clicks "Continue as <username>"
- Does OAuth with different provider
- Provider returns email (even if it matches another user in system)

**Automatic linking** (no OTP required):
- Identity already proven via core session
- Auto-link new provider to existing user
- Issue auth_code immediately

#### Rule 4: No Collision (New Email)

If provider email is new (doesn't match any user):
- Create new user + identity + core session
- Issue auth_code
- Continue to app login

### 6.3 App SSO (Auth-Code Exchange Flow)

```
User (App)
  ↓ clicks "Login"
App → GET /auth/start (Gateway)
  ↓
Gateway → GET /v1/auth/start?app_id=xxx&redirect_uri=... (Core)
  ↓
Core → OAuth provider
  ↓
[User authenticates with provider]
  ↓
Core → GET /v1/auth/callback/:provider (user-facing)
  ↓
Core checks identity collision policy
Core creates/refreshes core session (proofa_session)
Core ensures license exists for (user, app)
Core issues auth_code (TTL 120s)
  ↓
Core → 302 Redirect to Gateway /auth/callback?code=xxx
  ↓
Gateway → POST /v1/auth/exchange (S2S with X-Proofa-Service-Token)
  ↓
Core → Validates & consumes code, returns user + license
  ↓
Gateway → Creates app session cookie (pp_app_session)
Gateway → Stores session in Redis
  ↓
Gateway → 302 Redirect back to App (with cookie)
  ↓
App → User logged in
```

**Key moments:**
- Core issues short-lived auth codes (120s)
- Gateway exchanges code server-to-server (S2S)
- App receives session cookie only, never sees auth code

---

## 7. API Specifications (MVP)

### 7.1 Core API (`auth.proofa.com`) — `/v1`

#### `GET /v1/auth/start`

**Query parameters:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `app_id` | string | YES | App slug or public_id |
| `redirect_uri` | string | YES | Callback URL (must be allowlisted) |
| `provider` | string | NO | OAuth provider (google, github) |
| `state` | string | NO | State param (echoed back) |

**Behavior:**
1. Validate `app_id` exists and is active
2. Validate `redirect_uri` is allowlisted for app
3. If `provider` not specified but app has `enabled_providers` with exactly one → use that
4. Redirect to provider OAuth

**Response:**
```
302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?...
```

---

#### `GET /v1/auth/callback/:provider`

**Query parameters:**

| Param | Type | Notes |
|-------|------|-------|
| `code` | string | OAuth authorization code from provider |
| `state` | string | State from `/auth/start` (optional) |

**Behavior:**
1. Exchange OAuth code → provider profile
2. Lookup identity by `(provider, provider_user_id)`
3. **If exists**: Login that user
4. **If not exists**: Create new user + identity
   - Email collision handling with OTP step-up: Phase 2 (Q2 2026)
   - MVP: Email collisions prevented by OAuth provider uniqueness
5. Create/refresh **core session** `proofa_session` (TTL 7 days rolling)
6. Ensure license exists for `(user, app)`
7. Issue **auth_code** (TTL 120s)
8. Redirect to `redirect_uri?code=xxx&state=yyy`

**Response:**
```
302 Found
Location: http://app.local/auth/callback?code=abc123&state=xyz
Set-Cookie: proofa_session=...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2419200
```

---

#### `POST /v1/auth/exchange` (S2S)

**Authentication**: `X-Proofa-Service-Token` header (required)

**Request body:**
```json
{
  "code": "C0abc123xyz",
  "app_id": "A0app123",
  "redirect_uri": "http://app.local/auth/callback"
}
```

**Behavior:**
1. Lookup `auth_code` by code
2. Validate:
   - Not expired (now < expires_at)
   - Not consumed (consumed_at IS NULL)
   - Bindings match (user_id, app_id, redirect_uri)
3. Mark consumed
4. Return user + license

**Response (200 OK):**
```json
{
  "user": {
    "public_id": "U0xxx",
    "primary_email": "user@example.com",
    "primary_email_verified": true,
    "name": "John Doe",
    "avatar_url": "https://..."
  },
  "license": {
    "public_id": "L0xxx",
    "plan": "free",
    "status": "active",
    "valid_from": 1702569600,
    "valid_until": null
  }
}
```

**Error responses:**
- `400 Bad Request` — Missing/invalid code, app_id, or redirect_uri
- `401 Unauthorized` — Invalid S2S token
- `404 Not Found` — Code not found or consumed
- `410 Gone` — Code expired

---

#### `POST /v1/email/start` (Phase 2 - Q2 2026)

**Request body:**
```json
{
  "email": "user@example.com"
}
```

**Behavior:**
1. **Always return 200 neutral response** (don't reveal if email exists)
2. Generate 6-digit OTP
3. Hash OTP, store in Redis with 10-min TTL
4. Send OTP via email (Resend)

**Response (200 OK):**
```json
{
  "ok": true
}
```

---

#### `POST /v1/email/verify` (Phase 2 - Q2 2026)

**Request body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Behavior:**
1. Lookup OTP data from Redis by email
2. Check if locked out (locked_until > now) → return 429 Too Many Requests
3. Validate OTP:
   - Not expired (now < expires_at)
   - Not consumed (consumed_at IS NULL)
   - Hash matches
4. If OTP invalid:
   - Increment `attempts` += 1
   - If `attempts >= 3`: Set `locked_until = now() + 30 minutes` in Redis
   - Return 400 Bad Request
5. If OTP valid:
   - Mark consumed in Redis
   - Check if user exists:
     - **If yes**: Create core session, return `{ ok: true, userExists: true }`
     - **If no**: Return `{ ok: true, userExists: false }`

**Response (200 OK):**
```json
{
  "ok": true,
  "userExists": true
}
```

---

#### `GET /v1/license?app_id=<app_id>`

**Authentication**: Core session cookie (`proofa_session`)

**Query parameters:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `app_id` | string | YES | App slug or public_id |

**Behavior:**
1. Validate core session
2. Lookup license by `(user_id, app_id)`
3. Return license or 404

**Response (200 OK):**
```json
{
  "public_id": "L0xxx",
  "plan": "free",
  "status": "active",
  "valid_from": 1702569600,
  "valid_until": null,
  "entitlements": {}
}
```

---

#### `POST /v1/admin/license/grant` (Admin-only)

**Authentication**: Core session + admin allowlist

**Request body:**
```json
{
  "app_id": "A0xxx",
  "user_id": "U0xxx",
  "plan": "pro",
  "duration_days": 365,
  "source": "manual",
  "note": "Granted for testing"
}
```

**Behavior:**
1. Validate admin status
2. Validate user exists (by `user_id` or `email`)
3. Upsert license:
   - `status = active`
   - `valid_from = now()`
   - `valid_until = now() + duration_days` (or null for lifetime)
   - `source = manual` or `promo`
   - `metadata.granted_by = current_user_id`
   - `metadata.note = note`
4. Return updated license

**Response (200 OK):**
```json
{
  "public_id": "L0xxx",
  "plan": "pro",
  "status": "active",
  "valid_from": 1702569600,
  "valid_until": 1734192000,
  "source": "manual",
  "metadata": {
    "granted_by": "U0admin",
    "note": "Granted for testing"
  }
}
```

---

### 7.2 Gateway API (`api.proofa.com`)

#### User Routes

##### `GET /auth/start`

**Query parameters:**

| Param | Type | Notes |
|-------|------|-------|
| `return_to` | string | Optional; where to redirect after login |

**Behavior:**
1. Resolve `app_id` from hostname (e.g., `api.pingpong.codes` → `pingpong`)
2. Redirect to Core `/v1/auth/start` with:
   - `redirect_uri = gateway /auth/callback`
   - `app_id = resolved`

**Response:**
```
302 Redirect to Core
```

---

##### `GET /auth/callback`

**Query parameters:**

| Param | Type | Notes |
|-------|------|-------|
| `code` | string | Auth code from Core |
| `state` | string | State (optional) |

**Behavior:**
1. Receive `code` from Core
2. S2S call to Core `POST /v1/auth/exchange` with `X-Proofa-Service-Token`
3. Core returns user + license
4. Set gateway session cookie `pp_app_session`
5. Store session in Redis (TTL from app config)
6. Redirect to app or user-dashboard

**Response:**
```
302 Found
Location: http://app.local/dashboard
Set-Cookie: pp_app_session=...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2419200
```

---

##### `GET /me`

**Authentication**: Gateway session cookie (`pp_app_session`)

**Behavior:**
1. Validate gateway session
2. Return user + license (cached in Redis per app config, default 10-min; fetch from Core if stale)

**Response (200 OK):**
```json
{
  "user": {
    "public_id": "U0xxx",
    "primary_email": "user@example.com",
    "primary_email_verified": true,
    "name": "John Doe"
  },
  "license": {
    "public_id": "L0xxx",
    "plan": "free",
    "status": "active"
  }
}
```

---

##### `GET /profile`

**Authentication**: Gateway session cookie

**Response (200 OK):**
```json
{
  "public_id": "U0xxx",
  "primary_email": "user@example.com",
  "primary_email_verified": true,
  "name": "John Doe",
  "avatar_url": "https://...",
  "identities": [
    {
      "public_id": "I0xxx",
      "provider": "google",
      "email": "user@gmail.com",
      "email_verified": true
    }
  ]
}
```

---

##### `PATCH /profile`

**Authentication**: Gateway session cookie

**Request body:**
```json
{
  "name": "New Name",
  "avatar_url": "https://..."
}
```

**Response (200 OK):** Updated user object

---

##### `GET /sessions`

**Authentication**: Gateway session cookie

**Response (200 OK):**
```json
[
  {
    "public_id": "S0xxx",
    "created_at": 1702569600,
    "last_seen_at": 1702656000,
    "expires_at": 1704988800
  }
]
```

---

##### `DELETE /sessions/:session_id`

**Authentication**: Gateway session cookie

**Behavior**: Revoke a core session

**Response (200 OK):**
```json
{ "ok": true }
```

---

##### `POST /logout`

**Authentication**: Gateway session cookie

**Behavior:**
1. Clear gateway session cookie
2. Optionally revoke core session (or leave active)

**Response (200 OK):**
```json
{ "ok": true }
```

---

#### Admin Routes (`/admin/*`)

All admin endpoints require:
- Gateway session cookie (authenticated user)
- User must be project owner/admin or system admin

##### `POST /admin/projects`

**Request body:**
```json
{
  "name": "My Project",
  "slug": "my-project"
}
```

**Response (201 Created):**
```json
{
  "public_id": "P0xxx",
  "name": "My Project",
  "slug": "my-project",
  "owner_user_id": "U0xxx"
}
```

---

##### `GET /admin/projects`

**Response (200 OK):**
```json
[
  {
    "public_id": "P0xxx",
    "name": "My Project",
    "slug": "my-project",
    "created_at": 1702569600
  }
]
```

---

##### `GET /admin/projects/:project_id`

**Response (200 OK):** Single project details

---

##### `GET /admin/projects/:project_id/members`

**Response (200 OK):**
```json
[
  {
    "user_id": "U0xxx",
    "email": "user@example.com",
    "role": "owner",
    "created_at": 1702569600
  }
]
```

---

##### `POST /admin/projects/:project_id/members`

**Request body:**
```json
{
  "email": "newmember@example.com",
  "role": "admin"
}
```

**Response (201 Created):** Member details

---

##### `GET /admin/projects/:project_id/apps`

**Response (200 OK):**
```json
[
  {
    "public_id": "A0xxx",
    "name": "My App",
    "slug": "my-app",
    "is_active": true,
    "licensing_required": true,
    "default_license_plan": "free",
    "app_session_ttl_days": 28
  }
]
```

---

##### `POST /admin/projects/:project_id/apps`

**Request body:**
```json
{
  "name": "My App",
  "slug": "my-app",
  "allowed_hosts": ["api.myapp.com"],
  "redirect_uris": ["http://myapp.local/auth/callback"],
  "enabled_providers": ["google", "github"],
  "licensing_required": true,
  "default_license_plan": "free",
  "app_session_ttl_days": 28
}
```

**Note**: OAuth providers are configured directly via the `enabled_providers` field in the app schema. No separate OAuth configuration endpoints exist - this field is updated via the app PATCH endpoint when needed.

**Response (201 Created):** App details

---

##### `PATCH /admin/projects/:project_id/apps/:app_id`

**Request body:** Subset of fields to update

**Response (200 OK):** Updated app

---

##### `DELETE /admin/projects/:project_id/apps/:app_id`

**Response (200 OK):** `{ "ok": true }`

---

##### `POST /admin/projects/:project_id/apps/:app_id/licenses`

**Request body:**
```json
{
  "user_id": "U0xxx",
  "plan": "pro",
  "duration_days": 365,
  "source": "manual",
  "note": "Granted via admin dashboard"
}
```

**Response (201 Created):** License details

---

##### `GET /admin/projects/:project_id/activity`

**Response (200 OK):**
```json
[
  {
    "timestamp": 1702656000,
    "action": "license_granted",
    "actor": "U0admin",
    "details": { ... }
  }
]
```

---

### 7.3 User Dashboard API (`account.proofa.com`)

**Simple, minimal scope.** Talks to Gateway `/me`, `/profile`, `/sessions` only.

---

### 7.4 Admin Dashboard API (`admin.proofa.com`)

Talks to Gateway `/admin/*` routes only.

---

## 8. Multi-Tenant Project Structure

### Concepts

- **Users** are global (shared across Proofa)
- **Projects** are user-owned collections of apps
- **Apps** belong to projects, define their own auth/licensing
- **Licenses** are per (user, app)
- **Admin access** is governed by `project_members` roles

### Workflows

#### Create a Project
1. User logs into Admin Dashboard
2. Click "New Project"
3. Enter name + slug
4. Project created with user as owner

#### Add Project Members
1. Navigate to project settings
2. Invite member by email
3. Member gets email invite (Phase 2)
4. Member joins as specified role (owner/admin/member)

#### Create an App
1. Navigate to project → "Apps" section
2. Click "New App"
3. Fill in:
   - Name, slug
   - Allowed hosts, redirect URIs
   - Required providers
   - Licensing config
4. App created in project

#### Grant a License
1. Navigate to project → app → "Licenses"
2. Search/select user
3. Set plan + duration
4. Grant button
5. User sees new license in User Dashboard

---

## 9. Session Management

### 9.1 Core Session (Global)

**Cookies**: 
- `proofa_user_session` (user sessions)
- `proofa_admin_session` (admin sessions)

**Stored**: Database `sessions` table + Redis metadata  
**Scope**: Shared across all apps  
**TTL**: **365 days rolling** (user sessions), **2 hours + 15-min inactivity** (admin sessions)

**Rolling behavior:**
- Expires 365 days after last **activity** (standard users)
- Activity = any valid API call to Core
- Refresh throttling: only extend if `last_seen_at < now() - 30 days`
- Prevents excessive DB writes
- Maintains security (expires if unused)

**Admin Session Security:**
- Admin sessions (`audience: "admin"`) have **strict TTLs**:
  - **Absolute TTL**: 2 hours from creation
  - **Inactivity TTL**: 15 minutes since last activity
  - Session metadata includes: `sessionType: "admin"`, `createdAt`, `lastActivityAt`
- Admin inactivity check enforced on every request via Gateway middleware
- Forces logout if either TTL expires
- Rationale: Admin operations are high-privilege; short sessions reduce attack surface

**Why separate admin sessions?**
- ✅ Security: Admin access is sensitive (license grants, payment configs, etc.)
- ✅ Compliance: SOC 2, ISO 27001, GDPR recommend short TTLs for admin access
- ✅ Best practice: Industry standard (AWS 12hr, GCP 1hr, Azure 1hr)
- ✅ User convenience: Regular users keep long sessions; admins re-auth as needed

**Why global?**
- User logs into Core once
- Can access all apps without re-auth
- But each app gets its own session cookie (see below)

### 9.2 Gateway App Session (Per-App)

**Cookie**: `pp_app_session`  
**Stored**: Upstash Redis  
**Scope**: Per-app, per-user  
**TTL Source**: `apps.app_session_ttl_days` (default 28 days)

**System-wide bounds** (configuration):
- Min: 1 day
- Max: 365 days
- Default: 28 days

**User/License Cache** (for `/me` endpoint):
- Stored in Redis per app's `cache_ttl_minutes` (default 10 minutes)
- Avoids repeated Core calls
- Stale TTL triggers re-fetch from Core

**Behavior:**
1. When user logs into app, Gateway creates app session
2. Stores in Redis with TTL = `apps.app_session_ttl_days`
3. Sets cookie with Max-Age = TTL
4. Caches user+license for 10-min (app-configurable)
5. Session and cache both validated on each request

**Fallback:**
- If app session expires but core session valid
- User sees "Continue as <user>" on next app visit
- New app session issued (fast path)

**Validation:**
- Gateway validates app session on each `/me` or `/license` call
- If expired, return 401 (client redirects to `/auth/start`)

---

## 10. Licensing System

### Per-App Configuration

Each app includes:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `licensing_required` | boolean | true | Whether to enforce licensing |
| `default_license_plan` | enum | "free" | `free` or `trial` |
| `trial_days` | integer | null | Required if plan = `trial` |

### Auto-License Creation

On first successful login for an app:

1. Check if license exists for `(user, app)`
2. If not:
   - If `licensing_required = false`: Return synthetic license (don't create in DB)
   - Else: Create license with:
     - `plan = apps.default_license_plan`
     - `status = active`
     - `valid_from = now()`
     - `valid_until = now() + trial_days` (if plan = trial) or null (if free)
     - `source = internal` (auto-created)

### License States

| Plan | Status | Notes |
|------|--------|-------|
| `free` | active | Infinite, no expiry |
| `trial` | active | Expires after `trial_days` |
| `pro` | active | Expires at `valid_until` |
| `team` | active | Expires at `valid_until` |
| `enterprise` | active | Can be lifetime (null) or limited |

**Status transitions:**
- `active` → `expired` (automatic on date check)
- `active` → `canceled` (manual via admin)
- `active` → `suspended` (manual, e.g., non-payment)

### Manual/Promo Grants

Admin can grant licenses via `/admin/projects/:project_id/apps/:app_id/licenses`:

```json
{
  "user_id": "U0xxx",
  "plan": "pro",
  "duration_days": 90,
  "source": "manual",
  "note": "Early adopter grant"
}
```

Sets:
- `valid_until = now() + duration_days`
- `metadata.granted_by = admin_user_id`
- `metadata.note = note`

---

## 11. Admin Access Control

### Project Roles

Each project member has a role:

| Role | Permissions |
|------|-------------|
| `owner` | Create/edit/delete project; manage members; grant licenses |
| `admin` | Edit/delete project; manage members; grant licenses |
| `member` | View-only access to project |

### API Authorization

Each admin endpoint checks:
1. User authenticated (valid gateway session)
2. User is system admin OR project owner/admin
3. Scope (e.g., user can only manage their own projects)

### Audit Trail (Phase 1.5)

Optional for MVP, recommended for Phase 1.5:
- Log all admin actions to `audit_log` table
- Include: who, what, when, details
- Query via `/admin/projects/:project_id/activity`

---

## 12. Deployment Domains

### Suggested Domains

| Service | Domain | Notes |
|---------|--------|-------|
| **Core** | `auth.proofa.com` | User-facing login pages + API |
| **Gateway** | `api.proofa.com` | Public BFF |
| **User Dashboard** | `account.proofa.com` | Account management |
| **Admin Dashboard** | `admin.proofa.com` | Project/app/license admin |

### App Domains (Custom)

Apps use their own domains or `api.{app-domain}`:

- `api.pingpong.codes` (gateway alias for PingPong)
- `api.mockly.codes` (gateway alias for Mockly)

**Gateway resolves apps via hostname mapping** (config):

```javascript
const appHostMap = {
  'api.pingpong.codes': 'pingpong',  // app slug
  'api.mockly.codes': 'mockly',
};
```

---

## 13. Security Policies (MVP)

### Authentication

- ✅ **OAuth-only** for user signup/login (no passwords)
- ✅ OTP-only for email verification (no magic links)
- ✅ Allowlisted redirect URIs per app (prevent open redirect)
- ✅ HttpOnly + Secure cookies (prevent XSS theft)
- ✅ SameSite=Lax cookies (prevent CSRF)
- ✅ S2S token validation (Core ↔ Gateway)
- ✅ No JWT tokens (sessions only)

### Account Lockout

- After N failed login attempts: temporary lockout
- Duration: `apps.account_lockout_minutes` (default 15 minutes)
- Tracked per email + app
- Logs to audit trail
- Admin can clear lockout via dashboard

### Rate Limiting (Global)

- **Global API rate limit**: `apps.rate_limit_requests_per_minute` (default 100/min)
- Scope: Per app per IP
- Implementation: Redis sliding window
- OTP send: 3 per email per hour (separate bucket)
- Auth start: 10 per IP per 5 minutes (separate bucket)
- Email verify: 5 attempts per OTP per 10 minutes (separate bucket)

**Development Mode Bypass**:
- ✅ Rate limiting **disabled** when `NODE_ENV=development`
- ✅ Improves developer experience (no friction during local testing)
- ✅ Production-safe: Always enforced when `NODE_ENV=production`
- ✅ Implementation:
  ```typescript
  if (env.IS_DEVELOPMENT) {
    await next();
    return; // Skip rate limiting
  }
  // ... rate limit checks
  ```

### Input Validation & Sanitization

- **Framework**: Zod (TypeScript-native schema validation)
- **Apply**: All HTTP endpoints (request body, query params, path params)
- **JSONB Validation**: Typed schemas for security_settings, app_tokens, plan_settings
  - Runtime validation with Zod
  - Type-safe helpers prevent invalid state
  - Example: `SecuritySettingsSchema`, `PlanSettingsSchema`
- **Error handling**: Return standardized error format (see below)
- **Database validation**: Foreign keys, unique constraints, type checks
- **ID validation**: Never trust user-provided `app_id` without lookup
  - Always fetch app from database
  - Use internal `id` for FK references
  - Expose `public_id` in API responses only

### Standard Error Response Format

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Human-readable error message",
    "details": { }
  }
}
```

**HTTP Status Codes**:
- `400` — Bad request (validation error)
- `401` — Unauthorized (missing/invalid auth)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `409` — Conflict (e.g., duplicate email)
- `429` — Too many requests (rate limited)
- `500` — Internal server error

### Logging Strategy

- **Library**: Winston or Pino (structured logging)
- **Levels**: debug, info, warn, error
- **Audit Trail**: Log all state-changing actions to `audit_logs` table
  - Include: who, what, when, where (IP), changes
  - Exclude: passwords, OTPs, OAuth tokens
- **Security**: Never log secrets or PII in debug logs
- **Format**: JSON-structured for easy parsing

### Database Transactions

- **Use transactions** wherever multiple writes are needed:
  - User creation + identity creation
  - License grant + audit log
  - Project creation + member assignment
- **ACID guarantees**: All-or-nothing semantics
- **Rollback on**: Validation failure, unique constraint violation, FK violation
- **Drizzle transaction API**: Use wherever multiple inserts/updates occur

### Configuration Standards

**Time Unit Standardization**:
- ✅ All duration configurations use **seconds** as the base unit
- ✅ No mixing of hours, days, or other time units
- ✅ Prevents conversion errors and improves code clarity
- ✅ Industry standard (JWT expiry, Redis TTL, HTTP cache all use seconds)

**Standard configuration variables**:
- `CORE_SESSION_TTL_SECONDS` — Core session TTL (31536000 = 365 days)
- `SESSION_REFRESH_THRESHOLD_SECONDS` — Refresh threshold (2592000 = 30 days)
- `ADMIN_SESSION_TTL_SECONDS` — Admin session TTL (7200 = 2 hours)
- `ADMIN_INACTIVITY_TIMEOUT_SECONDS` — Admin inactivity (900 = 15 minutes)
- `SESSION_TTL_SECONDS` — User session TTL (31536000 = 365 days)
- `INVITATION_EXPIRY_SECONDS` — Invitation expiry (604800 = 7 days)

**Breaking Changes Policy**:
- ✅ NO backward compatibility required when making changes
- ✅ Make breaking changes freely to improve code quality
- ✅ Update variable names, function signatures, and APIs as needed
- ✅ Remove deprecated code immediately
- ✅ Refactor aggressively for better patterns
- ❌ Don't maintain old interfaces "just in case"
- ❌ Don't add compatibility layers or deprecation warnings

**This is an active development project. Clean, correct code takes priority over backward compatibility.**

### Secret Management

- Never log secrets (tokens, passwords)
- **S2S Token** (`X-Proofa-Service-Token`):
  - Generate via script: `/scripts/generate-s2s-token.ts`
  - Store as env var `X_PROOFA_SERVICE_TOKEN` (Core + Gateway must match)
  - Manual rotation: regenerate and update env var
  - Format: High-entropy random string (32+ chars)
- Hash OTPs + passwords (bcrypt)
- Use HTTPS everywhere (enforce in middleware)

### CORS (Per-App Configurable)

Gateway configures CORS headers based on `apps.cors_allowed_origins`:
- JSON array of allowed origins
- Checked on each request
- Return `Access-Control-Allow-Origin: <origin>` if whitelisted
- Prevent cross-origin data leaks

---

## 14. Build Order (MVP)

Follow this sequence for implementation:

| # | Task | Owner | Est. Days | Status |
|---|------|-------|-----------|--------|
| 1 | Monorepo scaffold (pnpm + turbo) | DevOps | 1 | ⬜ |
| 2 | Drizzle schema + migrations (Turso) | Backend | 3 | ⬜ |
| 3 | ID generator + shared types | Backend | 1 | ⬜ |
| 4 | Core: app/project registry seed | Backend | 2 | ⬜ |
| 5 | Core: OAuth adapters (Google, GitHub) | Backend | 2 | ⬜ |
| 6 | Core: OTP endpoints | Backend | 1 | ⬜ |
| 7 | Core: Sessions + auth-code flow | Backend | 2 | ⬜ |
| 8 | Core: License system (GET + grant) | Backend | 2 | ⬜ |
| 9 | Gateway: Auth start/callback + exchange | Backend | 2 | ⬜ |
| 10 | Gateway: Session store (Redis) + LRU cache | Backend | 1 | ⬜ |
| 11 | Gateway: `/me`, `/profile`, `/sessions` endpoints | Backend | 2 | ⬜ |
| 12 | Gateway: Admin routes (CRUD projects/apps/licenses) | Backend | 3 | ⬜ |
| 13 | User Dashboard: Login + profile/sessions UI | Frontend | 2 | ⬜ |
| 14 | Admin Dashboard: Projects/apps/licenses UI | Frontend | 4 | ⬜ |
| **Total** | | | **~32 days** | |

**Parallel work**:
- Tasks 1–4 are blocking; do first
- Tasks 5–8 can run in parallel with Gateway foundation
- Frontend (13–14) can start after Gateway is mostly done

---

## 15. Resolved Decisions

### Key Choices (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend | Node.js + TypeScript | Type safety, ecosystem |
| Framework | Hono | Lightweight, edge-ready, excellent TS support |
| Database | Turso (SQLite) | Serverless, simple schema, easy migrations |
| ORM | Drizzle | Type-safe, Turso native |
| Cache | Upstash Redis | Serverless, rate-limiting, ephemeral state |
| Monorepo | pnpm + Turbo | Workspaces, fast builds |
| Email | Resend | Simple API, abstracted (swappable) |
| Deployment | Cloud-agnostic | Designed for Fly/VPS/etc. |
| **Sessions** | **365 days rolling (core users), 2 hours + 15-min inactivity (admins), 1-365 days per-app configurable** | Enhanced security; admin privilege separation |
| **IDs** | **Nanoid prefixed (23 entity types)** | Human-readable, type-safe, compact |
| **Multi-tenant** | **Yes (projects)** | Flexibility for future |
| **Admin access** | **Role-based (owner/admin/member)** | Scalable permission model |
| **Auth pages** | **Core-hosted** | Security, consistency, branding |
| **Authentication** | **OAuth-only for MVP (Google, GitHub); email/OTP in Q2 2026** | Simple, secure, modern |
| **ID collision** | **OAuth provider uniqueness (MVP); email collision with OTP step-up in Phase 2 (Q2 2026)** | Prevents duplicates in MVP; account linking in Phase 2 |
| **JWT** | **No JWT tokens; sessions only** | Stateful sessions more secure for this use case |
| **Input Validation** | **Zod schemas (TypeScript-native) + JSONB validation** | Type-safe runtime validation |
| **JSONB Updates** | **Atomic operations only (buildJsonbMergeClause, buildJsonbSetClause, createJsonbUpdateChain)** | Zero race conditions, data integrity |
| **Error Format** | **Standard JSON structure (ok/error/code/message)** | Consistent, client-friendly API |
| **Rate Limiting** | **Global per-app (config: 100/min default) + per-action buckets; disabled in dev mode** | DDoS protection; flexible per app; better DX |
| **Account Lockout** | **Per-app configurable (default 15 min after failed attempts)** | Brute-force protection |
| **Cache TTL** | **Per-app configurable (default 10 min for /me endpoint)** | Balances freshness vs. Core load |
| **CORS** | **Per-app JSON array whitelist** | Origin-based security; prevent leaks |
| **Logging** | **Winston/Pino structured logs + audit_logs table** | Security audit, debugging, compliance |
| **Transactions** | **Drizzle transactions for multi-write operations** | ACID guarantees, atomicity |
| **Audit Trail** | **Yes (audit_logs table with actions/actors/changes)** | Compliance, transparency, security |
| **OTP Lockout** | **Phase 2 (Q2 2026) - 3 failed attempts = 30 min lockout** | Brute-force protection for email login |
| **S2S Token** | **Env var + manual script generation** | Simple, no infra needed for MVP |
| **Config Units** | **All time durations in seconds** | Consistency, clarity, industry standard |
| **Breaking Changes** | **No backward compatibility required** | Clean, correct code priority |

### Future (Phase 2 / Beyond)

**Q1 2026:**
- ✅ Payments (Stripe, LemonSqueezy integration)
- ✅ Email invitations (project member invites)
- ✅ OAuth linking (step-up flows)
- ✅ Admin audit dashboard (activity logs visualization)
- ✅ License expiry cron job (auto-mark expired, send notifications)

**Q2 2026:**
- ✅ Email/Magic Link Authentication (OTP-based passwordless)
- ✅ Email collision handling with OTP step-up
- ✅ MFA/2FA (TOTP)
- ✅ WebAuthn/Passkeys
- ✅ SAML/SSO integration
- ✅ Advanced RBAC (custom roles, permissions)
- ✅ Separate admin-api subdomain (if scale demands)
- ✅ S2S token rotation strategy + management API

---

## Appendix: Quick Reference

### Cookies

| Cookie | Domain | TTL | Scope | Auth? |
|--------|--------|-----|-------|-------|
| `proofa_session` | Core | 365d rolling (users), 2hr + 15min inactivity (admins) | Global | User ID + Audience |
| `pp_app_session` | Gateway | Per-app config (1-365d, default 30d) | Per-app | User ID + App ID |

### Key Endpoints (Cheat Sheet)

| Flow | Core | Gateway |
|------|------|---------|
| **Login Start** | `/v1/auth/start` | `/auth/start` |
| **OAuth Callback** | `/v1/auth/callback/:provider` | `/auth/callback` |
| **Code Exchange** | `POST /v1/auth/exchange` (S2S) | — |
| **Get Me** | — | `GET /me` |
| **Get License** | `GET /v1/license` | — |
| **Grant License** | `POST /v1/admin/license/grant` | — |
| **Admin Routes** | — | `POST /admin/projects`, etc. |

### Environment Variables (Essential)

**Core**:
```env
DATABASE_URL=libsql://proofa-dev-xxx.turso.io
DATABASE_AUTH_TOKEN=<token>
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
RESEND_API_KEY=...
CORE_SESSION_SECRET=<32+ char>
X_PROOFA_SERVICE_TOKEN=<32+ char>
CORE_SESSION_TTL_SECONDS=31536000
SESSION_REFRESH_THRESHOLD_SECONDS=2592000
LOG_LEVEL=info
```

**Gateway**:
```env
CORE_URL=http://localhost:3000
X_PROOFA_SERVICE_TOKEN=<same as core>
SESSION_SECRET=<32+ char>
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
SESSION_TTL_SECONDS=31536000
ADMIN_SESSION_TTL_SECONDS=7200
ADMIN_INACTIVITY_TIMEOUT_SECONDS=900
INVITATION_EXPIRY_SECONDS=604800
LOG_LEVEL=info
```

**User Dashboard**:
```env
VITE_GATEWAY_URL=http://localhost:3001
```

**Admin Dashboard**:
```env
VITE_GATEWAY_URL=http://localhost:3001
```

---

**Document Owner**: Platform Team  
**Last Updated**: December 14, 2025  
**Next Review**: After Phase 1 MVP completion
