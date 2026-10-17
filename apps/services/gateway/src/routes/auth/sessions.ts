import { parseSessionCookie } from "@nube-auth/auth";
import { sessionStore } from "@nube-auth/cache";
import { serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { coreClient } from "../../lib/core-client";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE } from "../../utils/cookieNames";

import { inferAudience, log } from "./shared";

const sessionRoutes = new Hono();

/**
 * GET /v1/auth/status
 * Check if user is logged in
 *
 * SECURITY: Only validates the cookie matching the requested audience.
 * - audience=admin: Only checks admin cookie, returns 401 if missing/invalid
 * - audience=user: Only checks user cookie, returns 401 if missing/invalid
 */
sessionRoutes.get("/status", async (c: Context) => {
	try {
		const audience = inferAudience(c);

		// CRITICAL: Only check the cookie for the requested audience
		const cookieName = audience === "admin" ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE;
		const cookie = getCookie(c, cookieName);

		// Return 401 if the appropriate cookie doesn't exist
		if (!cookie) {
			log.debug({ audience, cookieName }, "No session cookie for audience");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		// Validate the session
		const sessionId = parseSessionCookie(cookie);
		if (!sessionId) {
			log.warn({ audience, cookieName }, "Invalid session cookie format");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		const appSession = await sessionStore.getAppSession(sessionId);
		if (!appSession) {
			log.warn({ audience, sessionId: `${sessionId.substring(0, 8)}...` }, "Session not found in store");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;
		if (!coreSessionId) {
			log.warn({ audience, sessionId: `${sessionId.substring(0, 8)}...` }, "Core session ID missing");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		// Verify session type matches audience
		const sessionType = appSession.metadata?.["sessionType"] as string | undefined;
		if (sessionType && sessionType !== audience) {
			log.warn(
				{
					audience,
					sessionType,
					sessionId: `${sessionId.substring(0, 8)}...`,
				},
				"Session type mismatch with audience",
			);
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		const user = await coreClient.exchangeSession(coreSessionId);
		if (!user) {
			log.warn({ audience, coreSessionId: `${coreSessionId.substring(0, 8)}...` }, "Core session invalid");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		return c.json({
			loggedIn: true,
			user: {
				id: user.userId,
				email: user.email,
				name: user.name,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Status check error");
		return c.json({ error: "Unauthorized", loggedIn: false }, 401);
	}
});

/**
 * GET /v1/auth/sessions
 * List all active sessions for the current user
 */
sessionRoutes.get("/sessions", async (c: Context) => {
	try {
		const adminCookie = getCookie(c, ADMIN_SESSION_COOKIE);
		const userCookie = getCookie(c, USER_SESSION_COOKIE);

		const cookiesToCheck: Array<{ cookie: string; cookieName: string }> = [];
		if (adminCookie) cookiesToCheck.push({ cookie: adminCookie, cookieName: ADMIN_SESSION_COOKIE });
		if (userCookie) cookiesToCheck.push({ cookie: userCookie, cookieName: USER_SESSION_COOKIE });

		if (cookiesToCheck.length === 0) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		let currentUserId: string | undefined;
		const activeSessions = [];

		// Get current user ID and collect all their sessions
		for (const { cookie, cookieName: _cookieName } of cookiesToCheck) {
			const sessionId = parseSessionCookie(cookie);
			if (!sessionId) continue;

			const appSession = await sessionStore.getAppSession(sessionId);
			if (!appSession) continue;

			const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;
			if (!coreSessionId) continue;

			const user = await coreClient.exchangeSession(coreSessionId);
			if (!user) continue;

			currentUserId = user.userId;
			break; // Found valid session, get user ID
		}

		if (!currentUserId) {
			return c.json({ error: "Invalid session" }, 401);
		}

		// Get all sessions for this user
		const userSessions = await sessionStore.getUserSessions(currentUserId);

		for (const session of userSessions) {
			const sessionData = session.sessionData;
			const metadata = sessionData.metadata || {};
			activeSessions.push({
				id: session.id,
				appId: sessionData.appId,
				createdAt: (metadata["createdAt"] as number) || Date.now(),
				lastActivity: (metadata["lastActivityAt"] as number) || Date.now(),
				isCurrentSession: session.id === parseSessionCookie(userCookie || adminCookie || ""),
				// Device/location info
				ipAddress: (metadata["ipAddress"] as string) || null,
				userAgent: (metadata["userAgent"] as string) || null,
			});
		}

		return c.json({
			sessions: activeSessions.sort(
				(a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
			),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Sessions list error:");
		return c.json({ error: "Failed to list sessions" }, 500);
	}
});

/**
 * DELETE /v1/auth/sessions/:sessionId
 * Revoke a specific session by ID
 */
sessionRoutes.delete("/sessions/:sessionId", async (c: Context) => {
	try {
		const sessionIdToRevoke = c.req.param("sessionId");
		if (!sessionIdToRevoke) return c.json({ error: "Session not found" }, 404);
		const adminCookie = getCookie(c, ADMIN_SESSION_COOKIE);
		const userCookie = getCookie(c, USER_SESSION_COOKIE);

		const cookiesToCheck: Array<string> = [];
		if (adminCookie) cookiesToCheck.push(adminCookie);
		if (userCookie) cookiesToCheck.push(userCookie);

		if (cookiesToCheck.length === 0) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		let currentUserId: string | undefined;
		let currentSessionId: string | undefined;

		// Get current user ID to ensure they can only revoke their own sessions
		for (const cookie of cookiesToCheck) {
			const parsedSessionId = parseSessionCookie(cookie);
			if (!parsedSessionId) continue;

			const appSession = await sessionStore.getAppSession(parsedSessionId);
			if (!appSession) continue;

			const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;
			if (!coreSessionId) continue;

			const user = await coreClient.exchangeSession(coreSessionId);
			if (!user) continue;

			currentUserId = user.userId;
			currentSessionId = parsedSessionId;
			break;
		}

		if (!currentUserId) {
			return c.json({ error: "Invalid session" }, 401);
		}

		// Verify the session to revoke belongs to the current user
		const sessionToRevoke = await sessionStore.getAppSession(sessionIdToRevoke);
		if (!sessionToRevoke) {
			return c.json({ error: "Session not found" }, 404);
		}

		if (sessionToRevoke.userId !== currentUserId) {
			return c.json({ error: "Cannot revoke other users' sessions" }, 403);
		}

		// Prevent revoking current session via this endpoint (use /logout instead)
		if (sessionIdToRevoke === currentSessionId) {
			return c.json({ error: "Use /logout endpoint to revoke current session" }, 400);
		}

		// Revoke the session
		await sessionStore.revokeAppSession(sessionIdToRevoke);

		log.info(
			{
				userId: currentUserId,
				revokedSessionId: `${sessionIdToRevoke.substring(0, 8)}...`,
			},
			"Session revoked by user",
		);

		return c.json({ message: "Session revoked successfully" });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Session revocation error:");
		return c.json({ error: "Failed to revoke session" }, 500);
	}
});

export { sessionRoutes };
