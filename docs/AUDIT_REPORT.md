# Proofa — Comprehensive Audit Report

**Date:** 2026-02-10
**Branch:** `sweet-golick`
**Auditor:** Automated (Claude Code)
**Scope:** Full stack — Backend services, Database, API layer, Frontend dashboards, Shared packages

---

## Executive Summary

A comprehensive audit of the Proofa authentication and licensing platform revealed **68 findings** across security, database integrity, API design, frontend quality, and UI/UX.

| Severity     | Count |
|-------------|-------|
| **Critical** | 10    |
| **High**     | 24    |
| **Medium**   | 24    |
| **Low**      | 10    |
| **Total**    | **68** |

---

## Table of Contents

1. [Critical Findings](#1-critical-findings)
2. [High Severity Findings](#2-high-severity-findings)
   - [Security — Timing Attacks](#21-security--timing-attacks)
   - [Security — OAuth & Auth Flows](#22-security--oauth--auth-flows)
   - [Security — Rate Limiting & Lockout](#23-security--rate-limiting--lockout)
   - [Database](#24-database)
   - [UI/UX](#25-uiux)
3. [Medium Severity Findings](#3-medium-severity-findings)
   - [Security](#31-security)
   - [Database](#32-database)
   - [Frontend](#33-frontend)
4. [Missing Implementations & Stubs](#4-missing-implementations--stubs)
5. [UI/UX Issues](#5-uiux-issues)
   - [Accessibility](#51-accessibility)
   - [Missing User Feedback](#52-missing-user-feedback)
   - [Form Validation Gaps](#53-form-validation-gaps)
   - [Navigation Issues](#54-navigation-issues)
   - [Console Statements in Production](#55-console-statements-in-production)
   - [Responsive Design Gaps](#56-responsive-design-gaps)
6. [Remediation Roadmap](#6-remediation-roadmap)

---

## 1. Critical Findings

> These require **immediate action** — they represent active security vulnerabilities or fundamental breakages.

### 1.1 OTP Generated with `Math.random()` — Not Cryptographically Secure

| | |
|---|---|
| **File** | `apps/packages/auth/src/crypto.ts:8` |
| **Severity** | Critical |
| **Description** | `Math.random()` is predictable. An attacker who determines the PRNG state can predict future OTPs. |
| **Fix** | Use `crypto.randomInt(0, 1000000)` from Node.js crypto module. |

---

### 1.2 OTP Hashing Uses Hardcoded Static Salt

| | |
|---|---|
| **File** | `apps/packages/auth/src/crypto.ts:19` |
| **Severity** | Critical |
| **Description** | Salt is `"proofa-otp-salt"` for ALL users. With only 1M possible OTPs, an attacker can precompute a full rainbow table in seconds. |
| **Fix** | Generate a per-user random salt, store alongside hash. |

---

### 1.3 Core Admin Routes Have ZERO Authentication

| | |
|---|---|
| **File** | `apps/services/core/src/routes/v1/admin/index.ts` + `core/src/index.ts:45` |
| **Severity** | Critical |
| **Description** | The `s2sMiddleware` exists but is **never applied** to any Core route. Anyone who can reach the Core service network can grant licenses, manage projects, etc. |
| **Fix** | Apply `s2sMiddleware` to all Core admin, auth, billing, and email routes. |

---

### 1.4 Webhook Signatures Not Verified Before Queuing

| | |
|---|---|
| **File** | `apps/services/core/src/routes/v1/billing/webhooks.ts:33-93` |
| **Severity** | Critical |
| **Description** | The endpoint checks that a signature header *exists* but **never verifies** it. Anyone can forge webhook payloads to create fraudulent transactions, grant subscriptions, or trigger refunds. |
| **Fix** | Verify signatures against the provider's webhook secret **before** queuing the event. |

---

### 1.5 Transaction Utility Uses Wrong Database Driver (D1 instead of PostgreSQL)

| | |
|---|---|
| **File** | `apps/packages/db/src/utils/transaction.ts` |
| **Severity** | Critical |
| **Description** | Imports `DrizzleD1Database` (Cloudflare D1) but the app uses `node-postgres`. The `withTransaction`/`executeAtomic` functions are **non-functional** and will throw runtime errors if called. |
| **Fix** | Rewrite using `db.transaction(async (tx) => { ... })` from `drizzle-orm/node-postgres`. |

---

### 1.6 Toast Notification System Is a `console.log` Stub

| | |
|---|---|
| **File** | `apps/dashboard/admin/src/components/Toast.tsx:26` |
| **Severity** | Critical |
| **Description** | The entire admin dashboard's user feedback system only does `console.log()`. No user ever sees success/error messages for ANY action. 20+ action flows affected (user updates, license changes, plan creation, team operations, project/app deletion, API key regeneration, OAuth provider updates, etc.). |
| **Fix** | Implement actual toast component (e.g., `react-hot-toast`, `sonner`). |

---

### 1.7 No React Error Boundaries — White Screen on Any Error

| | |
|---|---|
| **Files** | `apps/dashboard/admin/` and `apps/dashboard/user/` |
| **Severity** | Critical |
| **Description** | Zero `ErrorBoundary` components in either dashboard. Any uncaught render error crashes the entire application with a white screen. No graceful degradation. |
| **Fix** | Add Error Boundaries around `<ProtectedLayout>` and individual page routes. |

---

### 1.8 All Gateway User Routes Are Stubs

| | |
|---|---|
| **File** | `apps/services/gateway/src/routes/user.ts` |
| **Severity** | Critical |
| **Description** | ALL six user routes (`/me`, `/me/profile`, `/me/sessions`, `/me/sessions/:id`, `/me/logout`) return hardcoded placeholder JSON with `// TODO` comments. The user dashboard frontend displays no real data. |
| **Fix** | Implement actual user API routes connecting to Core service. |

---

### 1.9 Broken Cookie Signing — Signature Independent of Value

| | |
|---|---|
| **File** | `apps/services/gateway/src/utils/cookies.ts:55-78` |
| **Severity** | Critical |
| **Description** | `signCookie()` produces the **same** signature for **every** cookie value (first 8 chars of base64-encoded secret). An attacker who sees one valid cookie can forge arbitrary values by appending the same suffix. Zero integrity protection. |
| **Fix** | Remove if unused; replace with proper HMAC-based signing if used. |

---

### 1.10 License Upsert Race Condition (TOCTOU)

| | |
|---|---|
| **File** | `apps/packages/db/src/queries.ts:614-638` |
| **Severity** | Critical |
| **Description** | SELECT-then-INSERT without transaction. Concurrent requests can create duplicate licenses for the same user/app combination. |
| **Fix** | Use `INSERT ... ON CONFLICT DO UPDATE` for atomic upsert. |

---

## 2. High Severity Findings

### 2.1 Security — Timing Attacks

All secret comparisons use `===`/`!==` instead of `crypto.timingSafeEqual`, enabling timing side-channel attacks:

| File | Line | Context |
|------|------|---------|
| `apps/packages/auth/src/crypto.ts` | 35 | OTP hash comparison |
| `apps/packages/auth/src/crypto.ts` | 48 | S2S token comparison |
| `apps/services/gateway/src/middleware/auth.ts` | 171 | Token comparison |
| `apps/services/gateway/src/middleware/s2s.ts` | 13 | S2S token validation |
| `apps/packages/auth/src/session.ts` | 70 | Session HMAC verification |

**Fix:** Replace all with `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`.

---

### 2.2 Security — OAuth & Auth Flows

| # | Finding | File | Line | Fix |
|---|---------|------|------|-----|
| 1 | **No `redirect_uri` validation** — attacker-controlled redirect can steal auth codes | `core/src/routes/v1/auth/index.ts` | 109 | Validate against strict allowlist |
| 2 | **OAuth state parameter silently ignored** — `_state` prefixed with underscore, never validated | `packages/auth/src/oauth.ts` | 147 | Remove underscore, implement validation |
| 3 | **JWT decoded without signature verification** — comments say "verify in production" | `packages/auth/src/adapters/google.ts` | 13 | Use `jose` library to verify JWT signature |
| 4 | **`audience` parameter client-controllable** — user can pass `?audience=admin` to get admin session | `gateway/src/routes/auth.ts` | 82 | Validate `audience` against allowed values server-side |
| 5 | **In-memory OAuth state store** — breaks in multi-instance deployments | `packages/auth/src/state.ts` | 12 | Move to Redis-backed state storage |
| 6 | **No S2S auth on `/v1/auth/exchange`** — session ID → PII without authentication | `core/src/routes/v1/auth/index.ts` | 440 | Add S2S middleware |
| 7 | **No S2S auth on email routes** — anyone can trigger OTP emails | `core/src/routes/v1/email/index.ts` | — | Add S2S middleware |

---

### 2.3 Security — Rate Limiting & Lockout

| # | Finding | File | Line | Fix |
|---|---------|------|------|-----|
| 1 | **Rate limiting disabled in dev mode** — production misconfiguration disables all rate limiting | `gateway/src/middleware/rateLimit.ts` | 34 | Use higher thresholds in dev, never disable |
| 2 | **Rate limiter fails open** — Redis failure = unlimited brute force | `gateway/src/middleware/rateLimit.ts` | 94 | Fail closed on auth endpoints; add in-memory fallback |
| 3 | **Rate limiter INCR+EXPIRE not atomic** — key can persist without TTL | `cache/src/client.ts` | 234 | Use Redis Lua script or `SET NX EX` pattern |
| 4 | **IP spoofing via trusted headers** — trusts `cf-connecting-ip` and `x-forwarded-for` unconditionally | `gateway/src/middleware/rateLimit.ts` | 107 | Trust proxy headers only behind verified reverse proxy |

---

### 2.4 Database

| # | Finding | File | Fix |
|---|---------|------|-----|
| 1 | **No pool error handler** — unhandled pool error crashes Node.js | `packages/db/src/index.ts:28` | Add `pool.on('error', ...)` handler |
| 2 | **No transactions used in any query** — despite having transaction utilities | `packages/db/src/queries.ts` | Wrap multi-step mutations in transactions |
| 3 | **`setAsDefault` race condition** — two UPDATEs without transaction | `packages/db/src/queries.ts:964` | Wrap in transaction |
| 4 | **License delete is a no-op** — returns success without deleting | `core/src/routes/v1/admin/index.ts:150` | Implement actual deletion |
| 5 | **~~No admin role verification in Gateway~~** — ✅ RESOLVED: Replaced `is_admin` with session entitlements from project_members | `gateway/src/routes/admin.ts` | N/A |

---

### 2.5 UI/UX

| # | Finding | File | Line | Fix |
|---|---------|------|------|-----|
| 1 | **User suspend has no confirmation dialog** — single click suspends immediately | `admin/src/pages/AppUsers.tsx` | 114 | Add `ConfirmModal` like delete actions |
| 2 | **Wildcard CORS subdomain matching** — string suffix matching vulnerable to `attacker-proofa.sh` | `packages/shared/src/middleware/cors.ts` | 57 | Parse domain and match parts properly |

---

## 3. Medium Severity Findings

### 3.1 Security

| # | Finding | File | Line |
|---|---------|------|------|
| 1 | CORS returns `*` for missing `Origin` header | `gateway/src/index.ts` | 62 |
| 2 | Overly broad auth middleware bypass (`/v1/auth/*` and `/v1/debug/*` fully exempted) | `gateway/src/middleware/auth.ts` | 31 |
| 3 | CSP allows `unsafe-inline` for scripts | `gateway/src/index.ts` | 35 |
| 4 | Session cookie `maxAge` hardcoded to 7 days (mismatch with actual session TTLs) | `packages/auth/src/session.ts` | 33 |
| 5 | CSRF protection only on admin routes, not user routes | `gateway/src/index.ts` | 84 |
| 6 | CSRF token returned in login response body | `gateway/src/routes/auth.ts` | 397 |
| 7 | Admin security check relies on spoofable `User-Agent` | `gateway/src/middleware/adminSecurityCheck.ts` | — |
| 8 | Sensitive cookies logged on 401 responses | `gateway/src/middleware/auth.ts` | 41 |
| 9 | `Set-Cookie` exposed in CORS `Access-Control-Expose-Headers` | `packages/shared/src/middleware/cors.ts` | 85 |
| 10 | Lockout middleware fails open on Redis errors | `packages/shared/src/middleware/lockout.ts` | 177 |
| 11 | `email_verified` not checked for Google OAuth | `packages/auth/src/oauth.ts` | 125 |
| 12 | Minimal email validation (only checks `includes("@")`) | `core/src/routes/v1/email/index.ts` | 32 |
| 13 | No input validation on profile update (name accepts anything) | `gateway/src/routes/me.ts` | 63 |

### 3.2 Database

| # | Finding | File |
|---|---------|------|
| 1 | Missing pagination on all list queries (8+ unbounded) | `packages/db/src/queries.ts` |
| 2 | OTP `incrementAttempts` read-then-write race (lockout bypass) | `packages/db/src/queries.ts:676` |
| 3 | No graceful pool shutdown on process exit | `packages/db/src/index.ts` |
| 4 | Missing FK constraint on `plans.app_id` | `packages/db/src/schema.ts` |
| 5 | Missing cascade rules on foreign keys (schema-wide) | `packages/db/src/schema.ts` |
| 6 | Redis `KEYS` command exposed — blocks server | `packages/cache/src/client.ts:172` |
| 7 | `revokeUserSessions` uses O(n) key scan | `packages/cache/src/client.ts:326` |

### 3.3 Frontend

| # | Finding | File |
|---|---------|------|
| 1 | No 404 catch-all route in either dashboard | Both `App.tsx` files |
| 2 | `BillingDashboard` has no error state for failed API calls | `admin/src/pages/BillingDashboard.tsx:113` |
| 3 | Duplicate identity creation on email auth | `core/src/routes/v1/email/index.ts:177` |

---

## 4. Missing Implementations & Stubs

| Feature | File | Status |
|---------|------|--------|
| Payment processing worker | `workers/src/process-payment.ts:39` | "Phase 2" stub — logs only |
| License sync worker | `workers/src/sync-license.ts:46` | "Phase 2" stub — logs only |
| Admin billing gateway | `gateway/src/routes/admin-billing.ts` | Returns 501 for ALL routes |
| Payments gateway | `gateway/src/routes/payments.ts` | Returns 501 for ALL routes |
| Billing webhook (gateway) | `core/src/routes/v1/billing/index.ts:20` | "Phase 2 pending" stub |
| Email notifications — failed payments | `core/src/billing/services/webhook-processor.ts:219` | TODO comment |
| Email notifications — refunds | `core/src/billing/services/webhook-processor.ts:286` | TODO comment |
| Two-factor authentication | `user/src/pages/Security.tsx:91` | "Coming soon" in UI |
| Password management | `user/src/pages/Security.tsx:110` | "Coming soon" in UI |
| Advanced analytics | `admin/src/pages/ProjectStats.tsx:95` | "Coming Soon" placeholder |
| Total revenue statistic | `core/src/routes/v1/admin/stats.ts:71` | Hardcoded `0` |
| Redis session scanning | `gateway/src/services/sessionService.ts:204` | TODO comment |
| `adminSecurityCheck` middleware | `gateway/src/middleware/adminSecurityCheck.ts` | Defined but **never wired** into middleware chain |
| Notification system for plan sync events | `workers/src/sync-plan-to-providers.ts:289,304` | TODO comment |
| Auto-creation of default routing rules | `core/src/routes/v1/admin/providers.ts:307` | TODO comment |
| User dashboard `QueryClientProvider` | `user/src/App.tsx` | Missing — react-query hooks will crash |

---

## 5. UI/UX Issues

### 5.1 Accessibility

> **Zero ARIA attributes found across the entire codebase.**

| # | Issue | File | Recommendation |
|---|-------|------|----------------|
| 1 | No `aria-label`, `aria-describedby`, `aria-labelledby` anywhere | All dashboard files | Add ARIA labels to all interactive elements |
| 2 | Custom dropdowns lack `role="listbox"`, `role="option"`, `aria-expanded` | `admin/src/pages/AppUsers.tsx:273-323` | Use component library Select or add ARIA roles |
| 3 | OAuth toggle cards use `<div onClick>` — not keyboard accessible | `admin/src/pages/AppOAuth.tsx:162-200` | Add `role="button"`, `tabIndex={0}`, `onKeyDown` |
| 4 | Tables lack `scope="col"` on headers | All table pages | Add `scope` attributes to `<th>` |
| 5 | Deprecated `onKeyPress` used instead of `onKeyDown` | `admin/src/pages/AppLicenses.tsx:962` | Replace with `onKeyDown` |
| 6 | Collapse/expand toggle lacks `aria-expanded` attribute | `admin/src/pages/AppLicenses.tsx:433-454` | Add `aria-expanded={isOpen}` |

### 5.2 Missing User Feedback

| Issue | File | Impact |
|-------|------|--------|
| **Toast system is `console.log` only** | `admin/src/components/Toast.tsx:26` | Users see NO feedback for any action |
| `ProjectSettings` save — comments say "Success feedback" but not implemented | `admin/src/pages/ProjectSettings.tsx:52-56` | Silent save/fail |
| `AppSettings` save — comment says "add toast here" but none added | `admin/src/pages/AppSettings.tsx:138-141` | Silent save/fail |

### 5.3 Form Validation Gaps

| Issue | File | Risk |
|-------|------|------|
| Profile update accepts empty names, extremely long strings | `user/src/pages/Profile.tsx:66-77` | Data integrity |
| App settings number inputs lack JS validation (HTML only) | `admin/src/pages/AppSettings.tsx:350-355` | Bypassable via devtools |
| No inline validation messages on forms | `admin/src/pages/AppSettings.tsx:117-145` | Poor UX |

### 5.4 Navigation Issues

| Issue | Locations | Fix |
|-------|-----------|-----|
| `window.location.href` used instead of `navigate()` | 8+ locations (AppSettings, ProjectSettings, AppApiKeys, etc.) | Use `useNavigate()` from react-router-dom |
| No 404 pages in either dashboard | Both `App.tsx` | Add `<Route path="*">` catch-all |

### 5.5 Console Statements in Production

11+ files with unguarded `console.error`/`console.log` in frontend code. Should be wrapped in `import.meta.env.DEV` checks (as `AppApiKeys.tsx` correctly does).

**Affected files:**
- `admin/src/pages/AppUsers.tsx:82,140,181`
- `admin/src/pages/AppSettings.tsx:140`
- `admin/src/pages/AppOAuth.tsx:54`
- `admin/src/pages/ProjectSettings.tsx:54`
- `admin/src/pages/AppLicenses.tsx:110,322`
- `admin/src/pages/PaymentTestingPlayground.tsx:65,93,128,145`
- `admin/src/components/InviteUserModal.tsx:61`
- `packages/components/src/icons/icons.tsx:381`

### 5.6 Responsive Design Gaps

| Issue | File | Fix |
|-------|------|-----|
| `BillingDashboard` date filters overlap on mobile | `admin/src/pages/BillingDashboard.tsx:89-110` | Add `flex-wrap` or stack on small screens |
| `AppUsers` table lacks horizontal scroll | `admin/src/pages/AppUsers.tsx:353` | Add `overflow-x-auto` wrapper |

---

## 6. Remediation Roadmap

### Tier 1 — Security Critical (Immediate)

| # | Action | Impact |
|---|--------|--------|
| 1 | Apply `s2sMiddleware` to ALL Core service routes | Prevents unauthenticated access to admin APIs |
| 2 | Replace `Math.random()` with `crypto.randomInt()` for OTP | Prevents OTP prediction |
| 3 | Use per-user random salts for OTP hashing | Prevents rainbow table attacks |
| 4 | Replace all `===` secret comparisons with `crypto.timingSafeEqual()` | Prevents timing side-channel attacks |
| 5 | Verify webhook signatures before queuing | Prevents forged payment events |
| 6 | Fix transaction utility (D1 → node-postgres) | Enables actual database transactions |
| 7 | Validate `redirect_uri` against allowlist | Prevents auth code theft |
| 8 | Validate OAuth state parameter | Prevents CSRF in OAuth flow |

### Tier 2 — High Impact (This Sprint)

| # | Action | Impact |
|---|--------|--------|
| 9 | Implement actual Toast notification component | Users can see success/error feedback |
| 10 | Add React Error Boundaries | Prevents white-screen crashes |
| 11 | Implement gateway user routes (currently all stubs) | User dashboard becomes functional |
| 12 | ~~Add admin role verification~~ ✅ Implemented via session entitlements | Prevents privilege escalation |
| 13 | Fix rate limiter (atomic INCR+EXPIRE, fail closed for auth) | Prevents brute force attacks |
| 14 | Add pool error handler | Prevents process crashes |
| 15 | Verify Google JWT signatures | Prevents identity spoofing |

### Tier 3 — Medium Impact (Next Sprint)

| # | Action | Impact |
|---|--------|--------|
| 16 | Add pagination to all list queries | Prevents unbounded data fetching |
| 17 | Apply CSRF protection to user routes | Prevents CSRF on user actions |
| 18 | Add proper email validation (Zod schema) | Prevents invalid data entry |
| 19 | Add ARIA attributes and keyboard navigation | Accessibility compliance |
| 20 | Add 404 catch-all routes | Better navigation UX |
| 21 | Add confirmation dialogs for all destructive actions | Prevents accidental data loss |
| 22 | Remove `unsafe-inline` from CSP | Strengthens XSS protection |
| 23 | Add input validation with Zod schemas on all endpoints | Prevents malformed data |

---

*Generated by automated audit — 2026-02-10*
