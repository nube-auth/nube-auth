import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { getAppIdFromHost } from "../config/appHosts";
import { APP_ID_HEADER } from "../config/constants";

/**
 * App resolver middleware
 * Extracts app ID from hostname or query parameter
 * Supports multi-tenant app resolution
 */
export const appResolverMiddleware = createMiddleware((c: Context, next) => {
	let appId: string | null = null;

	// First, try to get from query parameter
	const queryAppId = c.req.query("app");
	if (queryAppId) {
		appId = queryAppId;
	}

	// Then, try to get from hostname
	if (!appId) {
		const hostname = c.req.header("host");
		if (hostname) {
			appId = getAppIdFromHost(hostname);
		}
	}

	// If still not found, try X-App-ID header
	if (!appId) {
		appId = c.req.header(APP_ID_HEADER) ?? null;
	}

	// Set app ID in context
	if (appId) {
		c.set("appId", appId);
	}

	return next();
});

/**
 * Get app ID from context, throw if not found
 */
export function getAppIdFromContext(c: Context): string {
	const appId = c.get("appId") as string | undefined;
	if (!appId) {
		throw new Error("App ID not resolved from request");
	}
	return appId;
}
