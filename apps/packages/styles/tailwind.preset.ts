import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS Preset for Proofa
 * 
 * Maps all design tokens from theme.css to Tailwind configuration.
 * This preset is extended by all dashboards (Home, Docs, User, Admin).
 * 
 * Theme variables are kept in theme.css for consistency with existing architecture.
 * This preset bridges CSS variables to Tailwind's config system.
 */

const preset: Config = {
  theme: {
    extend: {
      // Colors - mapped from CSS variables in theme.css
      colors: {
        // Primary brand colors
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-light': 'var(--primary-light)',

        // Sidebar colors
        'sidebar-bg': 'var(--sidebar-bg)',
        'sidebar-border': 'var(--sidebar-border)',
        'sidebar-text': 'var(--sidebar-text)',
        'sidebar-text-hover': 'var(--sidebar-text-hover)',
        'sidebar-active-bg': 'var(--sidebar-active-bg)',
        'sidebar-active-text': 'var(--sidebar-active-text)',
        'sidebar-section-text': 'var(--sidebar-section-text)',

        // Header/Topbar colors
        'top-header-bg': 'var(--top-header-bg)',

        // Content area colors
        'content-bg': 'var(--content-bg)',
        'card-bg': 'var(--card-bg)',
        'card-border': 'var(--card-border)',
        'card-hover-border': 'var(--card-hover-border)',

        // Legacy/compat aliases
        'bg-page': 'var(--content-bg)',
        'bg-surface': 'var(--card-bg)',
        'bg-muted': 'var(--surface-secondary, rgba(255, 255, 255, 0.04))',
        'bg-hover': 'var(--surface-hover, rgba(255, 255, 255, 0.06))',
        'border': 'var(--card-border)',
        'border-hover': 'var(--card-hover-border)',

        // Surface variations
        'surface-secondary': 'var(--surface-secondary, rgba(255, 255, 255, 0.04))',
        'surface-hover': 'var(--surface-hover, rgba(255, 255, 255, 0.06))',

        // Text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-link': 'var(--text-link)',

        // Status colors
        success: 'var(--success)',
        'success-bg': 'var(--success-bg)',
        'success-text': 'var(--success-text)',
        warning: 'var(--warning)',
        'warning-bg': 'var(--warning-bg)',
        'warning-text': 'var(--warning-text)',
        danger: 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        'danger-text': 'var(--danger-text)',
        info: 'var(--info)',
        'info-bg': 'var(--info-bg)',
        'info-text': 'var(--info-text)',

        // Code colors
        'code-bg': 'var(--code-bg)',
        'code-text': 'var(--code-text)',
        'code-border': 'var(--code-border)',
      },

      // Border radius
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },

      // Transitions
      transitionDuration: {
        DEFAULT: 'var(--transition)',
      },

      // Shadows
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },

      // Font sizes - custom sizes needed across dashboards
      fontSize: {
        '10px': '10px',
        '11px': '11px',
        '12px': '12px',
        '13px': '13px',
        '14px': '14px',
        '15px': '15px',
        '16px': '16px',
        '18px': '18px',
        '20px': '20px',
        '24px': '24px',
        '28px': '28px',
      },

      // Custom widths
      width: {
        '280px': '280px',
        '320px': '320px',
        '400px': '400px',
      },

      // Custom max-widths
      maxWidth: {
        '280px': '280px',
        '400px': '400px',
        '500px': '500px',
        '600px': '600px',
        '1100px': '1100px',
      },

      // Spacing (custom values if needed beyond default Tailwind)
      spacing: {
        '260px': '260px',
        '61px': '61px',
        '292px': '292px',
      },

      // Custom margin values
      margin: {
        '-1px': '-1px',
      },

      // Border widths
      borderWidth: {
        '3': '3px',
      },

      // Letter spacing
      letterSpacing: {
        wider: '0.1em',
        widest: '0.15em',
      },
    },
  },

  plugins: [
    // Form plugin for better form styling
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    // Typography plugin for prose styling
    require('@tailwindcss/typography'),
  ],
};

export default preset;
