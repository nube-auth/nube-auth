import { getDb, sessionQueries, userQueries, subscriptionQueries, licenseQueries, planQueries, priceQueries, appQueries } from "@nube-auth/db";
import { cache, sessionStore } from "@nube-auth/cache";
import { createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";

import { Hono } from "hono";
import { getAuth } from "../middleware/auth";

const log = createLogger("me-routes");

export const meRoutes = new Hono();

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
		const db = getDb();

		// Fetch user from database to get createdAt
		const user = await userQueries.findByPublicId(db, auth.userId);

		return c.json({
			id: auth.userId,
			email: auth.email,
			name: auth.name,
			createdAt: user?.created_at ? new Date(user.created_at).toISOString() : null,
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

		const db = getDb();

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Update user in database
		const updateData: Parameters<typeof userQueries.update>[2] = {};
		if (name !== undefined) updateData.name = name;
		if (picture !== undefined) updateData.avatar_url = picture;

		const updatedRows = await userQueries.update(db, user.id, updateData);
		const updated = updatedRows[0];

		if (!updated) {
			return c.json({ error: "User not found" }, 404);
		}

		return c.json({
			id: updated.public_id,
			email: updated.primary_email,
			name: updated.name,
			createdAt: updated.created_at ? new Date(updated.created_at).toISOString() : null,
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
		const db = getDb();

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const activeSessions = await sessionQueries.findActiveByUserId(db, user.id);
		for (const session of activeSessions) {
			await sessionQueries.revoke(db, session.id);
		}

		await revokeGatewaySessions(auth.userId);

		return c.json({ message: "All sessions revoked", revoked: activeSessions.length });
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
		const db = getDb();

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const sessionRows = await sessionQueries.findActiveByUserId(db, user.id);
		sessionRows.sort((a, b) => {
			const aIsCurrent = a.public_id === auth.coreSessionId;
			const bIsCurrent = b.public_id === auth.coreSessionId;
			if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1;
			return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
		});

		return c.json({
			sessions: sessionRows.map((s) => ({
				id: s.public_id,
				createdAt: new Date(s.created_at).toISOString(),
				lastSeenAt: new Date(s.last_seen_at).toISOString(),
				expiresAt: new Date(s.expires_at).toISOString(),
				isCurrent: s.public_id === auth.coreSessionId,
				ipAddress: s.ip_address || null,
				userAgent: s.user_agent || null,
				country: s.country || null,
			})),
		});
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

		if (!idPatterns.session.test(sessionId)) {
			return c.json({ error: "Invalid session id" }, 400);
		}

		const db = getDb();
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const session = await sessionQueries.findByPublicId(db, sessionId);
		if (!session || session.user_id !== user.id) {
			return c.json({ error: "Session not found" }, 404);
		}

		await sessionQueries.revoke(db, session.id);
		await revokeGatewaySessions(auth.userId, session.public_id);

		return c.json({
			message: "Session revoked",
			currentSessionRevoked: session.public_id === auth.coreSessionId,
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

                const db = getDb();

                // Resolve internal IDs for both user and app
                const [user, app] = await Promise.all([
                        userQueries.findByPublicId(db, auth.userId),
                        appQueries.findByPublicId(db, auth.appId),
                ]);

                if (!user || !app) {
                        return c.json({ hasActivePlan: false, planSlug: null, status: null, billingInterval: null, periodEnd: null });
                }

                const subscription = await subscriptionQueries.findActiveByUserAndApp(db, user.id, app.id);

                if (!subscription) {
                        // No subscription row — fall back to licenses table (covers one-time purchases)
                        const license = await licenseQueries.findByUserAndApp(db, user.id, app.id);
                        if (!license || license.status !== "active") {
                                return c.json({ hasActivePlan: false, planSlug: null, status: null, billingInterval: null, periodEnd: null });
                        }
                        const licensePrice = license.price_id ? await priceQueries.findById(db, license.price_id) : null;
                        const licensePlan = licensePrice
                                ? await planQueries.findById(db, licensePrice.plan_id)
                                : license.plan_id
                                        ? await planQueries.findById(db, license.plan_id)
                                        : null;
                        return c.json({
                                hasActivePlan: true,
                                planSlug: licensePlan?.slug ?? null,
                                status: license.status,
                                billingInterval: null,
                                periodEnd: license.valid_until ? new Date(license.valid_until).toISOString() : null,
                        });
                }

                // Walk subscription → price → plan to get the slug
                const price = await priceQueries.findById(db, subscription.price_id);
                const plan = price ? await planQueries.findById(db, price.plan_id) : null;

                return c.json({
                        hasActivePlan: true,
                        planSlug: plan?.slug ?? null,
                        status: subscription.status,
                        billingInterval: subscription.billing_interval,
                        periodEnd: subscription.billing_period_end
                                ? new Date(subscription.billing_period_end).toISOString()
                                : null,
                });
        } catch (error) {
                log.error({ err: serializeError(error as Error) }, "Subscription check error:");
                return c.json({ error: "Failed to fetch subscription" }, 500);
        }
});