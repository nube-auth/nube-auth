import { GitHubOAuthAdapter, GoogleOAuthAdapter } from '@proofa/auth';
import { getDb, identityQueries, sessionQueries, userQueries } from '@proofa/db';
import { id, idPatterns } from '@proofa/shared';
import type { Context } from 'hono';
import { Hono } from 'hono';

export const authRoutes = new Hono();

/**
 * GET /v1/auth/start
 * Start OAuth flow
 */
authRoutes.get('/start', async (c: Context) => {
	const provider = c.req.query('provider') as 'google' | 'github' | undefined;
	const redirectUri = c.req.query('redirect_uri') as string | undefined;

	if (!provider || !['google', 'github'].includes(provider)) {
		return c.json({ error: 'Invalid provider' }, 400);
	}

	if (!redirectUri) {
		return c.json({ error: 'Missing redirect_uri' }, 400);
	}

	try {
		let adapter;
		if (provider === 'google') {
			adapter = new GoogleOAuthAdapter({
				clientId: process.env.GOOGLE_CLIENT_ID || '',
				clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
			});
		} else {
			adapter = new GitHubOAuthAdapter({
				clientId: process.env.GITHUB_CLIENT_ID || '',
				clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
			});
		}

		const authUrl = adapter.getAuthorizationUrl(id.authCode(), redirectUri);

		return c.json({ authUrl });
	} catch (error) {
		console.error('Auth start error:', error);
		return c.json({ error: 'Failed to start auth' }, 500);
	}
});

/**
 * GET /v1/auth/callback/:provider
 * OAuth callback handler
 */
authRoutes.get('/callback/:provider', async (c: Context) => {
	const provider = c.req.param('provider') as 'google' | 'github' | undefined;
	const code = c.req.query('code') as string | undefined;

	if (!provider || !['google', 'github'].includes(provider)) {
		return c.json({ error: 'Invalid provider' }, 400);
	}

	if (!code) {
		return c.json({ error: 'Missing code' }, 400);
	}

	try {
		const db = getDb();

		let adapter;
		if (provider === 'google') {
			adapter = new GoogleOAuthAdapter({
				clientId: process.env.GOOGLE_CLIENT_ID || '',
				clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
			});
		} else {
			adapter = new GitHubOAuthAdapter({
				clientId: process.env.GITHUB_CLIENT_ID || '',
				clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
			});
		}

		const profile = await adapter.exchangeToken(code, process.env.CALLBACK_URL || '');

		// Find existing identity
		const existingIdentity = await identityQueries.findByProviderUserId(db, provider, profile.id);

		let userId = existingIdentity?.user_id;
		let createdUser = false;

		if (!userId) {
			// Create new user
			const newUser = await userQueries.create(db, {
				public_id: id.user(),
				primary_email: profile.email,
				name: profile.name,
				avatar_url: profile.avatar_url || null,
				created_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000),
			});
			userId = newUser.id;
			createdUser = true;

			// Create identity
			await identityQueries.create(db, {
				public_id: id.identity(),
				user_id: userId,
				provider,
				provider_user_id: profile.id,
				email: profile.email,
				created_at: Math.floor(Date.now() / 1000),
			});
		}

		// Create core session
		const sessionData = {
			public_id: id.session(),
			user_id: userId,
			created_at: Math.floor(Date.now() / 1000),
			last_seen_at: Math.floor(Date.now() / 1000),
			expires_at: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
		};

		const session = await sessionQueries.create(db, sessionData);

		// Get user info for response
		const user = await userQueries.findById(db, userId);

		return c.json({
			sessionId: session.public_id,
			userId: user?.public_id,
			createdUser,
		});
	} catch (error) {
		console.error('Auth callback error:', error);
		return c.json({ error: 'Failed to complete auth' }, 500);
	}
});

/**
 * POST /v1/auth/exchange
 * Exchange session token for cookies
 */
authRoutes.post('/exchange', async (c: Context) => {
	const { sessionId } = await c.req.json();

	if (!sessionId || !idPatterns.session.test(sessionId)) {
		return c.json({ error: 'Invalid session' }, 400);
	}

	try {
		const db = getDb();
		const session = await sessionQueries.findByPublicId(db, sessionId);

		if (!session) {
			return c.json({ error: 'Session not found' }, 404);
		}

		const now = Math.floor(Date.now() / 1000);
		if (session.expires_at < now) {
			return c.json({ error: 'Session expired' }, 401);
		}

		const user = await userQueries.findById(db, session.user_id);

		if (!user) {
			return c.json({ error: 'User not found' }, 404);
		}

		return c.json({
			userId: user.public_id,
			email: user.primary_email,
			name: user.name,
			expiresAt: session.expires_at,
		});
	} catch (error) {
		console.error('Auth exchange error:', error);
		return c.json({ error: 'Failed to exchange session' }, 500);
	}
});
