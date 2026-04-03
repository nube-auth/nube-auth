/**
 * License Routes (public)
 * Proxy to Core service for license validation by native macOS clients.
 * No user session required — licenseId is used as the lookup key.
 * The server (Core) is the sole source of truth for plan/feature data.
 */

import { Hono } from "hono";
import { pingpong } from "@nube-auth/auth";
import { getDb, userQueries, appQueries, licenseQueries, planQueries, priceQueries } from "@nube-auth/db";
import { cache } from "@nube-auth/cache";
import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { env } from "../config/env";
import { getAuth } from "../middleware/auth";
import { CACHE_TTL } from "../config/constants";

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
		const auth = getAuth(c);

		const cacheKey = `gateway:license:${auth.userId}:${appId}`;
		const cached = await cache.get<object>(cacheKey);
		if (cached) return c.json(cached);

		const db = getDb();

		const [user, app] = await Promise.all([
			userQueries.findByPublicId(db, auth.userId),
			appQueries.findByPublicId(db, appId),
		]);

		if (!user || !app) {
			return c.json({ error: "Not found" }, 404);
		}

		const license = await licenseQueries.findByUserAndApp(db, user.id, app.id);
		if (!license) {
			return c.json({ error: "License not found" }, 404);
		}

		// Resolve plan slug via price chain, falling back to direct plan_id
		const price = license.price_id ? await priceQueries.findById(db, license.price_id) : null;
		const plan = price
			? await planQueries.findById(db, price.plan_id)
			: await planQueries.findById(db, license.plan_id);

		const result = {
			public_id: license.public_id,
			app_id: app.public_id,
			plan: plan?.slug ?? "",
			status: license.status as "active" | "expired" | "canceled" | "suspended",
			valid_from: Math.floor(license.created_at.getTime() / 1000),
			valid_until: license.valid_until ? Math.floor(new Date(license.valid_until).getTime() / 1000) : null,
		};

		await cache.set(cacheKey, result, CACHE_TTL);
		return c.json(result);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get license error");
		return c.json({ error: "Failed to get license" }, 500);
	}
});
