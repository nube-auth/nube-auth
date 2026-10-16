/**
 * Credentialed CORS origin check.
 * Compares an Origin to explicit allowlist entries, or to one subdomain under
 * the service hostname's registrable domain (the last two labels).
 */

export interface AllowedOriginInput {
	origin: string | undefined | null;
	serviceHostname: string;
	explicitOrigins: readonly string[];
	allowLocalhost: boolean;
}

function registrableDomain(hostname: string): string | null {
	const parts = hostname
		.toLowerCase()
		.split(".")
		.filter((part) => part.length > 0);
	if (parts.length < 2) return null;
	return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

function isLocalHost(hostname: string): boolean {
	return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function resolveAllowedOrigin(input: AllowedOriginInput): string | null {
	const origin = input.origin?.trim();
	if (!origin) return null;

	let parsed: URL;
	try {
		parsed = new URL(origin);
	} catch {
		return null;
	}

	if (parsed.username || parsed.password) return null;
	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

	const hostname = parsed.hostname.toLowerCase();
	if (isLocalHost(hostname)) {
		return input.allowLocalhost ? origin : null;
	}

	const explicit = input.explicitOrigins.some((allowed) => {
		try {
			const candidate = new URL(allowed);
			return candidate.protocol === parsed.protocol && candidate.host.toLowerCase() === parsed.host.toLowerCase();
		} catch {
			return allowed === origin;
		}
	});
	if (explicit) return origin;

	const base = registrableDomain(input.serviceHostname);
	if (!base) return null;
	if (hostname !== base && !hostname.endsWith(`.${base}`)) return null;

	const extraLabels = hostname === base ? 0 : hostname.slice(0, -(base.length + 1)).split(".").length;
	if (extraLabels > 1) return null;
	if (!input.allowLocalhost && parsed.protocol !== "https:") return null;
	return origin;
}
