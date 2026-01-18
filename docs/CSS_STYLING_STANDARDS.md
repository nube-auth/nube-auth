# CSS Styling Standards & Component Patterns

## Problem Statement

Recurring issues when adding or updating UI sections:
1. **Transparent backgrounds** - Dropdowns/modals appear invisible
2. **Z-index conflicts** - Overlays don't stack correctly
3. **CSS specificity wars** - Dashboard-level CSS overrides component styles
4. **Inconsistent patterns** - Each developer implements dropdowns differently
5. **Token confusion** - Unclear when to use `bg-card-bg` vs `bg-content-bg` vs `bg-surface-secondary`

## Root Causes

### 1. No Systematic Z-Index Scale
Current state: Arbitrary z-index values (`z-50`, `z-1000`, `z-10000`)
- No clear layering hierarchy
- Conflicts when new components are added
- Hard to determine correct z-index for new elements

### 2. Missing Component Abstractions
- Every dropdown/modal implementation is custom
- No reusable base components for common patterns
- Inconsistent behavior across the app

### 3. Unclear Token Usage
- Multiple background tokens with similar names
- No documentation on when to use each
- Developers guess which token to use

### 4. Mixed Styling Approaches
- Some use inline UnoCSS utilities
- Some use CSS classes from index.css
- Some use both (anti-pattern)
- No clear guidelines

### 5. Dashboard-Level CSS Overrides ⚠️ **CRITICAL ISSUE**
**The Root Cause of Most Styling Problems**

Current state: `apps/dashboard/admin/src/index.css` contains:
- ❌ Component classes (`.card`, `.btn`, `.badge`, `.modal`)
- ❌ Layout classes (`.sidebar`, `.sidebar-nav`, `.app-layout`)
- ❌ Utility classes (`.flex`, `.gap-2`, `.text-sm`)
- ❌ Form element styles (`input`, `select`, `textarea`)
- ❌ Dropdown/modal implementations

**Why this is a problem:**
1. **Specificity wars** - CSS specificity overrides UnoCSS utilities
2. **Duplication** - Same styles exist in both CSS and UnoCSS
3. **Inconsistency** - Some components use CSS classes, others use utilities
4. **Maintenance nightmare** - Need to update in multiple places
5. **No theme awareness** - Hard-coded styles don't respond to theme changes
6. **Hidden bugs** - New UnoCSS utilities get overridden silently

**Example of the problem:**
```tsx
// Developer writes this (expecting UnoCSS):
<div className="bg-content-bg border border-card-border">

// But CSS in index.css overrides it:
input { border: 1px solid rgba(255, 255, 255, 0.1); }  // ← Overrides UnoCSS!
```

**Correct approach:**
- Dashboard-level CSS should be **nearly empty**
- Only contain: global resets, font imports, base typography (optional)
- All styling must be via UnoCSS utilities

## Solution: Comprehensive Design System

### Phase 1: Token Clarification (Immediate)

#### Background Token Reference

```typescript
// ====== BACKGROUND TOKENS - QUICK REFERENCE ======

// 🎨 MAIN SURFACES (Light/Dark Theme Aware)
--content-bg       // Page background (canvas)
--card-bg          // Card/panel backgrounds  
--surface-secondary // Elevated surface (icons, selections)
--surface-hover    // Hover states

// 🔲 BORDERS
--card-border       // Default borders
--card-hover-border // Hover state borders
--sidebar-border    // Sidebar specific

// 📝 TEXT COLORS
--text-primary      // Main text
--text-secondary    // Supporting text
--text-tertiary     // Muted text

// 🎯 STATUS COLORS (Use for badges/alerts, NOT icon containers)
--success-bg / --success-text
--warning-bg / --warning-text
--danger-bg / --danger-text
--info-bg / --info-text

// 🚫 NEVER USE FOR ICON CONTAINERS
bg-primary/10  ❌ Hides primary icons
bg-success/10  ❌ Hides green icons
bg-info/10     ❌ Hides blue icons
bg-warning/10  ❌ Hides yellow icons
```

#### Decision Tree for Background Selection

```
┌─ Question: What am I styling?
│
├─ Page/App Background
│  └─ Use: bg-content-bg
│
├─ Card/Panel
│  └─ Use: bg-card-bg
│
├─ Icon Container (with colored icon)
│  └─ Use: bg-surface-secondary (neutral, works with any icon color)
│
├─ Dropdown Menu
│  └─ Use: bg-content-bg (matches page background)
│
├─ Modal Background
│  └─ Use: bg-card-bg (elevated surface)
│
├─ Status Badge/Alert
│  └─ Use: bg-{status}/10 (e.g., bg-success/10)
│  └─ Note: This is OK because it contains text, not icons
│
├─ Hover State
│  └─ Use: bg-surface-hover
│
└─ Selected State (in list)
   └─ Use: bg-surface-secondary
```

### Phase 2: Z-Index System (Immediate)

```css
/* ==========================================================================
   Z-Index Scale - Add to theme.css
   ========================================================================== */

:root {
  /* Base layers (0-9) */
  --z-base: 0;
  
  /* Content layers (10-19) */
  --z-dropdown: 10;
  --z-sticky: 15;
  
  /* Navigation (20-29) */
  --z-header: 20;
  --z-sidebar: 25;
  
  /* Overlays (30-39) */
  --z-overlay: 30;
  --z-modal-backdrop: 35;
  
  /* Modals/Dialogs (40-49) */
  --z-modal: 40;
  --z-popover: 45;
  
  /* Notifications/Alerts (50-59) */
  --z-toast: 50;
  --z-tooltip: 55;
  
  /* Critical UI (60+) */
  --z-loading: 60;
}
```

**Usage Example:**
```tsx
// ❌ WRONG - Arbitrary z-index
<div className="fixed inset-0 z-[999]">

// ✅ CORRECT - Semantic z-index
<div className="fixed inset-0" style={{ zIndex: 'var(--z-modal-backdrop)' }}>
```

### Phase 3: Component Abstractions (High Priority)

#### 3.1 Dropdown Component

```tsx
// packages/react/src/components/Dropdown.tsx
import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'left', className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0" 
            style={{ zIndex: 'var(--z-overlay)' }}
            onClick={() => setIsOpen(false)} 
          />

          {/* Dropdown Menu */}
          <div 
            className={`absolute mt-2 bg-content-bg border border-card-border rounded-lg shadow-xl overflow-hidden ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
            style={{ zIndex: 'var(--z-dropdown)' }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

// Usage:
<Dropdown 
  trigger={<button>Open Menu</button>}
>
  <div className="py-2">
    <button className="w-full px-4 py-2 text-left hover:bg-surface-hover">
      Option 1
    </button>
    <button className="w-full px-4 py-2 text-left hover:bg-surface-hover">
      Option 2
    </button>
  </div>
</Dropdown>
```

#### 3.2 Modal Component

```tsx
// packages/react/src/components/Modal.tsx
import React from 'react';
import { X01Icon } from '@hugeicons/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-400px',
    md: 'max-w-600px',
    lg: 'max-w-1100px',
    xl: 'max-w-[1400px]',
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60"
        style={{ zIndex: 'var(--z-modal-backdrop)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-8"
        style={{ zIndex: 'var(--z-modal)' }}
      >
        <div 
          className={`bg-card-bg rounded-xl w-full ${widthClasses[maxWidth]} max-h-[calc(100vh-64px)] overflow-y-auto shadow-2xl border border-card-border`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-8 py-6 border-b border-card-border">
              <h2 className="text-18px font-semibold text-text-primary">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-content-bg text-text-secondary hover:text-text-primary transition-all"
              >
                <X01Icon size={20} />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

// Usage:
<Modal 
  isOpen={showModal} 
  onClose={() => setShowModal(false)}
  title="Edit Project"
  maxWidth="md"
>
  <form>
    {/* Form content */}
  </form>
</Modal>
```

#### 3.3 IconContainer Component

```tsx
// packages/react/src/components/IconContainer.tsx
import React from 'react';
import type { IconSvgElement } from '@hugeicons/react';
import { Icon } from './Icon';

interface IconContainerProps {
  icon: IconSvgElement;
  size?: number;
  iconSize?: number;
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'neutral';
  className?: string;
}

export function IconContainer({ 
  icon, 
  size = 40, 
  iconSize = 20,
  variant = 'neutral',
  className = '' 
}: IconContainerProps) {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info',
    neutral: 'text-text-secondary',
  };

  return (
    <div 
      className={`bg-surface-secondary rounded-md flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon 
        icon={icon} 
        size={iconSize} 
        className={colorClasses[variant]}
      />
    </div>
  );
}

// Usage:
<IconContainer 
  icon={DatabaseIcon} 
  variant="primary" 
  size={44}
  iconSize={24}
/>
```

### Phase 4: Dashboard CSS Cleanup (CRITICAL - DO FIRST)

#### 4.1 What Stays in Dashboard-Level index.css

**ONLY the following should exist in `apps/dashboard/*/src/index.css`:**

```css
/* ==========================================================================
   Dashboard-Specific Styles
   Theme variables come from @proofa/styles/theme.css
   
   ⚠️ DO NOT ADD:
   - Component classes (.card, .button, .modal)
   - Layout classes (.sidebar, .main-content)
   - Utility classes (.flex, .gap-2, .text-center)
   - Element styles (input, select, button)
   
   ✅ ONLY INCLUDE:
   - Global resets (*, body, html)
   - Font imports (@font-face)
   - Base typography (h1-h6, p, a) - OPTIONAL
   ========================================================================== */

/* Global Reset */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Font Import (if dashboard-specific) */
@font-face {
  font-family: 'CustomFont';
  src: url('./fonts/custom.woff2') format('woff2');
}

/* Base Document */
html {
  min-height: 100%;
  background: var(--content-bg);
}

body {
  min-height: 100%;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--content-bg);
  color: var(--text-primary);
  line-height: 1.5;
}

#root {
  min-height: 100vh;
  background: var(--content-bg);
}

/* Base Typography (OPTIONAL - can be removed if using UnoCSS) */
h1 { font-size: 2rem; font-weight: 700; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.25rem; font-weight: 600; }
p { margin-bottom: 1rem; }
a { color: var(--text-link); text-decoration: none; }
a:hover { text-decoration: underline; }

/* End of file - NOTHING ELSE */
```

**That's it! Everything else must be UnoCSS utilities or shortcuts.**

#### 4.2 Migration Strategy

**Step 1: Audit current index.css**
```bash
# Find all CSS classes defined in dashboard index.css
grep -E "^\.([-a-z]+)" apps/dashboard/admin/src/index.css

# You'll find hundreds of classes like:
# .sidebar
# .card
# .btn
# .badge
# .form-control
# etc.
```

**Step 2: For each CSS class, choose action:**

| Current CSS Class | Action | New Pattern |
|-------------------|--------|-------------|
| `.sidebar` | Delete → UnoCSS | `className="w-260px bg-sidebar-bg border-r border-sidebar-border..."` |
| `.card` | Delete → UnoCSS shortcut | `className="card"` (defined in uno.config.ts) |
| `.btn-primary` | Delete → UnoCSS shortcut | `className="btn-primary"` (defined in uno.config.ts) |
| `input[type="text"]` | Delete → UnoCSS | `className="form-control"` (shortcut) |
| `.sidebar-link` | Delete → UnoCSS | `className="sidebar-link"` (shortcut) |
| `*, *::before` | KEEP | Global reset required |
| `body` | KEEP | Base document setup |

**Step 3: Update uno.config.ts shortcuts**

Move complex patterns to shortcuts instead of CSS:

```typescript
// uno.config.ts
shortcuts: {
  // Complex sidebar pattern (was in CSS)
  "sidebar": "w-260px bg-sidebar-bg border-r border-sidebar-border flex flex-col fixed top-0 left-0 bottom-0 z-50",
  
  // Form controls (was in CSS as input[type='text'])
  "form-control": "w-full px-3.5 py-2.5 text-13px border border-card-border rounded-md bg-card-bg text-text-primary transition-all focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10",
  
  // Keep all common patterns as shortcuts
}
```

**Step 4: Update components to use UnoCSS**

```tsx
// ❌ BEFORE (using CSS class from index.css)
<div className="sidebar">
  <div className="sidebar-header">
    {/* ... */}
  </div>
</div>

// ✅ AFTER (using UnoCSS shortcut)
<div className="sidebar">  {/* shortcut defined in uno.config.ts */}
  <div className="sidebar-header">  {/* shortcut defined in uno.config.ts */}
    {/* ... */}
  </div>
</div>

// ✅ OR: Pure utilities (for simple cases)
<div className="w-260px bg-sidebar-bg border-r border-sidebar-border flex flex-col fixed top-0 left-0 bottom-0 z-50">
  <div className="h-61px px-5 flex items-center border-b border-sidebar-border">
    {/* ... */}
  </div>
</div>
```

#### 4.3 Benefits of This Approach

**Before (with dashboard-level CSS):**
- 2000+ lines of CSS per dashboard
- Styles defined in 2 places (CSS + UnoCSS)
- Specificity conflicts
- Hard to know which styles apply
- Difficult to override

**After (UnoCSS only):**
- ~50 lines of CSS per dashboard (resets only)
- Single source of truth (UnoCSS)
- No specificity issues
- Clear what styles apply (read className)
- Easy to override (just change className)

**Example of clarity improvement:**

```tsx
// ❌ BEFORE: What styles does this have?
<input type="text" className="border-primary" />
// Hidden: CSS defines base styles, UnoCSS adds border-primary
// Actual result: ???

// ✅ AFTER: All styles visible
<input className="form-control border-primary" />
// Clear: form-control shortcut + border override
// Actual result: Predictable!
```

### Phase 5: UnoCSS Shortcuts Update

Add to `uno.config.ts`:

```typescript
shortcuts: {
  // Dropdown patterns
  "dropdown-menu": "bg-content-bg border border-card-border rounded-lg shadow-xl overflow-hidden",
  "dropdown-item": "w-full px-4 py-2.5 text-left text-13px text-text-primary hover:bg-surface-hover transition-all cursor-pointer",
  "dropdown-divider": "border-t border-card-border my-1",
  
  // Modal patterns
  "modal-backdrop": "fixed inset-0 bg-black/60 flex items-center justify-center p-8",
  "modal-content": "bg-card-bg rounded-xl shadow-2xl border border-card-border",
  "modal-header": "flex items-center justify-between px-8 py-6 border-b border-card-border",
  "modal-body": "p-8",
  "modal-footer": "flex items-center justify-end gap-3 px-8 py-6 border-t border-card-border",
  
  // Icon container (ALWAYS use this for colored icons)
  "icon-container": "bg-surface-secondary rounded-md flex items-center justify-center",
  "icon-container-sm": "icon-container w-8 h-8",
  "icon-container-md": "icon-container w-10 h-10",
  "icon-container-lg": "icon-container w-12 h-12",
}
```

### Phase 5: Migration Checklist

For any new UI section, follow this checklist:

#### Before Implementation
- [ ] Identify which tokens to use (refer to Decision Tree)
- [ ] Check if reusable component exists (Dropdown, Modal, IconContainer)
- [ ] Determine correct z-index layer (use CSS variables)

#### During Implementation
- [ ] Use only UnoCSS utilities in `className`
- [ ] No CSS classes in `index.css` for components
- [ ] Use semantic z-index variables, not arbitrary numbers
- [ ] Use `bg-surface-secondary` for all icon containers with colored icons
- [ ] Use `bg-content-bg` for dropdowns
- [ ] Use `bg-card-bg` for modals and elevated surfaces

#### After Implementation
- [ ] Test in both light and dark themes
- [ ] Verify dropdown backdrop closes on click
- [ ] Verify correct z-index stacking
- [ ] Check icon visibility against all background colors
- [ ] Verify hover states work correctly

### Phase 6: Code Review Guidelines

#### Automatic Rejection Criteria

```typescript
// ❌ REJECT: Arbitrary z-index
<div className="z-[999]">

// ❌ REJECT: Component CSS class in dashboard index.css
// apps/dashboard/admin/src/index.css:
.custom-dropdown { background: #fff; border: 1px solid #ccc; }
// → Should be UnoCSS shortcut in uno.config.ts instead

// ❌ REJECT: Element styles in dashboard index.css
input { border: 1px solid var(--border); }
// → Should be className="form-control" (UnoCSS shortcut)

// ❌ REJECT: Colored semi-transparent background on icon container
<div className="bg-primary/10">
  <Icon className="text-primary" />
</div>

// ❌ REJECT: Direct process.env access
const apiKey = process.env.API_KEY;

// ❌ REJECT: Inconsistent dropdown implementation
// (Should use Dropdown component)

// ❌ REJECT: Mixed CSS + UnoCSS for same element
// index.css:
.sidebar { width: 260px; }
// Component:
<div className="sidebar bg-sidebar-bg">  // ← Mixing!
```

#### Required Patterns

```typescript
// ✅ APPROVE: Semantic z-index
<div style={{ zIndex: 'var(--z-modal)' }}>

// ✅ APPROVE: UnoCSS shortcut (no CSS in index.css)
// uno.config.ts:
shortcuts: {
  "sidebar": "w-260px bg-sidebar-bg border-r border-sidebar-border..."
}
// Component:
<div className="sidebar">

// ✅ APPROVE: Pure UnoCSS utilities (simple cases)
<div className="w-260px bg-sidebar-bg border-r border-sidebar-border">

// ✅ APPROVE: Minimal dashboard CSS (resets only)
// index.css:
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; background: var(--content-bg); }

// ✅ APPROVE: Neutral background for icon container
<div className="bg-surface-secondary">
  <Icon className="text-primary" />
</div>

// ✅ APPROVE: UnoCSS utilities only
<div className="bg-content-bg border border-card-border rounded-lg">

// ✅ APPROVE: Config-based env access
import { env } from './config/env';
const apiKey = env.API_KEY;
```

## Implementation Timeline

### Week 1: Dashboard CSS Cleanup (PRIORITY 1)
**Goal: Remove all component classes from dashboard index.css**

- [ ] **Day 1-2**: Audit admin dashboard index.css
  - [ ] List all CSS classes/selectors
  - [ ] Categorize: Keep vs Delete vs Move to UnoCSS
  - [ ] Document migration plan

- [ ] **Day 3-4**: Move to UnoCSS shortcuts
  - [ ] Add complex patterns to uno.config.ts shortcuts
  - [ ] Update components to use shortcuts
  - [ ] Test in dev environment

- [ ] **Day 5**: Clean up index.css
  - [ ] Delete all component/layout/utility classes
  - [ ] Keep only: resets, fonts, base document setup
  - [ ] Verify no regressions

**Expected Result:**
```css
/* apps/dashboard/admin/src/index.css */
/* Before: 2000+ lines */
/* After: ~50 lines (90% reduction) */
```

### Week 2: Foundation & Standards
- [ ] Add z-index variables to `theme.css`
- [ ] Document background token usage (✅ Done - this file)
- [ ] Create IconContainer component
- [ ] Update UnoCSS shortcuts with new patterns

### Week 3: Core Components
- [ ] Create Dropdown component
- [ ] Create Modal component
- [ ] Write component documentation
- [ ] Add to `@proofa/react` package

### Week 4: Migration & Enforcement
- [ ] Migrate IconPicker to use new patterns
- [ ] Migrate project selector dropdown
- [ ] Migrate all modals to Modal component
- [ ] Repeat cleanup for user dashboard

### Week 5: Enforcement & Documentation
- [ ] Add ESLint rules for anti-patterns
- [ ] Create automated checks for index.css bloat
- [ ] Update PR template with checklist
- [ ] Conduct team training session

## ESLint Rules (Automated Enforcement)

Add to `.eslintrc.js`:

```javascript
module.exports = {
  rules: {
    // Prevent CSS class definitions in component files
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^\\.(\\w+-?)+$/]',
        message: 'Do not define CSS classes in index.css. Use UnoCSS utilities or shortcuts instead.',
      },
    ],
  },
};
```

Create a pre-commit check:

```bash
#!/bin/bash
# scripts/check-dashboard-css.sh

# Count lines in dashboard CSS (excluding comments/whitespace)
lines=$(grep -v '^[[:space:]]*$' apps/dashboard/admin/src/index.css | grep -v '^[[:space:]]*/\*' | wc -l)

if [ "$lines" -gt 100 ]; then
  echo "❌ Dashboard CSS exceeds 100 lines ($lines lines)"
  echo "⚠️  Component classes should be UnoCSS shortcuts, not CSS"
  echo "📖 See docs/CSS_STYLING_STANDARDS.md"
  exit 1
fi

echo "✅ Dashboard CSS is minimal ($lines lines)"
```
- [ ] Update PR template with checklist
- [ ] Conduct team training session

## Quick Reference Card

Print and keep visible:

```
┌────────────────────────────────────────────────┐
│  PROOFA STYLING QUICK REFERENCE                │
├────────────────────────────────────────────────┤
│                                                │
│  BACKGROUNDS:                                  │
│  ┌──────────────────────────────────────────┐ │
│  │ Page        → bg-content-bg              │ │
│  │ Card        → bg-card-bg                 │ │
│  │ Dropdown    → bg-content-bg              │ │
│  │ Modal       → bg-card-bg                 │ │
│  │ Icon Box    → bg-surface-secondary       │ │
│  │ Hover       → bg-surface-hover           │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Z-INDEX:                                      │
│  ┌──────────────────────────────────────────┐ │
│  │ Dropdown    → var(--z-dropdown)   [10]  │ │
│  │ Overlay     → var(--z-overlay)    [30]  │ │
│  │ Modal       → var(--z-modal)      [40]  │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  COMPONENTS:                                   │
│  ┌──────────────────────────────────────────┐ │
│  │ <Dropdown>        → Menus               │ │
│  │ <Modal>           → Dialogs             │ │
│  │ <IconContainer>   → Icon boxes          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  DASHBOARD CSS (index.css):                   │
│  ┌──────────────────────────────────────────┐ │
│  │ ✅ Global resets (*, body, html)        │ │
│  │ ✅ Font imports (@font-face)            │ │
│  │ ✅ Base document setup                  │ │
│  │ ❌ NO component classes (.card, .btn)   │ │
│  │ ❌ NO layout classes (.sidebar)         │ │
│  │ ❌ NO element styles (input, select)    │ │
│  │                                          │ │
│  │ Goal: < 100 lines per dashboard         │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  NEVER:                                        │
│  ┌──────────────────────────────────────────┐ │
│  │ ❌ bg-primary/10 on icon containers      │ │
│  │ ❌ Arbitrary z-index (z-[999])           │ │
│  │ ❌ CSS classes in dashboard index.css    │ │
│  │ ❌ input { } styles in dashboard CSS     │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

## Next Steps (PRIORITIZED)

### IMMEDIATE (Do Today)
1. **Audit admin dashboard CSS** (30 minutes)
   ```bash
   # Count current lines
   wc -l apps/dashboard/admin/src/index.css
   
   # List all CSS selectors
   grep -E "^\.([-a-z]+)|^(input|select|button|textarea)" apps/dashboard/admin/src/index.css | head -50
   ```

2. **Create minimal index.css template** (15 minutes)
   - Copy the "What Stays" section from Phase 4.1 above
   - Prepare as `index.minimal.css` for reference

### THIS WEEK (Priority 1)
3. **Start CSS cleanup for admin dashboard** (2-3 days)
   - Move complex patterns to UnoCSS shortcuts
   - Update components to use shortcuts
   - Delete component classes from index.css
   - **Target: < 100 lines in index.css**

4. **Add z-index variables** to theme.css (5 minutes)

5. **Document current state vs target state** (30 minutes)
   - Take screenshots before/after
   - Measure: CSS lines, bundle size, specificity conflicts

### NEXT WEEK (Priority 2)
6. **Create reusable components** in `@proofa/react`
   - IconContainer (Day 1)
   - Dropdown (Day 2)
   - Modal (Day 3)

7. **Migrate existing UI** to use new patterns
   - IconPicker → use IconContainer
   - Project selector → use Dropdown
   - All modals → use Modal component

### ONGOING (Enforcement)
8. **Add automated checks**
   - Pre-commit hook for CSS line count
   - ESLint rule for CSS classes
   - PR template checklist

9. **Team alignment**
   - Share this document
   - Quick training session (30 min)
   - Update contributor guidelines

## Questions for Discussion

1. ✅ **Should we have dashboard-level CSS at all?**
   - **Answer: YES, but minimal (<100 lines)**
   - Only for: resets, fonts, base document setup
   - Everything else → UnoCSS utilities/shortcuts

2. Should we enforce this via ESLint rules?
   - **Recommendation: YES** (automated checks prevent regressions)

3. Do we need additional component abstractions?
   - **Start with: Dropdown, Modal, IconContainer**
   - Add others as patterns emerge (Toast, Alert, etc.)

4. Timeline for migrating existing code vs just new code?
   - **New code: Immediately** (use new patterns)
   - **Existing code: Gradually** (as touched during features)
   - **Target: 80% migrated in 4 weeks**

## Success Metrics

**Before (Current State):**
- Dashboard CSS: ~2000 lines per dashboard
- Styling in 3 places: CSS + UnoCSS + inline styles
- Specificity conflicts: frequent
- New developer onboarding: confusing
- Debugging time: high

**After (Target State):**
- Dashboard CSS: <100 lines per dashboard
- Styling in 1 place: UnoCSS (utilities + shortcuts)
- Specificity conflicts: none
- New developer onboarding: clear patterns
- Debugging time: low (all styles visible in className)

**Measure:**
```bash
# Before
wc -l apps/dashboard/admin/src/index.css
# Expected: ~2000 lines

# After
wc -l apps/dashboard/admin/src/index.css
# Target: <100 lines

# Savings: 95% reduction in CSS
```

---

**Status**: Proposal → **APPROVED FOR IMPLEMENTATION**  
**Created**: January 2026  
**Owner**: Engineering Team  
**Priority**: P0 (Blocking future feature work)  
**Next Action**: Start CSS audit today
