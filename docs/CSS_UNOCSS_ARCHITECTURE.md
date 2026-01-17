# CSS & UnoCSS Architecture Guide

## Overview

Proofa uses a **Shared Theme + UnoCSS** architecture pattern across all dashboards (admin, user, docs, home) for consistent, maintainable, and scalable styling.

**Key Principles:**
- Single source of truth for theme (shared `theme.css`)
- Atomic CSS via UnoCSS utilities and shortcuts
- No component CSS classes in dashboard-specific index.css
- Co-located styles with components for better DX

---

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Foundation                         │
├─────────────────────────────────────────────────────────────┤
│  @proofa/styles/theme.css         (Theme Variables)         │
│  @proofa/styles/uno.config.ts     (UnoCSS Config)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               Dashboard-Specific Imports                     │
├─────────────────────────────────────────────────────────────┤
│  apps/dashboard/*/src/main.tsx                              │
│    1. Import '@proofa/styles/theme.css'                    │
│    2. Import 'virtual:uno.css'                             │
│    3. Import './index.css'                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Components (TSX)                          │
├─────────────────────────────────────────────────────────────┤
│  Use UnoCSS utilities and shortcuts only                    │
│  className="btn-primary card project-card"                  │
└─────────────────────────────────────────────────────────────┘
```

---

## What Goes Where

### 1. `/apps/packages/styles/theme.css`
**Single Source of Truth for Theming**

✅ **DO Include:**
- All CSS Variables (colors, spacing, shadows, radius, transitions)
- Dark theme overrides `[data-theme="dark"]`
- Auto dark mode `@media (prefers-color-scheme: dark)`
- Typography tokens (font-family, font-size, line-height)
- Shared across ALL dashboards

❌ **DON'T Include:**
- Component CSS classes (`.card`, `.button`, `.modal`)
- Dashboard-specific styles
- Layout classes (`.sidebar`, `.main-content`)
- Utility classes (`.flex`, `.mt-4`, `.text-center`)

**Example:**
```css
:root {
  /* Colors */
  --primary: #6366f1;
  --danger: #ef4444;
  --success: #10b981;
  
  /* Layout */
  --sidebar-bg: #0B0F16;
  --content-bg: #0F1624;
  --card-bg: rgba(255, 255, 255, 0.04);
  
  /* Typography */
  --text-primary: rgba(255, 255, 255, 0.95);
  --text-secondary: rgba(255, 255, 255, 0.70);
}

[data-theme="dark"] {
  --content-bg: #0F1624;
  /* ... dark overrides ... */
}
```

---

### 2. `/apps/packages/styles/uno.config.ts`
**Shared UnoCSS Configuration**

✅ **DO Include:**
- Theme tokens referencing CSS variables
- Custom shortcuts for repeated patterns (150+ shortcuts)
- Custom rules for missing utilities
- Shared across ALL dashboards

❌ **DON'T Include:**
- Dashboard-specific logic
- Hard-coded colors (always use theme variables)

**Example:**
```typescript
export default defineConfig({
  theme: {
    colors: {
      'primary': 'var(--primary)',
      'sidebar-bg': 'var(--sidebar-bg)',
      'content-bg': 'var(--content-bg)',
      'card-bg': 'var(--card-bg)',
      'text-primary': 'var(--text-primary)',
      // ... all theme variables
    },
  },
  shortcuts: {
    // Buttons
    'btn-primary': 'btn bg-primary text-white hover:bg-primary-hover',
    'btn-secondary': 'btn bg-card-bg border border-card-border text-text-secondary hover:border-card-hover-border',
    
    // Cards
    'card': 'bg-card-bg border border-card-border rounded-lg overflow-hidden',
    'card-header': 'flex items-center justify-between px-5 py-4 border-b border-card-border',
    
    // Project Cards
    'project-card': 'bg-card-bg border border-card-border rounded-lg p-5 no-underline block transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5',
    
    // Stats
    'stat-card': 'bg-card-bg border border-card-border rounded-lg p-5',
    'stat-value': 'text-28px font-bold text-text-primary leading-none',
    
    // Forms
    'form-group': 'mb-4',
    'form-label': 'block text-13px font-medium text-text-primary mb-1.5',
    'form-control': 'w-full px-3.5 py-2.5 text-13px border border-card-border rounded-md bg-card-bg text-text-primary transition-all focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10',
    
    // ... 150+ shortcuts
  },
});
```

---

### 3. `/apps/dashboard/*/src/index.css`
**Dashboard-Specific Base Styles Only**

✅ **DO Include:**
- Global resets (`*`, `body`, `html`)
- Font imports (`@font-face`)
- Base typography (h1-h6, p, a)
- Native form element styling (complex pseudo-selectors)
- Table styling (complex :hover, :last-child selectors)
- Dashboard-specific overrides (RARE)
- Animations (`@keyframes`)

❌ **DON'T Include:**
- Theme variables (use shared `theme.css`)
- Component classes (`.card`, `.button`, `.modal`)
- Layout classes (`.sidebar`, `.main-content`)
- Utility classes (`.flex`, `.mt-4`, `.text-center`)

**Example (Admin Dashboard):**
```css
/* Global resets */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--content-bg);
  color: var(--text-primary);
}

/* Native form styling */
input[type="text"],
input[type="email"] {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  transition: border-color var(--transition);
}

input:focus {
  outline: none;
  border-color: var(--primary);
}

/* Table complex selectors */
table {
  width: 100%;
  border-collapse: collapse;
}

tbody tr:hover {
  background: var(--surface-hover);
}

tbody tr:last-child td {
  border-bottom: none;
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

### 4. Component Files (`.tsx`)
**All Styling via UnoCSS**

✅ **DO Use:**
- UnoCSS utility classes
- UnoCSS shortcuts (prefer for repeated patterns)
- Co-located styles with markup

❌ **DON'T Use:**
- Custom CSS classes from `index.css`
- Inline styles (except dynamic values)

**Example:**
```tsx
// ❌ WRONG - Custom CSS class in index.css
<div className="custom-card">
  <h3 className="custom-title">Title</h3>
</div>

// ✅ CORRECT - UnoCSS shortcut
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Title</h3>
  </div>
  <div className="card-body">Content</div>
</div>

// ✅ ALSO CORRECT - Inline utilities for one-off styles
<div className="flex items-center gap-4 p-6 bg-card-bg rounded-lg">
  Content
</div>

// ✅ CORRECT - Dynamic styles
<div 
  className="card"
  style={{ background: isDanger ? '#ef4444' : '#8b5cf6' }}
>
  Content
</div>
```

---

## Import Order (Critical)

In every dashboard's `main.tsx`:

```typescript
// 1. Reset styles (normalize browser defaults)
import '@unocss/reset/tailwind.css';

// 2. DaisyUI base (if using DaisyUI components)
import 'daisyui/dist/base.css';

// 3. SHARED THEME (single source of truth)
import '@proofa/styles/theme.css';

// 4. UnoCSS generated utilities
import 'virtual:uno.css';

// 5. Dashboard-specific styles (resets, forms, tables)
import './index.css';
```

**Why this order matters:**
1. Reset first (normalize browsers)
2. Theme variables before utilities (utilities reference theme)
3. UnoCSS utilities before index.css (allow overrides if needed)
4. Dashboard styles last (override if necessary)

---

## Shortcut Guidelines

### When to Create a Shortcut

**Create a shortcut if:**
- Pattern used 3+ times across codebase
- Pattern has 5+ utility classes
- Pattern is semantically meaningful (e.g., `card`, `btn-primary`)
- You want to enforce consistency

**Use inline utilities if:**
- Pattern used 1-2 times only
- Simple (1-2 utilities)
- Unique to specific component

### Shortcut Naming Convention

```typescript
// Component patterns
'card', 'card-header', 'card-body', 'card-title'

// State variants
'btn-primary', 'btn-secondary', 'btn-danger'
'badge-success', 'badge-warning', 'badge-danger'

// Size variants
'btn-sm', 'avatar-sm'

// Layout patterns
'page-header', 'section-header', 'sidebar-nav'

// Domain-specific
'project-card', 'stat-card', 'integration-card'
```

---

## Benefits of This Architecture

### 1. Single Source of Truth
- Change theme colors once → updates everywhere
- No duplication across dashboards
- Easy to add new dashboards (auto-inherit theme)

### 2. Smaller Bundle Size
- Atomic CSS = highly compressed
- Shared utilities reused across pages
- ~30-40% smaller than traditional CSS

### 3. Better Developer Experience
- Co-located styles with components
- Autocomplete for shortcuts
- Type-safe theme tokens
- No context switching between files

### 4. Consistency Guaranteed
- Shared shortcuts enforce design system
- Can't accidentally deviate from theme
- New developers follow established patterns

### 5. Maintainability
- Easy to find where styles are defined
- Change shortcut definition → updates all usages
- Clear separation of concerns

---

## Migration Pattern

### From Custom CSS to UnoCSS

**Before:**
```css
/* index.css */
.project-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}

.project-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}
```

```tsx
// Component
<div className="project-card">
  <h3>Project Name</h3>
</div>
```

**After:**
```typescript
// uno.config.ts
shortcuts: {
  'project-card': 'bg-card-bg border border-card-border rounded-xl p-5 transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-lg',
}
```

```tsx
// Component - same usage, styles from UnoCSS
<div className="project-card">
  <h3 className="project-name">Project Name</h3>
</div>
```

---

## Common Patterns

### Buttons
```tsx
<button className="btn-primary">Primary Action</button>
<button className="btn-secondary">Secondary Action</button>
<button className="btn-danger">Delete</button>
<button className="btn-ghost">Cancel</button>
<button className="btn-primary btn-sm">Small Button</button>
```

### Cards
```tsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Title</h3>
    <button className="btn-ghost">Action</button>
  </div>
  <div className="card-body">
    Content here
  </div>
</div>
```

### Forms
```tsx
<div className="form-group">
  <label className="form-label">Email</label>
  <input className="form-control" type="email" />
  <p className="form-hint">We'll never share your email</p>
</div>
```

### Stats
```tsx
<div className="stats-grid">
  <div className="stat-card">
    <div className="stat-card-header">
      <div className="stat-icon-blue">
        <Icon icon={UserIcon} />
      </div>
    </div>
    <div className="stat-value">1,234</div>
    <div className="stat-label">Total Users</div>
  </div>
</div>
```

### Loading
```tsx
<div className="loading">
  <div className="spinner" />
  <span className="loading-text">Loading...</span>
</div>
```

### Badges
```tsx
<span className="badge-success">Active</span>
<span className="badge-warning">Pending</span>
<span className="badge-danger">Failed</span>
```

---

## Testing & Verification

### Check for Old CSS Classes
```bash
# Search for potential old CSS class usage
grep -r 'className="custom-' apps/dashboard/admin/src/
grep -r 'className="my-' apps/dashboard/user/src/

# Should return minimal results (only dashboard-specific classes)
```

### Verify Import Order
```bash
# Check main.tsx files have correct import order
cat apps/dashboard/admin/src/main.tsx | grep -A5 "import.*css"
cat apps/dashboard/user/src/main.tsx | grep -A5 "import.*css"
```

### Build Check
```bash
# Ensure everything compiles
pnpm typecheck
pnpm build
```

---

## Troubleshooting

### Issue: Styles Not Applying
**Solution:** Check import order in `main.tsx`. Theme must load before UnoCSS.

### Issue: Theme Variable Not Found
**Solution:** Check if variable exists in `theme.css`. If not, add it there first, then reference in `uno.config.ts`.

### Issue: Shortcut Not Working
**Solution:** Ensure shortcut is defined in shared `uno.config.ts`, not in a component file.

### Issue: Class Name Conflicts
**Solution:** UnoCSS has higher specificity. If index.css conflicts, remove the CSS class and use shortcuts instead.

---

## Common Pitfalls

### ❌ DON'T: Duplicate Theme Variables
```css
/* ❌ WRONG - Don't redeclare in index.css */
/* apps/dashboard/admin/src/index.css */
:root {
  --primary: #6366f1; /* Already in theme.css! */
}
```

### ❌ DON'T: Component CSS in index.css
```css
/* ❌ WRONG - Use UnoCSS shortcuts instead */
.card {
  background: var(--card-bg);
  padding: 20px;
}
```

### ❌ DON'T: Mix CSS Classes and UnoCSS
```tsx
{/* ❌ WRONG - Inconsistent approach */}
<div className="custom-card flex items-center">
  {/* Don't mix custom CSS with utilities */}
</div>
```

### ❌ DON'T: Hardcode Colors
```typescript
// ❌ WRONG - Always use theme variables
shortcuts: {
  'btn-primary': 'bg-[#6366f1] text-white', // Don't hardcode!
}

// ✅ CORRECT
shortcuts: {
  'btn-primary': 'bg-primary text-white',
}
```

### ❌ DON'T: Use Native Select Elements
```tsx
{/* ❌ WRONG - Use custom dropdown component */}
<select className="form-control">
  <option>Option 1</option>
</select>

{/* ✅ CORRECT - Use Dropdown component */}
<Dropdown options={[...]} value={selected} onChange={setSelected} />
```

---

## Resources

- **Copilot Instructions**: `.github/copilot-instructions.md` (CSS and Styling Architecture section)
- **Theme File**: `apps/packages/styles/theme.css`
- **UnoCSS Config**: `apps/packages/styles/uno.config.ts` (150+ shortcuts)
- **Admin Migration Status**: `apps/dashboard/admin/UNOCSS_MIGRATION_STATUS.md`
- **User Dashboard**: `apps/dashboard/user/` (already migrated)

---

## Quick Reference

| Need | Use | Example |
|------|-----|---------|
| Add color | `theme.css` | `--primary: #6366f1;` |
| Create reusable pattern | `uno.config.ts` shortcuts | `'card': 'bg-card-bg border...'` |
| Style component | UnoCSS utilities/shortcuts | `className="card btn-primary"` |
| Complex pseudo-selector | `index.css` | `tbody tr:hover { ... }` |
| Animation | `index.css` | `@keyframes spin { ... }` |
| Native form styling | `index.css` | `input:focus { ... }` |

---

**Last Updated:** January 17, 2026  
**Status:** Architecture established and documented  
**Dashboards:** Admin (70% migrated), User (100% migrated)
