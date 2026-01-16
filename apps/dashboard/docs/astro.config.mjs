import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import unocss from "unocss/astro";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	site: "https://docs.proofa.sh",
	integrations: [
		unocss({
			configFile: path.resolve(__dirname, "../../packages/styles/uno.config.ts"),
		}),
		starlight({
			title: "Proofa",
			logo: {
				src: "./src/assets/logo.png",
				alt: "Proofa",
			},
			description: "Authentication, session management, and licensing for modern applications",
			favicon: "/favicon.png",
			head: [],
			customCss: ["./src/styles/custom.css"],
			components: {
				// Override the default theme selector with our custom toggle button
				ThemeSelect: "./src/components/ThemeSelect.astro",
			},
			sidebar: [
				{
					label: "Getting Started",
					items: [
						{ label: "Introduction", link: "/getting-started/introduction/" },
						{ label: "Quick Start", link: "/getting-started/quickstart/" },
						{ label: "Installation", link: "/getting-started/installation/" },
						{ label: "Configuration", link: "/getting-started/configuration/" },
					],
				},
				{
					label: "Dashboards",
					items: [
						{ label: "Overview", link: "/dashboards/overview/" },
						{ label: "Admin Dashboard", link: "/dashboards/admin-dashboard/" },
						{ label: "User Dashboard", link: "/dashboards/user-dashboard/" },
					],
				},
				{
					label: "Integration",
					items: [
						{ label: "Quick Start", link: "/integration/quickstart/" },
						{ label: "Browser Extension", link: "/integration/browser-extension/" },
					],
				},
				{
					label: "Authentication",
					items: [
						{ label: "Overview", link: "/authentication/overview/" },
						{ label: "OAuth Providers", link: "/authentication/oauth-providers/" },
						{ label: "Magic Links", link: "/authentication/magic-links/" },
					],
				},
				{
					label: "Sessions",
					items: [
						{ label: "Overview", link: "/sessions/overview/" },
						{ label: "Token Refresh", link: "/sessions/token-refresh/" },
					],
				},
				{
					label: "Licensing",
					items: [
						{ label: "Overview", link: "/licensing/overview/" },
						{ label: "Plans & Tiers", link: "/licensing/plans/" },
					],
				},
				{
					label: "API Reference",
					items: [
						{ label: "REST API", link: "/api/rest/" },
						{ label: "Authentication", link: "/api/authentication/" },
						{ label: "Sessions", link: "/api/sessions/" },
					],
				},
			],
		}),
	],
});
