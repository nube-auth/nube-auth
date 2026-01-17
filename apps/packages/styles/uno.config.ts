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
			// Primary colors (from theme.css)
			primary: "var(--primary)",
			"primary-hover": "var(--primary-hover)",
			"primary-light": "var(--primary-light)",

			// Sidebar colors (from theme.css)
			"sidebar-bg": "var(--sidebar-bg)",
			"sidebar-border": "var(--sidebar-border)",
			"sidebar-text": "var(--sidebar-text)",
			"sidebar-text-hover": "var(--sidebar-text-hover)",
			"sidebar-active-bg": "var(--sidebar-active-bg)",
			"sidebar-active-text": "var(--sidebar-active-text)",
			"sidebar-section-text": "var(--sidebar-section-text)",

			// Topbar (from theme.css)
			"top-header-bg": "var(--top-header-bg)",

			// Content area (from theme.css)
			"content-bg": "var(--content-bg)",
			"card-bg": "var(--card-bg)",
			"card-border": "var(--card-border)",
			"card-hover-border": "var(--card-hover-border)",

			// Legacy aliases (user dashboard compatibility)
			"bg-page": "var(--content-bg)",
			"bg-surface": "var(--card-bg)",
			"bg-muted": "var(--surface-secondary, rgba(255, 255, 255, 0.04))",
			"bg-hover": "var(--surface-hover, rgba(255, 255, 255, 0.06))",
			border: "var(--card-border)",
			"border-hover": "var(--card-hover-border)",

			// Surface colors (from theme.css)
			"surface-secondary": "var(--surface-secondary, rgba(255, 255, 255, 0.04))",
			"surface-hover": "var(--surface-hover, rgba(255, 255, 255, 0.06))",

			// Text colors (from theme.css)
			"text-primary": "var(--text-primary)",
			"text-secondary": "var(--text-secondary)",
			"text-tertiary": "var(--text-tertiary)",
			"text-link": "var(--text-link)",

			// Status colors (from theme.css)
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

			// Code colors (from theme.css)
			"code-bg": "var(--code-bg)",
			"code-text": "var(--code-text)",
			"code-border": "var(--code-border)",
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
		// Layout - Admin Dashboard
		"app-layout": "flex min-h-screen",
		"main-content": "flex-1 ml-260px min-h-screen",
		"page-content": "p-5 px-6",
		"page-header": "flex items-start justify-between mb-6",
		"page-title": "text-24px font-bold text-text-primary mb-1",
		"page-description": "text-14px text-text-secondary",

		// Sidebar (Complex - may need CSS for some parts)
		"sidebar": "w-260px bg-sidebar-bg border-r border-sidebar-border flex flex-col fixed top-0 left-0 bottom-0 z-50",
		"sidebar-header": "h-61px px-5 flex items-center border-b border-sidebar-border",
		"sidebar-logo": "flex items-center gap-2 no-underline",
		"sidebar-logo-img": "w-28px h-28px object-contain",
		"sidebar-logo-name": "text-16px font-semibold text-white",
		"sidebar-logo-badge": "text-10px font-semibold px-2 py-0.5 text-primary border border-primary/60 rounded-full uppercase tracking-widest",
		"sidebar-nav": "flex-1 p-2 px-3 overflow-y-auto",
		"sidebar-section": "mb-5",
		"sidebar-section-title": "px-3 py-2 text-11px font-semibold text-sidebar-section-text uppercase tracking-wider",
		"sidebar-link": "flex items-center gap-2.5 px-3 py-2 text-13px font-medium text-white/70 no-underline rounded-md transition-all mb-0.5 relative hover:text-white/95 hover:bg-white/8",
		"sidebar-link-active": "text-sidebar-active-text bg-sidebar-active-bg",
		"sidebar-link-badge": "ml-auto px-1.5 py-0.5 bg-primary rounded-full text-10px font-semibold text-white",
		"sidebar-footer": "p-3 border-t border-sidebar-border",
		"sidebar-user": "flex items-center gap-2.5 p-2.5 rounded-md cursor-pointer transition-all hover:bg-white/5",
		"sidebar-avatar": "w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-12px font-semibold text-white",
		"sidebar-user-info": "flex-1 min-w-0",
		"sidebar-user-name": "text-13px font-medium text-white truncate",
		"sidebar-user-email": "text-11px text-sidebar-text truncate",

		// Top Header
		"top-header": "h-61px flex items-center justify-between px-6 bg-top-header-bg border-b border-card-border sticky top-0 z-40",
		"top-header-left": "flex items-center gap-4",
		"top-header-right": "flex items-center gap-3",
		"header-btn": "flex items-center gap-1.5 px-3.5 py-2 text-13px font-medium rounded-md border border-card-border bg-card-bg text-text-secondary cursor-pointer transition-all hover:border-card-hover-border hover:text-text-primary no-underline",
		"header-btn-primary": "bg-primary border-primary text-white hover:bg-primary-hover hover:border-primary-hover hover:text-white",

		// Breadcrumbs
		"breadcrumb": "flex items-center gap-2 text-13px",
		"breadcrumb-item": "text-text-secondary no-underline transition-colors hover:text-text-primary",
		"breadcrumb-divider": "text-text-tertiary",
		"breadcrumb-current": "font-medium text-text-primary",

		// Buttons - Enhanced for admin
		"btn": "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-13px font-medium rounded-md border-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed",
		"btn-primary": "btn bg-primary text-white hover:bg-primary-hover",
		"btn-secondary": "btn bg-card-bg border border-card-border text-text-secondary hover:border-card-hover-border hover:text-text-primary",
		"btn-danger": "btn bg-danger text-white hover:bg-red-600",
		"btn-ghost": "btn bg-transparent text-text-secondary hover:bg-content-bg hover:text-text-primary",
		"btn-sm": "px-3 py-1.5 text-12px",
		"btn-google": "inline-flex items-center justify-center gap-3 w-full px-5 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400",

		// Cards - Enhanced
		"card": "bg-card-bg border border-card-border rounded-lg overflow-hidden",
		"card-hover": "card hover:border-card-hover-border hover:shadow-md transition-all",
		"card-header": "flex items-center justify-between px-5 py-4 border-b border-card-border",
		"card-title": "text-14px font-semibold text-text-primary",
		"card-desc": "text-12px text-text-secondary mt-0.5",
		"card-body": "p-5",

		// Stats Cards
		"stats-grid": "grid grid-cols-4 gap-4 mb-6",
		"stat-card": "bg-card-bg border border-card-border rounded-lg p-5",
		"stat-card-header": "flex items-center justify-between mb-3",
		"stat-icon": "w-10 h-10 rounded-md flex items-center justify-center",
		"stat-icon-blue": "stat-icon bg-info-bg text-info",
		"stat-icon-green": "stat-icon bg-success-bg text-success",
		"stat-icon-purple": "stat-icon bg-purple-100 text-purple-600",
		"stat-icon-orange": "stat-icon bg-warning-bg text-warning",
		"stat-trend": "flex items-center gap-1 text-11px font-medium",

		// Icon gradient backgrounds
		"icon-gradient-primary": "bg-primary/10",
		"icon-gradient-success": "bg-success/10",
		"icon-gradient-info": "bg-info/10",
		"icon-gradient-warning": "bg-warning/10",
		"stat-trend-up": "stat-trend text-success",
		"stat-trend-down": "stat-trend text-danger",
		"stat-value": "text-28px font-bold text-text-primary leading-none",
		"stat-label": "text-13px text-text-secondary mt-1",

		// Grids
		"grid-2": "grid grid-cols-2 gap-4",
		"grid-3": "grid grid-cols-3 gap-4",
		"grid-4": "grid grid-cols-4 gap-4",
		"projects-grid": "grid grid-cols-3 gap-4",
		"integrations-grid": "grid grid-cols-4 gap-4",
		"quickstart-steps": "grid grid-cols-4 gap-4",

		// Project Cards
		"project-card": "bg-card-bg border border-card-border rounded-lg p-5 no-underline block transition-all hover:border-primary hover:shadow-md hover:-translate-y-0.5",
		"project-card-header": "flex items-center justify-between mb-4",
		"project-icon": "w-10 h-10 bg-gradient-to-br from-primary-light to-purple-100 rounded-md flex items-center justify-center",
		"project-status": "flex items-center gap-1.5 text-11px font-medium text-success",
		"status-dot": "w-1.5 h-1.5 bg-success rounded-full",
		"project-card-body": "mb-4",
		"project-name": "text-15px font-semibold text-text-primary mb-1",
		"project-slug": "text-12px text-text-secondary",
		"project-card-footer": "flex items-center justify-between",
		"project-id": "font-mono text-11px text-text-tertiary bg-content-bg px-2 py-1 rounded-sm",

		// Integration Cards
		"integration-card": "bg-card-bg border border-card-border rounded-lg p-5 flex items-center gap-3.5 cursor-pointer transition-all hover:border-primary hover:shadow-md",
		"integration-icon": "w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0",
		"integration-info": "flex flex-col",
		"integration-name": "text-14px font-semibold text-text-primary",
		"integration-desc": "text-12px text-text-secondary mt-0.5",
		"integration-actions": "flex flex-col gap-2",
		"integration-btn": "flex items-center justify-center gap-1.5 px-3 py-2 text-12px font-medium rounded-md border border-card-border bg-card-bg text-text-primary cursor-pointer transition-all hover:border-primary hover:text-primary no-underline",

		// Quickstart
		"quickstart-card": "bg-card-bg border border-card-border rounded-lg p-6 mb-6",
		"quickstart-step": "bg-card-bg border border-card-border rounded-lg p-5 flex gap-3.5 transition-all hover:border-card-hover-border",
		"quickstart-step-number": "w-7 h-7 bg-primary rounded-full flex items-center justify-center text-13px font-semibold text-white flex-shrink-0",
		"quickstart-step-content": "flex-1",
		"quickstart-step-title": "text-14px font-semibold text-text-primary mb-1",
		"quickstart-step-desc": "text-12px text-text-secondary leading-relaxed",

		// Get Started Card
		"get-started-card": "bg-card-bg border border-card-border rounded-lg p-6 mb-6 relative",
		"get-started-header": "flex items-center gap-2 mb-4",
		"get-started-icon": "text-18px",
		"get-started-title": "text-13px font-semibold text-text-primary",
		"get-started-close": "absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-md border-none bg-transparent text-text-tertiary cursor-pointer transition-all hover:bg-content-bg hover:text-text-primary",
		"get-started-content": "flex gap-8",
		"get-started-info": "flex-1",
		"get-started-actions": "flex gap-3",
		"get-started-preview": "w-320px h-160px bg-code-bg rounded-md p-4 font-mono text-11px leading-relaxed text-code-text overflow-hidden",

		// Section Headers
		"section-header": "flex items-center justify-between mb-4",
		"section-title": "flex items-center gap-2 text-13px font-semibold text-text-primary",
		"section-link": "flex items-center gap-1 text-13px text-text-secondary no-underline transition-colors hover:text-primary",

		// Forms
		"form-group": "mb-4",
		"form-label": "block text-13px font-medium text-text-primary mb-1.5",
		"form-control": "w-full px-3.5 py-2.5 text-13px border border-card-border rounded-md bg-card-bg text-text-primary transition-all focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10",
		"form-hint": "text-12px text-text-tertiary mt-1.5",
		"input-group": "flex items-center gap-3",

		// Badges
		"badge": "inline-flex items-center gap-1 px-2.5 py-1 text-11px font-medium rounded-full",
		"badge-success": "badge bg-success-bg text-success-text",
		"badge-warning": "badge bg-warning-bg text-warning-text",
		"badge-danger": "badge bg-danger-bg text-danger-text",
		"badge-info": "badge bg-info-bg text-info-text",
		"badge-gray": "badge bg-content-bg text-text-secondary",

		// Alerts
		"alert": "flex items-start gap-3 px-4 py-4 rounded-md",
		"alert-success": "alert bg-success-bg text-success-text",
		"alert-warning": "alert bg-warning-bg text-warning-text",
		"alert-danger": "alert bg-danger-bg text-danger-text",
		"alert-info": "alert bg-info-bg text-info-text",

		// Empty State
		"empty-state": "text-center py-12 px-6",
		"empty-state-icon": "w-16 h-16 mx-auto mb-4 bg-content-bg rounded-lg flex items-center justify-center text-text-tertiary",
		"empty-state-title": "text-15px font-semibold text-text-primary mb-2",
		"empty-state-desc": "text-13px text-text-secondary max-w-320px mx-auto",

		// Spinner/Loading
		"spinner": "w-6 h-6 border-2 border-card-border border-t-primary rounded-full animate-spin",
		"loading": "flex items-center justify-center p-12",
		"loading-text": "text-sm text-text-secondary",

		// Avatar
		"avatar": "w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-13px font-semibold",
		"avatar-sm": "w-7 h-7 text-11px",

		// Code Display
		"code-inline": "px-2 py-0.5 bg-content-bg rounded-sm font-mono text-12px text-text-primary",
		"code-input": "flex items-center gap-2 bg-code-bg border border-code-border rounded-md px-3 py-2.5",
		"code-input-btn": "p-1 bg-transparent border-none text-text-tertiary cursor-pointer rounded-sm transition-all hover:text-code-text hover:bg-white/10",
		"code-preview": "bg-code-bg border border-code-border rounded-md overflow-hidden",
		"code-preview-header": "flex items-center gap-1.5 px-3.5 py-2.5 bg-black/30 border-b border-code-border",
		"code-preview-dot": "w-2.5 h-2.5 rounded-full",
		"code-preview-content": "p-4 font-mono text-11px leading-relaxed text-code-text overflow-hidden m-0",

		// User Dashboard - Profile
		"profile-header": "flex items-center gap-3 mb-6",
		"profile-avatar": "w-10 h-10 bg-bg-muted border-2 border-border rounded-full flex items-center justify-center text-sm font-semibold text-text-secondary",
		"profile-avatar-active": "bg-gradient-to-br from-primary to-purple-600 text-white border-none",
		"profile-info": "flex flex-col",
		"profile-info-name": "text-lg font-semibold text-text-primary",
		"profile-meta": "text-13px text-text-secondary mt-0.5",

		// User Dashboard - Info Grid
		"info-grid": "grid grid-cols-4 gap-px bg-border border border-border rounded-lg mb-6 overflow-hidden",
		"info-item": "bg-bg-surface px-5 py-4",
		"info-label": "text-11px font-semibold text-text-tertiary uppercase tracking-wide mb-1.5",
		"info-value": "text-sm font-medium text-text-primary flex items-center gap-1.5",
		"status-icon": "w-4 h-4 text-text-secondary",

		// User Dashboard - Tabs
		"tabs": "flex items-center gap-1 border-b border-border mb-6",
		"tab": "flex items-center gap-2 px-4 py-3 text-13px font-medium text-text-secondary no-underline border-b-2 border-transparent mb--1px transition-all cursor-pointer bg-transparent hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed",
		"tab-active": "text-primary border-b-primary",
		"tab-badge": "px-2 py-0.5 text-xs font-medium bg-bg-muted rounded-full text-text-secondary",
		"tab-icon": "w-4 h-4",

		// User Dashboard - Table
		"table-container": "bg-bg-surface border border-border rounded-lg overflow-hidden",
		"table-account": "flex items-center gap-3",
		"table-account-icon": "w-9 h-9 bg-bg-muted rounded-md flex items-center justify-center",
		"table-account-info": "flex flex-col",
		"table-account-name": "text-sm font-medium text-text-primary",
		"table-account-email": "text-12px text-text-secondary",
		"table-date": "text-13px text-text-secondary",

		// User Dashboard - Info List
		"info-list": "flex flex-col",
		"info-list-item": "flex items-center justify-between py-4 border-b border-border last:border-b-0",
		"info-list-label": "flex flex-col",
		"info-list-label-title": "text-sm font-medium text-text-primary",
		"info-list-label-desc": "text-12px text-text-tertiary mt-0.5",
		"info-list-value": "text-13px text-text-secondary",
		"info-list-code": "font-mono text-11px px-2 py-1 bg-bg-muted rounded",

		// User Dashboard - Current Session
		"current-session-card": "bg-bg-surface border border-border border-l-3 border-l-success rounded-lg px-5 py-5 mb-6",
		"current-session-header": "flex items-center gap-3 mb-4",
		"current-session-icon": "w-10 h-10 bg-success-bg rounded-lg flex items-center justify-center text-success",
		"current-session-info": "flex flex-col",
		"current-session-info-title": "text-sm font-semibold text-text-primary",
		"current-session-info-desc": "text-13px text-text-secondary",
		"current-session-meta": "grid grid-cols-2 gap-4",
		"current-session-meta-item": "flex flex-col",
		"current-session-meta-label": "text-12px text-text-tertiary mb-1",
		"current-session-meta-value": "text-13px font-medium text-text-primary",

		// Shared - Modal
		"modal-overlay": "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
		"modal-box": "bg-bg-surface rounded-lg shadow-xl max-w-lg w-full mx-4 p-6",
		"modal-header": "font-bold text-lg mb-4",
		"modal-body": "py-4",
		"modal-footer": "flex justify-end gap-2 pt-4",

		// Shared - Login
		"login-container": "min-h-screen flex items-center justify-center p-5 bg-bg-muted",
		"login-card": "w-full max-w-400px bg-bg-surface rounded-lg shadow-xl p-10 text-center",
		"login-title": "text-xl font-semibold text-text-primary mb-2",
		"login-subtitle": "text-sm text-text-secondary mb-6",
		"login-terms": "text-xs text-text-tertiary mt-6",
		"login-loading": "flex flex-col items-center gap-4 py-8",
		"login-loading-text": "flex items-center gap-2 text-sm text-text-secondary",
		"login-footer": "text-xs text-text-tertiary mt-6",
		"alert-bar": "flex items-center gap-3 px-4 py-3 bg-info-bg rounded-md mb-6 text-13px text-info-text",
		"alert-icon": "w-4.5 h-4.5 shrink-0",
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
