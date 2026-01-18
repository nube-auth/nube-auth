# Theming & Icon Standardization Plan

**Status**: DRAFT - Ready for Review  
**Created**: June 2025  
**Scope**: All Proofa Dashboards (Admin, User, Home, Docs)

---

## Executive Summary

This plan addresses two standardization efforts:
1. **Theme Consistency** - Replace hardcoded colors with CSS variable references
2. **Icon Library** - Standardize on HugeIcons across all dashboards

### Current State Summary

| Dashboard | Theme Violations | Inline SVGs | HugeIcons Used | Priority |
|-----------|-----------------|-------------|----------------|----------|
| **Admin** | 117+ instances | 98 | ✅ Partial | 🔴 Critical |
| **User** | 4 (Google logo) | 11 | ✅ Yes | ✅ Reference |
| **Home** | ~9 instances | 18 | ❌ No | 🟡 Medium |
| **Docs** | ~25 instances | Starlight | ❌ N/A | 🟢 Low |

---

## Part 1: Theme Standardization

### Reference: User Dashboard

The User dashboard is the clean reference implementation:
- Uses `@proofa/styles/theme.css` CSS variables
- Minimal hardcoded colors (only Google logo brand colors)
- Proper UnoCSS utility class usage

### Theme Variable Categories

From `apps/packages/styles/theme.css`:

```css
/* Background Colors */
--content-bg, --header-bg, --card-bg, --input-bg, --hover-bg

/* Border Colors */
--border-primary, --border-secondary, --border-tertiary, --card-border

/* Text Colors */
--text-primary, --text-secondary, --text-tertiary

/* Status Colors */
--success, --success-bg, --warning, --warning-bg, --error, --error-bg

/* Interactive */
--primary, --primary-hover, --primary-transparent, --accent
```

---

### Admin Dashboard - Theme Violations (🔴 Critical)

**Total: 117+ hardcoded color instances across 15+ files**

#### High Priority Files

| File | Line Range | Violations | Type |
|------|-----------|------------|------|
| [App.tsx](../apps/dashboard/admin/src/App.tsx) | 228-265 | 12+ | Dropdown styling |
| [AppDetail.tsx](../apps/dashboard/admin/src/pages/AppDetail.tsx) | 172-221 | 8+ | Gradient backgrounds |
| [AppLicenses.tsx](../apps/dashboard/admin/src/pages/AppLicenses.tsx) | 380-1177 | 25+ | Status colors, badges |
| [AppDevelopers.tsx](../apps/dashboard/admin/src/pages/AppDevelopers.tsx) | 1-177 | 15+ | Code blocks |
| [AppUsers.tsx](../apps/dashboard/admin/src/pages/AppUsers.tsx) | Various | 10+ | Table styling |
| [ProjectDetail.tsx](../apps/dashboard/admin/src/pages/ProjectDetail.tsx) | Various | 10+ | Card backgrounds |
| [Onboarding.tsx](../apps/dashboard/admin/src/pages/Onboarding.tsx) | 44-149 | 10+ | Platform icons |
| [Toast.tsx](../apps/dashboard/admin/src/components/Toast.tsx) | Various | 5+ | Status colors |

#### Violation Patterns

**1. Hardcoded Hex Colors**
```tsx
// ❌ WRONG
backgroundColor: "#0f1117"
color: "#22c55e"
border: "1px solid #333"

// ✅ CORRECT
className="bg-content-bg"
className="text-success"
className="border-border-primary"
```

**2. Hardcoded RGBA**
```tsx
// ❌ WRONG
backgroundColor: "rgba(255, 255, 255, 0.05)"
boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.5)"

// ✅ CORRECT
className="bg-white/5"  // UnoCSS opacity shorthand
className="ring-2 ring-primary/50"
```

**3. Inline Gradients**
```tsx
// ❌ WRONG
background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)"

// ✅ CORRECT - Add CSS variable or UnoCSS shortcut
// In uno.config.ts shortcuts:
'gradient-card': 'bg-gradient-to-br from-card-bg to-content-bg'
```

---

### Home Dashboard - Theme Violations (🟡 Medium)

**Total: ~9 hardcoded instances**

The Home dashboard uses its own complete theme system in `global.css` with ~750 lines of CSS variables. This is acceptable as it's a standalone marketing site.

**Minor Issues to Address:**

| File | Line | Issue |
|------|------|-------|
| [Features.astro](../apps/dashboard/home/src/sections/Features.astro) | 78 | `border-color: #4f46e5` - Use `var(--primary)` |
| [HowItWorks.astro](../apps/dashboard/home/src/sections/HowItWorks.astro) | 5-16 | Inline gradients - Consider CSS variables |
| [CTA.astro](../apps/dashboard/home/src/sections/CTA.astro) | Various | Some hardcoded accent colors |

**Recommendation**: Home's independent theme is fine for a marketing site. Only fix the ~9 inconsistencies for uniformity.

---

### Docs Dashboard - Theme Violations (🟢 Low)

**Total: ~25 hardcoded instances**

Uses Starlight framework which has its own theming system. The `custom.css` overrides are necessary.

**Acceptable Hardcoded Colors:**
- Starlight component overrides
- Syntax highlighting colors
- External link indicators

**Recommendation**: No action needed. Starlight constraints require these overrides.

---

## Part 2: Icon Standardization

### Target: HugeIcons

**Package:** `@hugeicons/react` + `@hugeicons/core-free-icons`  
**Documentation:** https://hugeicons.com/

### Icon Component Wrapper

Both Admin and User dashboards have an identical `Icon.tsx` wrapper:

```tsx
// apps/dashboard/*/src/components/Icon.tsx
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

export type IconProps = Omit<HugeiconsIconProps, "icon"> & {
  icon: IconSvgElement;
  bold?: boolean;
};

export function Icon({ icon, size = 20, strokeWidth, bold = false, color = "currentColor", ...props }: IconProps) {
  const computedStrokeWidth = strokeWidth ?? (bold ? 2.5 : 1.5);
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={computedStrokeWidth}
      color={color}
      {...props}
    />
  );
}
```

---

### Admin Dashboard - Icon Migration (🔴 Critical)

**Current State:**
- HugeIcons: ✅ Installed, used in 9 files
- Inline SVGs: ❌ 98 instances across 15+ files

#### Files Requiring Icon Migration

| File | Inline SVGs | Priority |
|------|-------------|----------|
| [AppUsers.tsx](../apps/dashboard/admin/src/pages/AppUsers.tsx) | 22 | High |
| [AppLicenses.tsx](../apps/dashboard/admin/src/pages/AppLicenses.tsx) | 15 | High |
| [ProjectDetail.tsx](../apps/dashboard/admin/src/pages/ProjectDetail.tsx) | 14 | High |
| [AppSetup.tsx](../apps/dashboard/admin/src/pages/AppSetup.tsx) | 13 | High |
| [Onboarding.tsx](../apps/dashboard/admin/src/pages/Onboarding.tsx) | 9 | Medium |
| [AppPaymentSettings.tsx](../apps/dashboard/admin/src/pages/AppPaymentSettings.tsx) | 6 | Medium |
| [InviteUserModal.tsx](../apps/dashboard/admin/src/components/InviteUserModal.tsx) | 6 | Medium |
| [Toast.tsx](../apps/dashboard/admin/src/components/Toast.tsx) | 5 | Medium |
| [ProjectApps.tsx](../apps/dashboard/admin/src/pages/ProjectApps.tsx) | 4 | Low |
| [AppOAuth.tsx](../apps/dashboard/admin/src/pages/AppOAuth.tsx) | 3 | Low |
| [AppApiKeys.tsx](../apps/dashboard/admin/src/pages/AppApiKeys.tsx) | 2 | Low |
| [Modal.tsx](../apps/dashboard/admin/src/components/Modal.tsx) | 1 | Low |
| [Select.tsx](../apps/dashboard/admin/src/components/Select.tsx) | 1 | Low |
| [ConfirmModal.tsx](../apps/dashboard/admin/src/components/ConfirmModal.tsx) | 2 | Low |
| [ProjectPaymentProviders.tsx](../apps/dashboard/admin/src/pages/ProjectPaymentProviders.tsx) | 2 | Low |

#### Common Icon Mappings

| Current SVG Pattern | HugeIcons Replacement |
|--------------------|----------------------|
| Chevron down/up | `ArrowDown01Icon` / `ArrowUp01Icon` |
| Close/X | `Cancel01Icon` |
| Check/Checkmark | `Tick01Icon` |
| Plus | `Add` |
| Settings/Gear | `Settings01` |
| Search | `Search01Icon` |
| User | `User01Icon` |
| Copy | `Copy` |
| Edit/Pencil | `Edit01Icon` |
| Trash/Delete | `Delete` |
| Eye/View | `View01Icon` |
| Warning/Alert | `Alert02Icon` |
| Info | `InformationCircleIcon` |
| Success | `CheckCircle` |
| Error | `AlertCircleIcon` |
| Download | `Download01Icon` |
| Upload | `Upload01Icon` |
| External link | `LinkSquare02Icon` |
| Refresh | `Refresh01Icon` |
| Menu | `Menu01Icon` |
| Lock | `Lock` |
| Key | `Key01Icon` |

---

### User Dashboard - Icon Status (✅ Reference)

**Current State:**
- HugeIcons: ✅ Used properly
- Inline SVGs: 11 (mostly acceptable)

**Acceptable SVGs:**
- Google OAuth logo (brand requirement)
- Platform-specific icons
- Custom illustrations

**Minor Cleanup:**
- [App.tsx](../apps/dashboard/user/src/App.tsx) lines 70-93: Navigation chevrons → HugeIcons
- [Sessions.tsx](../apps/dashboard/user/src/pages/Sessions.tsx) lines 75-82: Device icons → HugeIcons

---

### Home Dashboard - Icon Migration (🟡 Medium)

**Current State:**
- HugeIcons: ❌ Not installed
- Inline SVGs: 18 instances

**Challenge:** Home uses Astro (not React), so needs different integration approach.

#### Option A: astro-icon + SVG Sprites (Recommended for Astro)

```astro
---
// Features.astro
import { Icon } from 'astro-icon/components';
---
<Icon name="lucide:shield" />
```

#### Option B: Create SVG Component Library

Create an `icons/` folder with individual Astro icon components:

```astro
---
// src/icons/Shield.astro
const { class: className, size = 24 } = Astro.props;
---
<svg class={className} width={size} height={size} viewBox="0 0 24 24">
  <!-- path data -->
</svg>
```

**Recommendation:** For the Home marketing site, inline SVGs are acceptable for performance. If standardization is critical, use Option A with `astro-icon`.

---

### Docs Dashboard - Icon Status (🟢 Low Priority)

**Current State:** Uses Starlight's built-in icon system

**Recommendation:** No changes needed. Starlight manages its own icons.

---

## Implementation Plan

### Phase 1: Admin Theme Cleanup (Week 1-2)

**Effort:** ~4-6 hours  
**Priority:** 🔴 Critical

#### Tasks

- [ ] **1.1** Create theme variable mapping document
- [ ] **1.2** Fix [App.tsx](../apps/dashboard/admin/src/App.tsx) - Dropdown colors (12 violations)
- [ ] **1.3** Fix [AppDetail.tsx](../apps/dashboard/admin/src/pages/AppDetail.tsx) - Gradients (8 violations)
- [ ] **1.4** Fix [AppLicenses.tsx](../apps/dashboard/admin/src/pages/AppLicenses.tsx) - Status colors (25 violations)
- [ ] **1.5** Fix [AppDevelopers.tsx](../apps/dashboard/admin/src/pages/AppDevelopers.tsx) - Code blocks (15 violations)
- [ ] **1.6** Fix [AppUsers.tsx](../apps/dashboard/admin/src/pages/AppUsers.tsx) - Table styling (10 violations)
- [ ] **1.7** Fix remaining files (ProjectDetail, Onboarding, Toast, etc.)
- [ ] **1.8** Add new theme variables if needed to `theme.css`
- [ ] **1.9** Add UnoCSS shortcuts for common patterns

---

### Phase 2: Admin Icon Migration (Week 2-3)

**Effort:** ~6-8 hours  
**Priority:** 🔴 Critical

#### Tasks

- [ ] **2.1** Create icon mapping reference (inline SVG → HugeIcon)
- [ ] **2.2** Migrate [AppUsers.tsx](../apps/dashboard/admin/src/pages/AppUsers.tsx) (22 SVGs)
- [ ] **2.3** Migrate [AppLicenses.tsx](../apps/dashboard/admin/src/pages/AppLicenses.tsx) (15 SVGs)
- [ ] **2.4** Migrate [ProjectDetail.tsx](../apps/dashboard/admin/src/pages/ProjectDetail.tsx) (14 SVGs)
- [ ] **2.5** Migrate [AppSetup.tsx](../apps/dashboard/admin/src/pages/AppSetup.tsx) (13 SVGs)
- [ ] **2.6** Migrate component files (Toast, Modal, Select, etc.)
- [ ] **2.7** Migrate remaining page files
- [ ] **2.8** Update Icon.tsx if additional variants needed

---

### Phase 3: User Dashboard Polish (Week 3)

**Effort:** ~1-2 hours  
**Priority:** ✅ Low (already clean)

#### Tasks

- [ ] **3.1** Migrate navigation chevrons in App.tsx
- [ ] **3.2** Migrate device icons in Sessions.tsx
- [ ] **3.3** Review and document any intentional SVGs (brand logos)

---

### Phase 4: Home Dashboard Cleanup (Week 3-4)

**Effort:** ~2-3 hours  
**Priority:** 🟡 Medium

#### Tasks

- [ ] **4.1** Decide on icon strategy (keep inline vs astro-icon)
- [ ] **4.2** Fix 9 hardcoded color violations
- [ ] **4.3** (Optional) Create icon component library for Astro
- [ ] **4.4** Document Home's independent theme as intentional

---

### Phase 5: Documentation & Prevention (Week 4)

**Effort:** ~2 hours  
**Priority:** 🟡 Medium

#### Tasks

- [ ] **5.1** Update copilot-instructions.md with icon standards
- [ ] **5.2** Add ESLint rule to warn on inline SVGs in React files
- [ ] **5.3** Add stylelint rule to warn on hardcoded colors
- [ ] **5.4** Create CONTRIBUTING.md section on theming/icons
- [ ] **5.5** Update CSS_UNOCSS_ARCHITECTURE.md with examples

---

## Success Criteria

### Theme Standardization

- [ ] Admin dashboard: 0 hardcoded colors (excluding brand logos)
- [ ] User dashboard: Maintained as reference (4 acceptable)
- [ ] Home dashboard: ≤5 hardcoded colors (acceptable for marketing)
- [ ] All new code uses CSS variables via UnoCSS

### Icon Standardization

- [ ] Admin dashboard: 100% HugeIcons (except brand logos)
- [ ] User dashboard: 95%+ HugeIcons
- [ ] Shared Icon.tsx component documented
- [ ] Icon mapping guide available for developers

---

## Files Reference

### Theme Files

| File | Purpose |
|------|---------|
| [theme.css](../apps/packages/styles/theme.css) | Shared CSS variables |
| [uno.config.ts](../apps/packages/styles/uno.config.ts) | UnoCSS theme mapping |
| [admin/index.css](../apps/dashboard/admin/src/index.css) | Admin-specific overrides |
| [user/index.css](../apps/dashboard/user/src/index.css) | User-specific overrides |
| [home/global.css](../apps/dashboard/home/src/styles/global.css) | Home's complete theme |
| [docs/custom.css](../apps/dashboard/docs/src/styles/custom.css) | Starlight overrides |

### Icon Files

| File | Purpose |
|------|---------|
| [admin/Icon.tsx](../apps/dashboard/admin/src/components/Icon.tsx) | HugeIcons wrapper |
| [user/Icon.tsx](../apps/dashboard/user/src/components/Icon.tsx) | HugeIcons wrapper |

---

## Appendix: Color Mapping Quick Reference

### Backgrounds

| Hardcoded | Theme Variable | UnoCSS Class |
|-----------|---------------|--------------|
| `#0f1117`, `#0F1624` | `--content-bg` | `bg-content-bg` |
| `#1a1f2e`, `#1E293B` | `--card-bg` | `bg-card-bg` |
| `#2a2f3e` | `--input-bg` | `bg-input-bg` |
| `rgba(255,255,255,0.05)` | N/A | `bg-white/5` |

### Text

| Hardcoded | Theme Variable | UnoCSS Class |
|-----------|---------------|--------------|
| `#ffffff`, `#f8fafc` | `--text-primary` | `text-text-primary` |
| `#94a3b8`, `#9ca3af` | `--text-secondary` | `text-text-secondary` |
| `#64748b`, `#6b7280` | `--text-tertiary` | `text-text-tertiary` |

### Status Colors

| Hardcoded | Theme Variable | UnoCSS Class |
|-----------|---------------|--------------|
| `#22c55e`, `#10b981` | `--success` | `text-success` |
| `#ef4444`, `#f87171` | `--error` | `text-error` |
| `#f59e0b`, `#fbbf24` | `--warning` | `text-warning` |
| `#3b82f6`, `#6366f1` | `--primary` | `text-primary` |

### Borders

| Hardcoded | Theme Variable | UnoCSS Class |
|-----------|---------------|--------------|
| `#333`, `#374151` | `--border-primary` | `border-border-primary` |
| `rgba(255,255,255,0.1)` | `--border-secondary` | `border-border-secondary` |
| `rgba(255,255,255,0.06)` | `--card-border` | `border-card-border` |

---

## Review Checklist

Before implementing, confirm:

- [ ] Agree with priority ordering (Admin > Home > Docs)
- [ ] Approve Home's independent theme as acceptable
- [ ] Approve Docs Starlight constraints as acceptable
- [ ] Confirm icon strategy for Astro (Home dashboard)
- [ ] Allocate time for Phase 1-2 (critical path)

---

**Next Steps:**  
1. Review this plan
2. Approve or request changes
3. Begin Phase 1 implementation

