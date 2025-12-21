import { parseSessionCookie } from '@proofa/auth';
import { sessionStore } from '@proofa/redis';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { coreClient } from '../lib/core-client';

/**
 * Auth context with user and session info
 */
export interface AuthContext {
	userId: string;
	email: string;
	name: string;
	sessionId: string;
	appSessionId?: string;
}

/**
 * Middleware to extract and validate session cookie
 */
export const authMiddleware = createMiddleware(async (c: Context, next) => {
	// Skip auth for public routes
	const publicRoutes = ['/health', '/v1/auth/login', '/v1/auth/logout'];
	if (publicRoutes.includes(c.req.path) || c.req.path.startsWith('/v1/auth')) {
		return next();
	}

	const cookieValue = getCookie(c, 'proofa_session');

	if (!cookieValue) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	try {
		// Parse and verify signed session cookie
		const sessionId = parseSessionCookie(cookieValue);

		if (!sessionId) {
			return c.json({ error: 'Invalid session' }, 401);
		}

		// Check if app session exists in Redis
		const appSession = await sessionStore.getAppSession(sessionId);

		if (!appSession) {
			return c.json({ error: 'Session not found' }, 401);
		}

		// Get user info from Core
		const coreSession = await coreClient.exchangeSession(sessionId);

		if (!coreSession) {
			return c.json({ error: 'Invalid session' }, 401);
		}

		// Store auth context in Hono context
		const auth: AuthContext = {
			userId: coreSession.userId,
			email: coreSession.email,
			name: coreSession.name,
			sessionId,
			appSessionId: sessionId,
		};

		c.set('auth', auth);
		return next();
	} catch (error) {
		console.error('Auth middleware error:', error);
		return c.json({ error: 'Unauthorized' }, 401);
	}
});

/**
 * Get auth context from request
 */
export function getAuth(c: Context): AuthContext {
	const auth = c.get('auth');
	if (!auth) {
		throw new Error('Auth context not found');
	}
	return auth as AuthContext;
}

/**
 * S2S token validation middleware for internal requests
 */
export const s2sAuthMiddleware = createMiddleware(async (c: Context, next) => {
	const token = c.req.header('X-S2S-Token');
	const expectedToken = process.env.GATEWAY_S2S_TOKEN;

	if (!token || !expectedToken || token !== expectedToken) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	return next();
});
