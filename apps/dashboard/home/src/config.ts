// Build-time links between the marketing site, dashboards, docs, and gateway.
// `astro dev` falls back to localhost. Production builds fall back to the
// hosts in nube-scripts/deploy/configs/nube-auth.deploy.prod.yml.
// Set PUBLIC_* to override either mode.

function publicUrl(value: string | undefined, fallback: string): string {
	const trimmed = value?.trim();
	return (trimmed && trimmed.length > 0 ? trimmed : fallback).replace(/\/$/, "");
}

const dev = import.meta.env.DEV;
const adminUrl = publicUrl(
	import.meta.env.PUBLIC_ADMIN_URL,
	dev ? "http://localhost:5174" : "https://manage.nubeauth.com",
);
const userUrl = publicUrl(import.meta.env.PUBLIC_USER_URL, dev ? "http://localhost:5173" : "https://me.nubeauth.com");

export const config = {
	siteUrl: publicUrl(import.meta.env.PUBLIC_SITE_URL, dev ? "http://localhost:4321" : "https://nubeauth.com"),
	docsUrl: publicUrl(import.meta.env.PUBLIC_DOCS_URL, dev ? "http://localhost:4322" : "https://docs.nubeauth.com"),
	adminUrl,
	userUrl,
	adminLoginUrl: `${adminUrl}/login`,
	userLoginUrl: `${userUrl}/login`,
	gatewayUrl: publicUrl(
		import.meta.env.PUBLIC_GATEWAY_URL,
		dev ? "http://localhost:3004" : "https://api.nubeauth.com",
	),
	envTag: import.meta.env.PUBLIC_ENV_TAG || (dev ? "Local" : "Beta"),
};

export default config;
