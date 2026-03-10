# V1 Launch — Action Plan

**Owner:** @devendra  
**Target:** v1 release  
**Reference:** [docs/V1_RELEASE_AUDIT_MAR6.md](./V1_RELEASE_AUDIT_MAR6.md)  
**Estimate:** ~1.5–2 days for all blockers + launch-quality items

---

## Sprint 1 — Hard Blockers (Must Ship With)

### [x] B1. Implement real Toast notification system
**File:** `apps/dashboard/admin/src/components/Toast.tsx`  
**Effort:** 4–6 hours  
**Severity:** 🔴 BLOCKER

Current implementation is a `console.log` stub. 25+ action flows have zero user-visible feedback.

**Steps:**
- [ ] Install `sonner` or use Selia's toast primitive via `@proofa/components`
- [ ] Implement `ToastProvider` with actual toast UI (success, error, info, warning variants)
- [ ] Export `useToast()` hook from the provider
- [ ] Add `<ToastProvider>` + `<Toaster>` to `apps/dashboard/admin/src/App.tsx` root
- [ ] Verify all existing `showToast(message, type)` call sites work without code changes
- [ ] Smoke-test: create a project, delete an app, regenerate API keys — confirm toasts appear

---

### [x] B2. Add React Error Boundaries to both dashboards
**Files:** `apps/dashboard/admin/src/App.tsx`, `apps/dashboard/user/src/App.tsx`  
**Effort:** 1 hour  
**Severity:** 🔴 BLOCKER

**Steps:**
- [ ] Create `apps/dashboard/admin/src/components/ErrorBoundary.tsx` — class component wrapping a user-friendly error UI using Selia `Alert` (danger variant)
- [ ] Wrap `<RouterProvider>` / `<ProtectedLayout>` in admin `App.tsx` with `<ErrorBoundary>`
- [ ] Create equivalent in user dashboard `apps/dashboard/user/src/`
- [ ] Wrap user `App.tsx` routes with `<ErrorBoundary>`
- [ ] Test: manually throw an error inside a page component to confirm the boundary catches it

---

### [x] B3. Implement `totalRevenue` from actual payment records
**File:** `apps/services/core/src/routes/v1/admin/stats.ts`  
**Effort:** 3–4 hours  
**Severity:** 🔴 BLOCKER

All three `totalRevenue: 0` stubs must be replaced with real queries.

**Steps:**
- [ ] Add revenue query to `apps/packages/db/src/queries/` — sum `payments.amount` (or equivalent) grouped by `app_id`, filtered to `status = 'completed'`
- [ ] Update `/v1/admin/projects/:projectId/stats` handler to call the query and populate `totalRevenue`
- [ ] Update `/v1/admin/projects/:projectId/apps/:appId/stats` for per-app revenue
- [ ] Verify currency: ensure the returned value is in the correct unit (cents vs dollars) matching what the frontend expects
- [ ] Test with a completed payment in the DB — confirm non-zero value appears on Project and App detail pages

---

## Sprint 2 — Launch-Quality (Fix Before Go-Live)

### [x] L1. Fix LemonSqueezy webhook HMAC timing-safe comparison
**File:** `apps/services/core/src/billing/adapters/lemonsqueezy.ts:175`  
**Effort:** 15 minutes  
**Severity:** 🟠 Security

```ts
// Before
if (signature !== digest) {

// After
if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
```

- [ ] Replace `!==` with `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`
- [ ] Ensure `crypto` is already imported (it is, as a Node built-in)

---

### [x] L2. Remove `console.log` user object leak + other production logs
**Files:** `apps/dashboard/admin/src/pages/AppDevelopers.tsx:535,538`, `apps/dashboard/admin/src/hooks/api.ts:69`  
**Effort:** 30 minutes  
**Severity:** 🟠 Security/Privacy

- [ ] `AppDevelopers.tsx:535` — remove `console.log('Logged in:', user)` (leaks email + session data)
- [ ] `AppDevelopers.tsx:538` — remove `console.log('Not logged in')`
- [ ] `hooks/api.ts:69` — remove or guard `console.error("Schema validation error:", error, "Response data:", json)`; if kept, strip the `json` payload from the log
- [ ] Do a final sweep: `grep -rn "console\.log" apps/dashboard/admin/src/` — remove any remaining unguarded `console.log` calls (keep `console.error` for debugging)

---

### [x] L3. Add 404 catch-all routes to both dashboards
**Files:** `apps/dashboard/admin/src/App.tsx:332`, `apps/dashboard/user/src/App.tsx:107`  
**Effort:** 30 minutes  
**Severity:** 🟡

- [ ] Create `apps/dashboard/admin/src/pages/NotFound.tsx` — simple centered "404 — Page not found" with a back-to-projects link using Selia components
- [ ] Add `<Route path="*" element={<NotFound />} />` as last route in admin `App.tsx`
- [ ] Create equivalent `NotFound.tsx` in user dashboard
- [ ] Add `<Route path="*" element={<NotFound />} />` in user `App.tsx`
- [ ] Test: navigate to `/admin/does-not-exist` — confirm 404 page renders

---

### [x] L4. Replace `window.location.href` with `useNavigate()` in admin dashboard
**Files:** `AppDevelopers.tsx:539,546`, `ProjectSettings.tsx:304`, `AppPaymentSettings.tsx:131,197`  
**Effort:** 1 hour  
**Severity:** 🟡

- [ ] `AppDevelopers.tsx:539` — replace `window.location.href = '/login'` with `navigate('/login')`
- [ ] `AppDevelopers.tsx:546` — replace `window.location.href = '/'` with `navigate('/')`
- [ ] `ProjectSettings.tsx:304` — replace `window.location.href = "/projects"` with `navigate('/projects')`
- [ ] `AppPaymentSettings.tsx:131` — replace with `navigate(...)`
- [ ] `AppPaymentSettings.tsx:197` — replace with `navigate(...)`
- [ ] Note: `Login.tsx` OAuth redirect via `window.location.href` is intentional — do NOT change it

---

### [x] L5. Sweep `import.meta.env.VITE_GATEWAY_URL` → `config.gatewayUrl`
**Files:** 12 admin dashboard files (see ADMIN_DASHBOARD_AUDIT.md §2.3)  
**Effort:** 2 hours  
**Severity:** 🟡

```ts
// Before (in 12 files)
`${import.meta.env.VITE_GATEWAY_URL}/v1/...`

// After
import config from "../config";
`${config.gatewayUrl}/v1/...`
```

- [ ] Run `grep -rn "import.meta.env.VITE_GATEWAY_URL" apps/dashboard/admin/src/` to get full list
- [ ] Replace each occurrence with `config.gatewayUrl` (import `config` where missing)
- [ ] Run `grep -rn "GATEWAY_URL" apps/dashboard/admin/src/` to catch any local constants like `const GATEWAY_URL = ...`
- [ ] Verify all replaced files still compile (no TypeScript errors)

---

## Sprint 3 — Post-Launch Backlog (Phase 2)

These are tracked here for visibility but do NOT block v1.

### [ ] P1. Fix transaction utility (DrizzleD1Database → node-postgres)
**File:** `apps/packages/db/src/utils/transaction.ts`  
**Status:** Dead code currently (exported but never called)

- Becomes a blocker the moment any multi-step mutation needs `withTransaction`
- Rewrite using `db.transaction(async (tx) => { ... })` from `drizzle-orm/node-postgres`
- Update type signatures to use the proper `NodePgDatabase` type

### [ ] P2. Fix license upsert race condition
**File:** `apps/packages/db/src/queries.ts` (license upsert ~L642)  
**Status:** Low concurrency risk now

- Replace SELECT→INSERT with `INSERT ... ON CONFLICT (user_id, app_id) DO UPDATE SET ...`

### [ ] P3. Rate limiter `EXPIRE` atomicity
**File:** `apps/packages/cache/src/client.ts`  
**Status:** Small race window

- Replace `INCR` + separate `EXPIRE` with `SET key 0 EX ttl NX` + `INCR` or a Lua script

### [ ] P4. Breadcrumb standardization (admin dashboard)
- Migrate `AppUsers.tsx` manual `<nav>` and `ProjectPaymentProviders.tsx` broken breadcrumb to Selia `<Breadcrumb>` pattern

### [ ] P5. Standardize muted-text CSS tokens
- Pick canonical tokens (`text-text-secondary` for descriptions, `text-text-tertiary` for meta)
- Global find-and-replace across admin dashboard

### [ ] P6. Extract `<PageLoader>` shared component
- 3 different loading spinner patterns exist — consolidate into one

### [ ] P7. Email notifications for payment events
**Files:** `apps/services/core/src/billing/services/webhook-processor.ts:219,286`
- Failed payment notification to user
- Refund notification to user

### [ ] P8. Implement `totalRevenue` per app (stats endpoint)
- Already covered in B3, but verify per-app granularity is accurate for `AppDetail` page

### [ ] P9. Auto-create default routing rules
**File:** `apps/services/core/src/routes/v1/admin/providers.ts:307`

### [ ] P10. Clean up dead code
- Remove `_handleOpenEditModal` in `AppUsers.tsx`
- Remove or implement `withTransaction`/`executeAtomic` in `apps/packages/db/src/utils/transaction.ts`
- Mark `@proofa/ui` package as Phase 2 or remove

### [ ] P11. Accessibility pass
- Add `aria-label` to all icon-only buttons
- Add `scope="col"` to table headers
- Replace `onKeyPress` → `onKeyDown` in `AppLicenses.tsx:962`

### [ ] P12. Split large files
- `AppLicenses.tsx` (400+ lines) → `PlansTab.tsx` + `LicensesTab.tsx`
- `WebhookMonitoring.tsx` (500+ lines) → `WebhookList.tsx` + `WebhookDetails.tsx`
- `AppPromotions.tsx` (350+ lines) → `PromotionsForm.tsx` + `PromoCodesList.tsx`

---

## Checklist Summary

```
SPRINT 1 — BLOCKERS (Required for launch)
  [ ] B1  Toast notification system
  [ ] B2  React Error Boundaries (both dashboards)
  [ ] B3  totalRevenue from real payment records

SPRINT 2 — LAUNCH QUALITY (Fix before go-live)
  [ ] L1  LemonSqueezy timingSafeEqual fix (15 min)
  [ ] L2  Remove console.log user leak
  [ ] L3  404 catch-all routes
  [ ] L4  window.location.href → useNavigate()
  [ ] L5  import.meta.env → config.gatewayUrl sweep

SPRINT 3 — POST-LAUNCH (Phase 2 backlog)
  [ ] P1  Transaction utility fix
  [ ] P2  License upsert race condition (ON CONFLICT)
  [ ] P3  Rate limiter EXPIRE atomicity
  [ ] P4  Breadcrumb standardization
  [ ] P5  CSS token standardization
  [ ] P6  <PageLoader> component
  [ ] P7  Email notifications (payment failures + refunds)
  [ ] P8  Per-app revenue accuracy
  [ ] P9  Auto-create default routing rules
  [ ] P10 Dead code removal
  [ ] P11 Accessibility pass (ARIA labels, table scopes)
  [ ] P12 Split large files
```

---

*Last updated: 6 March 2026*
