# TODO: Admin Dashboard — Selia Design System Migration

**Priority**: 🔴 Critical (blocks v1 release)  
**Effort**: ~10-12 days  
**Owner**: @devendra  
**Reference**: `apps/dashboard/admin/PLAN.md`

---

## Overview

The admin dashboard has 26 pages with full functionality but uses legacy/custom components that need migration to Selia components from `@proofa/components`. The Toast system is a `console.log` stub, and there are no error boundaries.

---

## Phase 1: Setup & Audit (1-2 days)

### 1. Verify Theme CSS & Tailwind Pipeline
**Files**: `admin/src/index.css`, `admin/vite.config.ts`  
**Status**: ⬜ Not Started

- [ ] Verify `@proofa/components/styles/theme.css` is imported
- [ ] Verify Tailwind directives work (`@tailwind base, components, utilities`)
- [ ] Verify Selia components render correctly when imported from `@proofa/components`

---

### 2. Component Usage Audit
**Status**: ⬜ Not Started

Scan all 26 pages and create a replacement map:

| Page | Legacy Components Found | Selia Replacements Needed |
|------|------------------------|--------------------------|
| `Projects.tsx` | buttons, cards, badges | Button, Card, Chip |
| `AppUsers.tsx` | native select, buttons, table | Select, Button, Table |
| `AppOAuth.tsx` | div onClick toggles | Button/Switch |
| `AppLicenses.tsx` | badges, buttons, forms | Chip, Button, Input, Label |
| `AppSettings.tsx` | inputs, native select | Input, Select |
| `BillingDashboard.tsx` | cards, buttons | Card, Button |
| `ProjectTeam.tsx` | buttons, cards | Button, Card |
| `Profile.tsx` | inputs, buttons | Input, Button |
| `Login.tsx` | buttons | Button |
| ... | | |

**Deliverable**: Complete component count per page.

---

### 3. Identify Native `<select>` Elements
**Status**: ⬜ Not Started

Search all admin pages for native `<select>` tags and replace with Selia `Select`.

```bash
grep -rn "<select" apps/dashboard/admin/src/
```

---

### 4. Identify Direct `fetch()` Calls
**Status**: ⬜ Not Started

Search for `fetch(` and replace with `pingpong` from `@proofa/auth`.

```bash
grep -rn "fetch(" apps/dashboard/admin/src/
```

---

## Phase 2: Critical Infrastructure (2 days)

### 5. Implement Toast Notification System
**File**: `apps/dashboard/admin/src/components/Toast.tsx`  
**Status**: ⬜ Not Started

**Problem**: Current Toast is `console.log` only. 25+ action flows have no user feedback.

**Implementation**:
```bash
cd apps/dashboard/admin && pnpm add sonner
```

Replace the Toast stub with `sonner`:
```typescript
// Remove: apps/dashboard/admin/src/components/Toast.tsx (the console.log stub)
// Add to App.tsx:
import { Toaster } from 'sonner';
// In render: <Toaster position="top-right" richColors />

// Then in each page, replace console.log toast calls:
import { toast } from 'sonner';
toast.success("Project created");
toast.error("Failed to create project");
```

**Pages needing Toast wiring** (~25+):
- `Projects.tsx`: Create, update, delete project
- `ProjectSettings.tsx`: Save settings
- `ProjectTeam.tsx`: Invite, remove member
- `AppSettings.tsx`: Save app settings
- `AppOAuth.tsx`: Toggle providers
- `AppUsers.tsx`: Suspend, unsuspend, delete user
- `AppLicenses.tsx`: Grant, revoke, update license
- `AppApiKeys.tsx`: Generate, revoke API key
- `AppPaymentSettings.tsx`: Save payment settings
- `BillingDashboard.tsx`: Various actions
- `Profile.tsx`: Update profile
- `Onboarding.tsx`: Complete onboarding
- `CreateProject.tsx`: Create project
- All other pages with action buttons

**Effort**: 4 hours

---

### 6. Add React Error Boundaries
**Status**: ⬜ Not Started

**Implementation**: Same pattern as user dashboard.

**Effort**: 1 hour

---

### 7. Add 404 Catch-All Route
**File**: `apps/dashboard/admin/src/App.tsx`  
**Status**: ⬜ Not Started

```typescript
<Route path="*" element={<NotFoundPage />} />
```

**Effort**: 30 minutes

---

## Phase 3: Global Component Replacements (3-4 days)

### 8. Replace Legacy Buttons → Selia Button
**Status**: ⬜ Not Started

Replace all button variants across all pages:
- Custom CSS buttons → `<Button variant="primary">`
- Danger buttons → `<Button variant="danger">`
- Secondary buttons → `<Button variant="secondary">`
- Outline buttons → `<Button variant="outline">`

**Estimated instances**: ~100+ across 26 pages

**Effort**: 4 hours

---

### 9. Replace Legacy Badges → Selia Chip
**Status**: ⬜ Not Started

Replace all status badges:
- Active status → `<Chip variant="success">Active</Chip>`
- Expired/Inactive → `<Chip variant="danger">Expired</Chip>`
- Warning → `<Chip variant="warning">Warning</Chip>`
- Info → `<Chip variant="info">Info</Chip>`
- Default → `<Chip variant="default">Default</Chip>`

**Estimated instances**: ~30+ across 12+ pages

**Effort**: 3 hours

---

### 10. Replace Native `<select>` → Selia Select
**Status**: ⬜ Not Started

Replace all native dropdown elements with Selia components:
```typescript
// Before:
<select value={status} onChange={e => setStatus(e.target.value)}>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
</select>

// After:
<Select value={status} onValueChange={setStatus}>
    <SelectTrigger>
        <SelectValue placeholder="Select status" />
    </SelectTrigger>
    <SelectPopup>
        <SelectOption value="active">Active</SelectOption>
        <SelectOption value="inactive">Inactive</SelectOption>
    </SelectPopup>
</Select>
```

**Estimated instances**: 6+ pages

**Effort**: 4 hours

---

### 11. Replace Custom Cards → Selia Card
**Status**: ⬜ Not Started

Replace custom `div` card shells with structured components:
```typescript
<Card>
    <CardHeader>
        <CardTitle>Title</CardTitle>
    </CardHeader>
    <CardBody>Content</CardBody>
</Card>
```

**Estimated instances**: ~20+ across 15 pages

**Effort**: 4 hours

---

### 12. Replace Custom Inputs → Selia Input + Label
**Status**: ⬜ Not Started

Replace form inputs with structured Selia components:
```typescript
<Label htmlFor="name">Name</Label>
<Input id="name" value={name} onChange={setName} />
```

**Estimated instances**: ~30+ across 10 pages

**Effort**: 3 hours

---

### 13. Replace Custom Alerts → Selia Alert
**Status**: ⬜ Not Started

Replace custom alert HTML with Selia:
```typescript
<Alert variant="danger">Error message</Alert>
<Alert variant="success">Success message</Alert>
<Alert variant="warning">Warning message</Alert>
<Alert variant="info">Info message</Alert>
```

**Estimated instances**: ~10+ across 8 pages

**Effort**: 2 hours

---

### 14. Standardize Loading States → Selia Spinner
**Status**: ⬜ Not Started

Replace custom loading indicators with Selia `Spinner`.

**Effort**: 1 hour

---

## Phase 4: Layout Shell (2 days)

### 15. Build Dashboard Layout Shell
**Status**: ⬜ Not Started

**Components**:
- `AdminLayout.tsx`: Main layout wrapper
- Header: theme toggle (fixed-width), profile menu, breadcrumb
- Sidebar: collapsible navigation with icons
- Content area: consistent spacing

**Reference**: https://selia.earth/block/dashboard/

**Effort**: 8 hours

---

### 16. Theme Toggle (Match User Dashboard)
**Status**: ⬜ Not Started

Implement fixed-width theme toggle consistent with user dashboard pattern.

**Effort**: 1 hour

---

### 17. Responsive Sidebar Collapse
**Status**: ⬜ Not Started

Sidebar should collapse to icon-only on smaller screens, with hamburger toggle on mobile.

**Effort**: 3 hours

---

## Phase 5: Page Content Pass (2-3 days)

### 18. Overview/Dashboard Page
**File**: `ProjectStats.tsx`  
**Status**: ⬜ Not Started

- Use Selia Card + Chip for KPI status
- InfoGrid for quick stats
- Empty states with centered icon + text

---

### 19. Projects & Apps Pages
**Files**: `Projects.tsx`, `ProjectApps.tsx`, `ProjectDetail.tsx`  
**Status**: ⬜ Not Started

- Selia Table with proper headers
- Chip variants for status
- Button actions (view, edit, delete)
- Confirmation dialogs for destructive actions

---

### 20. Users & Access Pages
**Files**: `ProjectTeam.tsx`, `AppUsers.tsx`, `AppDetail.tsx`  
**Status**: ⬜ Not Started

- Add confirmation dialog for user suspend (currently missing)
- Selia Table with user data
- Chip variants for user status

---

### 21. Settings Pages
**Files**: `ProjectSettings.tsx`, `AppSettings.tsx`, `AppOAuth.tsx`  
**Status**: ⬜ Not Started

- Selia Form components
- Replace OAuth toggle cards with accessible components (role="button", tabIndex, keyboard events)
- Toast feedback on save

---

### 22. Advanced Pages
**Files**: `AppLicenses.tsx`, `BillingDashboard.tsx`, `AppApiKeys.tsx`, etc.  
**Status**: ⬜ Not Started

- Large forms with Selia components
- Table layouts with Selia Table
- Action buttons with proper confirmation

---

## Phase 6: Data Layer (1 day)

### 23. Replace `fetch()` with `pingpong`
**Status**: ⬜ Not Started

Across all pages, replace:
```typescript
// Before:
const response = await fetch('/api/endpoint');
const data = await response.json();

// After:
import { pingpong } from '@proofa/auth';
const response = await pingpong('/api/endpoint');
const data = response.data; // Auto-parsed JSON
```

---

### 24. Remove Console Statements
**Status**: ⬜ Not Started

11+ files with unguarded `console.error`/`console.log`:
- `AppUsers.tsx:82,140,181`
- `AppSettings.tsx:140`
- `AppOAuth.tsx:54`
- `ProjectSettings.tsx:54`
- `AppLicenses.tsx:110,322`
- `PaymentTestingPlayground.tsx:65,93,128,145`
- `InviteUserModal.tsx:61`

Replace with structured logger or wrap in `import.meta.env.DEV`.

---

### 25. Replace `window.location.href` with `navigate()`
**Status**: ⬜ Not Started

8+ locations using `window.location.href` instead of React Router navigation.

---

## Phase 7: Polish & Testing (1 day)

### 26. TypeScript Compilation Check
**Status**: ⬜ Not Started

```bash
cd apps/dashboard/admin && pnpm tsc --noEmit
```

### 27. Vite Build Check
**Status**: ⬜ Not Started

```bash
cd apps/dashboard/admin && pnpm build
```

### 28. Theme Toggle Verification
**Status**: ⬜ Not Started

Verify light/dark/system theme works across all pages.

### 29. Basic Accessibility Check
**Status**: ⬜ Not Started

- Add `aria-label` to icon-only buttons
- Add `tabIndex` and keyboard handlers to interactive non-button elements
- Verify focus states visible

---

## Implementation Order

```
Week 1:
  Day 1: Setup & Audit (tasks 1-4)
  Day 2: Toast + Error Boundaries + 404 (tasks 5-7)
  Day 3: Button + Badge + Select replacements (tasks 8-10)
  Day 4: Card + Input + Alert + Spinner (tasks 11-14)
  Day 5: Layout shell + theme toggle (tasks 15-16)

Week 2:
  Day 1: Responsive sidebar + Overview page (tasks 17-18)
  Day 2: Projects & Apps pages (task 19)
  Day 3: Users & Settings pages (tasks 20-21)
  Day 4: Advanced pages + data layer (tasks 22-24)
  Day 5: Navigate fixes + polish + build check (tasks 25-29)
```

---

## Definition of Done

- [ ] All legacy components replaced with Selia from `@proofa/components`
- [ ] Zero native `<select>` elements
- [ ] Zero native `fetch()` calls (all use `pingpong`)
- [ ] Toast notifications working for all 25+ action flows
- [ ] Error boundaries prevent white-screen crashes
- [ ] 404 route catches unknown paths
- [ ] Dashboard layout with collapsible sidebar
- [ ] Theme toggle works (light/dark)
- [ ] No `console.log`/`console.error` in production paths
- [ ] No `window.location.href` (use `navigate()`)
- [ ] TypeScript compiles cleanly
- [ ] Vite build succeeds
