# Proofa Design System

> **Enterprise-grade design system** for authentication, licensing, and session management platform

## 📚 Documentation

### Color System

Our comprehensive color palette is designed for trust, accessibility, and modern aesthetics.

**View the color system:**
- **📄 Interactive Palette (Docs Site)**: `colors.mdx` - Full documentation with interactive React component
- **🌐 Standalone HTML**: `color-palette.html` - Open directly in browser (no build required)

**Quick Access:**
```bash
# Open standalone palette in browser
open docs/design-system/color-palette.html

# Or view in docs site
cd apps/dashboard/docs
pnpm dev
# Navigate to /design-system/colors
```

## 🎨 Color Philosophy

### Brand Values
- **Trust & Security**: Enterprise-grade authentication platform
- **Modern & Professional**: Clean, sophisticated interface
- **Accessible**: WCAG 2.1 Level AA compliant
- **Versatile**: Beautiful in both light and dark modes

### Color Strategy

| Category | Purpose | Examples |
|----------|---------|----------|
| **Primary (Indigo)** | Brand identity, main CTAs | Login buttons, active nav |
| **Secondary (Cyan)** | Informational, links | Info badges, read more |
| **Accent (Purple)** | Premium features, special | Pro badge, promotions |
| **Semantic** | User feedback | Success, warnings, errors |
| **Neutrals** | Foundation | Backgrounds, text, borders |

## ✅ Key Features

- **40+ CSS Variables** - Comprehensive palette
- **WCAG AA Compliant** - All colors meet accessibility standards
- **Light + Dark Themes** - Seamless theme switching
- **Copy on Click** - Easy developer workflow
- **Contrast Ratios** - Displayed for each color
- **Usage Guidelines** - Clear documentation

## 🚀 Quick Start

### Using Colors in Your Code

**Method 1: Tailwind Utilities (Recommended)**
```tsx
<button className="bg-primary text-white hover:bg-primary-hover">
  Sign In
</button>
```

**Method 2: CSS Classes**
```css
.my-button {
  background: var(--primary);
  color: white;
  border: 1px solid var(--primary-border);
}

.my-button:hover {
  background: var(--primary-hover);
}
```

**Method 3: Inline Styles**
```tsx
<div style={{ color: 'var(--text-secondary)' }}>
  Secondary text
</div>
```

## 📊 Color Accessibility

All colors meet **WCAG 2.1 Level AA** standards:

| Standard | Requirement | Status |
|----------|-------------|--------|
| **Normal Text** | 4.5:1 minimum | ✅ 4.5:1 - 7.2:1 |
| **Large Text** | 3:1 minimum | ✅ 3.0:1 - 16.8:1 |
| **UI Components** | 3:1 minimum | ✅ 3.0:1+ |
| **Focus Indicators** | 3:1 minimum | ✅ High contrast |

## 🎯 Best Practices

### ✅ Do

- Use primary color for main CTAs and important actions
- Maintain consistent semantic color meanings
- Test colors in both light and dark modes
- Add icons alongside colors for accessibility
- Use neutrals to create visual hierarchy

### ❌ Don't

- Use more than 2-3 colors in a single component
- Override semantic colors (e.g., green for errors)
- Create custom colors without checking accessibility
- Rely on color alone to convey information
- Use pure black (#000) in dark mode

## 📁 File Structure

```
docs/design-system/
├── README.md                    # This file
├── colors.mdx                   # Full color documentation (docs site)
├── color-palette.html           # Standalone interactive palette
└── (future: typography.md, spacing.md, components.md)
```

## 🔗 Related Resources

- **[Product Spec](../PRODUCT_SPEC.md)** - Complete product specification
- **[Architecture](../ARCHITECTURE.md)** - System design patterns
- **[CSS Styling Standards](../CSS_STYLING_STANDARDS.md)** - Tailwind CSS guide
- **[Component Library](../../apps/packages/components/COMPONENT_LIBRARY.md)** - UI components

## 🛠️ Development

### Updating Colors

Colors are defined in `apps/packages/components/theme.css`:

```css
:root {
  --primary: #5B5FC7;
  --primary-hover: #464AB0;
  /* ... */
}

.dark {
  --text-primary: #F8FAFC;
  /* ... */
}
```

After updating `theme.css`:
1. Update color values in `color-palette.html`
2. Update examples in `colors.mdx`
3. Test in both light and dark modes
4. Verify WCAG contrast ratios

### Testing Accessibility

Use these tools to verify color contrast:
- **[WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)**
- **[Contrast Ratio Tool](https://contrast-ratio.com/)**
- **[Who Can Use](https://www.whocanuse.com/)**

### Color Blindness Testing

Test with simulators:
- **[Coblis](https://www.color-blindness.com/coblis-color-blindness-simulator/)**
- **Chrome DevTools** - Rendering > Emulate vision deficiencies

## 📝 Contributing

When adding new colors:

1. **Check Accessibility** - Verify WCAG AA compliance (4.5:1 for text)
2. **Test Both Themes** - Ensure color works in light and dark modes
3. **Update Documentation** - Add to `colors.mdx` and `color-palette.html`
4. **Add Usage Examples** - Show how to use the new color
5. **Verify Contrast** - Test with text/background combinations

## 🎉 Version History

| Version | Date | Changes |
|---------|------|---------|
| **2.0.0** | Jan 24, 2026 | Enhanced palette with improved accessibility |
| **1.0.0** | Jan 1, 2026 | Initial color system |

## 💬 Feedback

Have questions or suggestions?
- **Issues**: [GitHub Issues](https://github.com/0xdps/proofa-core/issues)
- **Discord**: [Community](https://discord.gg/proofa)
- **Email**: design@proofa.sh

---

**Made with ❤️ by the Proofa team**
