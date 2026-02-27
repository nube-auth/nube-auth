import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "../config/env";

/**
 * Service-to-service authentication middleware
 * Validates X-Proofa-Service-Token header for Core API calls
 * Uses constant-time comparison to prevent timing attacks
 */
export const s2sAuthMiddleware = createMiddleware(async (c: Context, next: Next): Promise<Response | undefined> => {
	const token = c.req.header("X-Proofa-Service-Token");
	const env = getEnv();
	const expected = env.X_PROOFA_SERVICE_TOKEN;

	if (!token || !expected || token.length !== expected.length ||
		!timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
	return;
});

/**
 * Adds service token to outgoing requests to Core
 */
export function addS2SAuthHeader(headers: Record<string, string>): void {
	const env = getEnv();
	headers["X-Proofa-Service-Token"] = env.X_PROOFA_SERVICE_TOKEN;
}
