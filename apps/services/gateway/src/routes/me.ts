import { getDb, sessionQueries, userQueries } from "@proofa/db";
import { cache, sessionStore } from "@proofa/cache";
import { createLogger, idPatterns, serializeError } from "@proofa/shared";
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
