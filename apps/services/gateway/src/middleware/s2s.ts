import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { getDb, appQueries } from "@nube-auth/db";
import { getEnv } from "../config/env";

/**
 * Service-to-service authentication middleware.
 * Validates X-Nube-Service-Token against the per-app serviceToken stored in
 * the app_tokens JSONB column. This means tokens are managed through the admin
 * dashboard (App → API Keys → Regenerate Service Token) rather than env vars.
 */
export const s2sAuthMiddleware = createMiddleware(async (c: Context, next: Next): Promise<Response | undefined> => {
	const token = c.req.header("X-Nube-Service-Token");
	if (!token) return c.json({ error: "Unauthorized" }, 401);

	const db = getDb();
	const app = await appQueries.findByServiceToken(db, token);
	if (!app) return c.json({ error: "Unauthorized" }, 401);

	// Attach the resolved app to context for downstream route handlers
	c.set("s2sApp", app);

	await next();
	return;
});

/**
 * Adds the gateway→Core service token to outgoing requests to Core.
 * This is separate from the per-app inbound token validation above.
 */
export function addS2SAuthHeader(headers: Record<string, string>): void {
	const env = getEnv();
	headers["X-Nube-Service-Token"] = env.X_NUBE_AUTH_SERVICE_TOKEN;
}
