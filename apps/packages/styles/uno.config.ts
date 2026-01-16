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
		// Buttons - Map to daisyUI btn classes
		"btn-base": "btn",
		"btn-primary": "btn btn-primary",
		"btn-secondary": "btn btn-outline",
		"btn-danger": "btn btn-error",
		"btn-ghost": "btn btn-ghost",
		"btn-google":
			"btn btn-outline gap-3 bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400",
		"btn-sm": "btn-sm",

		// Cards - Map to daisyUI card classes
		card: "card bg-base-100 border border-base-300 shadow-sm",
		"card-hover": "card bg-base-100 border border-base-300 shadow-sm hover:border-primary hover:shadow-md transition-all",

		// Forms - Map to daisyUI form classes
		"form-label": "label",
		"form-control": "input input-bordered w-full",
		"form-select": "select select-bordered w-full",
		"form-textarea": "textarea textarea-bordered w-full",
		"form-checkbox": "checkbox checkbox-primary",
		"form-toggle": "toggle toggle-primary",

		// Badges - Map to daisyUI badge classes
		badge: "badge",
		"badge-success": "badge badge-success",
		"badge-warning": "badge badge-warning",
		"badge-danger": "badge badge-error",
		"badge-info": "badge badge-info",
		"badge-gray": "badge badge-ghost",

		// Layout
		"app-layout": "min-h-screen bg-base-200",
		"main-content": "max-w-1100px mx-auto px-12 py-8",

		// Header
		"top-header":
			"navbar bg-base-100 border-b border-base-300 sticky top-0 z-50 px-8",
		"header-logo": "flex items-center gap-2.5 no-underline",
		"header-nav": "flex items-center gap-1",
		"header-btn": "btn btn-ghost btn-sm gap-1.5",
		"nav-link":
			"btn btn-ghost btn-sm gap-1.5 font-medium",
		"nav-link-active": "btn-active",

		// Breadcrumbs - Map to daisyUI breadcrumbs
		breadcrumbs: "breadcrumbs text-sm",
		"breadcrumb-item": "text-base-content/60 hover:text-primary",
		"breadcrumb-current": "font-medium text-base-content",

		// Profile
		"profile-header": "flex items-center gap-3 mb-6",
		"profile-avatar": "avatar placeholder",
		"profile-avatar-active": "bg-gradient-to-br from-primary to-secondary text-primary-content",

		// Info grid
		"info-grid": "stats stats-vertical lg:stats-horizontal shadow border border-base-300 mb-6 w-full",
		"info-item": "stat",
		"info-label": "stat-title",
		"info-value": "stat-value text-lg",

		// Tabs - Map to daisyUI tabs
		tabs: "tabs tabs-bordered",
		tab: "tab",
		"tab-active": "tab-active",
		"tab-badge": "badge badge-sm badge-ghost ml-2",

		// Table - Map to daisyUI table
		"table-container": "overflow-x-auto bg-base-100 rounded-lg border border-base-300",
		"data-table": "table table-zebra",

		// Alert - Map to daisyUI alert
		alert: "alert",
		"alert-success": "alert alert-success",
		"alert-warning": "alert alert-warning",
		"alert-danger": "alert alert-error",
		"alert-info": "alert alert-info",
		"alert-bar": "alert alert-info",

		// Current Session Card
		"current-session-card":
			"card bg-base-100 border border-base-300 border-l-4 border-l-success p-5 mb-6",

		// Loading - Map to daisyUI loading
		spinner: "loading loading-spinner",
		"spinner-sm": "loading loading-spinner loading-sm",
		"spinner-md": "loading loading-spinner loading-md",
		"spinner-lg": "loading loading-spinner loading-lg",
		loading: "flex items-center justify-center p-12",

		// Empty state
		"empty-state": "text-center py-12 px-6",
		"empty-state-icon":
			"w-14 h-14 mx-auto mb-4 bg-base-200 rounded-lg flex items-center justify-center text-base-content/50",
		"empty-state-title": "text-lg font-semibold text-base-content mb-2",
		"empty-state-desc": "text-sm text-base-content/70 max-w-280px mx-auto",

		// Login page
		"login-container": "min-h-screen flex items-center justify-center p-5 bg-base-200",
		"login-card": "card w-full max-w-400px bg-base-100 shadow-xl p-10 text-center",
		"login-icon":
			"w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mx-auto mb-5",

		// Modal - Map to daisyUI modal
		"modal-overlay": "modal modal-open",
		"modal-box": "modal-box",
		"modal-header": "font-bold text-lg mb-4",
		"modal-body": "py-4",
		"modal-footer": "modal-action",

		// Dropdown - Map to daisyUI dropdown
		dropdown: "dropdown",
		"dropdown-content": "dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-50",

		// Tooltip - Map to daisyUI tooltip
		tooltip: "tooltip",

		// Progress - Map to daisyUI progress
		progress: "progress",
		"progress-primary": "progress progress-primary",
		"progress-success": "progress progress-success",
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
