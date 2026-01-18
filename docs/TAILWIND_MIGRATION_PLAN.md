# Tailwind CSS Migration Plan

**Status**: Draft  
**Created**: January 2026  
**Target**: Q1 2026  

---

## Executive Summary

Migrate from the current fragmented styling architecture (UnoCSS + DaisyUI + per-dashboard CSS) to a unified Tailwind CSS + component library approach. This migration will improve maintainability, enable AI-assisted development, and establish a scalable design system.

---

## Current State Analysis

### Styling Layers (Problem)

| Layer | Location | Lines/Items | Issue |
|-------|----------|-------------|-------|
| **theme.css** | `packages/styles/theme.css` | ~200 lines | ✅ Good - CSS variables |
| **base.css** | `packages/styles/base.css` | ~350 lines | ⚠️ DaisyUI + global styles mixed |
| **uno.config.ts** | `packages/styles/uno.config.ts` | 120 shortcuts | ❌ "Invisible" - hard to discover |
| **uno.astro.config.ts** | `packages/styles/uno.astro.config.ts` | 60 shortcuts | ❌ Duplicate of above for Astro |
| **admin/index.css** | `dashboard/admin/src/index.css` | ~100 lines | ❌ Dashboard-specific overrides |
| **user/index.css** | `dashboard/user/src/index.css` | ~200 lines | ❌ Duplicated patterns |
| **home/global.css** | `dashboard/home/src/styles/global.css` | ~700 lines | ❌ Standalone styling system |
| **docs/custom.css** | `dashboard/docs/src/styles/custom.css` | ~350 lines | ❌ Starlight overrides |

**Total: ~2,060 lines of CSS + 180 UnoCSS shortcuts across 8 files**

### Component/Page Files

| Dashboard | Files | className Usages | Primary Styling |
|-----------|-------|------------------|-----------------|
| Admin | 36 TSX | ~2,107 | UnoCSS shortcuts + utilities |
| User | 6 TSX | ~198 | UnoCSS shortcuts + utilities |
| Home | 10 Astro | ~228 | Plain CSS classes |
| Docs | 1 Astro | ~13 | Starlight + custom CSS |
| **Total** | **53 files** | **~2,546** | - |

### Pain Points

1. **No single source of truth** - 5 different places define button styles
2. **Shortcuts are invisible** - Developers don't know `sidebar-link` exists
3. **Copy-paste between dashboards** - No shared component library
4. **AI struggles** - Models don't understand custom UnoCSS shortcuts
5. **New features require reinvention** - No reusable patterns

---

## Target Architecture

### Directory Structure

```
apps/
├── packages/
│   ├── ui/                          # NEW: Shared component library
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── alert.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   └── cn.ts            # clsx + tailwind-merge
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── styles/
│       ├── tailwind.config.ts       # REPLACE: uno.config.ts
│       ├── tailwind.preset.ts       # Shared preset for all dashboards
│       ├── globals.css              # REPLACE: base.css (minimal)
│       ├── theme.css                # KEEP: CSS variables
│       └── package.json
│
├── dashboard/
│   ├── admin/
│   │   ├── tailwind.config.ts       # Extends @proofa/styles preset
│   │   ├── src/
│   │   │   ├── index.css            # Minimal - imports only
│   │   │   ├── components/          # Dashboard-specific only
│   │   │   └── pages/               # Uses @proofa/ui
│   │   └── ...
│   │
│   ├── user/
│   │   ├── tailwind.config.ts
│   │   └── src/...
│   │
│   ├── home/
│   │   ├── tailwind.config.ts
│   │   └── src/...
│   │
│   └── docs/
│       ├── tailwind.config.ts
│       └── src/...
```

### Design Token Flow

```
theme.css (CSS Variables)
    ↓
tailwind.preset.ts (Maps variables to Tailwind tokens)
    ↓
Dashboard tailwind.config.ts (Extends preset)
    ↓
@proofa/ui components (Use Tailwind classes)
    ↓
Dashboard pages (Import components)
```

### Component Library Pattern

Components will follow Catalyst/shadcn pattern:

```tsx
// packages/ui/src/components/button.tsx
import { cn } from '../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        // Size variants
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        // Color variants
        variant === 'primary' && 'bg-primary text-white hover:bg-primary-hover',
        variant === 'secondary' && 'bg-card-bg border border-card-border text-text-secondary hover:text-text-primary',
        variant === 'danger' && 'bg-danger text-white hover:bg-red-600',
        variant === 'ghost' && 'bg-transparent text-text-secondary hover:bg-surface-hover',
        className
      )}
      {...props}
    />
  );
}
```

Usage in dashboards:
```tsx
// dashboard/admin/src/pages/Projects.tsx
import { Button, Card, Table, Badge } from '@proofa/ui';

export function ProjectsPage() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Projects</Card.Title>
        <Button variant="primary" size="sm">
          New Project
        </Button>
      </Card.Header>
      <Table>
        ...
      </Table>
    </Card>
  );
}
```

---

## Migration Phases (Revised)

### Phase 1: Foundation + Simple Dashboards (Do Now)
**Estimated Time: 6-8 hours**  
**Blocking Dependencies: None**  
**Goal**: Setup Tailwind infrastructure and migrate 3 simple dashboards to reduce total work

#### 1.1 Create Tailwind Preset Package

- [ ] Create `packages/styles/tailwind.preset.ts`
- [ ] Map all CSS variables from `theme.css` to Tailwind tokens
- [ ] Define color palette, spacing, typography, shadows, border-radius, transitions
- [ ] Export preset for use across all dashboards

#### 1.2 Create UI Package Structure

- [ ] Create `packages/ui/` with package.json, tsconfig.json
- [ ] Create `src/utils/cn.ts` (clsx + tailwind-merge utility)
- [ ] Create `src/index.ts` placeholder
- [ ] Placeholder for future Catalyst components (Phase 2)

#### 1.3 Setup Tailwind in Home Dashboard (Astro)

- [ ] Install tailwindcss, postcss, autoprefixer, @astrojs/tailwind
- [ ] Create `tailwind.config.ts` extending preset
- [ ] Update `astro.config.mjs` to use Tailwind instead of UnoCSS
- [ ] Convert Tailwind utilities in `.astro` files
- [ ] Keep custom CSS patterns (landing page specific designs)
- [ ] Remove `unocss/astro` integration

#### 1.4 Setup Tailwind in Docs Dashboard (Astro)

- [ ] Install @astrojs/tailwind
- [ ] Create `tailwind.config.ts` extending preset
- [ ] Update `astro.config.mjs` for Tailwind
- [ ] Update Starlight integration
- [ ] Convert Tailwind utilities in custom components
- [ ] Simplify `custom.css` overrides
- [ ] Remove `unocss/astro` integration

#### 1.5 Setup Tailwind in User Dashboard (React)

- [ ] Install tailwindcss, postcss, autoprefixer
- [ ] Create `tailwind.config.ts` extending preset
- [ ] Update `vite.config.ts` to use Tailwind instead of UnoCSS
- [ ] Migrate `src/index.css` to globals pattern
- [ ] Convert shortcut usage to Tailwind utilities:
  - `card` → `bg-card-bg border border-card-border rounded-lg`
  - `tabs` → `flex border-b gap-1`
  - `badge-*` → `inline-flex px-2.5 py-1 text-11px font-medium rounded-full`
  - `btn-primary` → `inline-flex items-center bg-primary text-white hover:bg-primary-hover`
- [ ] Replace custom font sizes: `text-13px` → `text-[13px]`, etc.
- [ ] Remove UnoCSS from build

#### 1.6 Leave Admin Dashboard Unchanged

- [ ] Admin remains on UnoCSS
- [ ] No changes needed (will migrate in Phase 3 with component library)

#### 1.7 Update Root Config

- [ ] Root `package.json`: Add Tailwind dependencies
- [ ] Update monorepo documentation

#### Deliverables
- ✅ Working Tailwind preset with all design tokens
- ✅ `@proofa/ui` package structure ready for Phase 2
- ✅ Home dashboard running 100% on Tailwind
- ✅ Docs dashboard running 100% on Tailwind
- ✅ User dashboard running 100% on Tailwind
- ✅ Admin dashboard unchanged (UnoCSS still working)
- ✅ Zero breaking changes to production dashboards

---

### Phase 2: Component Library (After Tailwind Plus Subscription)
**Estimated Time: 12-16 hours**  
**Blocking Dependencies: Tailwind Plus subscription + Phase 1 complete**  
**Goal**: Build reusable component library ready for Admin dashboard migration

#### Why Wait for Tailwind Plus

| Component | shadcn/ui | Catalyst (TW Plus) |
|-----------|-----------|-------------------|
| Quality | Community | Tailwind Labs official |
| Maintenance | Volunteer | Paid team |
| Design | Variable | Consistent, polished |
| Headless UI | Optional | Built-in |
| Form handling | Basic | Advanced |

Catalyst components will be production-ready and match Tailwind's design philosophy.

#### Tasks

1. **Copy Catalyst components to `@proofa/ui`**
   - [ ] Button (primary, secondary, danger, ghost variants + sizes)
   - [ ] Card (with Header, Footer, Body composition)
   - [ ] Dialog/Modal
   - [ ] Dropdown/Select
   - [ ] Table (with sorting, pagination ready)
   - [ ] Tabs
   - [ ] Badge (status variants)
   - [ ] Alert (success, warning, danger, info)
   - [ ] Input, Textarea
   - [ ] Checkbox, Radio, Switch
   - [ ] Avatar
   - [ ] Breadcrumb
   - [ ] Pagination
   - [ ] Loading/Spinner

2. **Adapt components to Proofa theme**
   - [ ] Update all colors to use CSS variables from preset
   - [ ] Ensure dark mode works with existing theme.css
   - [ ] Add Proofa-specific variants if needed
   - [ ] Update component docs/types

3. **Create composite components (higher-level)**
   - [ ] PageHeader (title + description + actions layout)
   - [ ] DataTable (table + sorting + pagination)
   - [ ] EmptyState (icon + title + description + action)
   - [ ] StatsCard (icon + value + label + trend)
   - [ ] FormField (label + input + hint + error)
   - [ ] ConfirmDialog (reusable confirm pattern)

4. **Testing & Documentation**
   - [ ] All components TypeScript typed
   - [ ] Export all from `@proofa/ui/index.ts`
   - [ ] Add storybook stories (optional)

#### Deliverables
- 15-20 production-ready components in `@proofa/ui`
- All components use shared Tailwind preset + CSS variables
- Full TypeScript support
- Ready for Admin dashboard migration

---

### Phase 3: Admin Dashboard Migration (With Components)
**Estimated Time: 18-22 hours**  
**Blocking Dependencies: Phase 2 complete**  
**Goal**: Migrate complex Admin dashboard using component library for maximum reusability

#### Migration Strategy

Now with component library ready, Admin migration is cleaner:

1. **Systematic replacement of UnoCSS shortcuts**
   ```
   card → <Card>
   btn-primary → <Button variant="primary">
   tabs → <Tabs>
   modal → <Dialog>
   table-container → <Table>
   badge-success → <Badge variant="success">
   alert-danger → <Alert variant="danger">
   ```

2. **Automated find-replace for utilities**
   ```bash
   text-13px → text-[13px]
   text-11px → text-[11px]
   w-280px → w-[280px]
   mb--1px → -mb-px
   border-l-3 → border-l-[3px]
   ```

3. **Component-by-component migration (8 files)**
   - [ ] Modal.tsx → use `<Dialog>`
   - [ ] ConfirmModal.tsx → use `<ConfirmDialog>`
   - [ ] Select.tsx → use `<Select>`
   - [ ] Toast.tsx → use `<Alert>`
   - [ ] Icon.tsx (keep as-is)
   - [ ] IconPicker.tsx
   - [ ] InviteUserModal.tsx → use `<Dialog>`
   - [ ] InviteTeamMemberModal.tsx → use `<Dialog>`

4. **Page-by-page migration (26 files)**
   - Priority 1 (login flow): Login.tsx, Onboarding.tsx
   - Priority 2 (dashboards): Projects.tsx, ProjectDetail.tsx, ProjectStats.tsx
   - Priority 3 (management): ProjectSettings.tsx, ProjectTeam.tsx, ProjectApps.tsx
   - Priority 4 (apps): AppDetail.tsx, AppSettings.tsx, AppSetup.tsx
   - Priority 5 (oauth): AppOAuth.tsx, AppApiKeys.tsx, AppUsers.tsx
   - Priority 6 (licensing): AppLicenses.tsx, Licenses.tsx
   - Priority 7 (payments): BillingDashboard.tsx, AppPaymentSettings.tsx, ProjectPaymentProviders.tsx, PaymentTestingPlayground.tsx
   - Priority 8 (advanced): WebhookMonitoring.tsx, TransactionExport.tsx, RefundProcessing.tsx
   - Priority 9 (misc): Profile.tsx, CreateProject.tsx, AppDevelopers.tsx

5. **Remove UnoCSS**
   - [ ] Update `vite.config.ts` (remove UnoCSS)
   - [ ] Remove `uno.config.ts` reference
   - [ ] Remove `index.css.backup` and UnoCSS docs

6. **Cleanup & verify**
   - [ ] Minimize `admin/src/index.css`
   - [ ] Verify all theme colors work
   - [ ] Cross-browser testing
   - [ ] Performance check

#### Deliverables
- Admin dashboard running 100% on Tailwind + component library
- All shortcuts replaced with components
- Cleaner, more maintainable codebase
- Admin ready for production

---

### Phase 4: Cleanup (Optional - After All Migrations)
**Estimated Time: 2-4 hours**  
**Blocking Dependencies: Phase 3 complete**  
**Goal**: Remove old styling infrastructure, update documentation

#### Tasks

1. **Remove old infrastructure**
   - [ ] Remove DaisyUI references from base.css
   - [ ] Uninstall daisyui package (if not used elsewhere)
   - [ ] Remove `packages/styles/base.css` obsolete parts
   - [ ] Remove old docs: `CSS_COMPONENT_AUDIT.md`, `docs/CSS_STYLING_STANDARDS.md`, etc.

2. **Consolidate styles**
   - [ ] Keep only: `theme.css` (variables) + `globals.css` (base reset)
   - [ ] All styling now in Tailwind + components

3. **Update documentation**
   - [ ] Update README with new styling approach
   - [ ] Document `@proofa/ui` component library usage
   - [ ] Update copilot-instructions.md for new patterns
   - [ ] Add component usage examples

4. **Update CI/CD**
   - [ ] Verify all builds pass
   - [ ] Update any style-related scripts
   - [ ] Update linting/formatting rules if needed

#### Deliverables
- Clean monorepo with single styling approach
- Updated documentation
- No unused CSS infrastructure

---

## Files to Delete After Migration

```
# UnoCSS configs
packages/styles/uno.config.ts
packages/styles/uno.astro.config.ts

# Dashboard-specific CSS (mostly)
dashboard/admin/src/index.css.backup
dashboard/admin/UNOCSS_GUIDE.md
dashboard/admin/UNOCSS_MIGRATION_STATUS.md
dashboard/user/UNOCSS_CONVERSION_COMPLETE.md
dashboard/user/UNOCSS_MIGRATION.md

# Root docs (outdated after migration)
CSS_COMPONENT_AUDIT.md
docs/ADMIN_DASHBOARD_CSS_MIGRATION.md
docs/CSS_CLEANUP_PROGRESS.md
docs/CSS_STYLING_STANDARDS.md
docs/CSS_UNOCSS_ARCHITECTURE.md
```

---

## Risk Mitigation

### Visual Regression
- Take screenshots before migration
- Compare after each phase
- Use Percy or similar if available

### Breaking Changes
- Run both UnoCSS and Tailwind in Phase 1 (parallel)
- Migrate one dashboard at a time
- Full QA before each phase merge

### Timeline Slip
- Phase 1 is independent, can be done anytime
- Phases 3-5 can be parallelized across team members
- Each phase delivers working software

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Styling files | 8 | 3 (preset, globals, theme) |
| UnoCSS shortcuts | 180 | 0 |
| Shared components | 0 | 15-20 |
| Lines of custom CSS | ~2,060 | ~500 |
| AI completion accuracy | Low | High |
| Time to add new feature | Hours | Minutes |

---

## Timeline Summary (Revised)

| Phase | Effort | When | Blocker | Status |
|-------|--------|------|---------|--------|
| Phase 1: Foundation + 3 Dashboards | 6-8h | **Now** | None | To Do |
| Phase 2: Component Library | 12-16h | After TW Plus | Subscription | Waiting |
| Phase 3: Admin Dashboard | 18-22h | After Phase 2 | Phase 2 | Waiting |
| Phase 4: Cleanup | 2-4h | After Phase 3 | Phase 3 | Optional |
| **Total** | **38-50h** | - | - | - |

**Estimated Duration**: 5-7 developer days (spread over 2-3 weeks)

### What Gets Done When

| Dashboard | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|-----------|---------|---------|---------|---------|---------|
| **Home** | UnoCSS | ✅ Tailwind | - | - | ✅ Cleanup |
| **Docs** | UnoCSS | ✅ Tailwind | - | - | ✅ Cleanup |
| **User** | UnoCSS | ✅ Tailwind | - | - | ✅ Cleanup |
| **Admin** | UnoCSS | ← unchanged | ← unchanged | ✅ Tailwind + Components | ✅ Cleanup |

---

## Approval

- [ ] Architecture reviewed
- [ ] Timeline accepted
- [ ] Ready to start Phase 1

---

## Appendix A: Package Dependencies

### To Install
```json
{
  "tailwindcss": "^3.4.x",
  "postcss": "^8.4.x",
  "autoprefixer": "^10.4.x",
  "tailwind-merge": "^2.x",
  "clsx": "^2.x",
  "@tailwindcss/forms": "^0.5.x",
  "@tailwindcss/typography": "^0.5.x"
}
```

### To Remove (After Migration)
```json
{
  "unocss": "x",
  "@unocss/preset-attributify": "x",
  "@unocss/preset-icons": "x",
  "@unocss/preset-wind": "x",
  "@unocss/transformer-directives": "x",
  "@unocss/transformer-variant-group": "x",
  "daisyui": "x"
}
```

---

## Appendix B: Shortcut → Component Mapping

| UnoCSS Shortcut | Replacement |
|-----------------|-------------|
| `btn`, `btn-primary`, `btn-secondary`, `btn-danger`, `btn-ghost` | `<Button variant="...">` |
| `card`, `card-hover`, `card-header`, `card-title`, `card-body` | `<Card>`, `<Card.Header>`, etc. |
| `tabs`, `tab`, `tab-active` | `<Tabs>`, `<Tabs.Tab>` |
| `badge`, `badge-success`, `badge-warning`, etc. | `<Badge variant="...">` |
| `alert`, `alert-success`, `alert-danger`, etc. | `<Alert variant="...">` |
| `modal-overlay`, `modal-box`, etc. | `<Dialog>` |
| `form-group`, `form-label`, `form-control` | `<Input>`, `<Label>`, etc. |
| `table-container`, `table-*` | `<Table>`, `<Table.Row>`, etc. |
| `empty-state`, `empty-state-*` | `<EmptyState>` |
| `loading`, `spinner` | `<Spinner>`, `<Loading>` |
| `page-header`, `page-title`, `page-description` | `<PageHeader>` |
| `stat-card`, `stat-*` | `<StatsCard>` |
| `sidebar-*` | Keep as CSS or create `<Sidebar>` |
| `breadcrumb-*` | `<Breadcrumbs>` |

---

*Last Updated: January 2026*
