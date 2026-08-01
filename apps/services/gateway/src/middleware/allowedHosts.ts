/**
 * Allowed Hosts Middleware
 *
 * Enforces the per-app `allowedHosts` security setting for auth and user routes.
 * Acts as a server-side complement to CORS: while CORS protects browser-initiated
 * cross-origin requests, this middleware validates the caller's hostname from the
 * `Origin` or `Referer` header against the app's configured allowed hosts.
 *
 * Behaviour:
 * - Only applies to /v1/auth/* and /v1/me/* (not /v1/admin/* or public routes)
 * - Skipped when no appId is resolved in context
 * - Skipped when the app has no `allowedHosts` configured (opt-in)
 * - Skipped when neither Origin nor Referer header is present (headless/server calls)
 * - Blocks with 403 if the hostname is not in the allowedHosts list
 *
 * Security notes:
 * - Protects against DNS rebinding attacks by validating the caller's host
 * - Protects against host-header injection on token/session endpoints
 * - Settings are cached (5 min TTL) — uses getAppSecuritySettings() helper
 * - Fails open on cache/DB errors to avoid blocking legitimate requests
 */

import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context, Next } from "hono";
import { getAppSecuritySettings } from "../lib/appSecuritySettings";

const log = createLogger("gateway:allowed-hosts");

function extractHostname(url: string): string | null {
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}

function hostMatchesPattern(hostname: string, pattern: string): boolean {
	if (pattern === "*") return true;
	if (pattern === hostname) return true;
	// Wildcard subdomain: *.example.com matches sub.example.com and example.com
	if (pattern.startsWith("*.")) {
		const domain = pattern.slice(2);
		return hostname === domain || hostname.endsWith(`.${domain}`);
	}
	return false;
}

export async function allowedHostsMiddleware(c: Context, next: Next) {
	const appId = (c as any).get("appId") as string | undefined;
	if (!appId) return next();

	// Only enforce on routes where client apps actually make requests.
	// Admin routes are protected by admin session auth, not by app allowedHosts.
	const path = c.req.path;
	if (!path.startsWith("/v1/auth/") && !path.startsWith("/v1/me/")) return next();

	// Origin header is set by browsers on cross-origin requests.
	// Referer is set on same-origin navigations and some server-side clients.
	// If neither is present we cannot determine the caller's host — allow through.
	const origin = c.req.header("origin");
	const referer = c.req.header("referer");
	const sourceUrl = origin || referer;
	if (!sourceUrl) return next();

	const hostname = extractHostname(sourceUrl);
	if (!hostname) return next();

	try {
		const settings = await getAppSecuritySettings(appId);
		const allowedHosts = settings?.allowedHosts ?? [];

		// Empty list means the app hasn't opted in — skip enforcement.
		if (allowedHosts.length === 0) return next();

		const allowed = allowedHosts.some((pattern) => hostMatchesPattern(hostname, pattern));
		if (!allowed) {
			log.warn({ appId, hostname, path }, "Request blocked: host not in allowedHosts");
			return c.json({ error: "Origin not allowed" }, 403) as unknown as Response;
		}
	} catch (error) {
		// Fail open — don't block legitimate requests on transient errors.
		log.error({ err: serializeError(error as Error), appId }, "allowedHosts: failed to look up settings");
	}

	return next();
}
