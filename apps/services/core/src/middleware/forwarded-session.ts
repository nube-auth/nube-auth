import { getDb, sessionQueries, userQueries } from "@nube-auth/db";
import type { Context } from "hono";

type SessionUser = NonNullable<Awaited<ReturnType<typeof userQueries.findByPublicId>>>;

/**
 * The caller is the user on the forwarded session. A bare user header is not enough.
 */
export async function requireMatchingSession(c: Context): Promise<SessionUser | null> {
	const userPublicId = c.req.header("X-Nube-User-Id");
	const sessionPublicId = c.req.header("X-Nube-Session-Id");
	if (!userPublicId || !sessionPublicId) return null;

	const db = getDb();
	const user = await userQueries.findByPublicId(db, userPublicId);
	const session = await sessionQueries.findByPublicId(db, sessionPublicId);
	const live =
		user != null &&
		session != null &&
		session.user_id === user.id &&
		session.revoked_at == null &&
		session.expires_at.getTime() > Date.now();
	return live && user ? user : null;
}
