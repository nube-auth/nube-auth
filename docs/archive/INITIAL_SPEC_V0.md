# Proofa Monorepo Implementation (v0)

This doc is the **single source of truth** for how we build Proofa in a private monorepo:

* **proofa-core**: identities, sessions, licenses, billing (later)
* **proofa-gateway**: internal BFF used by apps + dashboard
* **proofa-dashboard**: user/admin UI (talks only to gateway)

## Stack decisions (locked for v0)

* Backend runtime: **Node.js + TypeScript**
* HTTP framework: **Hono**
* DB (day 1): **Turso (SQLite/libSQL)**
* Cache/KV: **Upstash Redis**
* ORM: **Drizzle**
* Monorepo: **pnpm + turbo**
* Dashboard: **Vite + React + Tailwind**
* Email: **Resend** (abstract interface so Postmark can be swapped later)
* Deployment: not locked (design to work on Fly/VPS/etc.)

> Since this is a brand-new system, we can reset migrations early. Once we have real users/licenses,
> treat migrations as append-only.

---

## 0) Monorepo layout

```
proofa/
  apps/
    core/                 # Proofa backend (source of truth)
    gateway/              # Internal BFF for apps + dashboard
    dashboard/            # Vite React UI
  packages/
    shared/               # shared types, constants, helpers
    db/                   # drizzle schema + migrations
    auth/                 # provider adapters (google/github)
    redis/                # upstash client + caching helpers
  turbo.json
  pnpm-workspace.yaml
  package.json
```

### Rules

1. **Apps never call core directly**. Apps + dashboard call **gateway** only.
2. **Gateway calls core** via server-to-server (S2S) token.
3. **Core is the only owner** of identity + license truth.
4. No secrets in dashboard or app clients.

---

## 1) Core flows

### 1.1 Login decision and account creation (authoritative)

Proofa always begins by checking the **core session** cookie (`proofa_session`).

#### Case A — Core session exists and is valid

UI shows two primary actions:

1. **Continue as <username>**

   * Fast path. **No provider re-auth**.
   * Proceed directly with App SSO (auth-code flow) and redirect the user back to the app.
   * Provider OAuth is only required for **step-up** actions (linking a new provider, security settings changes, billing changes).

2. **Switch account**

   * Opens a screen with two options:

     * **Sign in to another existing account** (email OTP or provider sign-in)
     * **Create a new account**

   **Switch account → Create a new account** behavior (locked):

   * **Revoke/logout the current core session first**, then proceed to new-account signup.
   * Rationale: keeps one active user per browser, avoids confusing multi-persona state.

#### Case B — No core session (missing/expired/invalid)

UI shows:

1. **Sign in (existing account)**

   * **Email verification first** (OTP / magic link).
   * Flow:

     * user enters email → send OTP (neutral response)
     * user enters OTP → verify
     * if a user exists for that verified email → create core session and continue
     * if no user exists → show: "No account found. Create a new account?" (safe to reveal after OTP verification)
   * Do **not** auto-create an "email-only" account in v0.

2. **Create account (new user)**

   * Show provider buttons (Google/GitHub/etc. based on app policy).
   * Provider OAuth → create user + identity → create core session → continue.

---

### 1.2 Identity collision policy (provider + email)

These rules prevent duplicate accounts and account-takeover.

1. **Provider identity match wins**

   * After OAuth, lookup identity by `(provider, provider_user_id)`.
   * If it exists, treat this as **login** to that user, even if the user clicked "Create account".

2. **Email collision (provider identity new, email matches existing user)**

   * If provider identity is new but the provider returns an email that matches an existing Proofa user:

     * Do **not** auto-link identities based on email alone.
     * Require **email OTP step-up verification**.
     * After OTP verified, link the new provider identity to the existing user and continue.

3. **Email not found**

   * If email verified and no user exists, proceed with creating a new account via provider signup.

---

### 1.3 App SSO (auth-code flow)

* App → Gateway: `/auth/start`
* Gateway → Core: `/v1/auth/start` (redirect)
* Core completes provider auth, creates/refreshes **core session**, issues short-lived **auth code**
* Core redirects back to Gateway `/auth/callback?code=...`
* Gateway exchanges code with Core `/v1/auth/exchange` (S2S)
* Gateway creates **app session** cookie and redirects to the app

---

## 2) Data model (Turso/SQLite via Drizzle)

### 2.1 Tables

(Turso/SQLite via Drizzle)

### 2.1 Tables

#### users

* id
* primary_email (nullable)
* primary_email_verified (bool)
* name (nullable)
* avatar_url (nullable)
* created_at, updated_at

#### identities

* id
* user_id (FK)
* provider (text: google/github/…)
* provider_user_id (stable id)
* email (nullable)
* email_verified (bool)
* created_at

**Constraints**

* UNIQUE(provider, provider_user_id)

#### sessions (core sessions)

* id (session_id)
* user_id
* created_at
* last_seen_at
* expires_at
* revoked_at (nullable)

#### apps

* id (app_id)
* name
* allowed_hosts (json/text)
* redirect_uris (json/text)
* required_providers (json/text)
* is_active

#### auth_codes

* code
* user_id
* app_id
* redirect_uri
* created_at
* expires_at
* consumed_at (nullable)

#### licenses

* id
* user_id
* app_id
* plan (free/trial/pro/team/enterprise as text)
* status (active/expired/canceled/suspended as text)
* source (manual/promo/stripe/lemonsqueezy/internal as text)
* valid_from
* valid_until (nullable = lifetime)
* entitlements (json/text nullable)
* provider (nullable)
* provider_ref_id (nullable)
* metadata (json/text nullable)
* created_at, updated_at

**Constraints**

* UNIQUE(user_id, app_id)

#### email_verifications

* id
* email
* otp_hash
* expires_at
* consumed_at (nullable)
* created_at

---

## 3) Core API (apps/core)

Base path: `/v1`

### 3.1 Service-to-service auth

Gateway → Core calls must include:

* `X-Proofa-Service-Token: <secret>`

Core validates this token for:

* `/v1/auth/exchange`
* admin proxy endpoints (if gateway proxies)

### 3.2 Auth endpoints

#### GET /v1/auth/start

Query:

* app_id
* redirect_uri
* provider (optional)
* state (optional)

Behavior:

* validate app_id exists & active
* validate redirect_uri is allowlisted for app
* pick provider (if required_providers has exactly one)
* redirect to provider OAuth

#### GET /v1/auth/callback/:provider

Behavior:

* exchange OAuth code → provider profile
* lookup identity by (provider, provider_user_id)
* if exists: login that user
* else: create user + identity (see “email collision” note below)
* create/refresh core session cookie `proofa_session`
* ensure license exists for (user, app) (create free/trial)
* issue auth_code (TTL 120s), store in auth_codes
* redirect to redirect_uri with `code` + `state`

#### POST /v1/auth/exchange (S2S)

Body:

* code
* app_id
* redirect_uri

Behavior:

* validate code exists, not expired, not consumed, bindings match
* mark consumed
* return user + license for app

### 3.3 Email verification

#### POST /v1/email/start

Body: { email }
Behavior:

* always return 200 neutral response
* create OTP, store hash with TTL
* send OTP email

#### POST /v1/email/verify

Body: { email, otp }
Behavior:

* validate OTP, consume
* if user exists for email: create core session
* return { ok: true, userExists: boolean }

### 3.4 License

#### GET /v1/license?app_id=...

Auth: core session
Return license for app

### 3.5 Admin (manual/promo)

#### POST /v1/admin/license/grant

Auth: core session + admin allowlist
Body:

* app_id
* user_id OR email
* plan
* duration_days OR valid_until OR lifetime
* source (manual|promo)
* note

Behavior:

* upsert license (user, app)
* set status=active, valid_from=now
* set metadata.granted_by + note

---

## 4) Gateway API (apps/gateway)

Gateway is the only public-facing API for apps and dashboard.

### 4.1 App resolution

Preferred: hostname mapping (config)

* api.pingpong.codes → pingpong
* api.mockly.codes → mockly

Never trust user-provided app_id without strict validation.

### 4.2 Gateway session cookie

* Cookie name: `pp_app_session`
* Must include app_id and be validated as app-scoped.
* Store as signed token (HMAC) or DB session.

### 4.3 Endpoints

#### GET /auth/start

* resolve app_id
* redirect to core /v1/auth/start with redirect_uri = gateway /auth/callback

#### GET /auth/callback

* receive code
* S2S call to core /v1/auth/exchange
* set gateway session cookie
* redirect to app return URL

#### GET /me

* validate gateway session
* return user + license (optionally cached)

#### GET /license

* validate gateway session
* return license only

#### POST /logout

* clear gateway session cookie

---

## 5) Upstash Redis usage

Use Redis for:

* rate limiting (email OTP, auth start)
* short-lived caches in gateway (license snapshot 30–120s)
* ephemeral state (OAuth state/nonce) if needed

Avoid storing long-term truth in Redis.

---

## 6) Payments (Phase 2)

Not in MVP. Implement after:

* login + sessions
* license system
* manual/promo grants

Phase 2 adds:

* per-app billing provider config (encrypted)
* checkout creation
* webhook processing → license updates

---

## 7) Build order (MVP)

1. Monorepo scaffolding (pnpm + turbo)
2. Drizzle schema + migrations (Turso)
3. core: app registry seed
4. core: provider adapters (Google, GitHub)
5. core: sessions + auth-code flow
6. core: license upsert + admin grant
7. gateway: auth start/callback + session cookie
8. gateway: /me and /license
9. dashboard: login via gateway + admin grant UI

---

## 8) Open questions (resolved)

### Licensing policy (per app)

Each app config includes:

* `licensing_required`: boolean
* `default_license_plan`: `free` or `trial`
* `trial_days`: integer (required only if default plan is `trial`)

Behavior:

* If `licensing_required=false`: core returns a synthetic license `{ status: "active", plan: "free" }` (or omit license) and apps skip paid checks.
* If `licensing_required=true`: on first successful login for that app, core **creates** a license using the app’s defaults.

### Trial policy

Trial is optional and configured per app.

* If enabled, core creates `trial` with `valid_until = now + trial_days`.
* Otherwise core creates `free`.

### Session TTL

Core session TTL: **28 days rolling**.

* Rolling means: session expires **28 days after last user activity**, not 28 days after login.
* Each valid request may refresh expiry (with throttling to avoid excessive writes).

Core session TTL: **7 days rolling**.

* Each valid request refreshes expiry (rolling).

### Email auth

Email verification uses **OTP only** (no magic links) for v0.

### Login UI location

Login and account flows use **core-hosted pages** (recommended for security and consistency).

* Dashboard and apps redirect users to core pages for auth flows.
