import {
	defineConfig,
	presetAttributify,
	presetIcons,
	presetWind3,
	transformerDirectives,
	transformerVariantGroup,
} from "unocss";

export default defineConfig({
	presets: [
		presetWind3(),
		presetAttributify(),
		presetIcons({ scale: 1.2, warn: true }),
	],
	transformers: [transformerDirectives(), transformerVariantGroup()],
	theme: {
		colors: {
			primary: "var(--primary)",
			"primary-hover": "var(--primary-hover)",
			"primary-light": "var(--primary-light)",

			"bg-page": "var(--bg-page)",
			"bg-surface": "var(--bg-surface)",
			"bg-muted": "var(--bg-muted)",
			"bg-hover": "var(--bg-hover)",

			// Card colors (admin dashboard)
			"card-bg": "var(--card-bg)",
			"card-border": "var(--card-border)",
			"surface-secondary": "var(--surface-secondary, rgba(255, 255, 255, 0.03))",

			border: "var(--border)",
			"border-hover": "var(--border-hover)",

			"text-primary": "var(--text-primary)",
			"text-secondary": "var(--text-secondary)",
			"text-tertiary": "var(--text-tertiary)",

			success: "var(--success)",
			"success-bg": "var(--success-bg)",
			"success-text": "var(--success-text)",
			warning: "var(--warning)",
			"warning-bg": "var(--warning-bg)",
			"warning-text": "var(--warning-text)",
			danger: "var(--danger)",
			"danger-bg": "var(--danger-bg)",
			"danger-text": "var(--danger-text)",
			info: "var(--info)",
			"info-bg": "var(--info-bg)",
			"info-text": "var(--info-text)",
		},
		borderRadius: {
			sm: "var(--radius-sm)",
			DEFAULT: "var(--radius)",
			md: "var(--radius-md)",
			lg: "var(--radius-lg)",
			xl: "var(--radius-xl)",
			"2xl": "var(--radius-2xl)",
			full: "var(--radius-full)",
		},
		transitionDuration: {
			DEFAULT: "var(--transition)",
		},
		boxShadow: {
			sm: "var(--shadow-sm)",
			md: "var(--shadow-md)",
			lg: "var(--shadow-lg)",
			xl: "var(--shadow-xl)",
		},
	},
	// Shortcuts use standard Tailwind classes only (not daisyUI)
	// For daisyUI component classes (btn, card, alert, etc.), use them directly in JSX
	shortcuts: {
		// Layout
		"app-layout": "min-h-screen bg-bg-page",
		"main-content": "max-w-1100px mx-auto px-12 py-8",

		// Login page - using CSS variables
		"login-container": "min-h-screen flex items-center justify-center p-5 bg-bg-muted",
		"login-card": "w-full max-w-400px bg-bg-surface rounded-lg shadow-xl p-10 text-center",
		"login-title": "text-xl font-semibold text-text-primary mb-2",
		"login-subtitle": "text-sm text-text-secondary mb-6",
		"login-terms": "text-xs text-text-tertiary mt-6",
		"login-loading": "flex flex-col items-center gap-4 py-8",
		"login-loading-text": "flex items-center gap-2 text-sm text-text-secondary",
		"login-footer": "text-xs text-text-tertiary mt-6",

		// Buttons
		"btn-base":
			"inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed",
		"btn-primary":
			"btn-base bg-primary text-white hover:bg-primary-hover",
		"btn-secondary":
			"btn-base bg-bg-surface border border-border text-text-primary hover:border-border-hover hover:bg-bg-hover",
		"btn-danger": 
			"btn-base bg-danger text-white hover:opacity-90",
		"btn-ghost": 
			"btn-base bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary",
		"btn-google":
			"inline-flex items-center justify-center gap-3 w-full px-5 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400",
		"btn-sm": "px-3 py-1.5 text-xs",

		// Cards
		"card": "bg-bg-surface border border-border rounded-lg overflow-hidden",
		"card-base": "bg-bg-surface border border-border rounded-lg overflow-hidden",
		"card-hover": "card-base hover:border-border-hover hover:shadow-md transition-all",
		"card-header": "flex items-center justify-between px-5 py-4 border-b border-border",
		"card-title": "text-sm font-semibold text-text-primary",
		"card-body": "p-5",

		// Forms
		"form-group": "mb-5",
		"form-label": "block text-13px font-medium text-text-primary mb-1.5",
		"form-control":
			"w-full px-3.5 py-2.5 text-sm border border-border rounded-md bg-bg-surface text-text-primary transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
		"form-hint": "text-12px text-text-tertiary mt-1.5",
		"input-group": "flex items-center gap-3",

		// Badges
		"badge": "inline-flex items-center gap-1 px-2.5 py-1 text-11px font-medium rounded-full",
		"badge-base": "inline-flex items-center gap-1 px-2.5 py-1 text-11px font-medium rounded-full",
		"badge-success": "badge-base bg-success-bg text-success-text",
		"badge-warning": "badge-base bg-warning-bg text-warning-text",
		"badge-danger": "badge-base bg-danger-bg text-danger-text",
		"badge-info": "badge-base bg-info-bg text-info-text",
		"badge-gray": "badge-base bg-bg-muted text-text-secondary",

		// Header
		"top-header":
			"flex items-center justify-between px-6 py-3 bg-bg-surface border-b border-border sticky top-0 z-50",
		"header-left": "flex items-center",
		"header-right": "flex items-center gap-4",
		"header-logo": "flex items-center gap-2 no-underline",
		"header-logo-img": "w-7 h-7 object-contain",
		"header-logo-text": "text-base font-semibold text-text-primary",
		"header-beta-badge": "px-2 py-0.5 text-10px font-semibold uppercase tracking-wider text-primary border border-primary/60 rounded-full ml-1",
		"header-theme-btn":
			"w-24 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary bg-bg-surface border border-border rounded-md cursor-pointer transition-all hover:bg-bg-hover hover:border-border-hover hover:text-text-primary",
		"header-theme-label": "text-13px",
		"header-user": "flex items-center gap-2.5",
		"header-avatar": "w-8 h-8 bg-bg-muted border border-border rounded-full flex items-center justify-center text-xs font-semibold text-text-secondary",
		"header-user-name": "text-sm font-medium text-text-primary",
		"nav-link":
			"flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-text-secondary no-underline rounded transition-all hover:text-text-primary hover:bg-bg-hover",
		"nav-link-active": "text-primary bg-primary-light",

		// Breadcrumbs
		"breadcrumbs": "flex items-center gap-2 mb-5 text-13px",
		"breadcrumb-item": "text-text-secondary no-underline transition-colors hover:text-primary",
		"breadcrumb-divider": "text-text-tertiary",
		"breadcrumb-current": "font-medium text-text-primary",

		// Profile
		"profile-header": "flex items-center gap-3 mb-6",
		"profile-avatar":
			"w-10 h-10 bg-bg-muted border-2 border-border rounded-full flex items-center justify-center text-sm font-semibold text-text-secondary",
		"profile-avatar-active": "bg-gradient-to-br from-primary to-purple-600 text-white border-none",
		"profile-info": "flex flex-col",
		"profile-info-name": "text-lg font-semibold text-text-primary",
		"profile-meta": "text-13px text-text-secondary mt-0.5",

		// Info grid
		"info-grid": "grid grid-cols-4 gap-px bg-border border border-border rounded-lg mb-6 overflow-hidden",
		"info-item": "bg-bg-surface px-5 py-4",
		"info-label": "text-11px font-semibold text-text-tertiary uppercase tracking-wide mb-1.5",
		"info-value": "text-sm font-medium text-text-primary flex items-center gap-1.5",
		"status-icon": "w-4 h-4 text-text-secondary",
		"status-dot": "w-2 h-2 rounded-full bg-success",

		// Tabs
		"tabs": "flex items-center gap-1 border-b border-border mb-6",
		"tab": "flex items-center gap-2 px-4 py-3 text-13px font-medium text-text-secondary no-underline border-b-2 border-transparent mb--1px transition-all cursor-pointer bg-transparent hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed",
		"tab-active": "text-primary border-b-primary",
		"tab-badge": "px-2 py-0.5 text-xs font-medium bg-bg-muted rounded-full text-text-secondary",
		"tab-icon": "w-4 h-4",

		// Table
		"table-container": "bg-bg-surface border border-border rounded-lg overflow-hidden",
		"table-account": "flex items-center gap-3",
		"table-account-icon": "w-9 h-9 bg-bg-muted rounded-md flex items-center justify-center",
		"table-account-info": "flex flex-col",
		"table-account-name": "text-sm font-medium text-text-primary",
		"table-account-email": "text-12px text-text-secondary",
		"table-date": "text-13px text-text-secondary",

		// Alerts
		"alert": "flex items-center gap-3 px-4 py-3 rounded-md mb-4 text-13px",
		"alert-base": "flex items-center gap-3 px-4 py-3 rounded-md mb-4 text-13px",
		"alert-success": "alert-base bg-success-bg text-success-text",
		"alert-warning": "alert-base bg-warning-bg text-warning-text",
		"alert-danger": "alert-base bg-danger-bg text-danger-text",
		"alert-info": "alert-base bg-info-bg text-info-text",
		"alert-bar": "flex items-center gap-3 px-4 py-3 bg-info-bg rounded-md mb-6 text-13px text-info-text",
		"alert-icon": "w-4.5 h-4.5 shrink-0",

		// Info list (for account info section)
		"info-list": "flex flex-col",
		"info-list-item": "flex items-center justify-between py-4 border-b border-border last:border-b-0",
		"info-list-label": "flex flex-col",
		"info-list-label-title": "text-sm font-medium text-text-primary",
		"info-list-label-desc": "text-12px text-text-tertiary mt-0.5",
		"info-list-value": "text-13px text-text-secondary",
		"info-list-code": "font-mono text-11px px-2 py-1 bg-bg-muted rounded",

		// Current Session Card
		"current-session-card":
			"bg-bg-surface border border-border border-l-3 border-l-success rounded-lg px-5 py-5 mb-6",
		"current-session-header": "flex items-center gap-3 mb-4",
		"current-session-icon": "w-10 h-10 bg-success-bg rounded-lg flex items-center justify-center text-success",
		"current-session-info": "flex flex-col",
		"current-session-info-title": "text-sm font-semibold text-text-primary",
		"current-session-info-desc": "text-13px text-text-secondary",
		"current-session-meta": "grid grid-cols-2 gap-4",
		"current-session-meta-item": "flex flex-col",
		"current-session-meta-label": "text-12px text-text-tertiary mb-1",
		"current-session-meta-value": "text-13px font-medium text-text-primary",

		// Loading
		"spinner": "w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin",
		"loading": "flex flex-col items-center justify-center p-12 gap-3",
		"loading-text": "text-sm text-text-secondary",

		// Empty state
		"empty-state": "text-center py-12 px-6",
		"empty-state-icon":
			"w-14 h-14 mx-auto mb-4 bg-bg-muted rounded-lg flex items-center justify-center text-text-tertiary",
		"empty-state-title": "text-base font-semibold text-text-primary mb-2",
		"empty-state-desc": "text-sm text-text-secondary max-w-280px mx-auto",

		// Modal
		"modal-overlay": "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
		"modal-box": "bg-bg-surface rounded-lg shadow-xl max-w-lg w-full mx-4 p-6",
		"modal-header": "font-bold text-lg mb-4",
		"modal-body": "py-4",
		"modal-footer": "flex justify-end gap-2 pt-4",
	},
	safelist: [
		// Theme colors
		"text-primary",
		"text-secondary",
		"text-tertiary",
		"bg-primary",
		"border-primary",
		"hover:bg-primary-hover",
		// Login
		"login-container",
		"login-card",
		"login-title",
		"login-subtitle",
		"btn-google",
		// Core components
		"card",
		"card-header",
		"card-title",
		"card-body",
		"tabs",
		"tab",
		"tab-active",
		"badge",
		"badge-success",
		"badge-info",
		"alert",
		"alert-success",
		"spinner",
		"loading",
		"loading-text",
		// Profile
		"profile-header",
		"profile-avatar",
		"profile-info",
		"profile-meta",
		"breadcrumbs",
		"breadcrumb-item",
		"breadcrumb-divider",
		"breadcrumb-current",
		// Forms
		"form-group",
		"form-label",
		"form-hint",
		"input-group",
		// Info grid
		"info-grid",
		"info-item",
		"info-label",
		"info-value",
		"status-icon",
		"status-dot",
		// Info list
		"info-list",
		"info-list-item",
		"info-list-label",
		"info-list-value",
		// Buttons
		"btn-primary",
		"btn-secondary",
		"btn-danger",
		"btn-ghost",
	],
	rules: [
		["text-10px", { "font-size": "10px" }],
		["text-11px", { "font-size": "11px" }],
		["text-12px", { "font-size": "12px" }],
		["text-13px", { "font-size": "13px" }],
		["text-14px", { "font-size": "14px" }],
		["text-15px", { "font-size": "15px" }],
		["text-16px", { "font-size": "16px" }],
		["text-18px", { "font-size": "18px" }],
		["text-20px", { "font-size": "20px" }],
		["text-24px", { "font-size": "24px" }],
		["text-28px", { "font-size": "28px" }],
		["w-280px", { width: "280px" }],
		["w-320px", { width: "320px" }],
		["w-400px", { width: "400px" }],
		["max-w-280px", { "max-width": "280px" }],
		["max-w-400px", { "max-width": "400px" }],
		["max-w-500px", { "max-width": "500px" }],
		["max-w-600px", { "max-width": "600px" }],
		["max-w-1100px", { "max-width": "1100px" }],
		["mb--1px", { "margin-bottom": "-1px" }],
		["border-l-3", { "border-left-width": "3px" }],
		["pl-292px", { "padding-left": "292px" }],
	],
});
