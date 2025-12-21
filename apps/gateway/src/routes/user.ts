import type { Context } from 'hono';
import { Router } from 'hono';

const userRouter = new Router();

/**
 * GET /me
 * Get current user profile
 */
userRouter.get('/', async (c: Context) => {
	try {
		const userId = c.get('userId') as string;
		const appId = c.get('appId') as string;

		// TODO: implement user fetching from Core or cache
		return c.json({
			userId,
			appId,
			message: 'User profile',
		});
	} catch (error) {
		console.error('Get user error:', error);
		return c.json({ error: 'Failed to get user profile' }, 500);
	}
});

/**
 * GET /me/profile
 * Get detailed user profile
 */
userRouter.get('/profile', async (c: Context) => {
	try {
		const userId = c.get('userId') as string;

		// TODO: implement profile fetching
		return c.json({
			userId,
			message: 'User profile details',
		});
	} catch (error) {
		console.error('Get profile error:', error);
		return c.json({ error: 'Failed to get profile' }, 500);
	}
});

/**
 * PATCH /me/profile
 * Update user profile
 */
userRouter.patch('/profile', async (c: Context) => {
	try {
		const userId = c.get('userId') as string;
		const body = await c.req.json();

		// TODO: implement profile update via Core service
		return c.json({
			userId,
			message: 'Profile updated',
			data: body,
		});
	} catch (error) {
		console.error('Update profile error:', error);
		return c.json({ error: 'Failed to update profile' }, 500);
	}
});

/**
 * GET /me/sessions
 * List active sessions for the user
 */
userRouter.get('/sessions', async (c: Context) => {
	try {
		const userId = c.get('userId') as string;

		// TODO: implement sessions fetching from Redis
		return c.json({
			userId,
			sessions: [],
			message: 'User sessions',
		});
	} catch (error) {
		console.error('Get sessions error:', error);
		return c.json({ error: 'Failed to get sessions' }, 500);
	}
});

/**
 * DELETE /me/sessions/:session_id
 * Revoke a specific session
 */
userRouter.delete('/sessions/:session_id', async (c: Context) => {
	try {
		const userId = c.get('userId') as string;
		const sessionId = c.req.param('session_id');

		// TODO: implement session revocation
		return c.json({
			userId,
			sessionId,
			message: 'Session revoked',
		});
	} catch (error) {
		console.error('Revoke session error:', error);
		return c.json({ error: 'Failed to revoke session' }, 500);
	}
});

/**
 * POST /me/logout
 * Logout user by revoking current session
 */
userRouter.post('/logout', async (c: Context) => {
	try {
		const userId = c.get('userId') as string;
		const _sessionToken = c.req.cookie('gateway_session');

		// TODO: implement logout
		// 1. Delete session from Redis
		// 2. Clear session cookie

		return c.json({
			userId,
			message: 'User logged out',
		});
	} catch (error) {
		console.error('Logout error:', error);
		return c.json({ error: 'Failed to logout' }, 500);
	}
});

export default userRouter;
