/**
 * License Routes (public)
 * Proxy to Core service for license validation by native macOS clients.
 * No user session required — licenseId is used as the lookup key.
 * The server (Core) is the sole source of truth for plan/feature data.
 */

import { pingpong } from "@nube-auth/auth";
import { cache, readCacheKeys } from "@nube-auth/cache";
import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { CACHE_TTL } from "../config/constants";
import { env } from "../config/env";
import { getAuth } from "../middleware/auth";

const log = createLogger("license-routes");

export const licenseRoutes = new Hono();

/**
 * GET /v1/license/check?licenseId=lic_xxx&appId=app_xxx&deviceId=<IOPlatformUUID>
 *
 * Public endpoint — no auth cookie required.
 * Rate limited at the middleware level in index.ts.
 * Proxies to Core /v1/license/check (S2S authenticated).
 *
 * On success, Core returns:
 *   { valid: true, license: { licenseId, plan: { slug, name, features }, validUntil } }
 * On failure:
 *   { valid: false, reason: "<reason_string>" }
 */
licenseRoutes.get("/check", async (c: Context) => {
	const licenseId = c.req.query("licenseId");
	const appId = c.req.query("appId");
	const deviceId = c.req.query("deviceId");

	if (!licenseId || !appId || !deviceId) {
		return c.json({ valid: false, reason: "missing_params" }, 400);
	}

	try {
		const coreUrl = new URL(`${env.CORE_URL}/v1/license/check`);
		coreUrl.searchParams.set("licenseId", licenseId);
		coreUrl.searchParams.set("appId", appId);
		coreUrl.searchParams.set("deviceId", deviceId);

		const response = await pingpong(coreUrl.toString(), {
			method: "GET",
			headers: {
				"X-Nube-S2S-Token": env.S2S_SECRET,
				"X-Forwarded-For": c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "",
				"X-Real-IP": c.req.header("x-real-ip") || "",
				"User-Agent": c.req.header("user-agent") || "",
			},
		});

		return c.json(response.data, response.status as ContentfulStatusCode);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "License check proxy error");
		return c.json({ valid: false, reason: "service_unavailable" }, 502);
	}
});

/**
 * GET /v1/license/:appId
 *
 * Returns the license for the authenticated user in the context of the given app.
 * Requires a valid Bearer token or session cookie (audience=app sessions).
 * Response is cached for CACHE_TTL seconds and busted on subscription cancel/resume.
 */
licenseRoutes.get("/:appId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		if (!appId) return c.json({ error: "Not found" }, 404);
		const auth = getAuth(c);

		const cacheKey = readCacheKeys.license(auth.userId, appId);
		const cached = await cache.get<object>(cacheKey);
		if (cached) return c.json(cached);

		const coreUrl = new URL(`${env.CORE_URL}/v1/license/for-user`);
		coreUrl.searchParams.set("appId", appId);
		const response = await pingpong(coreUrl.toString(), {
			method: "GET",
			headers: {
				"X-Nube-S2S-Token": env.S2S_SECRET,
				"X-Nube-User-Id": auth.userId,
				"X-Nube-Session-Id": auth.coreSessionId || "",
			},
		});
		if (response.status >= 200 && response.status < 300) {
			await cache.set(cacheKey, response.data, CACHE_TTL);
		}
		return c.json(response.data, response.status as ContentfulStatusCode);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get license error");
		return c.json({ error: "Failed to get license" }, 500);
	}
});
