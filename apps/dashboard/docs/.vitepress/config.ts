import { defineConfig } from "vitepress";

const dev = process.env.NODE_ENV !== "production";
const envTag = (process.env.VITE_ENV_TAG || (dev ? "Local" : "Beta")).replace(/[^a-zA-Z0-9 ._-]/g, "") || "Beta";
const adminUrl = process.env.VITE_ADMIN_URL || (dev ? "http://localhost:5174" : "https://manage.nubeauth.com");
const userUrl = process.env.VITE_USER_URL || (dev ? "http://localhost:5173" : "https://me.nubeauth.com");
const homeUrl = process.env.VITE_HOME_URL || (dev ? "http://localhost:4321" : "https://nubeauth.com");

export default defineConfig({
	srcExclude: ["src/**"],
	title: "Nube Auth",
	description: "Authentication, session management, and licensing for modern applications",

	// Site config
	lang: "en-US",
	lastUpdated: true,
	cleanUrls: true,
	ignoreDeadLinks: true, // Ignore dead links during build

	// Site metadata
	head: [
		["link", { rel: "icon", href: "/favicon.png" }],
		["meta", { name: "theme-color", content: "#6366f1" }],
		["meta", { property: "og:type", content: "website" }],
		["meta", { property: "og:locale", content: "en" }],
		["meta", { property: "og:site_name", content: "Nube Auth Documentation" }],
		["style", {}, `:root { --env-tag-label: '${envTag}'; }`],
		// Google Fonts
		["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
		["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
		[
			"link",
			{
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
				rel: "stylesheet",
			},
		],
	],

	// Theme config
	themeConfig: {
		logo: "/logo.png",
		siteTitle: "Nube Auth",

		// Navigation
		nav: [
			{ text: "Docs", link: "/getting-started/introduction" },
			{ text: "API", link: "/api/rest" },
			{
				text: "Links",
				items: [
					{ text: "Admin Dashboard", link: adminUrl },
					{ text: "User Portal", link: userUrl },
					{ text: "Website", link: homeUrl },
				],
			},
		],

		// Sidebar structure
		sidebar: [
			{
				text: "Getting Started",
				collapsed: false,
				items: [
					{ text: "Introduction", link: "/getting-started/introduction" },
					{ text: "Quick Start", link: "/getting-started/quickstart" },
					{ text: "Installation", link: "/getting-started/installation" },
					{ text: "Configuration", link: "/getting-started/configuration" },
				],
			},
			{
				text: "Dashboards",
				items: [
					{ text: "Overview", link: "/dashboards/overview" },
					{ text: "Admin Dashboard", link: "/dashboards/admin-dashboard" },
					{ text: "User Dashboard", link: "/dashboards/user-dashboard" },
				],
			},
			{
				text: "Integration",
				items: [
					{ text: "Quick Start", link: "/integration/quickstart" },
					{ text: "Browser Extension", link: "/integration/browser-extension" },
				],
			},
			{
				text: "Authentication",
				items: [
					{ text: "Overview", link: "/authentication/overview" },
					{ text: "OAuth Providers", link: "/authentication/oauth-providers" },
					{ text: "Magic Links", link: "/authentication/magic-links" },
				],
			},
			{
				text: "Sessions",
				items: [
					{ text: "Overview", link: "/sessions/overview" },
					{ text: "Token Refresh", link: "/sessions/token-refresh" },
				],
			},
			{
				text: "Licensing",
				items: [
					{ text: "Overview", link: "/licensing/overview" },
					{ text: "Plans & Tiers", link: "/licensing/plans" },
				],
			},
			{
				text: "API Reference",
				items: [
					{ text: "REST API", link: "/api/rest" },
					{ text: "Authentication", link: "/api/authentication" },
					{ text: "Sessions", link: "/api/sessions" },
				],
			},
			{
				text: "Self-Hosting",
				items: [{ text: "Docker", link: "/self-hosting/docker" }],
			},
		],

		// Social links
		socialLinks: [{ icon: "github", link: "https://github.com/nube-auth/nube-auth" }],

		// Edit link
		editLink: {
			pattern: "https://github.com/nube-auth/nube-auth/edit/trunk/apps/dashboard/docs/:path",
			text: "Edit this page on GitHub",
		},

		// Footer
		footer: {
			message: "Released under the MIT License.",
			copyright: "Copyright © 2026 Nube Auth",
		},

		// Search (local)
		search: {
			provider: "local",
			options: {
				detailedView: true,
			},
		},

		// Outline (table of contents)
		outline: {
			level: [2, 3],
			label: "On this page",
		},
	},

	// Vite config
	vite: {
		server: {
			port: 4322,
		},
	},

	// Markdown config
	markdown: {
		theme: {
			light: "github-light",
			dark: "github-dark",
		},
		lineNumbers: true,
	},
});
