# CSS Component Classes Audit

## Admin Dashboard (`apps/dashboard/admin/src/index.css`)

### ✅ Already Migrated to UnoCSS
- `.modal-*` classes (overlay, content, header, body, footer) - **DONE** ✅

### 🔄 Component Classes to Migrate

#### Layout Classes
- `.app-layout` - flex min-h-screen
- `.sidebar` - Complex fixed sidebar with multiple properties
- `.sidebar-header` - flex items-center with fixed height
- `.sidebar-logo`, `.sidebar-logo-img`, `.sidebar-logo-name`, `.sidebar-logo-badge`
- `.sidebar-nav`, `.sidebar-section`, `.sidebar-section-title`
- `.sidebar-link`, `.sidebar-link.active`, `.sidebar-link-badge`
- `.sidebar-footer`, `.sidebar-user`, `.sidebar-avatar`, `.sidebar-user-info`
- `.admin-main-content` - margin-left with sidebar offset
- `.top-header`, `.top-header-left`, `.top-header-right`

#### Project Selector (Dropdown-like)
- `.project-selector` - Custom button/dropdown component
- `.project-selector:hover`, `.project-selector:focus`
- `.project-selector-info`, `.project-selector-icon`, `.project-selector-name`, `.project-selector-env`

#### Navigation
- `.breadcrumb`, `.breadcrumb-item`, `.breadcrumb-divider`, `.breadcrumb-current`

#### Headers
- `.header-btn`, `.header-btn-primary`, `.header-btn:hover`

#### Content
- `.page-content`
- `.page-header`, `.page-title`, `.page-description`

#### Components - Cards
- `.card`, `.card-header`, `.card-title`, `.card-desc`, `.card-body`
- `.get-started-card`, `.get-started-header`, `.get-started-icon`, etc.
- `.stat-card`, `.stat-card-header`, `.stat-icon`, `.stat-trend`, `.stat-value`, `.stat-label`
- `.integration-card`, `.integration-icon`, `.integration-name`, `.integration-desc`, `.integration-actions`, `.integration-btn`
- `.project-card`, `.project-card-header`, `.project-icon`, `.project-status`, `.project-name`, `.project-slug`, `.project-id`
- `.quickstart-card`, `.quickstart-steps`, `.quickstart-step`, `.step-header`, `.step-number`, `.step-title`, `.step-desc`

#### Grids
- `.stats-grid` - grid grid-cols-4
- `.integrations-grid` - grid grid-cols-4
- `.projects-grid` - grid grid-cols-3
- `.quickstart-steps` - grid grid-cols-4

#### Buttons
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.btn-sm`

#### Badges
- `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-info`, `.badge-gray`

#### Forms
- `.form-group`, `.form-label`, `.form-control`
- Native input/textarea/select styles

#### Tables
- `table`, `thead`, `th`, `td`, `tbody tr:hover`

#### Code Display
- `.code-inline` - inline code style
- `.code-input`, `.code-input-btn`
- `.code-preview`, `.code-preview-header`, `.code-preview-content`
- `.code-comment`, `.code-keyword`, `.code-string`, etc.

#### Alerts
- `.alert`, `.alert-success`, `.alert-warning`, `.alert-danger`, `.alert-info`

#### Empty State
- `.empty-state`, `.empty-state-icon`, `.empty-state-title`, `.empty-state-desc`

#### Utilities (Already UnoCSS-like)
- `.flex`, `.flex-col`, `.items-center`, `.gap-*`, `.text-*`, `.mb-*`, etc.
- **These should be removed** - use UnoCSS directly

#### Spinner
- `.spinner`, `.loading`

#### Avatar
- `.avatar`, `.avatar-sm`

#### Section
- `.section-header`, `.section-title`, `.section-link`

---

## User Dashboard (`apps/dashboard/user/src/index.css`)

### ✅ Minimal Component CSS (Good!)
User dashboard is cleaner with less component CSS.

### 🔄 Component Classes to Migrate

#### Form Elements
- Native input/textarea styles (lines 40-61)

#### Tables
- `table`, `thead`, `th`, `td`, `tbody` styles (lines 67-96)

#### Info List
- `.info-list-label span:first-child`, `.info-list-label span:last-child`
- `.info-list-value code`

#### Profile Avatar
- `.profile-avatar.has-icon`

#### Animations
- `@keyframes spin`, `@keyframes pulse`

---

## Migration Priority

### High Priority (Core Layout)
1. **Sidebar components** - Used on every page
2. **Top header** - Used on every page
3. **Button system** (`.btn-*`) - Used everywhere
4. **Card system** (`.card`, `.card-header`, etc.) - Very common
5. **Form controls** (`.form-group`, `.form-label`, `.form-control`)

### Medium Priority (Common Components)
6. **Grid systems** (`.stats-grid`, `.projects-grid`, etc.)
7. **Badge system** (`.badge-*`)
8. **Alert system** (`.alert-*`)
9. **Tables** (table, th, td styles)
10. **Page headers** (`.page-header`, `.page-title`)

### Lower Priority (Specific Components)
11. **Integration cards** - Specific pages
12. **Quickstart steps** - Dashboard page
13. **Get started card** - Dashboard page
14. **Project selector** - Sidebar dropdown
15. **Code display** - Specific use cases
16. **Empty states** - Conditional display
17. **Spinner/loading** - Conditional display

---

## Recommended UnoCSS Shortcuts

Based on the audit, create these shortcuts in `uno.config.ts`:

```typescript
shortcuts: {
  // Card system
  'card': 'bg-card-bg border border-card-border rounded-lg',
  'card-hover': 'hover:border-card-hover-border hover:shadow-md',
  
  // Buttons
  'btn': 'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-13px font-medium rounded-md transition-all',
  'btn-primary': 'btn bg-primary text-white hover:bg-primary-hover',
  'btn-secondary': 'btn bg-card-bg border border-card-border text-text-secondary hover:border-card-hover-border hover:text-text-primary',
  'btn-danger': 'btn bg-danger text-white hover:bg-red-600',
  'btn-ghost': 'btn bg-transparent text-text-secondary hover:bg-content-bg hover:text-text-primary',
  'btn-sm': 'px-3 py-1.5 text-12px',
  
  // Badges
  'badge': 'inline-flex items-center gap-1 px-2.5 py-1 text-11px font-medium rounded-full',
  'badge-success': 'badge bg-success-bg text-success-text',
  'badge-warning': 'badge bg-warning-bg text-warning-text',
  'badge-danger': 'badge bg-danger-bg text-danger-text',
  'badge-info': 'badge bg-info-bg text-info-text',
  
  // Forms
  'form-label': 'block text-13px font-medium text-text-primary mb-1.5',
  'form-control': 'w-full px-3.5 py-2.5 text-13px border border-card-border rounded-md bg-card-bg text-text-primary transition-all focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10',
  
  // Page structure
  'page-header': 'flex items-start justify-between mb-6',
  'page-title': 'text-24px font-bold text-text-primary',
  'page-description': 'text-14px text-text-secondary',
  
  // Grids
  'grid-2': 'grid grid-cols-2 gap-4',
  'grid-3': 'grid grid-cols-3 gap-4',
  'grid-4': 'grid grid-cols-4 gap-4',
}
```

---

## Files Using Component Classes

### High Usage Files (>20 CSS class references)
- `WebhookMonitoring.tsx` - cards, buttons, forms
- `BillingDashboard.tsx` - cards, grids
- `Profile.tsx` - page-header, cards, forms, alerts
- `AppSettings.tsx` - page-header, cards, forms
- `Dashboard.tsx` - stats-grid, integrations-grid, quickstart-steps, get-started-card
- `Projects.tsx` - projects-grid, project-card

### Medium Usage Files (10-20 references)
- All other page components

### Layout Files (Always Active)
- Sidebar component - Uses `.sidebar`, `.sidebar-*` extensively
- TopHeader component - Uses `.top-header`, `.header-btn`

---

## Notes

1. **Keep table styles in CSS** - Complex pseudo-selectors (`:last-child`, `:hover`) are cleaner in CSS
2. **Keep native input/textarea/select styles** - Base form element styles are cleaner in CSS
3. **Remove utility classes** - `.flex`, `.gap-*`, `.text-*`, etc. - use UnoCSS directly
4. **Complex layouts** - Sidebar and top header may need custom CSS or very detailed shortcuts
5. **Gradients** - Some gradients (avatar, project-icon) may need CSS variables or Tailwind arbitrary values

---

## Next Steps

1. Create UnoCSS shortcuts (Task 10)
2. Start migration with high-priority components (Task 11)
3. Test each page after migration
4. Remove CSS classes from index.css incrementally (Task 13)
5. Final verification grep search (Task 15)
