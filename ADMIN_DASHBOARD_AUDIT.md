# Admin Dashboard Audit Report

**Date:** March 4, 2026  
**Scope:** `/apps/dashboard/admin/src`  
**Status:** Complete survey with prioritized action items

---

## Executive Summary

The admin dashboard is a well-structured React/TypeScript application using Vite, React Router, and the Selia design system. However, there are **critical error-handling bugs**, **design inconsistencies**, and **performance anti-patterns** that need remediation before production.

### Critical Issues Found
- 🔴 **6 broken error checks** (`response.ok` property vs method)
- 🟡 **12 files bypass centralized config** for gateway URL
- 🟡 **19 console statements** (11 logs, 8 errors)
- 🟠 **Direct API calls in components** (should be hooks)
- 🟠 **Design inconsistencies** (breadcrumbs, colors, spacing)

---

## 1. Design Inconsistencies

### 1.1 Breadcrumb Navigation — 3 Different Patterns

| Pattern | Files | Implementation |
|---------|-------|-----------------|
| **Selia Breadcrumb** (correct ✅) | `ProjectApps.tsx`<br/>`AppApiKeys.tsx` | `<Breadcrumb>` → `<BreadcrumbList>` → `<BreadcrumbItem>` |
| **Manual `<nav>`** (wrong ❌) | `AppUsers.tsx` (L224) | Hand-rolled `<nav className="flex items-center gap-2">` with `ArrowRight` icons |
| **Plain text breadcrumb** (wrong ❌) | `ProjectPaymentProviders.tsx` | `<Breadcrumb>/<BreadcrumbSeparator>` without `<BreadcrumbList>` |

**Fix:** Standardize all to the Selia Breadcrumb pattern.

**Example of inconsistency:**

```tsx
// AppUsers.tsx - WRONG (manual nav)
<nav className="flex items-center gap-2 text-[13px]">
  <Link to="/projects" className="no-underline text-text-secondary">
    Projects
  </Link>
  <Icon icon={IconType.ArrowRight} size={14} className="text-text-tertiary" />
  <Link to={`/projects/${projectId}`}>{project.name}</Link>
</nav>

// AppApiKeys.tsx - CORRECT (Selia)
<Breadcrumb className="mb-6">
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
    </BreadcrumbItem>
    {/* ... */}
  </BreadcrumbList>
</Breadcrumb>
```

---

### 1.2 Text Color Classes — 4 Different Tokens for "Muted Text"

Used interchangeably across pages for the same semantic purpose:

| Class | Count | Example Files |
|-------|-------|----------------|
| `text-muted` | ~15 | `Projects.tsx`, `AppUsers.tsx`, `BillingDashboard.tsx` |
| `text-text-muted` | ~20 | `ProjectDetail.tsx`, `AppUsers.tsx`, `AppSetup.tsx` |
| `text-muted-foreground` | ~10 | `AppSubscriptions.tsx` only |
| `text-text-secondary` | ~15 | `AppSetup.tsx`, `AppUsers.tsx`, `ProjectDetail.tsx` |
| `text-text-tertiary` | ~8 | `AppSetup.tsx`, `BillingDashboard.tsx` |

**Issue:** Inconsistent naming makes it hard to maintain design consistency.

**Fix:** Pick canonical tokens:
- Use `text-text-secondary` for descriptions
- Use `text-text-tertiary` for labels/meta information
- Never mix `text-muted` with `text-text-*` in the same codebase

---

### 1.3 Loading States — 3 Different Patterns

| Pattern | File | Code |
|---------|------|------|
| Large spinner + text | `Projects.tsx` (L37-41) | `<Spinner className="w-12 h-12 mb-4">` |
| Minimal centered | `ProjectApps.tsx` (L43-46) | `<Spinner />` centered, no text |
| Spinner + small text | `AppUsers.tsx` (L205-209) | `<Spinner className="mb-4">` + `<Text>` |

**Fix:** Extract shared `<PageLoader>` component:

```tsx
// components/PageLoader.tsx
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Spinner className="w-12 h-12 mb-4" />
      <Text className="text-text-secondary">{message}</Text>
    </div>
  );
}
```

---

### 1.4 Button Spacing — Inconsistent `gap-*`

Action button groups use mixed spacing:
- Some: `gap-1`
- Others: `gap-2`
- Others: `gap-3`

**Fix:** Standardize to `gap-2` or `gap-3` globally.

---

## 2. Critical Performance & Code Quality Issues

### 2.1 🔴 CRITICAL: `response.ok` vs `response.ok()` — Broken Error Checks

**Status:** 6 files have **silent error swallowing**

The Pingpong v1.4.0+ API uses `.ok()` as a **method**, not a property. Checking `if (!response.ok)` always passes because it's checking if a function exists (always truthy).

| File | Line | Current Code | Issue |
|------|------|--------------|-------|
| `AppUsers.tsx` | L73 | `if (!response.ok)` | Error callback never fires |
| `AppUsers.tsx` | L123 | `if (!response.ok)` | Error callback never fires |
| `AppUsers.tsx` | L159 | `if (!response.ok)` | Error callback never fires |
| `AppSettings.tsx` | L478 | `if (!response.ok)` | Error callback never fires |
| `ProjectSettings.tsx` | L293 | `if (!response.ok)` | Error callback never fires |
| `Profile.tsx` | L44 | `if (!response.ok)` | Error callback never fires |

**Example of the bug:**

```tsx
// WRONG - function object is always truthy
if (!response.ok) {
  const data = await response.json();
  throw new Error(data.error || "Failed");
}

// CORRECT - call the method
if (!response.ok()) {
  const error = await response.data; // or response.json()
  throw new Error(error.message || "Failed");
}
```

**Fix:** Change all 6 instances of `!response.ok` → `!response.ok()`

---

### 2.2 High: `response.json()` → `response.data` (Old API)

**Status:** 14 files use deprecated old API

Pingpong v1.4.0+ auto-parses response bodies into the `.data` property. Using `.json()` requires manual async parsing.

| File | Occurrences | Lines |
|------|-----------|-------|
| `AppUsers.tsx` | 3 | L77, L124, L160 |
| `AppSettings.tsx` | 1 | L479 |
| `AppDevelopers.tsx` | 2 | L661, L696 |
| `Profile.tsx` | 2 | L45, L49 |
| `ProjectSettings.tsx` | 1 | L294 |
| `hooks/api.ts` | 2 | L61, L65 |
| `InviteUserModal.tsx` | 3 | L51, L102, L106 |

**Example:**

```tsx
// OLD - requires manual parsing
const response = await pingpong(...);
if (!response.ok()) {
  const data = await response.json(); // Manual parse
}

// NEW - auto-parsed
const response = await pingpong(...);
if (!response.ok()) {
  const data = response.data; // Already parsed
}
```

**Fix:** Replace all `await response.json()` with `response.data`

---

### 2.3 High: Direct `import.meta.env.VITE_GATEWAY_URL` Usage

**Status:** 12 files bypass centralized config

A `config.ts` exists with `config.gatewayUrl`, but most files ignore it:

| File | Usage | Issue |
|------|-------|-------|
| `App.tsx` | Uses config ✅ | Centralized correctly |
| `PaymentTestingPlayground.tsx` | Uses config ✅ | Centralized correctly |
| `AppUsers.tsx` | Direct env | No fallback |
| `AppApiKeys.tsx` | Direct env + `\|\| "...localhost:3004"` | Inconsistent fallback |
| `AppSettings.tsx` | Direct env + fallback | Inconsistent |
| `ProjectSettings.tsx` | Direct env + fallback | Inconsistent |
| `Profile.tsx` | Defines local `GATEWAY_URL` | Duplicate constant |
| `Login.tsx` | Direct env + fallback | Inconsistent |
| `InviteUserModal.tsx` | Direct env | No fallback |
| `hooks/api.ts` | Defines local `GATEWAY_URL` + uses env | Duplication |

**Fix:** Import and use `config.gatewayUrl` everywhere:

```tsx
// WRONG
const response = await pingpong(
  `${import.meta.env.VITE_GATEWAY_URL}/v1/...`
);

// CORRECT
import config from "../config";

const response = await pingpong(
  `${config.gatewayUrl}/v1/...`
);
```

---

### 2.4 Medium: Direct `pingpong` Calls in Components (No Hooks)

**Status:** 5+ pages make raw API calls instead of using hooks

These should be abstracted to React Query hooks for:
- Automatic cache invalidation
- Optimistic updates
- Deduplication
- Error handling consistency

| File | Direct Calls | Should Be Hooks |
|------|--------------|-----------------|
| `AppUsers.tsx` | 3 | `useFetchPlans`, `useSuspendUser`, `useUpdateUser` |
| `AppApiKeys.tsx` | 4 | `useRevealApiKeys`, `useCopyKey`, `useRegenerateSecret`, `useRegenerateToken` |
| `AppSettings.tsx` | 1 | `useUpdateApp` |
| `ProjectSettings.tsx` | 1 | `useUpdateProject` |
| `Profile.tsx` | 1 | `useUpdateProfile` |
| `InviteUserModal.tsx` | 2 | Already wrapped, good |

**Impact:** Missing query invalidation after mutations means stale UI until page refresh.

**Fix:** Create hooks in `hooks/api.ts`:

```tsx
// Before: Direct API call in render
const handleSuspendToggle = async (userId: string) => {
  const response = await pingpong(`${config.gatewayUrl}/...`, {
    method: "PATCH",
    body: { status: "suspended" }
  });
  // Manual refetch needed
};

// After: React Query hook
const useSuspendUser = (projectId: string, appId: string) => {
  return useMutation({
    mutationFn: (userId: string) => pingpong(`${config.gatewayUrl}/...`, {
      method: "PATCH",
      body: { status: "suspended" }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appUsers", projectId, appId]
      });
    }
  });
};
```

---

### 2.5 Medium: No Error Boundaries

**Status:** No global error boundary; all errors handled locally

Unhandled Promise rejections could crash the app silently.

**Fix:** Add root error boundary in `App.tsx`:

```tsx
// Root error boundary
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      setError(event.reason);
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  if (error) {
    return (
      <Alert variant="danger">
        <Icon icon={IconType.AlertCircle} size={20} />
        <div>
          <strong>Something went wrong</strong>
          <p className="text-sm mt-2">{error.message}</p>
        </div>
      </Alert>
    );
  }

  return <>{children}</>;
}
```

---

## 3. Code Quality Issues

### 3.1 `console.log` & `console.error` Usage

**Status:** 19 occurrences across 8 files

| File | Type | Count | Lines |
|------|------|-------|-------|
| `AppApiKeys.tsx` | error | 4 | L61, L74, L102, L132 |
| `AppUsers.tsx` | error | 3 | L80, L131, L172 |
| `AppOAuth.tsx` | error | 1 | L56 |
| `ProjectSettings.tsx` | error | 1 | L54 |
| `PaymentTestingPlayground.tsx` | log + error | 4 | L113, L129, L136, L140 |
| `AppDevelopers.tsx` | log | 3 | L34, L538, L541 |
| `InviteUserModal.tsx` | error | 1 | L61 |
| `Toast.tsx` | log | 1 | L26 |
| `hooks/api.ts` | error | 1 | L74 |

**Standard:** Frontend code can use `console.error` for debugging (no `@proofa/shared` logger on client). But `console.log` should be removed.

**Fix:** Remove all `console.log` calls; keep `console.error` for debugging.

---

### 3.2 Dead Code

**Status:** 1 unused variable

[AppUsers.tsx](apps/dashboard/admin/src/pages/AppUsers.tsx) ~L178:
```tsx
const _handleOpenEditModal = (user: any) => {
  setEditingUser(user);
  setEditLicensePlan(user.plan_id || null);
  setEditLicenseStatus(user.status || "active");
  setUpdateError(null);
};
```

This function is never called. Instead, `setEditingUser(user)` is called inline in the JSX. The underscore prefix suggests the developer abandoned this pattern.

**Fix:** Remove `_handleOpenEditModal` and replace the inline call with it if needed, or keep it removed.

---

### 3.3 Inconsistent Error Messages

Different pages use different error display patterns:

```tsx
// Pattern A: Toast (good)
showToast(error.message, "error");

// Pattern B: State + Alert (verbose)
const [updateError, setUpdateError] = useState<string | null>(null);
{updateError && <Alert variant="danger">{updateError}</Alert>}

// Pattern C: Silent console.error (bad)
console.error("Failed:", error);
```

**Fix:** Standardize on toast notifications for all user-facing errors.

---

## 4. Large Files (Code Organization)

| File | Lines | Recommendation |
|------|-------|-----------------|
| `AppLicenses.tsx` | 400+ | Split into `PlansTab.tsx`, `LicensesTab.tsx` |
| `AppPromotions.tsx` | 350+ | Split into `PromotionsForm.tsx`, `PromoCodesList.tsx` |
| `ProjectPaymentProviders.tsx` | 450+ | Already complex; extract `ProviderForm.tsx`, `ProviderList.tsx` |
| `WebhookMonitoring.tsx` | 500+ | Split into `WebhookList.tsx`, `WebhookDetails.tsx` |
| `PaymentTestingPlayground.tsx` | 350+ | Keep as-is (intentionally complex playground) |

---

## 5. Accessibility Gaps

### 5.1 Missing ARIA Labels on Icon-Only Buttons

Many buttons have only icons and no accessible labels:

```tsx
// WRONG - icon-only, no label
<Button size="sm" variant="danger" onClick={() => { ... }}>
  <Icon icon={IconType.Delete} size={14} />
</Button>

// CORRECT - add aria-label
<Button
  size="sm"
  variant="danger"
  onClick={() => { ... }}
  aria-label="Delete item"
>
  <Icon icon={IconType.Delete} size={14} />
</Button>
```

**Files affected:** `ProjectDetail.tsx`, `AppUsers.tsx`, `WebhookMonitoring.tsx`, and others.

---

### 5.2 Missing Form Labels

Some form inputs lack proper `<label>` associations:

```tsx
// WRONG
<Input
  type="text"
  placeholder="e.g., My Web App"
  required
  value={formData.name}
/>

// CORRECT
<Label htmlFor="app-name" className="mb-2">
  App Name
</Label>
<Input
  id="app-name"
  type="text"
  placeholder="e.g., My Web App"
  required
  value={formData.name}
/>
```

---

## 6. Priority Action Items

### Tier 1: Critical (Breaks Functionality)

| # | Issue | Severity | Effort | Impact |
|---|-------|----------|--------|--------|
| 1 | `response.ok` → `response.ok()` (6 files) | 🔴 Critical | Low | High — errors silently swallowed |
| 2 | Centralize `import.meta.env` → `config` (12 files) | 🔴 Critical | Low | High — inconsistent env handling |

### Tier 2: High (Design/Performance)

| # | Issue | Severity | Effort | Impact |
|---|-------|----------|--------|--------|
| 3 | `response.json()` → `response.data` (14 files) | 🟡 High | Low | Medium — old API, works but verbose |
| 4 | Standardize breadcrumbs (1 file) | 🟡 High | Low | Medium — design consistency |
| 5 | Remove `console.log` (5 files) | 🟡 High | Low | Low — cleanup |
| 6 | Extract direct pingpong calls to hooks (5 files) | 🟡 High | Medium | High — cache invalidation, consistency |

### Tier 3: Medium (Code Quality)

| # | Issue | Severity | Effort | Impact |
|---|-------|----------|--------|--------|
| 7 | Standardize text colors (all files) | 🟠 Medium | Medium | Medium — design consistency |
| 8 | Shared `<PageLoader>` component | 🟠 Medium | Low | Low — consistency |
| 9 | Remove dead code (`_handleOpenEditModal`) | 🟠 Medium | Trivial | Trivial — cleanup |
| 10 | Error boundary | 🟠 Medium | Low | Medium — resilience |

### Tier 4: Low (Nice to Have)

| # | Issue | Severity | Effort | Impact |
|---|-------|----------|--------|--------|
| 11 | ARIA labels on icon buttons | 🔵 Low | Medium | Low — accessibility |
| 12 | Split large files (AppLicenses, AppPromotions, WebhookMonitoring) | 🔵 Low | High | Medium — maintainability |
| 13 | Consistent error messaging | 🔵 Low | Medium | Low — UX consistency |

---

## 7. Recommended Fix Order

1. **Fix Tier 1 (CRITICAL):**
   - [ ] Fix 6 `response.ok` → `response.ok()` checks
   - [ ] Centralize 12 files to use `config.gatewayUrl`
   
2. **Fix Tier 2 (HIGH):**
   - [ ] Update 14 `response.json()` → `response.data`
   - [ ] Fix breadcrumb in `AppUsers.tsx`
   - [ ] Remove `console.log` statements
   
3. **Fix Tier 3+ (NICE TO HAVE):**
   - [ ] Extract hooks for direct API calls
   - [ ] Standardize text colors across codebase
   - [ ] Add error boundary

---

## Appendix: File Index

### Pages (28 files)
- `AppApiKeys.tsx`, `AppDetail.tsx`, `AppDevelopers.tsx`, `AppLicenses.tsx`
- `AppOAuth.tsx`, `AppPaymentSettings.tsx`, `AppPromotions.tsx`, `AppSettings.tsx`
- `AppSetup.tsx`, `AppSubscriptions.tsx`, `AppUsers.tsx`
- `BillingDashboard.tsx`, `CreateProject.tsx`, `Licenses.tsx`, `Login.tsx`
- `Onboarding.tsx`, `PaymentTestingPlayground.tsx`, `Profile.tsx`
- `ProjectApps.tsx`, `ProjectDetail.tsx`, `ProjectPaymentProviders.tsx`
- `ProjectSettings.tsx`, `ProjectStats.tsx`, `ProjectTeam.tsx`, `Projects.tsx`
- `RefundProcessing.tsx`, `TransactionExport.tsx`, `WebhookMonitoring.tsx`

### Components (8 files)
- `ConfirmModal.tsx`, `IconPicker.tsx`, `InviteTeamMemberModal.tsx`
- `InviteUserModal.tsx`, `Modal.tsx`, `Select.tsx`, `StatCard.tsx`, `Toast.tsx`

### Hooks & Utils (7 files)
- `hooks/api.ts`
- `lib/pingpong.ts`, `lib/utils.ts`
- `layouts/AppSidebar.tsx`, `layouts/DashboardLayout.tsx`
- `types/admin.ts`
- `config.ts`

### Core (3 files)
- `App.tsx`, `main.tsx`, `styles.css`

---

## Conclusion

The admin dashboard is production-ready in terms of structure and user experience, but requires **critical bug fixes** (error handling) before deployment. Recommend addressing Tier 1 and Tier 2 issues immediately.

