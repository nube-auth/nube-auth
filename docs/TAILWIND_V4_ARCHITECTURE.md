# Tailwind v4 + Vite + Selia Architecture Guide

**Complete guide to how styling works in Proofa User Dashboard**

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Architecture Overview](#architecture-overview)
3. [The Build Pipeline](#the-build-pipeline)
4. [CSS Import Flow](#css-import-flow)
5. [Theme System](#theme-system)
6. [Utility Class Generation](#utility-class-generation)
7. [Component Usage](#component-usage)
8. [Troubleshooting](#troubleshooting)
9. [Complete Flow Diagram](#complete-flow-diagram)

---

## Project Structure

### User Dashboard File Organization

```
proofa-core/
├── apps/
│   ├── dashboard/
│   │   └── user/                          ← User Dashboard
│   │       ├── src/
│   │       │   ├── main.tsx               ← Entry point (imports styles.css)
│   │       │   ├── styles.css             ← Tailwind v4 config (CSS-based)
│   │       │   ├── App.tsx
│   │       │   └── pages/
│   │       │       └── Login.tsx          ← Uses LoginCard component
│   │       ├── vite.config.ts             ← Vite + Tailwind plugin
│   │       ├── package.json               ← Dependencies
│   │       └── node_modules/
│   │           └── @proofa/
│   │               └── components@        ← Symlink to packages/components
│   │
│   └── packages/
│       └── components/                    ← Shared component library
│           ├── src/
│           │   ├── components/
│           │   │   └── ui/
│           │   │       └── LoginCard/
│           │   │           └── LoginCard.tsx  ← Component using semantic classes
│           │   └── styles/
│           │       └── selia.css          ← Custom Selia utilities (@utility)
│           ├── theme.css                  ← Tech Minimal overrides (:root, .dark)
│           ├── selia-theme.css            ← Selia defaults (:root, .dark)
│           └── package.json               ← Package exports configuration
│
├── pnpm-workspace.yaml                    ← Monorepo workspace config
└── docs/
    └── TAILWIND_V4_ARCHITECTURE.md        ← This file
```

### Key Files Explained

| File | Purpose | Tailwind v4 Feature |
|------|---------|---------------------|
| **styles.css** | Main configuration file | `@import "tailwindcss"`, `@source`, `@theme` |
| **vite.config.ts** | Build tool config | `tailwind()` plugin (no options needed) |
| **selia.css** | Custom utilities | `@utility` directives |
| **theme.css** | Color overrides | CSS variables (`:root`, `.dark`) |
| **selia-theme.css** | Selia defaults | CSS variables (`:root`, `.dark`) |
| **package.json** | Package exports | Maps import paths to files |
| ~~tailwind.config.ts~~ | ❌ **NOT NEEDED** | Tailwind v4 is CSS-based |

### Configuration Philosophy

**Tailwind v3 (OLD):**
```
Configuration: tailwind.config.ts (JavaScript)
File scanning: content: [] option
Theme: theme.extend = {} object
```

**Tailwind v4 (NEW):**
```
Configuration: styles.css (CSS)
File scanning: @source directive
Theme: @theme { } directive
```

---

## Architecture Overview

### The Three Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    1. BUILD LAYER                           │
│  (Vite + Tailwind v4 Plugin)                                │
│  - Scans files for class names                              │
│  - Generates CSS at build time                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    2. THEME LAYER                           │
│  (CSS Variables + @theme directive)                         │
│  - Defines design tokens                                    │
│  - Maps variables to Tailwind utilities                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    3. COMPONENT LAYER                       │
│  (React Components)                                         │
│  - Uses semantic class names (bg-card, text-primary)        │
│  - Rendered with generated CSS                              │
└─────────────────────────────────────────────────────────────┘
```

---

## The Build Pipeline

### 1. Entry Point: `main.tsx`

```tsx
// apps/dashboard/user/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";  // ← THIS IS THE MAGIC ENTRY POINT
```

**Why this matters:**
- Vite reads main.tsx as the application entry point
- The `import "./styles.css"` triggers the entire styling pipeline
- Tailwind v4 plugin intercepts this import

---

### 2. Vite Configuration

```typescript
// apps/dashboard/user/vite.config.ts
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwind(), // ← No options needed! Auto-scans project
  ],
});
```

**What the Tailwind plugin does:**

1. **Automatic Project Scanning** (Build Time)
   ```
   Plugin automatically scans:
   - Current project root: ./src/**/*.{js,ts,jsx,tsx}
   - Detects React/Vue/Svelte files
   - Extracts class names: "bg-card", "text-primary", "flex"
   - Passes to Tailwind CSS generation engine
   ```

2. **No `content` option in Tailwind v4:**
   ```typescript
   // ❌ WRONG - Tailwind v4 doesn't support content option
   tailwind({
     content: ["./src/**/*.tsx"]  // TypeScript error!
   })
   
   // ✅ CORRECT - No options needed
   tailwind()
   ```

3. **Scanning External Paths (Monorepo):**
   Use `@source` directive in CSS instead of config:
   ```css
   /* styles.css */
   @import "tailwindcss";
   @source "../../../packages/components/src";  /* Scan component library */
   ```

4. **Why `@import "tailwindcss"` must be in local project:**
   ```css
   /* ❌ WRONG - In @proofa/components package */
   @import "tailwindcss";

   /* ✅ CORRECT - In apps/dashboard/user/src/styles.css */
   @import "tailwindcss";
   ```

   **Reason:** The Vite plugin creates a virtual module for the Tailwind import. This virtual module is only available to the project where the plugin is configured, not to external packages.

---

### 3. CSS Import Flow

```css
/* apps/dashboard/user/src/styles.css */

/* STEP 1: Initialize Tailwind Engine */
@import "tailwindcss";
/* This activates the Tailwind v4 processing engine
   Must be FIRST and in LOCAL project (not external package) */

/* STEP 2: Specify Additional Scan Paths (Monorepo) */
@source "../../../packages/components/src";
/* Tells Tailwind to scan external component library
   Path is relative to THIS file (apps/dashboard/user/src/styles.css)
   - ../ → apps/dashboard/user/
   - ../../ → apps/dashboard/
   - ../../../ → apps/ (monorepo root)
   - packages/components/src/ → component library
   Replaces the old "content" option from vite.config.ts
   Required for monorepo setups to find classes in shared packages */

/* STEP 3: Import Custom Utilities */
@import "@proofa/components/styles/selia.css";
/* Adds custom utilities like: size-4.5, bg-spinner, inset-shadow-xs
   These are Selia-specific utilities not in standard Tailwind */

/* STEP 4: Import Selia Default Theme */
@import "@proofa/components/selia-theme.css";
/* Defines Selia's default color tokens:
   --primary: oklch(0.5784 0.2057 262.95)  // Purple
   --foreground: oklch(0.2036 0.0029 247.97)  // Dark gray
   Provides comprehensive set of semantic tokens */

/* STEP 5: Import Tech Minimal Theme Overrides */
@import "@proofa/components/theme.css";
/* Overrides Selia colors with Proofa's design:
   --primary: #18181B  // Black (monochrome)
   --secondary: #3B82F6  // Blue (accent only)
   Redefines tokens for Tech Minimal aesthetic */

/* STEP 6: Map Variables to Tailwind Utilities */
@theme {
  /* This directive tells Tailwind to generate utilities from CSS variables */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  /* ... etc */
}
```

**Import Order is Critical:**

1. **tailwindcss** = Engine initialization
2. **@source** = Additional file scan paths (monorepo)
3. **selia.css** = Custom utility definitions
4. **selia-theme.css** = Base color tokens
5. **theme.css** = Proofa-specific overrides
6. **@theme** = Utility generation mapping

**What happens if order is wrong:**
- Import tailwindcss last → Custom utilities not processed
- Forget @source → Component library classes not found
- Import theme.css before selia-theme.css → Wrong color priorities
- Skip @theme mapping → No bg-card, text-primary utilities generated

---

## Theme System

### CSS Variable Cascade

```css
/* 1. Selia Default (selia-theme.css) */
:root {
  --primary: oklch(0.5784 0.2057 262.95);  /* Purple */
  --card: oklch(1 0 0);                     /* White */
  --foreground: oklch(0.2036 0.0029 247.97); /* Dark gray */
}

/* 2. Proofa Override (theme.css) - LOADED AFTER, TAKES PRECEDENCE */
:root {
  --primary: #18181B;      /* ← Overrides purple with black */
  --card: #FFFFFF;         /* ← Overrides with hex white */
  --foreground: #18181B;   /* ← Overrides with black */
  --secondary: #3B82F6;    /* ← NEW: Blue accent */
}

/* 3. Dark Mode (theme.css) */
.dark {
  --primary: #FAFAFA;      /* Light text on dark bg */
  --card: #27272A;         /* Dark gray card */
  --foreground: #FAFAFA;   /* Light foreground */
  --secondary: #60A5FA;    /* Lighter blue for dark mode */
}
```

**Final Computed Values:**

| Variable | Light Mode | Dark Mode | Source |
|----------|------------|-----------|--------|
| `--primary` | `#18181B` | `#FAFAFA` | theme.css |
| `--secondary` | `#3B82F6` | `#60A5FA` | theme.css |
| `--card` | `#FFFFFF` | `#27272A` | theme.css |
| `--foreground` | `#18181B` | `#FAFAFA` | theme.css |
| `--muted` | `#52525B` | `#A1A1AA` | theme.css |

**Browser Cascade Resolution:**
```
User types: className="bg-card"
↓
Tailwind generates: .bg-card { background-color: var(--color-card); }
↓
Browser resolves: var(--color-card) → var(--card) → #FFFFFF (light) or #27272A (dark)
```

---

## Utility Class Generation

### The @theme Directive (Tailwind v4 Feature)

```css
/* apps/dashboard/user/src/styles.css */
@theme {
  /* Maps CSS variable → Tailwind utility namespace */
  --color-background: var(--background);
  --color-primary: var(--primary);
  --color-card: var(--card);
  /* etc... */
}
```

**What this generates:**

| @theme Declaration | Generated Utilities | Example Usage |
|-------------------|---------------------|---------------|
| `--color-background: var(--background);` | `bg-background`, `text-background`, `border-background` | `<div className="bg-background">` |
| `--color-primary: var(--primary);` | `bg-primary`, `text-primary`, `border-primary`, `outline-primary` | `<button className="bg-primary">` |
| `--color-card: var(--card);` | `bg-card`, `text-card`, `border-card` | `<div className="bg-card">` |

**Utility Pattern:**
```
@theme {
  --color-{name}: var(--{variable});
}
↓
Generates:
- bg-{name}
- text-{name}
- border-{name}
- outline-{name}
- ring-{name}
- decoration-{name}
- divide-{name}
- accent-{name}
- caret-{name}
- fill-{name}
- stroke-{name}
```

### Example: Full Generation Flow

```css
/* 1. Define variable in theme.css */
:root {
  --primary: #18181B;
}

/* 2. Map to Tailwind in styles.css */
@theme {
  --color-primary: var(--primary);
}

/* 3. Tailwind generates (automatically): */
.bg-primary { background-color: var(--color-primary); }
.text-primary { color: var(--color-primary); }
.border-primary { border-color: var(--color-primary); }
/* ... and 10+ more utility variants */

/* 4. Use in component */
<button className="bg-primary text-white">Click Me</button>

/* 5. Browser computes: */
background-color: var(--color-primary)
               ↓ var(--primary)
               ↓ #18181B
```

---

## Component Usage

### LoginCard Component Example

```tsx
// packages/components/src/components/ui/LoginCard/LoginCard.tsx

export const LoginCard = ({ children, error, loading }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/*              ↑                                                            */}
      {/*              Uses semantic class name                                     */}
      {/*              Generated from: @theme { --color-background: var(--background); } */}

      <div className="w-full max-w-md bg-card border border-card-border rounded-lg">
        {/*                          ↑       ↑                                      */}
        {/*                          Both mapped in @theme directive                */}
        {children}
      </div>
    </div>
  );
};
```

**Class Resolution:**

1. **Developer writes:** `className="bg-card"`
2. **Tailwind finds:** Class name during file scan
3. **Tailwind checks:** Is `bg-card` defined?
   - Looks in generated utilities
   - Finds: `@theme { --color-card: var(--card); }`
   - Generates: `.bg-card { background-color: var(--color-card); }`
4. **Browser applies:**
   ```css
   background-color: var(--color-card)
                   ↓ var(--card)
                   ↓ #FFFFFF (light mode) or #27272A (dark mode)
   ```

---

## Troubleshooting

### Problem 1: "Class not found" in Tailwind debug extension

**Symptom:** `bg-card`, `text-primary` showing as "not found"

**Diagnosis:**
```bash
# Check if @theme mapping exists
cat apps/dashboard/user/src/styles.css | grep "@theme" -A 20

# Expected output:
@theme {
  --color-card: var(--card);
  --color-primary: var(--primary);
  # ... etc
}
```

**Solutions:**
1. ✅ Verify @theme directive includes the missing color
2. ✅ Add to @theme mapping:
   ```css
   @theme {
     --color-card: var(--card);  /* Enables bg-card, text-card, border-card */
   }
   ```
3. ✅ Restart dev server after changes to styles.css

---

### Problem 2: "Utilities generating but wrong colors"

**Symptom:** `bg-card` class exists but shows wrong color

**Diagnosis:**
```bash
# Check CSS variable definition
# Open browser DevTools → Elements → Select element
# Computed tab → Filter for "--card"

# Expected:
--card: #FFFFFF (light) or #27272A (dark)

# If showing:
--card: oklch(1 0 0)
# ↑ Theme override not loading correctly
```

**Solutions:**
1. ✅ Check import order in styles.css:
   ```css
   @import "@proofa/components/selia-theme.css";  /* Base */
   @import "@proofa/components/theme.css";         /* Override */
   ```
2. ✅ Verify theme.css defines variable:
   ```css
   :root {
     --card: #FFFFFF;  /* Must exist */
   }
   ```
3. ✅ Clear cache: `rm -rf node_modules/.vite && pnpm dev`

---

### Problem 3: "Dev server shows CSS loaded but no styles applied"

**Symptom:** Network tab shows CSS file, but page has no styling

**Diagnosis:**
```bash
# Check if @import "tailwindcss" is in LOCAL project
grep -r "tailwindcss" apps/dashboard/user/src/

# Expected:
apps/dashboard/user/src/styles.css:@import "tailwindcss";

# NOT expected:
packages/components/tailwind.css:@import "tailwindcss";
```

**Solutions:**
1. ✅ Move `@import "tailwindcss"` to dashboard's styles.css
2. ✅ Update main.tsx:
   ```tsx
   // ❌ WRONG
   import "@proofa/components/tailwind.css";
   
   // ✅ CORRECT
   import "./styles.css";
   ```
3. ✅ Verify vite.config.ts has Tailwind plugin:
   ```ts
   plugins: [
     react(),
     tailwind({
       content: ["./src/**/*.{js,ts,jsx,tsx}"]
     })
   ]
   ```

---

### Problem 4: "Dark mode not switching"

**Symptom:** Adding `.dark` class to `<html>` doesn't change colors

**Diagnosis:**
```css
/* Check if dark mode overrides exist */
.dark {
  --card: #27272A;  /* Must override :root value */
}
```

**Solutions:**
1. ✅ Verify theme.css has `.dark { }` block
2. ✅ Use JavaScript to toggle:
   ```typescript
   document.documentElement.classList.toggle('dark');
   ```
3. ✅ Check CSS specificity (`.dark` must override `:root`)

---

### Problem 5: "TypeScript error: 'content' does not exist in type 'PluginOptions'"

**Symptom:** Error in vite.config.ts when using `tailwind({ content: [...] })`

**Diagnosis:**
```typescript
// ❌ This is Tailwind v3 syntax - doesn't work in v4
tailwind({
  content: ["./src/**/*.tsx"]  // TypeScript error!
})
```

**Solutions:**
1. ✅ Remove content option from vite.config.ts:
   ```typescript
   plugins: [tailwind()]  // No options needed
   ```
2. ✅ Use @source directive in styles.css instead:
   ```css
   @source "../../packages/components/src";
   ```
3. ✅ Delete tailwind.config.ts if it exists (not needed in v4)

---

## Complete Flow Diagram

### Build Time (Development Mode)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. USER STARTS DEV SERVER                                              │
│    $ pnpm dev                                                           │
└────────────────────────────────┬────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. VITE INITIALIZATION                                                  │
│    - Reads vite.config.ts                                               │
│    - Loads plugins: react(), tailwind({...})                            │
│    - Registers Tailwind Vite plugin                                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. ENTRY POINT PROCESSING                                               │
│    Vite reads: main.tsx                                                 │
│    Finds: import "./styles.css"                                         │
│    ↓                                                                    │
│    Tailwind plugin intercepts CSS import                                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. CSS PROCESSING PIPELINE                                              │
│                                                                         │
│    Step 4.1: Process @import "tailwindcss"                              │
│    ├─ Initialize Tailwind v4 engine                                     │
│    ├─ Create virtual module for base/utilities/components layers       │
│    └─ Prepare class name registry                                       │
│                                                                         │
│    Step 4.2: Process @import "@proofa/components/styles/selia.css"     │
│    ├─ Read custom utility definitions                                   │
│    ├─ Parse @utility directives (size-4.5, bg-spinner, etc.)           │
│    └─ Add to Tailwind's utility registry                                │
│                                                                         │
│    Step 4.3: Process @import "@proofa/components/selia-theme.css"      │
│    ├─ Read Selia default CSS variables                                  │
│    ├─ Register :root { --primary: oklch(...); }                         │
│    └─ Store as base theme layer                                         │
│                                                                         │
│    Step 4.4: Process @import "@proofa/components/theme.css"            │
│    ├─ Read Proofa theme overrides                                       │
│    ├─ Override :root variables (--primary: #18181B)                     │
│    ├─ Add .dark {...} overrides                                         │
│    └─ Higher specificity than Selia defaults                            │
│                                                                         │
│    Step 4.5: Process @theme directive                                   │
│    ├─ Parse custom theme mapping:                                       │
│    │  @theme {                                                          │
│    │    --color-card: var(--card);                                      │
│    │    --color-primary: var(--primary);                                │
│    │  }                                                                 │
│    ├─ Generate utility classes:                                         │
│    │  .bg-card { background-color: var(--color-card); }                 │
│    │  .text-primary { color: var(--color-primary); }                    │
│    └─ Add to Tailwind's utility registry                                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. FILE SCANNING PHASE                                                  │
│    Tailwind plugin scans content paths:                                 │
│    ./src/**/*.{js,ts,jsx,tsx}                                           │
│    ../../packages/components/src/**/*.{js,ts,jsx,tsx}                   │
│                                                                         │
│    Finds class names in files:                                          │
│    ├─ App.tsx: "flex", "items-center", "justify-center"                │
│    ├─ LoginCard.tsx: "bg-card", "border-card-border", "text-primary"   │
│    └─ Button.tsx: "bg-primary", "text-white", "rounded-lg"             │
│                                                                         │
│    Extracts unique class names → Set<string>                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. CSS GENERATION                                                       │
│    For each found class name:                                           │
│                                                                         │
│    "bg-card"                                                            │
│    ├─ Check: Is this a custom utility? (from selia.css)                │
│    ├─ Check: Is this from @theme? (--color-card exists)                │
│    ├─ Generate: .bg-card { background-color: var(--color-card); }      │
│    └─ Add to output CSS                                                 │
│                                                                         │
│    "flex"                                                               │
│    ├─ Check: Standard Tailwind utility                                  │
│    ├─ Generate: .flex { display: flex; }                                │
│    └─ Add to output CSS                                                 │
│                                                                         │
│    "size-4.5" (Selia custom)                                            │
│    ├─ Check: Defined in selia.css                                       │
│    ├─ Use definition: width: calc(var(--spacing) * 4.5);               │
│    └─ Add to output CSS                                                 │
│                                                                         │
│    Classes NOT found in scan → NOT GENERATED                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. CSS OUTPUT                                                           │
│    Generated CSS structure:                                             │
│                                                                         │
│    /* Base Layer */                                                     │
│    * { box-sizing: border-box; }                                        │
│    body { margin: 0; font-family: ...; }                                │
│                                                                         │
│    /* Theme Variables */                                                │
│    :root { --card: #FFFFFF; --primary: #18181B; }                       │
│    .dark { --card: #27272A; --primary: #FAFAFA; }                       │
│                                                                         │
│    /* Utilities Layer */                                                │
│    .flex { display: flex; }                                             │
│    .bg-card { background-color: var(--color-card); }                    │
│    .text-primary { color: var(--color-primary); }                       │
│    .size-4.5 { width: calc(var(--spacing) * 4.5); }                    │
│                                                                         │
│    ↓                                                                    │
│    Vite serves as: /@id/__x00__virtual:tailwind.css                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 8. BROWSER LOADING                                                      │
│    1. Browser requests: http://localhost:5173/                          │
│    2. Vite serves: index.html                                           │
│    3. Browser parses: <script type="module" src="/src/main.tsx">       │
│    4. Browser requests: /src/main.tsx (transformed to JS)               │
│    5. Browser sees: import "./styles.css"                               │
│    6. Browser requests: generated CSS from Vite                         │
│    7. Browser applies: All generated utility classes                    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 9. RUNTIME (IN BROWSER)                                                 │
│                                                                         │
│    Component renders:                                                   │
│    <div className="bg-card border border-card-border">                  │
│                                                                         │
│    Browser computes styles:                                             │
│    ├─ .bg-card { background-color: var(--color-card); }                │
│    │  └─ var(--color-card) → var(--card) → #FFFFFF                     │
│    └─ .border-card-border { border-color: var(--color-card-border); }  │
│       └─ var(--color-card-border) → var(--card-border) → #E4E4E7       │
│                                                                         │
│    User clicks: Toggle Dark Mode                                        │
│    JavaScript: document.documentElement.classList.add('dark')           │
│                                                                         │
│    CSS Variables cascade:                                               │
│    ├─ :root { --card: #FFFFFF; } (cascaded out by .dark)               │
│    └─ .dark { --card: #27272A; } (now active!)                         │
│                                                                         │
│    Browser recomputes:                                                  │
│    └─ .bg-card background → var(--card) → #27272A ✨                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Hot Module Replacement (HMR)

### File Change Detection

```
Developer saves: LoginCard.tsx
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ Vite detects: File change in content path                  │
│ ├─ Read updated file                                        │
│ ├─ Extract class names                                      │
│ └─ Compare with previous scan                               │
└────────────────────────┬────────────────────────────────────┘
                         ↓
           ┌─────────────────────────────┐
           │ New classes found?          │
           └──────┬──────────────┬───────┘
                  │ YES          │ NO
                  ↓              ↓
     ┌────────────────┐    ┌──────────────────┐
     │ Regenerate CSS │    │ Send HMR update  │
     │ ├─ Generate    │    │ (no CSS rebuild) │
     │ │  new utils   │    └──────────────────┘
     │ └─ Append to   │              ↓
     │    output      │    Browser hot-swaps component
     └───────┬────────┘
             ↓
   Send CSS + Component update
             ↓
   Browser applies without full reload
```

### CSS Variable Changes

```
Developer saves: theme.css
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ Vite detects: CSS file change                              │
│ ├─ Re-import theme.css                                      │
│ ├─ Update CSS variable values                               │
│ └─ No class generation needed (just value swap)             │
└────────────────────────┬────────────────────────────────────┘
                         ↓
              Send HMR CSS update
                         ↓
         Browser updates <style> tag
                         ↓
      All var(--card) references compute new value
                         ↓
                 Instant re-render
```

---

## Package Export Resolution

### @proofa/components exports

```json
// packages/components/package.json
{
  "exports": {
    "./styles/selia.css": "./src/styles/selia.css",
    "./selia-theme.css": "./selia-theme.css",
    "./theme.css": "./theme.css"
  }
}
```

**When you write:**
```css
@import "@proofa/components/styles/selia.css";
```

**Node resolves:**
1. Look up `@proofa/components` in node_modules (symlink via pnpm workspace)
2. Read package.json `exports` field
3. Match: `"./styles/selia.css": "./src/styles/selia.css"`
4. Resolve to: `packages/components/src/styles/selia.css`
5. Vite reads and processes that file

---

## Key Takeaways

### 1. The Four Critical Rules

| Rule | Why It Matters |
|------|----------------|
| **@import "tailwindcss" in LOCAL project** | Vite plugin creates virtual module only for local project |
| **@source for external paths** | Required to scan monorepo packages (no content option in v4) |
| **@theme maps variables to utilities** | Without this, bg-card, text-primary won't exist |
| **Import order: tailwind → @source → selia → selia-theme → theme** | Later imports override earlier ones |

### 2. The Color Resolution Chain

```
Component: className="bg-card"
→ Tailwind generates: .bg-card { background-color: var(--color-card); }
→ @theme maps: --color-card → var(--card)
→ theme.css defines: --card: #FFFFFF (or #27272A in .dark)
→ Browser computes final color
```

### 3. When Things Break

| Symptom | Root Cause | Fix |
|---------|------------|-----|
| No utilities generated | Missing `@import "tailwindcss"` in local project | Add to styles.css |
| Component library classes missing | Missing `@source` directive | Add to styles.css |
| Classes exist but colors wrong | Missing @theme mapping | Add to @theme directive |
| Dark mode doesn't work | Missing .dark overrides | Check theme.css |
| TypeScript error on tailwind() | Using v3 content option | Remove options, use @source |
| tailwind.config.ts ignored | Tailwind v4 is CSS-based | Delete config file, use styles.css |

---

## Additional Resources

- [Tailwind v4 Documentation](https://tailwindcss.com/docs/v4-beta)
- [Selia Design System](https://github.com/nauvalazhar/selia)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)
- [CSS Variables MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

---

**Last Updated:** January 25, 2026  
**Proofa Version:** User Dashboard v0.0.0  
**Tailwind Version:** 4.1.18
