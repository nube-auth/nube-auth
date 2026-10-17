/**
 * App Secret Middleware
 *
 * Validates server-to-server requests from app backends using the app's client secret.
 * The hash is cached in Redis. A miss asks Core for the hash. The comparison stays here.
 *
 * Expected header:
 *   Authorization: Bearer <clientSecret>
 */

import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { getClientSecretHash } from "../lib/appClientSecret";
import { presentedSecretMatches } from "../lib/secret-match";

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
		const stored = await getClientSecretHash(appId);
		if (!stored.isActive || !stored.hash || !presentedSecretMatches(providedSecret, stored)) {
			log.warn({ appId }, "Invalid app credentials");
			return c.json({ error: "Invalid app credentials" }, 401);
		}

		await next();
		return;
	} catch (error) {
		log.error({ appId, err: serializeError(error as Error) }, "App secret validation error");
		return c.json({ error: "Authentication error" }, 500);
	}
});
