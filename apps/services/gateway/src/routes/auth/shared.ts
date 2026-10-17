import { createLogger } from "@nube-auth/shared";
import type { Context } from "hono";
import { env } from "../../config/env";

export const log = createLogger("auth-routes");

/**
 * Safely extract string values from cookie attributes
 * Handles cases where attributes might be typed as string | string[]
 */
export function safeAttrString(value: unknown): string {
	if (typeof value === "string") return value;
	if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") return value[0];
	return String(value);
}

export function safeAttrBoolean(value: unknown): boolean {
	return value === true || value === "true";
}

export function safeAttrNumber(value: unknown): number | undefined {
	if (typeof value === "number") return value;
	if (typeof value === "string") return parseInt(value, 10);
	if (Array.isArray(value) && value.length > 0) return safeAttrNumber(value[0]);
	return undefined;
}

export function safeParseUrl(value: string | undefined): URL | null {
	if (!value) return null;
	try {
		return new URL(value);
	} catch {
		return null;
	}
}

export function inferAudience(c: Context): "user" | "admin" {
	const audience = c.req.query("audience");
	if (audience === "admin") return "admin";
	if (audience === "user") return "user";

	const originOrReferer = c.req.header("origin") || c.req.header("referer") || "";
	const requestHost = safeParseUrl(originOrReferer)?.host || "";

	const adminHost = safeParseUrl(env.ADMIN_DASHBOARD_URL)?.host || "";
	const userHost = safeParseUrl(env.USER_DASHBOARD_URL)?.host || "";

	if (adminHost && requestHost === adminHost) return "admin";
	if (userHost && requestHost === userHost) return "user";

	// Fallback heuristics for hosted environments
	if (
		requestHost.startsWith("manage.") ||
		requestHost.startsWith("s-manage.") ||
		requestHost.includes("manage.nubeauth.") ||
		requestHost.includes("manage.nube-auth.") ||
		requestHost.includes("admin.nube-auth.")
	) {
		return "admin";
	}
	return "user";
}
