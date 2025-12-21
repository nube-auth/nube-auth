import { createSessionCookie, parseSessionCookie } from '@proofa/auth';
import { sessionStore } from '@proofa/redis';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { coreClient } from '../lib/core-client';

export const authRoutes = new Hono();

/**
 * POST /v1/auth/login
 * Exchange Core session for Gateway app session
 */
authRoutes.post('/login', async (c: Context) => {
	try {
		const { coreSessionId } = (await c.req.json()) as { coreSessionId?: string };

		if (!coreSessionId) {
			return c.json({ error: 'Core session ID required' }, 400);
		}

		// Get user info from Core
		const user = await coreClient.exchangeSession(coreSessionId);

		if (!user) {
			return c.json({ error: 'Invalid session' }, 401);
		}

		// Store app session in Redis (7-day TTL for now)
		const ttlSeconds = 7 * 24 * 60 * 60; // 7 days
		await sessionStore.setAppSession(coreSessionId, user.userId, 'gateway', ttlSeconds);

		// Create signed cookie
		const { name, value, attributes } = createSessionCookie(coreSessionId);

		// Set cookie
		setCookie(c, name, value, {
			httpOnly: attributes.httpOnly as boolean,
			secure: attributes.secure as boolean,
			sameSite: attributes.sameSite as string,
			path: attributes.path as string,
		});

		return c.json({
			message: 'Logged in successfully',
			user: {
				id: user.userId,
				email: user.email,
				name: user.name,
			},
		});
	} catch (error) {
		console.error('Login error:', error);
		return c.json({ error: 'Failed to login' }, 500);
	}
});

/**
 * POST /v1/auth/logout
 * Logout and clear session
 */
authRoutes.post('/logout', async (c: Context) => {
	try {
		// Clear session cookie
		setCookie(c, 'proofa_session', '', {
			httpOnly: true,
			secure: true,
			sameSite: 'Lax',
			path: '/',
			maxAge: 0, // Clear cookie
		});

		return c.json({ message: 'Logged out successfully' });
	} catch (error) {
		console.error('Logout error:', error);
		return c.json({ error: 'Failed to logout' }, 500);
	}
});

/**
 * GET /v1/auth/status
 * Check if user is logged in
 */
authRoutes.get('/status', async (c: Context) => {
	try {
		const cookie = c.req.cookie('proofa_session');

		if (!cookie) {
			return c.json({ loggedIn: false });
		}

		try {
			const sessionId = parseSessionCookie(cookie);
			const appSession = await sessionStore.getAppSession(sessionId);

			if (!appSession) {
				return c.json({ loggedIn: false });
			}

			// Get user info from Core
			const user = await coreClient.exchangeSession(sessionId);

			if (!user) {
				return c.json({ loggedIn: false });
			}

			return c.json({
				loggedIn: true,
				user: {
					id: user.userId,
					email: user.email,
					name: user.name,
				},
			});
		} catch {
			return c.json({ loggedIn: false });
		}
	} catch (error) {
		console.error('Status check error:', error);
		return c.json({ loggedIn: false });
	}
});
