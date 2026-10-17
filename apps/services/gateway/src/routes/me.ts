import { pingpong } from "@nube-auth/auth";
import { cache, readCacheKeys, sessionStore } from "@nube-auth/cache";
import { createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";

import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { CACHE_TTL } from "../config/constants";
import { env } from "../config/env";
import { coreClient } from "../lib/core-client";
import { getAuth } from "../middleware/auth";

const log = createLogger("me-routes");

export const meRoutes = new Hono();

const subCacheKey = readCacheKeys.subscription;
const licenseCacheKey = readCacheKeys.license;

async function revokeGatewaySessions(userPublicId: string, targetCoreSessionId?: string): Promise<void> {
	let cursor = 0;
	const pattern = "session:app:*";

	do {
		const result = await cache.scan(cursor, pattern, 100);
		cursor = result.cursor;

		for (const key of result.keys) {
			const sessionId = key.replace("session:app:", "");
			const appSession = await sessionStore.getAppSession(sessionId);
			if (!appSession) continue;

			const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;
			if (appSession.userId !== userPublicId) continue;
			if (targetCoreSessionId && coreSessionId !== targetCoreSessionId) continue;

			await sessionStore.revokeAppSession(sessionId);
		}
	} while (cursor !== 0);
}

/**
 * GET /v1/me
 * Get current user profile
 */
meRoutes.get("/", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const profile = await coreClient.edge<{ createdAt: string | null }>(
			"GET",
			`/v1/edge/users/${encodeURIComponent(auth.userId)}`,
		);
		if (profile.status !== 200) return c.json({ error: "Failed to get profile" }, 500);

		return c.json({
			id: auth.userId,
			email: auth.email,
			name: auth.name,
			createdAt: profile.data.createdAt,
			entitlements: auth.entitlements,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get me error:");
		return c.json({ error: "Failed to get profile" }, 500);
	}
});

/**
 * PATCH /v1/me
 * Update current user profile
 */
meRoutes.patch("/", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const { name, picture } = (await c.req.json()) as { name?: string; picture?: string };

		const updated = await coreClient.edge<{
			id: string;
			email: string;
			name: string | null;
			createdAt: string | null;
			error?: string;
		}>("PATCH", `/v1/edge/users/${encodeURIComponent(auth.userId)}`, {
			...(name !== undefined ? { name } : {}),
			...(picture !== undefined ? { picture } : {}),
		});
		if (updated.status !== 200) {
			return c.json(
				{ error: updated.data.error ?? "Failed to update profile" },
				updated.status as ContentfulStatusCode,
			);
		}

		return c.json({
			id: updated.data.id,
			email: updated.data.email,
			name: updated.data.name,
			createdAt: updated.data.createdAt,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Update profile error:");
		return c.json({ error: "Failed to update profile" }, 500);
	}
});

/**
 * DELETE /v1/me/sessions
 * Logout from all sessions
 */
meRoutes.delete("/sessions", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const revoked = await coreClient.edge<{ revoked: number; error?: string }>(
			"DELETE",
			`/v1/edge/users/${encodeURIComponent(auth.userId)}/sessions`,
		);
		if (revoked.status !== 200) {
			return c.json({ error: revoked.data.error ?? "Failed to logout" }, revoked.status as ContentfulStatusCode);
		}

		await revokeGatewaySessions(auth.userId);

		return c.json({ message: "All sessions revoked", revoked: revoked.data.revoked });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Logout error:");
		return c.json({ error: "Failed to logout" }, 500);
	}
});

/**
 * GET /v1/me/sessions
 * Get all active sessions for user
 */
meRoutes.get("/sessions", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const current = auth.coreSessionId ? `?current=${encodeURIComponent(auth.coreSessionId)}` : "";
		const sessions = await coreClient.edge<{ sessions: unknown[]; error?: string }>(
			"GET",
			`/v1/edge/users/${encodeURIComponent(auth.userId)}/sessions${current}`,
		);
		if (sessions.status !== 200) {
			return c.json(
				{ error: sessions.data.error ?? "Failed to get sessions" },
				sessions.status as ContentfulStatusCode,
			);
		}
		return c.json({ sessions: sessions.data.sessions });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get sessions error:");
		return c.json({ error: "Failed to get sessions" }, 500);
	}
});

/**
 * DELETE /v1/me/sessions/:sessionId
 * Revoke a specific session
 */
meRoutes.delete("/sessions/:sessionId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const sessionId = c.req.param("sessionId");
		if (!sessionId || !idPatterns.session.test(sessionId)) {
			return c.json({ error: "Invalid session id" }, 400);
		}

		const revoked = await coreClient.edge<{ publicId: string; error?: string }>(
			"DELETE",
			`/v1/edge/users/${encodeURIComponent(auth.userId)}/sessions/${encodeURIComponent(sessionId)}`,
		);
		if (revoked.status !== 200) {
			return c.json(
				{ error: revoked.data.error ?? "Failed to revoke session" },
				revoked.status as ContentfulStatusCode,
			);
		}

		await revokeGatewaySessions(auth.userId, revoked.data.publicId);

		return c.json({
			message: "Session revoked",
			currentSessionRevoked: revoked.data.publicId === auth.coreSessionId,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Revoke session error:");
		return c.json({ error: "Failed to revoke session" }, 500);
	}
});
/**
 * GET /v1/me/subscription
 *
 * Returns the active subscription for the authenticated user in the context of
 * the app that issued the session token (audience=app sessions only).
 *
 * Used by Native/CLI clients to check license/plan status after OAuth.
 *
 * Returns:
 *  { hasActivePlan: boolean, planSlug: string | null, status: string | null,
 *    billingInterval: string | null, periodEnd: string | null }
 */
meRoutes.get("/subscription", async (c: Context) => {
	try {
		const auth = getAuth(c);

		if (!auth.appId) {
			return c.json({ error: "Subscription check is only available for app sessions" }, 400);
		}

		// Return cached response when available
		const cacheKey = subCacheKey(auth.userId, auth.appId);
		const cached = await cache.get<object>(cacheKey);
		if (cached) return c.json(cached);

		const subscription = await coreClient.edge<Record<string, unknown>>(
			"GET",
			`/v1/edge/users/${encodeURIComponent(auth.userId)}/apps/${encodeURIComponent(auth.appId)}/subscription`,
		);
		if (subscription.status !== 200) return c.json({ error: "Failed to fetch subscription" }, 500);
		await cache.set(cacheKey, subscription.data, CACHE_TTL);
		return c.json(subscription.data);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Subscription check error:");
		return c.json({ error: "Failed to fetch subscription" }, 500);
	}
});
/**
 * POST /v1/me/subscription/cancel
 *
 * Cancels the active subscription for the authenticated user.
 * Proxies to Core S2S endpoint and busts the subscription + license caches.
 */
meRoutes.post("/subscription/cancel", async (c: Context) => {
	try {
		const auth = getAuth(c);
		if (!auth.appId) {
			return c.json({ error: "Subscription cancel is only available for app sessions" }, 400);
		}

		let reason: string | undefined;
		try {
			const body = await c.req.json();
			reason = typeof body?.reason === "string" ? body.reason : undefined;
		} catch {
			// Body is optional
		}

		const response = await pingpong(`${env.CORE_URL}/v1/subscription/cancel`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Nube-S2S-Token": env.S2S_SECRET,
				"X-Nube-User-Id": auth.userId,
				"X-Nube-Session-Id": auth.coreSessionId || "",
			},
			body: { appId: auth.appId, ...(reason ? { reason } : {}) },
		});

		if (response.ok()) {
			await Promise.all([
				cache.delete(subCacheKey(auth.userId, auth.appId)),
				cache.delete(licenseCacheKey(auth.userId, auth.appId)),
			]);
		}

		return c.json(response.data, response.status as ContentfulStatusCode);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Subscription cancel error:");
		return c.json({ error: "Failed to cancel subscription" }, 500);
	}
});

/**
 * POST /v1/me/subscription/resume
 *
 * Resumes a subscription that was scheduled for cancellation at period end.
 * Proxies to Core S2S endpoint and busts the subscription + license caches.
 */
meRoutes.post("/subscription/resume", async (c: Context) => {
	try {
		const auth = getAuth(c);
		if (!auth.appId) {
			return c.json({ error: "Subscription resume is only available for app sessions" }, 400);
		}

		const response = await pingpong(`${env.CORE_URL}/v1/subscription/resume`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Nube-S2S-Token": env.S2S_SECRET,
				"X-Nube-User-Id": auth.userId,
				"X-Nube-Session-Id": auth.coreSessionId || "",
			},
			body: { appId: auth.appId },
		});

		if (response.ok()) {
			await Promise.all([
				cache.delete(subCacheKey(auth.userId, auth.appId)),
				cache.delete(licenseCacheKey(auth.userId, auth.appId)),
			]);
		}

		return c.json(response.data, response.status as ContentfulStatusCode);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Subscription resume error:");
		return c.json({ error: "Failed to resume subscription" }, 500);
	}
});
