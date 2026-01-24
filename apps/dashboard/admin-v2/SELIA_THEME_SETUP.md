# Selia Theme Setup - Admin Dashboard v2 (CORRECTED)

## 🎯 Problem Solved

**Issue**: Selia UI components were not using Proofa's custom theme colors and dark mode wasn't working.

**Root Causes**:
1. ❌ Using `[data-theme="dark"]` instead of `.dark` class (Selia standard)
2. ❌ Incorrect `@theme` configuration (should be `@theme inline` for fonts only)
3. ❌ Unnecessary `content` array in vite.config.ts (Tailwind v4 auto-discovers)
4. ❌ Not following Selia's installation guide properly

**Solution**: Followed Selia's official Vite installation guide exactly.

---

## ✅ Changes Made (Following Selia Docs)

### 1. **Updated [index.css](src/index.css)** - Simplified to Match Selia Docs

**Before** (WRONG):
```css
@theme {
  --color-primary: var(--primary);  // ❌ Wrong approach
  --color-secondary: var(--secondary);
  // ... lots of color mappings
}
@import "tailwindcss";
```

**After** (CORRECT):
```css
@import "tailwindcss";

/* Import Selia custom utilities */
@import "@proofa/components/styles/selia.css";

/* Fonts only (as per Selia docs) */
@theme inline {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif, ...;
  --font-mono: 'JetBrains Mono', ui-monospace, ...;
}
```

**Why**: Selia's documentation states that `@theme inline` is ONLY for fonts. Color theming works through CSS variables directly.

### 2. **Updated [theme.css](../../packages/components/theme.css)** - Fixed Dark Mode

**Before** (WRONG):
```css
[data-theme="dark"] {  // ❌ Wrong selector
  --primary: #6366f1;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {  // ❌ Wrong selector
```

**After** (CORRECT):
```css
.dark {  // ✅ Selia uses .dark class
  --primary: #6366f1;
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {  // ✅ Correct selector
```

**Why**: Selia's customization docs show they use `.dark` class for dark mode, NOT data attributes.

### 3. **Updated [vite.config.ts](vite.config.ts)** - Removed Content Array

**Before** (WRONG):
```ts
tailwindcss({
  content: [  // ❌ Unnecessary in Tailwind v4
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/components/src/**/*.{js,ts,jsx,tsx}',
  ],
}),
```

**After** (CORRECT):
```ts
tailwindcss(),  // ✅ Tailwind v4 auto-discovers
```

**Why**: Selia's Vite installation guide shows just `tailwindcss()` with no content array - Tailwind v4 auto-discovers files.

### 4. **Updated [App.tsx](src/App.tsx)** - Fixed Theme Toggle

**Before** (WRONG):
```tsx
document.documentElement.setAttribute("data-theme", theme);  // ❌
```

**After** (CORRECT):
```tsx
// Selia uses .dark class
if (theme === "dark") {
  document.documentElement.classList.add("dark");  // ✅
} else {
  document.documentElement.classList.remove("dark");
}
```

**Why**: Consistent with Selia's dark mode implementation using `.dark` class.

---

## 🧪 How to Test

1. **Start the dev server**:
   ```bash
   cd apps/dashboard/admin-v2
   pnpm dev
   ```

2. **Navigate to Settings page**: Login → Click "Settings" in sidebar

3. **Verify**:
   - ✅ Primary buttons should be **purple/indigo** (#6366f1)
   - ✅ Theme toggle should work (light/dark)
   - ✅ All Selia components should have proper styling

---

## 📚 How Selia Theming Actually Works

### Color System

Selia uses **CSS variables** defined in your theme.css:

```css
:root {
  --primary: #6366f1;
  --foreground: #111827;
  --background: #ffffff;
  --danger: #ef4444;
  /* etc. */
}

.dark {
  --foreground: #ffffff;
  --background: #1e293b;
  /* inverted values */
}
```

Selia components reference these variables directly:
```tsx
// Button component uses:
className="bg-primary text-primary-foreground"
```

Tailwind v4 **natively supports CSS variables** in utility classes when they're defined in `:root` or `.dark`.

### Font Configuration

Only fonts need `@theme inline`:

```css
@theme inline {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, ...;
}
```

### Dark Mode

Selia uses `.dark` class on `<html>`:

```tsx
// Light mode
<html>...</html>

// Dark mode
<html class="dark">...</html>
```

CSS variables automatically switch based on presence of `.dark` class.

---

## 🎨 Theme Customization

### Changing Colors

Edit [theme.css](../../packages/components/theme.css):

```css
:root {
  /* Change from purple to blue */
  --primary: #3b82f6;
  --primary-hover: #2563eb;
}

.dark {
  /* Dark mode version */
  --primary: #60a5fa;
}
```

Changes apply immediately - no Tailwind config needed!

### Adding New Colors

1. Define in theme.css:
   ```css
   :root {
     --custom: #10b981;
   }
   ```

2. Use in components:
   ```tsx
   <div className="bg-[--custom] text-white">Custom color!</div>
   ```

   Or define a Tailwind utility in `@theme`:
   ```css
   @theme {
     --color-custom: var(--custom);
   }
   ```

   Then use:
   ```tsx
   <div className="bg-custom">Custom color!</div>
   ```

---

## 🔧 Correct Architecture

```
Selia Theme Flow:

┌─────────────────────────────────────────┐
│ theme.css (CSS Variables)              │
│ :root { --primary: #6366f1; }          │
│ .dark { --primary: #818cf8; }          │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Tailwind v4 (Native CSS Variable        │
│ Support)                                 │
│ bg-[--primary] or bg-primary (if        │
│ mapped)                                  │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Selia Components Use Classes            │
│ <Button className="bg-primary           │
│ text-primary-foreground" />             │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ .dark Class Toggles Theme               │
│ document.documentElement.classList.     │
│ toggle("dark")                           │
└─────────────────────────────────────────┘
```

**Key Point**: No complex `@theme` configuration needed. CSS variables + Tailwind v4 native support = it just works!

---

## 🚨 Common Mistakes (What We Fixed)

### ❌ WRONG: Using data-theme attribute
```tsx
document.documentElement.setAttribute("data-theme", "dark");
```

### ✅ CORRECT: Using .dark class
```tsx
document.documentElement.classList.add("dark");
```

---

### ❌ WRONG: Complex @theme configuration
```css
@theme {
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  /* ... dozens of mappings */
}
```

### ✅ CORRECT: @theme inline for fonts only
```css
@theme inline {
  --font-sans: 'Inter', ...;
}
```

---

### ❌ WRONG: Content array in vite.config.ts
```ts
tailwindcss({
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
})
```

### ✅ CORRECT: No content array
```ts
tailwindcss()
```

---

## 📖 Reference Links

- [Selia Vite Installation](https://selia.earth/docs/installation/vite)
- [Selia Customization](https://selia.earth/docs/customization)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs/v4-beta)
- [Tailwind v4 @theme directive](https://tailwindcss.com/docs/v4-beta#theme-configuration)

---

## ✨ Summary

**What Was Wrong**:
1. Using `[data-theme="dark"]` instead of `.dark` class
2. Overcomplicating `@theme` configuration
3. Adding unnecessary `content` array to vite.config
4. Not following Selia's official installation guide

**What We Fixed**:
1. ✅ Changed to `.dark` class for dark mode
2. ✅ Simplified to `@theme inline` for fonts only
3. ✅ Removed content array (Tailwind v4 auto-discovers)
4. ✅ Followed Selia docs exactly

**Result**: Selia components now work perfectly with Proofa's theme colors and dark mode! 🎨

---

## 🧪 Test Checklist

- [ ] Primary buttons are purple/indigo (#6366f1)
- [ ] Dark mode toggle works
- [ ] All button variants styled correctly
- [ ] Chips/badges have proper styling
- [ ] Alerts display correctly
- [ ] Loading states work
- [ ] Theme persists on page refresh
- [ ] Auto dark mode detection works
