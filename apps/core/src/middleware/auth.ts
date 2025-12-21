import type { Context, Next } from 'hono';
import { getSignedCookie } from 'hono/cookie';

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
 * Validates JWT or session cookie
 */
export async function authMiddleware(c: Context, next: Next) {
	try {
		const authHeader = c.req.header('authorization');
		const sessionCookie = await getSignedCookie(c, 'session_secret', 'sessionId');

		if (!authHeader && !sessionCookie) {
			return c.json({ error: 'Unauthorized' }, 401);
		}

		// TODO: Validate JWT or session
		// This is a stub for session validation logic

		await next();
	} catch (_error) {
		return c.json({ error: 'Authentication failed' }, 401);
	}
}
