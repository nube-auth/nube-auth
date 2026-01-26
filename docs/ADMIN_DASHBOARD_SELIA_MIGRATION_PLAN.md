# Admin Dashboard → Selia 100% Migration Plan

Date: January 26, 2026
Owner: Proofa Admin Dashboard

## 0) Quick context (how the User Dashboard is built)
The user dashboard already follows the Selia-first model:
- Uses Selia primitives directly from `@proofa/components` (Card, Button, Alert, Table, Tabs, Chip, Spinner, etc.) in pages like `apps/dashboard/user/src/pages/Profile.tsx`, `Sessions.tsx`, `Security.tsx`.
- Uses Proofa composite components (built on Selia) such as `ProfileHeader`, `InfoGrid`, `SessionCard`, `AuthLoginCard`.
- Only minimal layout CSS in `apps/dashboard/user/src/index.css`; component styling comes from Selia + Tailwind tokens in `apps/dashboard/user/src/styles.css`.

This is the target architecture for the admin dashboard.

---

## 1) Current admin state (what exists today)
Selia usage is partial:
- Selia primitives already used in a few places (`AuthLoginCard` in `apps/dashboard/admin/src/pages/Login.tsx`, Dialog in `apps/dashboard/admin/src/components/Modal.tsx`, Select wrapper, some modals).
- Most UI is custom CSS driven via `apps/dashboard/admin/src/index.css` (cards, buttons, badges, alerts, tables, forms, modals, tabs, breadcrumbs, sidebar, etc.).

Primary work: replace custom UI with Selia components + minimal layout CSS.

---

## 1.1) Use Selia Dashboard Block as the base layout
Selia provides an out-of-the-box dashboard block that already includes a full layout and core building blocks. We will use this as the base shell for the admin dashboard to avoid designing a new layout from scratch. citeturn2view1

What the Selia Dashboard block includes:
- `app-sidebar.tsx`
- `chart.tsx`
- `data.ts`
- `layout.tsx`
- `page.tsx`
- `stat-card.tsx`
citeturn2view1

Source reference (provided): 
```
https://selia.earth/block/dashboard/
https://github.com/nauvalazhar/selia/tree/master/components/blocks/dashboard
```

How we will apply it:
- Replace admin app shell with the Selia dashboard block structure and map admin routes into the block’s `page.tsx` + `layout.tsx`.
- Migrate the sidebar to Selia’s `app-sidebar.tsx` pattern and wire it to admin routes.
- Replace admin stat grid with Selia’s `stat-card.tsx`.
- Reuse the block’s data patterns (`data.ts`) for sidebar nav and stat configuration, then adapt to admin APIs.

---

## 2) Migration goals (Definition of Done)
- 100% of UI primitives in admin are Selia components (or Proofa composites built on Selia).
- `apps/dashboard/admin/src/index.css` is reduced to layout-only (grid, spacing, structural layout) with no visual primitives (buttons, cards, badges, alerts, tables, forms, etc.).
- All pages use Selia tokens + components and follow the same base design language as the user dashboard.

---

## 3) Selia component inventory (available primitives)
From `@proofa/components` → `apps/packages/components/src/components/selia/ui`:
- Card, Button, Alert, Badge, Chip, Table, Tabs, Select, Input, Textarea, Label, Field, Form, Dialog, Toast, Breadcrumb, Sidebar, Pagination, Spinner, Tooltip, Popover, Menu, Toolbar, Divider, Stack, Text, Heading, IconBox, Switch, Checkbox, Radio.

---

## 4) Component mapping (custom CSS → Selia primitives)
Replace these custom CSS patterns with Selia components:

- `.card`, `.card-header`, `.card-title`, `.card-body` → `Card`, `CardHeader`, `CardTitle`, `CardBody`.
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.btn-outline`, size variants → `Button` with variants and sizes.
- `.badge`, `.badge-*` → `Badge` or `Chip` depending on density.
- `.alert`, `.alert-*` → `Alert` with variants.
- `.table`, `.table-container` → `Table`, `TableHeader`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TableContainer`.
- `.form-control`, `.form-label`, `.form-*` → `Field`, `Label`, `Input`, `Textarea`, `Select`, `Switch`, `Checkbox`.
- `.tabs` (custom buttons) → `Tabs`, `TabsList`, `TabsItem`, `TabsPanel`.
- `.breadcrumbs`, `.breadcrumb-*` → `Breadcrumb`.
- `.modal` (custom overlay) → `Dialog` / `AlertDialog`.
- `.spinner` → `Spinner`.
- `.sidebar` → `Sidebar` (Selia component).
- `.empty-state` → `EmptyState` composite or Selia `Card` + `IconBox`.

---

## 5) Migration phases

### Phase 1 — Foundation & theme alignment
Goal: confirm theme inputs and set the baseline for Selia.

Tasks:
- Decide whether admin should enable `@proofa/components/selia-theme.css` (default Selia theme) or keep custom theme tokens. (Currently commented out in `apps/dashboard/admin/src/styles.css`.)
- Ensure Tailwind token mapping remains in `apps/dashboard/admin/src/styles.css`.
- Align admin `index.css` to “layout-only” by flagging sections that must be removed once components are migrated.

Deliverables:
- Theme decision documented.
- `index.css` cleanup list created (see Phase 5).

---

### Phase 2 — Shared admin UI wrappers (optional, but speeds migration)
Goal: reduce per-page churn with shared Selia-based components.

Create in `apps/dashboard/admin/src/components/ui`:
- `AdminPageHeader` (title, description, actions slot).
- `AdminSectionCard` (Card + header + description + actions).
- `AdminStatCard` (Card + icon + value + label).
- `AdminEmptyState` (Icon + title + description + action).
- `AdminFiltersBar` (date range + inputs + buttons).
- `AdminDataTable` (Selia Table with empty/loading states).
- `AdminBreadcrumbs` (Selia Breadcrumb wrapper).

These should be built strictly on Selia primitives.

---

### Phase 3 — Layout migration (App shell)
Goal: migrate global layout (sidebar, header, breadcrumb, top controls).

Files:
- `apps/dashboard/admin/src/App.tsx`

Tasks:
- Replace custom sidebar markup with Selia `Sidebar`.
- Replace project dropdown with Selia `Select` or `Menu` + `Popover`.
- Replace header actions and theme toggle with Selia `Button`, `Toggle`, `ToggleGroup`.
- Replace breadcrumbs with Selia `Breadcrumb`.

---

### Phase 4 — Page migrations (by feature group)

Group A: Core navigation
- `Projects.tsx`, `ProjectDetail.tsx`, `ProjectStats.tsx`, `ProjectSettings.tsx`, `ProjectTeam.tsx`, `ProjectApps.tsx`

Primary replacements:
- `card` → `Card`
- grid stats → `AdminStatCard` or `InfoGrid`
- tables → `Table` with Selia components
- buttons → `Button`
- badges → `Badge` / `Chip`
- breadcrumbs → `Breadcrumb`

Group B: App management
- `AppDetail.tsx`, `AppSettings.tsx`, `AppUsers.tsx`, `AppLicenses.tsx`, `AppApiKeys.tsx`, `AppOAuth.tsx`, `AppSetup.tsx`, `AppPaymentSettings.tsx`, `AppDevelopers.tsx`

Primary replacements:
- custom forms → `Field`, `Label`, `Input`, `Textarea`, `Select`
- tables → `Table`
- status chips → `Badge`/`Chip`
- alerts → `Alert`

Group C: Billing + monitoring
- `BillingDashboard.tsx`, `TransactionExport.tsx`, `RefundProcessing.tsx`, `WebhookMonitoring.tsx`, `PaymentTestingPlayground.tsx`

Primary replacements:
- filters → `Field` + `Input` + `Button`
- tabs → `Tabs`
- cards → `Card`
- tables → `Table`
- pagination → Selia `Pagination`

Group D: Auth + profile
- `Login.tsx` already Selia (`AuthLoginCard`). Remove remaining login styles from admin `index.css`.
- `Profile.tsx`, `Onboarding.tsx`, `CreateProject.tsx` → convert to Selia form primitives.

---

### Phase 5 — Modal, toast, and dialog cleanup
Files:
- `apps/dashboard/admin/src/components/InviteUserModal.tsx` (custom modal)
- `apps/dashboard/admin/src/components/Toast.tsx`

Tasks:
- Rewrite `InviteUserModal` to use Selia `Dialog` + `Form` + `Input` + `Textarea` + `Select` + `Button` + `Alert`.
- Replace custom toast provider with Selia `Toast` primitives (and provide a `useToast` wrapper if needed for existing API).

---

### Phase 6 — CSS reduction
Files:
- `apps/dashboard/admin/src/index.css`

Delete or migrate these sections once Selia replacements are in place:
- Buttons (`.btn*`)
- Cards (`.card*`)
- Badges (`.badge*`)
- Alerts (`.alert*`)
- Tables (`.table*`)
- Forms (`.form-*`)
- Modals (`.modal*`)
- Tabs, breadcrumbs, and extra UI blocks that are now Selia

Keep only:
- layout grid/spacing (app shell, sidebar position, content spacing)
- minimal utility helpers (if not replicated by Selia/Tailwind)

---

## 6) Suggested migration order (minimize regression)
1. Global App shell (`App.tsx`) → Selia Sidebar + Breadcrumb + Header
2. Replace shared primitives (Button/Card/Table/Badge/Alert) in one core page (Projects) to validate approach
3. Build `AdminStatCard`/`AdminDataTable` and migrate ProjectDetail + ProjectStats
4. Migrate App management pages
5. Migrate Billing/Monitoring pages
6. Replace modal + toast
7. Remove CSS from `index.css`

---

## 7) Testing plan
- Visual regression on core flows: Login, Projects list, Project detail, App detail, Billing dashboard.
- Functional checks: forms submit, modals open/close, table actions, theme toggle, sidebar navigation.
- Ensure dark mode styling works (Selia uses `.dark` class already applied in `App.tsx`).

---

## 8) Open questions / decisions
1. Do we want to enable `@proofa/components/selia-theme.css` for admin, or keep custom theme tokens and override Selia defaults?
2. Should shared admin composites live in `apps/dashboard/admin/src/components/ui` or be moved into `@proofa/components` for reuse?
3. Any admin pages that must retain a custom visual style (e.g. billing dashboards) that would require custom Selia theming?

---

## 9) Minimal starting checklist (first sprint)
- Convert `Projects.tsx` to Selia: cards, table, empty state, buttons.
- Replace `.btn`, `.card`, `.table`, `.badge`, `.alert` usages in one page to validate Selia mappings.
- Implement `AdminPageHeader` and `AdminEmptyState` using Selia primitives.
- Document before/after in this plan.
