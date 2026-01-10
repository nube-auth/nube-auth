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
- **Database**: Turso (SQLite/libSQL)
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
- `id` (auto-increment integer, internal only)
- `public_id` (nanoid-based string, externally exposed)
- `created_at`, `updated_at` (SQLite integers: seconds since epoch)

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
| `is_admin` | BOOLEAN | NO | DEFAULT false | Admin flag for authorization |
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
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (S0xxx format) |
| `user_id` | INTEGER | NO | FK → users.id | |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `last_seen_at` | INTEGER | NO | | Updated on each activity |
| `expires_at` | INTEGER | NO | | Expiry time (epoch seconds) |
| `revoked_at` | INTEGER | YES | | NULL = active; set on logout |

**TTL**: 7 days rolling (see §9.1)

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
| `allowed_hosts` | TEXT | NO | | JSON array of domains |
| `redirect_uris` | TEXT | NO | | JSON array of valid redirect URIs |
| `enabled_providers` | TEXT | NO | DEFAULT '["google"]' | JSON array of enabled OAuth providers (e.g., ["google", "github"]) |
| `is_active` | BOOLEAN | NO | DEFAULT true | |
| `licensing_required` | BOOLEAN | NO | DEFAULT true | |
| `default_license_plan` | TEXT | NO | DEFAULT "free" | Enum: free or trial |
| `trial_days` | INTEGER | YES | | Required if default_plan = trial |
| `app_session_ttl_days` | INTEGER | NO | DEFAULT 28 | Per-app Gateway session TTL (1–365 days) |
| `account_lockout_minutes` | INTEGER | NO | DEFAULT 15 | Lockout duration after failed login attempts |
| `cache_ttl_minutes` | INTEGER | NO | DEFAULT 10 | Cache TTL for /me endpoint (user+license data) |
| `cors_allowed_origins` | TEXT | NO | | JSON array of CORS-allowed origins (optional) |
| `rate_limit_requests_per_minute` | INTEGER | NO | DEFAULT 100 | Global API rate limit for app |
| `created_at` | INTEGER | NO | | Epoch seconds |
| `updated_at` | INTEGER | NO | | Epoch seconds |

**Constraints**: `UNIQUE(project_id, slug)` — One slug per project

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

#### `email_verifications` (Phase 2 - Q2 2026)

| Column | Type | Nullable | Constraints | Notes |
|--------|------|----------|-------------|-------|
| `id` | INTEGER | NO | PK | Internal only |
| `public_id` | TEXT | NO | UNIQUE | Externally exposed (E0xxx format) |
| `email` | TEXT | NO | | Email being verified |
| `otp_hash` | TEXT | NO | | Hashed OTP (bcrypt) |
| `attempts` | INTEGER | NO | DEFAULT 0 | Track failed OTP verify attempts |
| `expires_at` | INTEGER | NO | | TTL 10 min from created_at |
| `locked_until` | INTEGER | YES | | Lockout expiry (3 failed attempts = 30 min lockout) |
| `consumed_at` | INTEGER | YES | | NULL = unused; set on verify |
| `created_at` | INTEGER | NO | | Epoch seconds |

**TTL**: 10 minutes (consumed on successful verify)

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

---

## 5. ID Generation System

### Format

`[EntityLetter][VariantDigit][nanoid(9-12 chars)]`

**Total length**: 11–14 characters (compact, URL-friendly)

| Entity | Prefix | Example | Length | Notes |
|--------|--------|---------|--------|-------|
| User | U0 | U0sFFDmgde | 11 | 9-char random |
| Project | P0 | P0kMn7pQx2 | 11 | 9-char random |
| App | A0 | A0aC7mK9pN | 11 | 9-char random |
| License | L0 | L0kN2m7PqC | 11 | 9-char random |
| Identity | I0 | I0aC9mKpNx | 11 | 9-char random |
| Project Member | M0 | M0kN7pQmCa | 11 | 9-char random |
| Email Verification | E0 | E0mK9pNqXc | 11 | 9-char random |
| Session | S0 | S0mK9pQxCa | 13 | 11-char random (higher entropy) |
| Auth Code | C0 | C0pN7mKqXc9A | 14 | 12-char random (security-critical) |
| Audit Log | AL0 | AL0mK9pNqXc | 12 | 9-char random |

### Rationale

**Why letter + digit (vs letter only)?**
- Avoids ambiguity: `P0kMn7...` is clearly a Project, not random chars starting with P
- Letter + digit pattern can't naturally occur in the random part
- Future-proof: Digit 0-9 reserves variants (e.g., U0 = user, U1 = service account)
- Still compact: 11 chars vs 15+ with underscores

**Alphabet (56 characters)**:
```
0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ
```
Excludes: i, I, l, L, o, O (confusing in readability)

### Implementation

Location: `packages/shared/src/id.ts`

```typescript
import { nanoid } from 'nanoid';

const ALPHABET = '0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ';

export const idGenerators = {
  user: () => `U0${nanoid(9, ALPHABET)}`,
  project: () => `P0${nanoid(9, ALPHABET)}`,
  app: () => `A0${nanoid(9, ALPHABET)}`,
  license: () => `L0${nanoid(9, ALPHABET)}`,
  identity: () => `I0${nanoid(9, ALPHABET)}`,
  projectMember: () => `M0${nanoid(9, ALPHABET)}`,
  emailVerification: () => `E0${nanoid(9, ALPHABET)}`,
  session: () => `S0${nanoid(11, ALPHABET)}`,
  authCode: () => `C0${nanoid(12, ALPHABET)}`,
  auditLog: () => `AL0${nanoid(9, ALPHABET)}`,
};

// Validation regex (per-entity)
export const idPatterns = {
  user: /^U0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  project: /^P0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  app: /^A0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  license: /^L0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  session: /^S0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{11}$/,
  authCode: /^C0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{12}$/,
};
```

### Benefits

- ✅ **Compact**: 11 chars vs 22+ (50% shorter)
- ✅ **Unambiguous**: Letter + digit prefix can't occur naturally
- ✅ **URL-friendly**: Clean URLs (`/projects/P0kMn7pQx2`)
- ✅ **Scannable**: Easy to grep logs (`grep "^U0"`)
- ✅ **Future-proof**: Digit 0-9 allows entity variants
- ✅ **Type-safe**: Prefix indicates entity type at a glance

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
3. Hash OTP, store in `email_verifications` with 10-min TTL
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
1. Lookup `email_verifications` by email
2. Check if locked out (locked_until > now) → return 429 Too Many Requests
3. Validate OTP:
   - Not expired (now < expires_at)
   - Not consumed (consumed_at IS NULL)
   - Hash matches
4. If OTP invalid:
   - Increment `attempts` += 1
   - If `attempts >= 3`: Set `locked_until = now() + 30 minutes`
   - Return 400 Bad Request
5. If OTP valid:
   - Mark consumed
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

**Cookie**: `proofa_session`  
**Stored**: Database `sessions` table  
**Scope**: Shared across all apps  
**TTL**: **7 days rolling**

**Rolling behavior:**
- Expires 7 days after last **activity**
- Activity = any valid API call to Core
- Refresh throttling: only extend if `last_seen_at < now() - 1 hour`
- Prevents excessive DB writes
- Maintains security (expires if unused)

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

### Input Validation & Sanitization

- **Framework**: Zod (TypeScript-native schema validation)
- **Apply**: All HTTP endpoints (request body, query params, path params)
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
| **Sessions** | **7 days rolling (core), 1-365 days per-app configurable** | Enhanced security; independent TTLs |
| **IDs** | **Nanoid prefixed** | Human-readable, type-safe |
| **Multi-tenant** | **Yes (projects)** | Flexibility for future |
| **Admin access** | **Role-based (owner/admin/member)** | Scalable permission model |
| **Auth pages** | **Core-hosted** | Security, consistency, branding |
| **Authentication** | **OAuth-only for MVP (Google, GitHub); email/OTP in Q2 2026** | Simple, secure, modern |
| **ID collision** | **OAuth provider uniqueness (MVP); email collision with OTP step-up in Phase 2 (Q2 2026)** | Prevents duplicates in MVP; account linking in Phase 2 |
| **JWT** | **No JWT tokens; sessions only** | Stateful sessions more secure for this use case |
| **Input Validation** | **Zod schemas (TypeScript-native)** | Type-safe runtime validation |
| **Error Format** | **Standard JSON structure (ok/error/code/message)** | Consistent, client-friendly API |
| **Rate Limiting** | **Global per-app (config: 100/min default) + per-action buckets** | DDoS protection; flexible per app |
| **Account Lockout** | **Per-app configurable (default 15 min after failed attempts)** | Brute-force protection |
| **Cache TTL** | **Per-app configurable (default 10 min for /me endpoint)** | Balances freshness vs. Core load |
| **CORS** | **Per-app JSON array whitelist** | Origin-based security; prevent leaks |
| **Logging** | **Winston/Pino structured logs + audit_logs table** | Security audit, debugging, compliance |
| **Transactions** | **Drizzle transactions for multi-write operations** | ACID guarantees, atomicity |
| **Audit Trail** | **Yes (audit_logs table with actions/actors/changes)** | Compliance, transparency, security |
| **OTP Lockout** | **Phase 2 (Q2 2026) - 3 failed attempts = 30 min lockout** | Brute-force protection for email login |
| **S2S Token** | **Env var + manual script generation** | Simple, no infra needed for MVP |

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
| `proofa_session` | Core | 7d rolling | Global | User ID |
| `pp_app_session` | Gateway | Per-app config | Per-app | User ID + App ID |

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
LOG_LEVEL=info
```

**Gateway**:
```env
CORE_URL=http://localhost:3000
X_PROOFA_SERVICE_TOKEN=<same as core>
SESSION_SECRET=<32+ char>
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
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
