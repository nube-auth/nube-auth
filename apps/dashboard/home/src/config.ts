// Build-time links between the marketing site, dashboards, docs, and gateway.
// Hosts come from NUBE_DOMAIN (default nubeauth.com) and NUBE_ENV.
// An explicit PUBLIC_* value still overrides one host.

import { nubeHosts } from "../../../../scripts/nube-hosts.mjs";

function publicUrl(value: string | undefined, fallback: string): string {
	const trimmed = value?.trim();
	return (trimmed && trimmed.length > 0 ? trimmed : fallback).replace(/\/$/, "");
}

const dev = import.meta.env.DEV;
const domain = publicUrl(import.meta.env.PUBLIC_NUBE_DOMAIN, "nubeauth.com");
const envName = import.meta.env.PUBLIC_NUBE_ENV || (dev ? "local" : "production");
const derived = nubeHosts(domain, envName === "staging" ? "staging" : "production");

const adminUrl = publicUrl(import.meta.env.PUBLIC_ADMIN_URL, dev ? "http://localhost:5174" : derived.admin);
const userUrl = publicUrl(import.meta.env.PUBLIC_USER_URL, dev ? "http://localhost:5173" : derived.user);

export const config = {
	domain: derived.domain,
	siteUrl: publicUrl(import.meta.env.PUBLIC_SITE_URL, dev ? "http://localhost:4321" : derived.site),
	docsUrl: publicUrl(import.meta.env.PUBLIC_DOCS_URL, dev ? "http://localhost:4322" : derived.docs),
	adminUrl,
	userUrl,
	adminLoginUrl: `${adminUrl}/login`,
	userLoginUrl: `${userUrl}/login`,
	gatewayUrl: publicUrl(import.meta.env.PUBLIC_GATEWAY_URL, dev ? "http://localhost:3004" : derived.gateway),
	envTag: import.meta.env.PUBLIC_ENV_TAG || (dev ? "Local" : derived.envTag),
	supportEmail: `support@${derived.domain}`,
	privacyEmail: `privacy@${derived.domain}`,
	legalEmail: `legal@${derived.domain}`,
};

export default config;
