# Proofa V1 Release Audit

**Date:** 6 March 2026  
**Branch:** `trunk`  
**Scope:** Full stack — backend services, frontend dashboards, packages, documentation  
**Previous Audits Referenced:** AUDIT_REPORT.md (Feb 10, 2026), V1_LAUNCH_AUDIT.md (Mar 1, 2026), ADMIN_DASHBOARD_AUDIT.md (Mar 4, 2026)

---

## Overall Verdict: **NOT READY — 3 hard blockers + 4 launch-quality issues**

The March 1 "V1 Launch Audit" over-claimed. Of the 10 original critical issues it marked as resolved, 6 are genuinely fixed, 2 remain broken, and the dashboard audits introduced additional issues that must be resolved before shipping.

| Area | Grade | Notes |
|------|-------|-------|
| **Core Service** | A | 90+ endpoints, S2S auth on all routes, no stubs |
| **Gateway** | A- | Session mgmt, CSRF, rate limiting solid; `cookies.ts` helper is dead code but still broken |
| **Workers** | A | All 5 registered and implemented |
| **Database** | A- | 41 tables, 94 indexes, atomic JSONB; transaction utility broken (dead code) |
| **SDKs** | A | Dual CJS+ESM, accurate README, license/subscription modules |
| **Admin Dashboard** | C+ | 28 pages of real data; toast is a stub = zero user feedback |
| **User Dashboard** | B+ | 4 pages functional, clean auth; missing error boundary + 404 route |
| **Documentation** | A- | 92% coverage, strong security docs |
| **Security** | B+ | 8.5/10 — LemonSqueezy timing bug found; everything else solid |

---

## Hard Blockers (Ship Gated On These)

### B1. Toast system is a `console.log` stub
**File:** `apps/dashboard/admin/src/components/Toast.tsx`  
**Status:** ❌ UNFIXED — marked resolved in Mar 1 audit but never implemented

```ts
export function ToastProvider({ children }: { children: ReactNode }) {
    const showToast = (...) => {
        // Simple console implementation for now
        console.log(`[Toast ${type.toUpperCase()}] ${message}`); // ← stub
        // TODO(@devendra): Integrate with Selia toast component when available
    };
```

**Impact:** 25+ action flows across the admin dashboard produce **zero user-visible feedback**. Project creation, app creation, plan changes, license grants, API key regeneration, OAuth config updates — all fire-and-forget with no success or error messaging. The admin dashboard is effectively unusable for real customers.

---

### B2. No React Error Boundaries in either dashboard
**Files:** `apps/dashboard/admin/src/App.tsx`, `apps/dashboard/user/src/App.tsx`  
**Status:** ❌ UNFIXED — confirmed missing in Mar 1 and Mar 4 audits

Zero `ErrorBoundary` components anywhere in either dashboard. Any uncaught render error produces a white screen with no message and no recovery path.

---

### B3. `totalRevenue` hardcoded to `0` everywhere
**File:** `apps/services/core/src/routes/v1/admin/stats.ts` (lines 77, 143, 198)  
**Status:** ❌ UNFIXED

```ts
totalRevenue: 0,  // Stub for now  ← appears 3 times
```

Consumed by `Projects.tsx` (projects list and cards), `ProjectDetail.tsx`, `AppDetail.tsx`, and `ProjectStats.tsx`. Every paying customer immediately sees `$0.00 revenue` regardless of actual earnings.

---

## Launch-Quality Issues (Fix Before Go-Live)

### L1. LemonSqueezy webhook HMAC uses non-timing-safe comparison
**File:** `apps/services/core/src/billing/adapters/lemonsqueezy.ts:175`  
**Status:** ❌ NEW — found this audit; Stripe and Dodo were already fixed

```ts
if (signature !== digest) {   // ← should be crypto.timingSafeEqual()
```

Stripe and Dodo adapters correctly use `crypto.timingSafeEqual` for HMAC comparison. LemonSqueezy was missed. This is a timing oracle vulnerability on the webhook verification path.

---

### L2. `console.log` leaks full user object in production (admin dashboard)
**Files:** `apps/dashboard/admin/src/pages/AppDevelopers.tsx:535`, `apps/dashboard/admin/src/hooks/api.ts:69`  
**Status:** ❌

```ts
console.log('Logged in:', user)       // ← logs full user object incl. email/session
console.log('Not logged in')
// Also:
console.error("Schema validation error:", error, "Response data:", json) // ← leaks raw API responses
```

Logged to browser DevTools in production builds. The user-object leak is particularly sensitive.

---

### L3. No 404 catch-all routes in either dashboard
**Files:** `apps/dashboard/admin/src/App.tsx:332`, `apps/dashboard/user/src/App.tsx:107`  
**Status:** ❌

Both route trees end with a redirect and no `<Route path="*">`. Any unknown URL renders a completely blank white page with no message or redirect.

---

### L4. `window.location.href` bypassing React Router in 5 non-OAuth locations
**Files:** `AppDevelopers.tsx:539,546`, `ProjectSettings.tsx:304`, `AppPaymentSettings.tsx:131,197`  
**Status:** ❌ NEW

```ts
window.location.href = "/login"    // ← full page reload inside SPA
window.location.href = "/projects" // ← resets all React state + query cache
```

OAuth redirects (`Login.tsx`) are acceptable. All other uses cause full page reloads that destroy React state, TanStack Query caches, and scroll position. Should use `useNavigate()`.

---

## What Was Fixed (Verified Current Code)

| Issue (from Feb 10 audit) | Verification |
|---|---|
| OTP uses `Math.random()` | ✅ Fixed — `crypto.randomInt()` + random PBKDF2 salt + `timingSafeEqual` |
| S2S auth missing on Core admin routes | ✅ Fixed — `s2sMiddleware` on all route groups incl. `/v1/admin/*` |
| Webhook signatures never verified | ✅ Fixed (mostly) — deferred to worker layer; only LemonSqueezy timing bug remains |
| Transaction utility uses DrizzleD1Database | ✅ Dead code — `withTransaction` is exported but never called anywhere in services; zero runtime impact currently |
| Cookie signing broken (8-char base64 slice) | ✅ Dead code — `signCookie`/`verifyCookie` in `cookies.ts` are exported but never imported by any service file |
| `===` used for secret comparisons | ✅ Fixed — `timingSafeEqual` in all crypto, s2s middleware, and session code |
| Redirect URI not validated | ✅ Fixed — validated against `ALLOWED_REDIRECT_ORIGINS` env list + per-app `security_settings.redirectUris` |
| OAuth state parameter ignored | ✅ Fixed — Redis-backed, consumed after use, 10-min TTL |
| Google JWT decoded without signature verification | ✅ Fixed — `jose.jwtVerify()` + JWKS endpoint, audience + issuer validated |
| Gateway user routes all returning stub JSON | ✅ Fixed — full `me.ts` implementation with real Core proxying |
| All 5 workers not registered | ✅ Fixed — all 5 registered in `workers/src/index.ts` |
| CORS subdomain suffix check | ✅ Fixed — requires leading `.` separator, `evilproofa.sh` cannot spoof `*.proofa.sh` |
| License delete is a no-op | ✅ Fixed — graceful transition to free plan + soft-delete with audit history |
| React QueryClientProvider missing (user dashboard) | ✅ N/A — user dashboard doesn't use React Query |

---

## Still Broken From Feb Audit (2 items — currently low/no runtime impact)

| Issue | Status | Risk Level |
|---|---|---|
| Transaction utility uses `DrizzleD1Database` wrong type | ❌ Broken but dead code — exported, never called | Safe now; becomes a blocker the moment any multi-step mutation needs a transaction |
| License upsert is SELECT→INSERT race condition | ❌ Broken | Low concurrency risk currently; concurrent signups for same user+app can produce duplicate licenses or unique constraint errors |

---

## Additional Issues from Admin Dashboard Audit (Mar 4)

### Code Quality — Must Fix Before v1

| Issue | Files | Severity |
|---|---|---|
| `import.meta.env.VITE_GATEWAY_URL` direct usage bypassing `config.ts` | 12 files | 🔴 Should use `config.gatewayUrl` |
| `console.error` / `console.log` in 8 files (19 total occurrences) | AppApiKeys, AppUsers, AppOAuth, ProjectSettings, PaymentTestingPlayground, AppDevelopers, InviteUserModal, Toast, hooks/api | 🟡 |

### Design Inconsistencies — Polish Items

| Issue | Details |
|---|---|
| 3 different breadcrumb implementations | Selia `<Breadcrumb>`, manual `<nav>`, and broken `<Breadcrumb>` without `<BreadcrumbList>` |
| 5 different "muted text" tokens used interchangeably | `text-muted`, `text-text-muted`, `text-muted-foreground`, `text-text-secondary`, `text-text-tertiary` |
| 3 different loading state patterns | Should extract shared `<PageLoader>` component |
| Icon-only buttons missing `aria-label` | `ProjectDetail.tsx`, `AppUsers.tsx`, `WebhookMonitoring.tsx` |
| Large files over 400 lines | `AppLicenses.tsx` (400+), `WebhookMonitoring.tsx` (500+), `AppPromotions.tsx` (350+) |

---

## Security Summary

| Area | Score | Notes |
|------|-------|-------|
| Cryptography | 9.5/10 | AES-256-GCM, PBKDF2 OTPs, 32-byte random keys |
| Authentication | 9/10 | HMAC-SHA256 sessions, Google JWT verified via JWKS |
| OAuth Security | 9/10 | State CSRF via Redis, redirect URI allowlist |
| Authorization | 9/10 | Project ownership checked on all admin endpoints |
| CSRF Protection | 9/10 | 256-bit tokens on all `/v1/admin/*` mutations |
| Rate Limiting | 8/10 | Fail-closed on auth; EXPIRE call is non-atomic (minor) |
| Webhook Security | 8/10 | 2/3 providers use `timingSafeEqual`; LemonSqueezy doesn't |
| S2S Auth | 9/10 | Constant-time comparison, applied to all Core route groups |
| Session Management | 9/10 | Signed+encrypted, TTL rolling, inactivity tracking |
| Credentials at Rest | 8.5/10 | AES-256-GCM; endpoint returns plaintext to project owners (documented acceptable risk) |

**Overall Security: 8.7/10** — Solid for v1. LemonSqueezy timing bug is only outstanding security item.

---

## What's Working Well

- **Entire auth system:** OAuth, OTP, session lifecycle, fixation protection, CSRF
- **Full payment pipeline:** Checkout routing, webhook verification + logging, provider adapters (Stripe/LemonSqueezy/DodoPay)
- **Subscription lifecycle:** Trial → Active → Cancel at period end
- **License system:** Grant, activate, history, device activation counting
- **Promotions:** Campaigns, codes, plan targeting, redemption tracking
- **Admin dashboard functionality:** 28 pages with real data across all entity types
- **Database:** Atomic JSONB, 94 indexes, proper ID isolation (internal vs public)
- **Workers:** Idempotent license sync, provider-aware refunds, exponential backoff retry
- **SDKs:** Accurate docs, dual builds, license + subscription modules

---

## Fix Estimate

| Item | Effort |
|---|---|
| Toast system (implement with Selia or sonner) | 4–6 hours |
| Error Boundaries in both App.tsx | 1 hour |
| `totalRevenue` from actual payment records | 3–4 hours |
| LemonSqueezy `timingSafeEqual` fix | 15 minutes |
| Remove `console.log` user leak + fix `window.location.href` nav | 1–2 hours |
| 404 catch-all routes (both dashboards) | 30 minutes |
| `import.meta.env` → `config.gatewayUrl` sweep (12 files) | 2 hours |
| **Total** | **~1.5–2 days** |

---

*Generated: 6 March 2026 — Verified against live codebase on `trunk`*
