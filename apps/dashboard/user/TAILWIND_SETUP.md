# User Dashboard Tailwind Setup Documentation

## Overview

The user dashboard uses **Tailwind CSS v4** with a sophisticated theming system that combines:
- **Tailwind v4** - The core utility framework with Vite plugin integration
- **Selia Design System** - A modern component design system with pre-built tokens
- **Tech Minimal Theme** - Custom color overrides providing a monochrome aesthetic with blue accents

This document explains how these three systems work together to generate the final styling.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Entry Point (main.tsx)                   │
│                   imports ./styles.css                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   styles.css (Layer 1)                       │
│  • Imports Tailwind v4 base (@import "tailwindcss")         │
│  • Imports Selia utilities (selia.css)                      │
│  • Imports Selia theme defaults (selia-theme.css)           │
│  • Imports Tech Minimal overrides (theme.css)               │
│  • Maps CSS variables to Tailwind utilities (@theme)        │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────────┬─────────────┬───────────────┐
│   Selia      │    Selia    │ Tech Minimal  │
│  Utilities   │   Theme     │    Theme      │
│  (Layer 2)   │  (Layer 3)  │   (Layer 4)   │
└──────────────┴─────────────┴───────────────┘
        │            │            │
        └────────────┼────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Final Compiled CSS    │
        │  with utility classes  │
        └────────────────────────┘
```

---

## Starting Point: The Entry Files

### 1. **main.tsx** - The Application Entry Point

**Location**: [apps/dashboard/user/src/main.tsx](./src/main.tsx)

```tsx
import "./styles.css";  // ← This is where styling starts
```

The main.tsx file imports `styles.css`, which is the primary entry point for all styling.

### 2. **vite.config.ts** - Build Configuration

**Location**: [apps/dashboard/user/vite.config.ts](./vite.config.ts)

```typescript
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwind({
      content: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "../../packages/components/src/**/*.{js,ts,jsx,tsx}",
      ],
    }),
  ],
});
```

**Key Points**:
- Uses Tailwind v4's Vite plugin (`@tailwindcss/vite`)
- Scans files for class names in both the dashboard and shared components package
- No traditional `tailwind.config.ts` theme configuration needed (CSS-based instead)

### 3. **tailwind.config.ts** - Minimal Configuration

**Location**: [apps/dashboard/user/tailwind.config.ts](./tailwind.config.ts)

```typescript
const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/components/src/**/*.{ts,tsx}',
  ],
  plugins: [],
};
```

**Key Points**:
- Minimal config file (Tailwind v4 uses CSS-based configuration)
- Just defines content paths - no theme.extend needed
- Colors and design tokens come from CSS variables instead

---

## Layer 1: Main Stylesheet (styles.css)

**Location**: [apps/dashboard/user/src/styles.css](./src/styles.css)

This is the **orchestrator** that imports everything in the correct order:

```css
/* 1. Import Tailwind v4 core */
@import "tailwindcss";

/* 2. Import Selia custom utilities */
@import "@proofa/components/styles/selia.css";

/* 3. Import Selia theme defaults (base design tokens) */
@import "@proofa/components/selia-theme.css";

/* 4. Import Tech Minimal theme overrides (custom colors) */
@import "@proofa/components/theme.css";

/* 5. Map CSS variables to Tailwind utilities */
@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-card: var(--card);
  /* ... and many more */
}
```

### Import Order Explained

1. **@import "tailwindcss"** - Loads Tailwind v4 base styles
2. **Selia utilities** - Custom utility classes (spinners, custom spacing, etc.)
3. **Selia theme** - Default design tokens (neutral colors in OKLCH format)
4. **Tech Minimal theme** - Overrides Selia defaults with custom colors
5. **@theme directive** - Maps CSS variables to Tailwind utility classes

The **order matters** because later imports override earlier ones.

---

## Layer 2: Selia Custom Utilities

**Location**: [apps/packages/components/src/styles/selia.css](../../packages/components/src/styles/selia.css)

Defines custom Tailwind v4 utilities that aren't in core Tailwind:

```css
/* Custom variant for dark mode */
@custom-variant dark (&:where(.dark, .dark *));

/* Spinner backgrounds */
@utility bg-spinner {
  background-image: var(--spinner-light);
  background-repeat: no-repeat;
  background-position: center;
}

/* Custom fractional spacing */
@utility size-3.5 {
  width: calc(var(--spacing) * 3.5);
  height: calc(var(--spacing) * 3.5);
}

/* More custom utilities... */
```

**What This Provides**:
- Custom size utilities (size-3.5, size-4.5, etc.)
- Spinner backgrounds (bg-spinner, bg-spinner-dark)
- Chevron icons (bg-chevron-right, bg-chevron-down)
- Inset shadow utilities (inset-shadow-xs, inset-shadow-2xs)

---

## Layer 3: Selia Theme Defaults

**Location**: [apps/packages/components/selia-theme.css](../../packages/components/selia-theme.css)

Default design tokens from the Selia design system:

```css
:root {
  --background: oklch(1 0 0);           /* Pure white */
  --foreground: oklch(0.2036 0.0029 247.97);  /* Near black */
  --primary: oklch(0.5784 0.2057 262.95);     /* Purple-blue */
  --card: oklch(1 0 0);                 /* White */
  --border: oklch(0.915 0.0024 247.85); /* Light gray */
  /* ... many more tokens */
}

.dark {
  --background: oklch(0.2036 0.0029 247.97);  /* Dark background */
  --foreground: oklch(0.977 0.0007 247.83);   /* Light text */
  /* ... dark mode tokens */
}
```

**What This Provides**:
- Base color palette using modern OKLCH color space
- Semantic tokens (primary, secondary, danger, success, etc.)
- Component-specific tokens (card, popover, dialog, etc.)
- Radius variables (--radius, --radius-sm, --radius-lg, etc.)
- Dark mode variants

---

## Layer 4: Tech Minimal Theme (Custom Overrides)

**Location**: [apps/packages/components/theme.css](../../packages/components/theme.css)

**Color Philosophy**: "Tech Minimal" - Refined monochrome with single blue accent

```css
:root {
  /* Tech Minimal: Monochrome blacks/grays with blue accent */
  --primary: #18181B;           /* Almost black */
  --primary-hover: #09090B;     /* Pure black */
  --text-link: #3B82F6;         /* Blue accent */

  /* Unified light neutral background */
  --sidebar-bg: #FAFAFA;
  --content-bg: #FAFAFA;
  --card-bg: #FEFEFE;

  /* Text hierarchy: black → gray → light gray */
  --text-primary: #18181B;
  --text-secondary: #52525B;
  --text-tertiary: #A1A1AA;

  /* Overrides Selia's purple primary with black */
  /* Overrides Selia's component tokens with our colors */
}

.dark {
  /* Tech Minimal Dark: Inverted monochrome */
  --primary: #FAFAFA;           /* Light for dark bg */
  --text-link: #60A5FA;         /* Lighter blue */

  /* Deep black backgrounds */
  --sidebar-bg: #09090B;
  --content-bg: #09090B;
  --card-bg: #18181B;

  /* Inverted text hierarchy */
  --text-primary: #FAFAFA;
  --text-secondary: #D4D4D8;
  --text-tertiary: #A1A1AA;
}
```

**What This Does**:
- **Overrides** Selia's purple primary with monochrome blacks/grays
- Provides a consistent "Tech Minimal" aesthetic
- Defines both light and dark mode variants
- Maps to Selia component tokens for compatibility

---

## The @theme Directive: CSS Variables → Tailwind Utilities

In [styles.css](./src/styles.css:14-48):

```css
@theme {
  /* This generates: bg-background, text-background, border-background */
  --color-background: var(--background);

  /* This generates: bg-primary, text-primary, border-primary */
  --color-primary: var(--primary);

  /* This generates: bg-card, text-card, border-card */
  --color-card: var(--card);

  /* And so on... */
}
```

### How It Works

Tailwind v4's `@theme` directive creates utility classes from CSS variables:

| CSS Variable | Generated Utilities |
|--------------|-------------------|
| `--color-primary` | `bg-primary`, `text-primary`, `border-primary`, `outline-primary` |
| `--color-card` | `bg-card`, `text-card`, `border-card` |
| `--color-danger` | `bg-danger`, `text-danger`, `border-danger` |

### Example Usage in Components

```tsx
// Uses --color-primary from @theme
<button className="bg-primary text-white">
  Click me
</button>

// Uses --color-card from @theme
<div className="bg-card border border-card-border">
  Card content
</div>
```

---

## Complete Flow: From CSS Variable to Rendered Style

Let's trace how a `text-primary` class gets its final color:

### Light Mode Flow

```
1. Component uses class:
   <h1 className="text-primary">Title</h1>

2. @theme directive maps it:
   --color-primary: var(--primary)

3. theme.css defines --primary:
   :root {
     --primary: #18181B;  /* Almost black */
   }

4. Final computed style:
   color: #18181B;
```

### Dark Mode Flow

```
1. Component uses class:
   <h1 className="text-primary">Title</h1>

2. @theme directive maps it:
   --color-primary: var(--primary)

3. theme.css defines --primary for dark mode:
   .dark {
     --primary: #FAFAFA;  /* Light for dark bg */
   }

4. When <html class="dark"> is set:
   color: #FAFAFA;
```

---

## Dark Mode Implementation

### How Dark Mode Works

1. **CSS Variables**: All colors defined in `:root` (light) and `.dark` (dark)
2. **Class Toggle**: Adding/removing `dark` class on root element switches theme
3. **Auto Detection**: Media query detects system preference

### In [theme.css](../../packages/components/theme.css:203-274):

```css
/* Manual dark mode via class */
.dark {
  --primary: #FAFAFA;
  --background: #18181B;
  /* ... */
}

/* Auto dark mode detection */
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --primary: #FAFAFA;
    --background: #18181B;
    /* ... */
  }
}
```

### Switching Themes in Code

```tsx
// Toggle dark mode
document.documentElement.classList.toggle('dark');

// Set dark mode
document.documentElement.classList.add('dark');

// Set light mode
document.documentElement.classList.remove('dark');
document.documentElement.classList.add('light');
```

---

## Dashboard-Specific Styles (index.css)

**Location**: [apps/dashboard/user/src/index.css](./src/index.css)

Custom styles specific to the user dashboard layout:

```css
/* Layout components */
.app-layout { /* ... */ }
.top-header { /* ... */ }
.main-content { /* ... */ }

/* Dashboard-specific components */
.info-grid { /* ... */ }
.profile-header { /* ... */ }
.tabs { /* ... */ }

/* Uses CSS variables from theme */
background: var(--content-bg);
color: var(--text-primary);
border: 1px solid var(--border);
```

**Key Points**:
- Uses CSS variables defined in theme.css
- Provides layout-specific styles that don't map well to utilities
- Handles complex selectors (`.info-list-label span:first-child`)
- Auto-adapts to dark mode via CSS variables

---

## Component Integration: LoginCard Example

**Location**: [apps/dashboard/user/src/pages/Login.tsx](./src/pages/Login.tsx:119-147)

```tsx
import {
  Button,
  LoginCard,
  LoginCardLogo,
  LoginCardTitle,
  LoginCardSubtitle,
  LoginCardBody,
  LoginCardTerms
} from "@proofa/components";

<LoginCard>
  <LoginCardLogo src="/favicon.png" alt="Proofa" />
  <LoginCardTitle>Welcome to Proofa</LoginCardTitle>
  <LoginCardSubtitle>Sign in to manage your account</LoginCardSubtitle>

  <LoginCardBody>
    <Button variant="secondary" size="md" className="w-full">
      <Icon icon={IconType.Google} />
      Continue with Google
    </Button>
  </LoginCardBody>

  <LoginCardTerms>
    By continuing, you agree to our <a href="#">Terms</a>
  </LoginCardTerms>
</LoginCard>
```

### How Selia Components Get Styled

1. **Component internal styles** - Use CSS variables (`var(--primary)`, `var(--card)`)
2. **Tailwind utilities** - Applied via className (`bg-primary`, `text-foreground`)
3. **Theme adaptation** - CSS variables change in dark mode automatically

---

## How Everything Fits Together

### The Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Tailwind v4                                        │
│  - Core utility framework                                    │
│  - @theme directive for CSS variable mapping                │
│  - Vite plugin for fast HMR                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Selia Design System                               │
│  - Custom utilities (spinners, fractional spacing)          │
│  - Default design tokens (neutral OKLCH colors)             │
│  - Component tokens (card, dialog, popover, etc.)           │
│  - Dark mode variants                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Tech Minimal Theme (Custom Overrides)            │
│  - Monochrome blacks/grays (light mode)                    │
│  - Monochrome whites/grays (dark mode)                     │
│  - Blue accent (#3B82F6 / #60A5FA)                         │
│  - Overrides Selia defaults                                │
└─────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

1. **Separation of Concerns**
   - Tailwind = utility framework
   - Selia = component design system
   - Tech Minimal = brand/aesthetic customization

2. **Theme Override Hierarchy**
   - Selia provides sensible defaults
   - Tech Minimal overrides only what's needed
   - CSS cascade handles the rest

3. **Dark Mode Simplicity**
   - All layers support dark mode
   - Single class toggle (`.dark`) switches entire theme
   - No component-level logic needed

4. **Scalability**
   - Easy to add new colors (just add CSS variables)
   - Easy to create new themes (override in theme.css)
   - Components automatically adapt to theme changes

---

## Step-by-Step: Adding a New Color

Let's add a new "accent-green" color to the system:

### Step 1: Define in theme.css

```css
/* apps/packages/components/theme.css */
:root {
  --accent-green: #10B981;
  --accent-green-hover: #059669;
}

.dark {
  --accent-green: #34D399;
  --accent-green-hover: #10B981;
}
```

### Step 2: Map to Tailwind in styles.css

```css
/* apps/dashboard/user/src/styles.css */
@theme {
  --color-accent-green: var(--accent-green);
  --color-accent-green-hover: var(--accent-green-hover);
}
```

### Step 3: Use in Components

```tsx
<button className="bg-accent-green hover:bg-accent-green-hover text-white">
  Success Button
</button>

<div className="border-2 border-accent-green">
  Green border
</div>

<p className="text-accent-green">
  Green text
</p>
```

**Result**: Automatic utilities generated:
- `bg-accent-green`, `bg-accent-green-hover`
- `text-accent-green`, `text-accent-green-hover`
- `border-accent-green`, `border-accent-green-hover`

---

## Key Files Reference

| File | Purpose | Location |
|------|---------|----------|
| **main.tsx** | Application entry point, imports styles.css | `apps/dashboard/user/src/main.tsx` |
| **styles.css** | Main stylesheet orchestrator | `apps/dashboard/user/src/styles.css` |
| **vite.config.ts** | Tailwind v4 Vite plugin config | `apps/dashboard/user/vite.config.ts` |
| **tailwind.config.ts** | Minimal Tailwind config (content paths) | `apps/dashboard/user/tailwind.config.ts` |
| **selia.css** | Custom Selia utilities | `apps/packages/components/src/styles/selia.css` |
| **selia-theme.css** | Selia default design tokens | `apps/packages/components/selia-theme.css` |
| **theme.css** | Tech Minimal theme overrides | `apps/packages/components/theme.css` |
| **index.css** | Dashboard-specific custom styles | `apps/dashboard/user/src/index.css` |
| **selia.json** | Selia CLI configuration | `apps/packages/components/selia.json` |

---

## Common Patterns

### Pattern 1: Using Theme Colors

```tsx
// Primary color (adapts to light/dark mode)
<button className="bg-primary text-primary-foreground">
  Primary Button
</button>

// Card backgrounds
<div className="bg-card border border-card-border">
  Card content
</div>

// Text hierarchy
<h1 className="text-text-primary">Main Heading</h1>
<p className="text-text-secondary">Secondary text</p>
<span className="text-text-muted">Muted text</span>
```

### Pattern 2: Using Selia Custom Utilities

```tsx
// Custom fractional spacing
<div className="size-3.5">Icon</div>
<div className="px-4.5 py-2.5">Padded content</div>

// Spinner backgrounds
<div className="bg-spinner size-6 animate-spin"></div>

// Chevron icons
<button className="bg-chevron-down size-4"></button>
```

### Pattern 3: Combining Utilities and Custom CSS

```tsx
// Component with Tailwind utilities
<div className="flex items-center gap-4 p-4 bg-card rounded-lg">
  {/* Uses custom CSS class from index.css */}
  <div className="profile-avatar">
    JD
  </div>
</div>
```

---

## Troubleshooting

### Issue: Utilities Not Generated

**Problem**: `bg-my-color` doesn't work

**Solution**: Make sure you've:
1. Added `--my-color` to theme.css
2. Mapped it in styles.css `@theme` block as `--color-my-color: var(--my-color)`
3. Restarted dev server

### Issue: Dark Mode Not Working

**Problem**: Colors don't change in dark mode

**Solution**:
1. Check if `.dark` class is on `<html>` element
2. Ensure color is defined in both `:root` and `.dark` in theme.css
3. Use CSS variables, not hardcoded colors

### Issue: Component Styles Not Applying

**Problem**: Selia component doesn't look right

**Solution**:
1. Check import order in styles.css (Selia theme must come before Tech Minimal)
2. Verify @proofa/components is properly installed
3. Check that component is imported from `@proofa/components`

---

## Summary

The user dashboard styling system is built on three layers:

1. **Tailwind v4** provides the utility framework and `@theme` directive
2. **Selia Design System** provides custom utilities and default design tokens
3. **Tech Minimal Theme** overrides Selia defaults with monochrome + blue aesthetic

**Key Concepts**:
- CSS variables flow through: theme.css → @theme directive → utility classes
- Import order matters: Tailwind → Selia utilities → Selia theme → Tech Minimal
- Dark mode works via `.dark` class toggling CSS variable values
- All layers work together seamlessly for a cohesive styling system

**Main Entry Point**: `styles.css` orchestrates everything by importing in the correct order and mapping CSS variables to utilities.

**Result**: A maintainable, scalable, theme-aware styling system that adapts automatically to light/dark mode and provides both utility-first and custom CSS approaches.
