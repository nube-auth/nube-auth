# UnoCSS Integration Guide - Proofa Admin Dashboard

## Overview

UnoCSS has been successfully integrated into the admin dashboard. It provides instant on-demand atomic CSS with excellent performance and developer experience.

## Why UnoCSS?

✅ **Instant on-demand** - Only generates CSS for classes you actually use  
✅ **Faster than Tailwind** - No PostCSS overhead, pure ESM  
✅ **Smaller bundle** - Better performance  
✅ **Flexible** - Can use Tailwind syntax OR custom presets  
✅ **CSS Variables** - Seamlessly integrates with our existing design system  
✅ **TypeScript support** - Better DX with autocomplete

## Configuration

### Files Modified

1. **`uno.config.ts`** - UnoCSS configuration with custom theme and shortcuts
2. **`vite.config.ts`** - Added UnoCSS plugin
3. **`main.tsx`** - Imported UnoCSS styles
4. **`package.json`** - Added UnoCSS dependencies

### Theme Mapping

All CSS variables from `index.css` are mapped to UnoCSS:

```typescript
colors: {
  primary: "var(--primary)",
  "primary-hover": "var(--primary-hover)",
  "text-primary": "var(--text-primary)",
  "text-secondary": "var(--text-secondary)",
  "card-bg": "var(--card-bg)",
  "card-border": "var(--card-border)",
  // ... and many more
}
```

This means you can use both approaches:
- **UnoCSS classes**: `bg-primary`, `text-text-secondary`
- **CSS variables**: Still available in custom CSS

## Quick Reference

### Common Shortcuts

```tsx
// Buttons
className="btn-primary"           // Primary button
className="btn-secondary"         // Secondary button
className="btn-danger"            // Danger button
className="btn-sm"                // Small button

// Cards
className="card"                  // Basic card
className="card-hover"            // Card with hover effects

// Forms
className="form-label"            // Form label
className="form-control"          // Input/textarea/select

// Badges
className="badge-success"         // Success badge
className="badge-warning"         // Warning badge
className="badge-danger"          // Danger badge

// Layout
className="page"                  // Page container (padding)
className="page-header"           // Page header layout
className="page-title"            // Page title styling
className="breadcrumb"            // Breadcrumb container
```

### Utility Classes

#### Spacing
```tsx
p-4        // padding: 1rem
px-6       // padding-left/right: 1.5rem
py-3       // padding-top/bottom: 0.75rem
m-2        // margin: 0.5rem
mb-6       // margin-bottom: 1.5rem
gap-4      // gap: 1rem (for flex/grid)
```

#### Layout
```tsx
flex               // display: flex
flex-col           // flex-direction: column
grid               // display: grid
items-center       // align-items: center
justify-between    // justify-content: space-between
```

#### Typography
```tsx
text-12px          // font-size: 12px (custom)
text-14px          // font-size: 14px (custom)
text-16px          // font-size: 16px (custom)
font-semibold      // font-weight: 600
font-bold          // font-weight: 700
uppercase          // text-transform: uppercase
```

#### Colors
```tsx
text-primary              // var(--primary)
text-text-secondary       // var(--text-secondary)
bg-card-bg               // var(--card-bg)
border-card-border       // var(--card-border)
```

## Migration Guide

### Before (Inline Styles)
```tsx
<div style={{
  display: "flex",
  gap: "8px",
  alignItems: "center",
  fontSize: "13px",
  color: "var(--text-tertiary)"
}}>
  Content
</div>
```

### After (UnoCSS)
```tsx
<div className="flex gap-2 items-center text-13px text-text-tertiary">
  Content
</div>
```

### Button Example

#### Before
```tsx
<button
  className="btn btn-primary"
  style={{
    opacity: isLoading ? 0.6 : 1,
    cursor: isLoading ? "not-allowed" : "pointer"
  }}
>
  Save
</button>
```

#### After
```tsx
<button
  className={`btn-primary ${isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
>
  Save
</button>
```

### Card Example

#### Before
```tsx
<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
  <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>
    Title
  </h3>
  <div style={{ display: "grid", gap: "20px" }}>
    Content
  </div>
</div>
```

#### After
```tsx
<div className="card p-6 mb-4">
  <h3 className="text-16px font-semibold mb-5">
    Title
  </h3>
  <div className="grid gap-5">
    Content
  </div>
</div>
```

## Component Patterns

### Page Layout
```tsx
<div className="page">
  {/* Breadcrumb */}
  <div className="mb-6">
    <div className="breadcrumb">
      <Link to="/projects" className="breadcrumb-item">Projects</Link>
      <span>›</span>
      <span className="breadcrumb-current">Settings</span>
    </div>
  </div>

  {/* Page Header */}
  <div className="mb-8">
    <h1 className="page-title">Page Title</h1>
    <p className="page-description">Page description</p>
  </div>

  {/* Content */}
  <div className="card p-6">
    Content here
  </div>
</div>
```

### Form Fields
```tsx
<div className="grid gap-5">
  <div>
    <label className="form-label">Field Name *</label>
    <input
      type="text"
      className="form-control"
      placeholder="Enter value"
    />
    <p className="text-12px text-text-tertiary mt-1.5">
      Helper text
    </p>
  </div>
</div>
```

### Tabs
```tsx
<div className="border-b border-card-border mb-8">
  <div className="flex gap-8">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        className={`py-3 text-14px font-semibold bg-transparent border-none cursor-pointer transition-all ${
          activeTab === tab.id
            ? "text-primary border-b-2 border-primary"
            : "text-text-tertiary border-b-2 border-transparent"
        }`}
        onClick={() => setActiveTab(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
</div>
```

### Danger Zone
```tsx
<div className="card p-6 border-2 border-danger">
  <h3 className="text-16px font-semibold mb-3 text-danger">
    ⚠️ Danger Zone
  </h3>
  <p className="text-14px text-text-secondary mb-5">
    These actions are permanent and cannot be undone.
  </p>
  
  <div className="p-5 bg-danger-bg bg-opacity-5 rounded-lg border border-danger border-opacity-20">
    <h4 className="text-14px font-semibold mb-2 text-danger">
      Delete This Project
    </h4>
    <button className="btn-danger">Delete Project</button>
  </div>
</div>
```

## Custom Rules

We've added custom font size rules to match the design system:

- `text-11px` → 11px
- `text-12px` → 12px
- `text-13px` → 13px
- `text-14px` → 14px
- `text-15px` → 15px
- `text-16px` → 16px
- `text-18px` → 18px
- `text-24px` → 24px
- `text-28px` → 28px

## VS Code Integration

For the best developer experience, install the UnoCSS VS Code extension:

```bash
code --install-extension antfu.unocss
```

This provides:
- Autocomplete for UnoCSS classes
- Hover to see generated CSS
- Color preview
- Diagnostics

## Performance

UnoCSS is significantly faster than traditional CSS frameworks:

- **Build time**: ~100ms for entire project
- **Bundle size**: Only includes used utilities (~30-50KB typically)
- **Hot reload**: Instant updates in development

## Best Practices

1. **Use shortcuts** for common patterns (btn-primary, card, form-label)
2. **Compose utilities** for unique styling needs
3. **Leverage CSS variables** - They still work perfectly
4. **Keep custom CSS** for complex animations or unique components
5. **Use conditional classes** with template literals for dynamic styles

## Migration Status

✅ **Completed**:
- UnoCSS installation and configuration
- AppSettings.tsx refactored
- ProjectSettings.tsx refactored (partial)
- Core shortcuts and utilities defined

🔄 **Recommended Next Steps**:
- Refactor remaining page components:
  - Projects.tsx
  - ProjectDetail.tsx
  - AppDetail.tsx
  - PaymentTestingPlayground.tsx
  - And other pages with inline styles
- Refactor shared components in `src/components/`
- Update any modals or overlays

## Resources

- [UnoCSS Documentation](https://unocss.dev/)
- [Interactive Playground](https://unocss.dev/play/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs) (compatible syntax)
- [Our uno.config.ts](./uno.config.ts) - Full configuration

## Troubleshooting

### Classes not generating?

1. Check `uno.config.ts` safelist
2. Restart dev server
3. Clear Vite cache: `rm -rf node_modules/.vite`

### Colors not showing?

Ensure CSS variables are defined in `index.css` - UnoCSS references them.

### Build errors?

Run `pnpm typecheck` to identify TypeScript issues before building.

## Questions?

Refer to the configuration in `uno.config.ts` or check the official UnoCSS documentation at https://unocss.dev/
