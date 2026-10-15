// Public hosts for one Nube Auth environment.
// Change the domain with NUBE_DOMAIN (default nubeauth.com).
// Staging uses the s- prefix. Production uses www for the marketing site.

export const DEFAULT_DOMAIN = "nubeauth.com";

export function normalizeDomain(domain) {
	return String(domain || DEFAULT_DOMAIN)
		.trim()
		.replace(/^https?:\/\//, "")
		.replace(/\/+$/, "")
		.replace(/^\.+/, "");
}

export function nubeHosts(domain = DEFAULT_DOMAIN, env = "production") {
	const apex = normalizeDomain(domain);
	if (!apex) throw new Error("NUBE_DOMAIN is empty");
	const staging = String(env).toLowerCase() === "staging";
	const host = (label) => `https://${label}.${apex}`;
	return {
		domain: apex,
		env: staging ? "staging" : "production",
		envTag: staging ? "Staging" : "Production",
		site: staging ? host("s-home") : `https://www.${apex}`,
		admin: host(staging ? "s-manage" : "manage"),
		user: host(staging ? "s-me" : "me"),
		docs: host(staging ? "s-docs" : "docs"),
		gateway: host(staging ? "s-api" : "api"),
	};
}

// Rewrite baked production hosts in docs and samples.
// A negative lookbehind skips hosts that are already staging-prefixed,
// so "s-manage.nubeauth.com" is not turned into "s-s-manage.nubeauth.com".
export function rewriteHosts(source, hosts) {
	const fromDomain = DEFAULT_DOMAIN;
	const replacements = [
		[`manage.${fromDomain}`, new URL(hosts.admin).host],
		[`me.${fromDomain}`, new URL(hosts.user).host],
		[`docs.${fromDomain}`, new URL(hosts.docs).host],
		[`api.${fromDomain}`, new URL(hosts.gateway).host],
		[`www.${fromDomain}`, new URL(hosts.site).host],
	];
	let next = source;
	for (const [from, to] of replacements) {
		if (from === to) continue;
		const pattern = new RegExp(`(?<!s-)${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
		next = next.replace(pattern, to);
	}
	const apex = new RegExp(`(?<![\\w@.-])${fromDomain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
	const siteHost = new URL(hosts.site).host;
	if (siteHost !== fromDomain) next = next.replace(apex, siteHost);
	return next;
}

export function buildArgs(hosts) {
	return [
		`NUBE_DOMAIN=${hosts.domain}`,
		`NUBE_ENV=${hosts.env}`,
		`PUBLIC_NUBE_DOMAIN=${hosts.domain}`,
		`PUBLIC_NUBE_ENV=${hosts.env}`,
		`VITE_ENV_TAG=${hosts.envTag}`,
		`PUBLIC_ENV_TAG=${hosts.envTag}`,
		`VITE_HOME_URL=${hosts.site}`,
		`PUBLIC_SITE_URL=${hosts.site}`,
		`VITE_ADMIN_URL=${hosts.admin}`,
		`PUBLIC_ADMIN_URL=${hosts.admin}`,
		`VITE_USER_URL=${hosts.user}`,
		`PUBLIC_USER_URL=${hosts.user}`,
		`VITE_DOCS_URL=${hosts.docs}`,
		`PUBLIC_DOCS_URL=${hosts.docs}`,
		`VITE_GATEWAY_URL=${hosts.gateway}`,
		`PUBLIC_GATEWAY_URL=${hosts.gateway}`,
	].join("\n");
}
