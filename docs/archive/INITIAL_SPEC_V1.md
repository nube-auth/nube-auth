# Proofa Implementation Specification (v0)

**Version:** 0.1.0
**Last Updated:** 2025-12-14
**Status:** MVP Spec — Ready for Implementation

> This spec consolidates our decisions (Hono + Turso + Upstash + Drizzle, core-hosted auth pages, OTP-only, identity collision rules, per-app licensing config, 28-day rolling sessions) into a single implementation contract for Copilot/Spark.

---

## Table of contents

1. Architecture overview
2. Technology stack
3. Monorepo structure
4. Data model
5. ID generation system
6. Authentication flows
7. API specifications
8. Multi-tenant project structure
9. Session management
10. Licensing system
11. Admin access control
12. Deployment domains
13. Security policies
14. Build order
15. Resolved decisions

---

## 1) Architecture overview

### Components (MVP)

* **Apps** (pingpong.codes, mockly.codes, etc.)

  * Never call Core directly
  * Call **Gateway** only

* **Gateway** (`api.proofa.com`)

  * Public BFF for apps + user/admin dashboards
  * Stores **app sessions** in **Upstash Redis** + in-memory LRU cache
  * Calls Core via **S2S token** (`X-Proofa-Service-Token`)

* **Core** (`auth.proofa.com`)

  * Source of truth: users, identities, core sessions, projects, apps, licenses
  * Hosts **user login UI** (core-hosted pages)
  * OAuth provider integration

* **User Dashboard** (`proofa.com` or `account.proofa.com`)

  * Account management (profile, sessions, linked identities)
  * Talks to Gateway only

* **Admin Dashboard** (`admin.proofa.com`)

  * Project/app/user/license management
  * Talks to Gateway only

> MVP simplification: **Admin routes live on the same Gateway** under `/admin/*`. Separate `admin-api` and `admin-auth` subdomains can be added later if needed.

### Communication rules

* Apps + dashboards → Gateway (public)
* Gateway → Core (private) via S2S token
* Core owns identity & license truth
* No secrets in dashboards or app clients

---

## 2) Technology stack

### Backend

* Node.js + TypeScript
* Hono
* Turso (SQLite/libSQL)
* Drizzle ORM
* Upstash Redis

### Frontend

* Vite + React
* Tailwind
* shadcn/ui (recommended)
* TanStack Query

### Monorepo

* pnpm + turbo

### Email

* Resend (abstracted, swapable with Postmark later)

---

## 3) Monorepo structure

```
proofa/
  apps/
    core/                 # auth + core APIs + core-hosted pages
    gateway/              # BFF for apps + dashboards (user + admin routes)
    user-dashboard/       # end-user UI
    admin-dashboard/      # admin UI
  packages/
    shared/               # types, constants, id generator
    db/                   # drizzle schema + migrations
    auth/                 # google/github adapters
    redis/                # upstash client + cache helpers
  turbo.json
  pnpm-workspace.yaml
  package.json
```

---

## 4) Data model (Drizzle + Turso)

### Global conventions

* Every table has:

  * internal `id` (auto-increment int, internal only)
  * `public_id` (nanoid-based string, externally exposed)
  * timestamps stored as SQLite integers
* Foreign keys reference internal `id`

### Tables (MVP)

* `users`
* `identities` (unique `(provider, provider_user_id)`)
* `sessions` (core sessions)
* `projects`
* `project_members` (unique `(project_id, user_id)`)
* `apps` (unique `(project_id, slug)`)
* `auth_codes` (TTL 120s, single-use)
* `licenses` (unique `(user_id, app_id)`)
* `email_verifications` (OTP only)

### Apps table additions (per-app session TTL)

Add the following field to `apps`:

* `app_session_ttl_days` **INTEGER NOT NULL DEFAULT 28**

Rules:

* Applies to **Gateway app sessions** (`pp_app_session`) only.
* Core session TTL stays global (see Session Management).
* Validation bounds (recommended): `1 <= app_session_ttl_days <= 365`.

---

## 5) ID generation system

Format: `[EntityLetter][0][nanoid]`

* Alphabet excludes confusing chars (i/I/l/L/o/O)
* Examples:

  * `U0xxxxxxxxx` (User)
  * `S0xxxxxxxxxxx` (Session)
  * `C0xxxxxxxxxxxx` (Auth Code)

Implementation lives at: `packages/shared/src/id.ts`

---

## 6) Authentication flows (authoritative)

### 6.1 User login decision

Proofa checks `proofa_session`.

**If session valid:**

* **Continue as <user>** → fast path (no provider re-auth)
* **Switch account** →

  * Sign in to another account (OTP or provider)
  * Create a new account (provider)
  * **Create new account logs out current session first**

**If no session:**

* **Sign in** → OTP-only

  * After OTP verify: if user exists → create session; else offer “Create account”.
* **Create account** → provider signup

### 6.2 Identity collision policy

1. Provider identity match wins: `(provider, provider_user_id)` → login that user.
2. Email collision requires step-up:

   * If provider identity new but email matches existing user → require OTP verification to link.
   * Store “pending link” in Redis (5–10 min) if needed.
3. No collision → create new user + identity.

### 6.3 App SSO (auth-code exchange)

App → Gateway `/auth/start` → Core `/v1/auth/start` → Core issues `auth_code` → Gateway exchanges via `/v1/auth/exchange` (S2S) → Gateway creates app session.

---

## 7) API specifications (MVP)

### 7.1 Core API (auth.proofa.com) — `/v1`

* `GET /v1/auth/start`
* `GET /v1/auth/callback/:provider`
* `POST /v1/auth/exchange` (S2S only)
* `POST /v1/email/start`
* `POST /v1/email/verify`
* `GET /v1/license?app_id=...`

### 7.2 Gateway API (api.proofa.com)

User:

* `GET /auth/start`
* `GET /auth/callback`
* `GET /me`
* `GET /profile`
* `PATCH /profile`
* `GET /sessions`
* `DELETE /sessions/:session_id`
* `POST /logout`

Admin (same gateway under `/admin/*`):

* `POST /admin/projects`
* `GET /admin/projects`
* `GET/PATCH/DELETE /admin/projects/:project_id`
* `GET/POST/DELETE /admin/projects/:project_id/members`
* `POST/GET/PATCH/DELETE /admin/projects/:project_id/apps`
* `GET /admin/projects/:project_id/activity`
* License grant/edit/revoke endpoints scoped to app

---

## 8) Multi-tenant project structure

* Users are global
* Projects own apps
* Licenses are per (user, app)
* Admin access is governed by `project_members` role

---

## 9) Session management (corrected)

### 9.1 Core session (global)

* Cookie: `proofa_session`
* Stored in DB `sessions`
* **TTL: 28 days rolling**

  * Rolling = expires 28 days after last activity
  * Refresh throttling: only extend if last refresh > 1 hour ago

Why global:

* Core session is shared across apps. Making it per-app creates confusing cross-app behavior.

### 9.2 Gateway app session (per app)

* Cookie: `pp_app_session`
* Stored in Redis `app_session:{session_id}`
* In-memory LRU cache TTL: 2 minutes

TTL source:

* **Derived from app config**: `apps.app_session_ttl_days`

Behavior:

* When Gateway creates an app session, it sets:

  * Redis TTL = `app_session_ttl_days`
  * Cookie Max-Age = `app_session_ttl_days`

Notes:

* If an app session expires but core session is still valid, user sees a fast-path "Continue as <user>" and a new app session is issued.

---

## 10) Licensing system

Per-app config in `apps` table:

* `licensing_required` (bool)
* `default_license_plan` (`free` | `trial`)
* `trial_days` (required if plan = `trial`)

Auto-license creation:

* On first successful login for an app
* If licensing_required=false: return synthetic active license or omit
* Else: create `license` with plan per app defaults

---

## 11) Admin access control

* Bootstrap allowlist: `ADMIN_EMAILS` env var
* DB flag: `users.is_admin`
* Project roles: owner/admin/member
* MFA: deferred to Phase 2 unless you want it in MVP

---

## 12) Deployment domains (suggested)

* `auth.proofa.com` (Core)
* `api.proofa.com` (Gateway)
* `admin.proofa.com` (Admin dashboard)
* `account.proofa.com` (User dashboard)

---

## 13) Security policies (MVP)

* Allowlisted redirect URIs per app
* HttpOnly + Secure cookies
* SameSite=Lax
* Rate limit OTP and auth start (Redis)
* S2S token required for Core exchange/admin calls
* Audit admin actions (Phase 1.5 / Phase 2)

---

## 14) Build order (MVP)

1. Monorepo scaffold (pnpm + turbo)
2. DB schema + migrations (Drizzle)
3. Core: app/project seed + middleware
4. Core: OAuth adapters (Google, GitHub)
5. Core: OTP endpoints
6. Core: session + auth-code issuance
7. Gateway: auth start/callback + exchange
8. Gateway: session storage in Redis + LRU cache
9. User dashboard: minimal profile + sessions
10. Admin dashboard: create project/app + grant license

---

## 15) Resolved decisions

* OTP only (no magic links)
* Core-hosted login UI
* Identity collision: provider match wins; email collision requires OTP step-up
* Sessions: **28 days rolling**
* DB: Turso + Drizzle
* Cache: Upstash Redis

---

## Notes on your pasted spec (quick deltas)

* Replace all occurrences of **7 days** TTL with **28 days rolling** (core sessions + Redis app sessions).
* For MVP, keep a **single gateway** with `/admin/*` routes; split to `admin-api` later if needed.
* Your schema choices (internal int id + public_id) are solid for Turso/SQLite.
