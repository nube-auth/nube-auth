import {
	defineConfig,
	presetAttributify,
	presetIcons,
	presetUno,
	transformerDirectives,
	transformerVariantGroup,
} from "unocss";
import { presetDaisy } from "@ameinhardt/unocss-preset-daisy";

export default defineConfig({
	presets: [
		presetUno(),
		presetAttributify(),
		presetIcons({ scale: 1.2, warn: true }),
		presetDaisy({
			// Use your custom theme colors
			themes: ["light", "dark"],
		}),
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
	shortcuts: {
		// Buttons
		"btn-base":
			"inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-14px font-medium rounded border-none cursor-pointer transition-all",
		"btn-primary":
			"btn-base bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed",
		"btn-secondary":
			"btn-base bg-bg-surface border border-border text-text-primary hover:border-border-hover hover:bg-bg-hover disabled:opacity-50",
		"btn-danger": "btn-base bg-danger text-white hover:bg-red-600 disabled:opacity-50",
		"btn-ghost": "btn-base bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary",
		"btn-google":
			"flex items-center justify-center gap-3 px-5 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg text-15px font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400",
		"btn-sm": "px-3 py-1.5 text-12px",

		// Cards
		card: "bg-bg-surface border border-border rounded-lg overflow-hidden",
		"card-hover": "card hover:border-border-hover hover:shadow-md transition-all",

		// Forms
		"form-label": "block text-13px font-medium text-text-primary mb-1.5",
		"form-control":
			"w-full px-3.5 py-2.5 text-14px border border-border rounded-md bg-bg-surface text-text-primary transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]",

		// Badges
		badge: "inline-flex items-center gap-1 px-2.5 py-1 text-11px font-medium rounded-full",
		"badge-success": "badge bg-success-bg text-success-text",
		"badge-warning": "badge bg-warning-bg text-warning-text",
		"badge-danger": "badge bg-danger-bg text-danger-text",
		"badge-info": "badge bg-info-bg text-info-text",
		"badge-gray": "badge bg-bg-muted text-text-secondary",

		// Layout
		"app-layout": "min-h-screen bg-bg-page",
		"main-content": "max-w-1100px mx-auto px-12 py-8",

		// Header
		"top-header":
			"flex items-center justify-between px-8 py-3 bg-bg-surface border-b border-border sticky top-0 z-50",
		"header-logo": "flex items-center gap-2.5 no-underline",
		"header-nav": "flex items-center gap-1",
		"header-btn":
			"flex items-center gap-1.5 px-3.5 py-2 text-13px font-medium text-text-secondary bg-bg-surface border border-border rounded cursor-pointer transition-all hover:bg-bg-hover hover:border-border-hover hover:text-text-primary",
		"nav-link":
			"flex items-center gap-1.5 px-3.5 py-2 text-13px font-medium text-text-secondary no-underline rounded transition-all hover:text-text-primary hover:bg-bg-hover",
		"nav-link-active": "text-primary bg-primary-light",

		// Breadcrumbs
		breadcrumbs: "flex items-center gap-2 mb-4 text-13px",
		"breadcrumb-item": "text-text-secondary no-underline transition-colors hover:text-primary",
		"breadcrumb-current": "font-medium text-text-primary",

		// Profile
		"profile-header": "flex items-center gap-3 mb-6",
		"profile-avatar":
			"w-10 h-10 bg-bg-muted border-2 border-border rounded-full flex items-center justify-center text-14px font-semibold text-text-secondary",
		"profile-avatar-active": "bg-gradient-to-br from-primary to-purple-600 text-white border-none",

		// Info grid
		"info-grid": "grid grid-cols-4 gap-px bg-border border border-border rounded-lg mb-6 overflow-hidden",
		"info-item": "bg-bg-surface px-5 py-4",
		"info-label": "text-11px font-medium text-text-tertiary uppercase tracking-wide mb-1.5",
		"info-value": "text-14px font-medium text-text-primary flex items-center gap-1.5",

		// Tabs
		tabs: "flex items-center gap-2 border-b border-border mb-6",
		tab: "flex items-center gap-2 px-4 py-3 text-14px font-medium text-text-secondary no-underline border-b-2 border-transparent mb--1px transition-all cursor-pointer bg-transparent hover:text-text-primary",
		"tab-active": "text-primary border-b-primary",
		"tab-badge": "px-2 py-0.5 text-11px font-medium bg-bg-muted rounded-full text-text-secondary",

		// Table
		"table-container": "bg-bg-surface border border-border rounded-lg overflow-hidden",

		// Alert
		alert: "flex items-start gap-3 px-4 py-3 rounded-md mb-5 text-13px",
		"alert-success": "bg-success-bg text-success-text",
		"alert-warning": "bg-warning-bg text-warning-text",
		"alert-danger": "bg-danger-bg text-danger-text",
		"alert-info": "bg-info-bg text-info-text",
		"alert-bar": "flex items-center gap-2 px-4 py-3 bg-info-bg rounded-md mb-5 text-13px text-info-text",

		// Current Session Card
		"current-session-card":
			"bg-bg-surface border border-border border-l-3 border-l-success rounded-lg px-5 py-5 mb-6",

		// Loading
		spinner: "w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin",
		loading: "flex items-center justify-center p-12",

		// Empty state
		"empty-state": "text-center py-12 px-6",
		"empty-state-icon":
			"w-14 h-14 mx-auto mb-4 bg-bg-muted rounded-lg flex items-center justify-center text-text-tertiary",
		"empty-state-title": "text-15px font-semibold text-text-primary mb-2",
		"empty-state-desc": "text-13px text-text-secondary max-w-280px mx-auto",

		// Login page
		"login-container": "min-h-screen flex items-center justify-center p-5 bg-bg-muted",
		"login-card": "w-full max-w-400px bg-bg-surface border border-border rounded-lg px-10 py-10 text-center",
		"login-icon":
			"w-14 h-14 bg-gradient-to-br from-primary to-purple-600 rounded-md flex items-center justify-center mx-auto mb-5",
	},
	safelist: [
		"text-primary",
		"text-secondary",
		"text-tertiary",
		"bg-primary",
		"border-primary",
		"hover:bg-primary-hover",
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
		["max-w-1100px", { "max-width": "1100px" }],
		["mb--1px", { "margin-bottom": "-1px" }],
		["border-l-3", { "border-left-width": "3px" }],
	],
});
