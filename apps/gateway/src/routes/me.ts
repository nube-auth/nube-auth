import { getDb, sessionQueries, userQueries } from "@proofa/db";
import type { Context } from "hono";
import { Hono } from "hono";
import { getAuth } from "../middleware/auth";

export const meRoutes = new Hono();

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
			createdAt: user?.created_at ? new Date(user.created_at * 1000).toISOString() : null,
		});
	} catch (error) {
		console.error("Get me error:", error);
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
		const updated = await userQueries.update(db, user.id, {
			name: name !== undefined ? name : undefined,
			avatar_url: picture !== undefined ? picture : undefined,
		});

		if (!updated) {
			return c.json({ error: "User not found" }, 404);
		}

		return c.json({
			id: updated.public_id,
			email: updated.primary_email,
			name: updated.name,
		});
	} catch (error) {
		console.error("Update profile error:", error);
		return c.json({ error: "Failed to update profile" }, 500);
	}
});

/**
 * DELETE /v1/me/sessions
 * Logout from all sessions
 */
meRoutes.delete("/sessions", async (c: Context) => {
	try {
		// Revoke all sessions for user (this would be in Core)
		// For now, just revoke the current session
		// In a real app, we'd call a Core endpoint to revoke all sessions

		return c.json({ message: "Logged out" });
	} catch (error) {
		console.error("Logout error:", error);
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
			const aIsCurrent = a.public_id === auth.sessionId;
			const bIsCurrent = b.public_id === auth.sessionId;
			if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1;
			return b.last_seen_at - a.last_seen_at;
		});

		return c.json({
			sessions: sessionRows.map((s) => ({
				id: s.public_id,
				createdAt: new Date(s.created_at * 1000).toISOString(),
				expiresAt: new Date(s.expires_at * 1000).toISOString(),
				isCurrent: s.public_id === auth.sessionId,
			})),
		});
	} catch (error) {
		console.error("Get sessions error:", error);
		return c.json({ error: "Failed to get sessions" }, 500);
	}
});
