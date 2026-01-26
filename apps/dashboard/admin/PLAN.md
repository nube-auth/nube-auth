# Admin Dashboard Plan (Review First)

## Objectives
- Ship a coherent admin dashboard aligned with Proofa design standards (Selia via `@proofa/components`).
- Enforce critical patterns: public IDs only, no direct `process.env`, no native `fetch`, no native `<select>`, no direct DB/Redis clients, no read-modify-write JSONB.
- Keep UI consistent with user dashboard improvements (fixed-width theme toggle, chip variants, alerts, InfoGrid usage).
- Use Selia dashboard block as layout inspiration: https://selia.earth/block/dashboard/

## Scope (initial pass)
- Layout shell: header (theme toggle + profile menu placeholder), sidebar navigation, content area (Selia dashboard block inspired).
- Core pages: Overview, Users, Projects/Apps, Sessions/Activity, Settings (feature flags/rate limits), Audit/Logs stub.
- Component usage: Selia components from `@proofa/components`; leverage existing composites where helpful.
- Data layer: use `pingpong` from `@proofa/auth` for HTTP; ensure public IDs in UI and routes.
- Styling: rely on shared theme/tailwind; avoid dashboard-local color variables.

## Selia Setup Checklist (baseline, match user dashboard)
- [ ] Import shared styles: `@proofa/components/styles/theme.css` and tailwind pipeline in admin entry.
- [ ] Ensure Selia components are imported from `@proofa/components` (no local copies).
- [ ] Add fixed-width ThemeToggle in header (reuse user dashboard component + CSS pattern).
- [ ] Verify Icon/IconType registry used everywhere (no ad-hoc icons).
- [ ] Replace any legacy Button/Card/Input/Select/Badge/Alert with Selia counterparts.
- [ ] Replace native selects with Selia Select (no `<select>` tags).
- [ ] Replace native fetch with `pingpong`; use `response.data`, `ok()`, `isError()`.
- [ ] Ensure no direct `process.env` access; use config.
- [ ] Ensure public IDs only in UI (API already returns `id` as public).

## Component Migration Checklist (legacy → Selia)
- Buttons: use Selia `Button` variants (primary/secondary/tertiary/danger/outline/plain); remove legacy button classes.
- Chips/Badges: replace legacy badges with Selia `Chip` variants (default/primary/success/warning/info/danger/outline/plain); prefer pill for statuses.
- Alerts: use Selia `Alert` with variants (default/info/success/warning/danger/tertiary) and proper icon alignment.
- Inputs/Fields: use Selia `Input`, `Label`, `Field` patterns; ensure helper text uses text-muted.
- Selects/Dropdowns: use Selia `Select` components; no native selects.
- Tables: use Selia `Table`, `TableHeader`, `TableRow`, `TableCell`; align with user dashboard table styles.
- Tabs/Navigation: use Selia Tabs or existing TabNavigation equivalent; align with Selia spacing.
- Cards: use Selia `Card`, `CardHeader`, `CardTitle`, `CardBody`; remove custom card shells.
- Modals/Dialogs: if needed, use Selia `Dialog` stack.
- Tooltips/Popover: use Selia primitives if present; otherwise defer.
- Icons: only from `IconType` registry; map statuses to consistent icons.
- Loading: use Selia `Spinner`; no custom loaders.

## Layout Structure Plan (Selia dashboard block inspired)
- Shell: sidebar (collapsible) + top header + content area; responsive collapse on smaller widths.
- Header: left-aligned page title/breadcrumb placeholder; right-aligned theme toggle (fixed width), notifications stub, profile menu placeholder.
- Sidebar: navigation items with icons; active/hover states using theme variables; include grouped sections if needed.
- Content: vertical spacing via consistent gap; cards for KPIs; tables/lists for entities; InfoGrid for quick stats.
- Empty states: centered icon + heading + muted text + action button where applicable.
- Status pills: use Chip variants for status indicators in cards, tables, and InfoGrid values.

## Assumptions / Open Items
- Authentication/session guard mirrors user dashboard (likely `useAuth`/`useMe` equivalents); confirm existing admin hooks.
- Navigation structure: need product-owner confirmation for primary sections (placeholder set above).
- API availability: confirm endpoints for users/projects/sessions; if absent, build mocks/stubs with types.
- Icons: use unified `IconType` registry.

## Work Breakdown
1) Repo & dependency audit (admin app)
- Inspect `apps/dashboard/admin` entrypoints, routing, hooks, current components.
- Verify theme imports (`@proofa/components/styles/theme.css`) and tailwind pipeline.
- Identify legacy components to replace (buttons, cards, selects, badges, alerts).

2) Layout & navigation (Selia-inspired shell)
- Build shell with header + sidebar using Selia primitives.
- Add theme toggle (fixed-width) consistent with user dashboard.
- Add navigation structure per agreed sections; ensure responsive collapse.

3) Global UX passes
- Swap legacy badges to `Chip` variants (success/warning/info/danger/primary/default).
- Replace native selects with Selia Select.
- Standardize alerts to Selia `Alert` variants.
- Buttons: use Selia `Button` variants (primary/secondary/danger/tertiary/outline/plain).

4) Pages (initial content)
- Overview: KPIs + cards (InfoGrid/Stats) with chips for statuses.
- Users: table with public IDs, status chips, action buttons; search/filter uses Select/Input; detail drawer stub.
- Projects/Apps: list with public IDs, status chips, provider info; actions (view, revoke).
- Sessions/Activity: table of sessions with chips for state (active/current/expired), location/UA parsing utilities reuse from user dashboard.
- Settings: feature flags toggles, rate limit note (disabled in dev), stub for S2S token management (no secrets logged).
- Audit/Logs: placeholder table with empty state.

5) Data & types
- Introduce lightweight types for admin entities (UserAdmin, ProjectAdmin, SessionAdmin) using public IDs and status enums.
- Fetch via `pingpong`; no `.json()` calls; use `response.data` and `.ok()` helpers.
- Mock data if APIs unavailable; isolate in `mocks/` to swap later.

6) Accessibility & polish
- Ensure focus states, keyboard nav in tables/selects, aria labels for buttons.
- Responsive checks for sidebar/header collapse.

7) Testing & verification
- Build admin app (`pnpm build`) clean.
- Spot-check pages for theme support (light/dark/system).

## Definition of Done
- Admin dashboard builds without TS or Vite errors.
- No forbidden patterns: native select/fetch, process.env direct, internal IDs surfaced, direct DB/Redis usage.
- Primary pages render with Selia components, status chips, and alerts; theme toggle present.
- Navigation stable and responsive; empty states present where data is missing.
- Ready for review with clear follow-ups called out.

## Risks / Questions
- Confirm available admin APIs and public-ID usage.
- Confirm required sections and prioritization (e.g., do we need billing/licenses in admin now?).
- Any custom charts allowed, or stick to textual KPIs for now?
