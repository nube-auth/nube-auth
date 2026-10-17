/**
 * App Secret Middleware
 *
 * Validates server-to-server requests from app backends (e.g. control planes)
 * using the app's `clientSecret` stored in `app_tokens`.
 *
 * Expected header:
 *   Authorization: Bearer <clientSecret>
 *
 * The appId must be present as a URL path param named `:appId`.
 *
 * Security:
 * - Uses constant-time comparison to prevent timing attacks.
 * - Fails closed: any DB error or missing secret → 401/404.
 * - Does NOT establish a user session — purely app-level identity.
 */

import { appQueries, getDb, presentedSecretMatches } from "@nube-auth/db";
import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";

const log = createLogger("app-secret-middleware");

export const appSecretMiddleware = createMiddleware(async (c: Context, next: Next): Promise<Response | undefined> => {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return c.json({ error: "Missing or invalid Authorization header" }, 401);
	}
	const providedSecret = authHeader.slice(7).trim();
	if (!providedSecret) {
		return c.json({ error: "Empty app secret" }, 401);
	}

	const appId = c.req.param("appId");
	if (!appId) {
		return c.json({ error: "appId path parameter required" }, 400);
	}

	try {
		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);

		if (!app?.is_active) {
			// Don't leak whether the app exists
			return c.json({ error: "Invalid app credentials" }, 401);
		}

		// `clientSecret` is stored in the app_tokens JSONB column but is not
		// part of the AppTokensSchema — access raw via bracket notation.
		const hash = app.client_secret_hash;

		if (!hash) {
			log.warn({ appId }, "App has no clientSecret in app_tokens");
			return c.json({ error: "Invalid app credentials" }, 401);
		}

		if (!presentedSecretMatches(providedSecret, { hash })) {
			log.warn({ appId }, "Invalid app secret");
			return c.json({ error: "Invalid app credentials" }, 401);
		}

		// Secret valid — expose the resolved app record for downstream handlers
		c.set("resolvedApp", app);

		await next();
		return;
	} catch (error) {
		log.error({ appId, err: serializeError(error as Error) }, "App secret validation error");
		return c.json({ error: "Authentication error" }, 500);
	}
});
