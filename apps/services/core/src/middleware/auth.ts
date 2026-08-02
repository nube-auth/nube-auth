import { getDb, sessionQueries, userQueries } from "@nube-auth/db";
import { createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context, Next } from "hono";
import { getSignedCookie } from "hono/cookie";
import { env } from "../config/env";

const log = createLogger("auth-middleware");

export interface AuthenticatedContext {
	sessionId: string;
	userId: string;
	user: {
		id: string;
		email: string;
	};
}

/**
 * Core session validation middleware
 * Validates session from X-Nube-Session-Id header (S2S calls) or signed cookie
 *
 * Security: Session must exist, be unexpired, and belong to a valid user
 * Tracking: https://github.com/0xdps/nube-auth/issues/42
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | undefined> {
	try {
		const db = getDb();
		const now = new Date();

		// Check for session in header (S2S) or signed cookie
		const sessionHeader = c.req.header("x-nube-session-id");
		const sessionCookie = await getSignedCookie(c, env.SESSION_SECRET, "sessionId");
		const sessionPublicId = sessionHeader || sessionCookie;

		if (!sessionPublicId) {
			return c.json({ error: "Unauthorized - No session provided" }, 401);
		}

		// Validate session ID format
		if (!idPatterns.session.test(sessionPublicId)) {
			log.warn({ sessionPublicId }, "Invalid session ID format");
			return c.json({ error: "Invalid session format" }, 401);
		}

		// Lookup session in database
		const session = await sessionQueries.findByPublicId(db, sessionPublicId);

		if (!session) {
			log.warn({ sessionPublicId }, "Session not found");
			return c.json({ error: "Session not found" }, 404);
		}

		// Check if session is expired
		if (session.expires_at < now) {
			log.warn({ sessionPublicId, expiresAt: session.expires_at }, "Session expired");
			return c.json({ error: "Session expired" }, 401);
		}

		// Check if session is revoked
		if (session.revoked_at) {
			log.warn({ sessionPublicId, revokedAt: session.revoked_at }, "Session revoked");
			return c.json({ error: "Session revoked" }, 401);
		}

		// Lookup user
		const user = await userQueries.findByInternalId_(db, session.user_id);

		if (!user) {
			log.error({ sessionPublicId, userId: session.user_id }, "User not found for valid session");
			return c.json({ error: "User not found" }, 404);
		}

		// Attach auth context to request
		(c as any).auth = {
			sessionId: session.public_id,
			userId: user.public_id,
			user: {
				id: user.public_id,
				email: user.primary_email || "",
				name: user.name,
			},
		} as AuthenticatedContext;

		// Update last_seen_at asynchronously (don't block request)
		sessionQueries.updateLastSeen(db, session.id, now).catch((err) => {
			log.error(
				{ err: serializeError(err as Error), sessionId: session.id },
				"Failed to update session last_seen_at",
			);
		});

		await next();
		return;
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Authentication middleware error");
		return c.json({ error: "Authentication failed" }, 500);
	}
}
