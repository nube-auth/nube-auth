import { appQueries, getDb, licenseQueries } from '@proofa/db';
import type { Context } from 'hono';
import { Hono } from 'hono';

const router = new Hono();

/**
 * GET /v1/license
 * Get license information for an app
 */
router.get('/', async (c: Context) => {
	const appId = c.req.query('appId');

	if (!appId) {
		return c.json({ error: 'Missing appId' }, 400);
	}

	try {
		const db = getDb();
		const now = Math.floor(Date.now() / 1000);

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: 'App not found' }, 404);
		}

		// In a real implementation, you'd query the license from the database
		// For now, return a placeholder
		return c.json({
			appId,
			status: 'active',
			expiresAt: now + 365 * 24 * 60 * 60, // 1 year from now
			seats: 1,
		});
	} catch (error) {
		console.error('License get error:', error);
		return c.json({ error: 'Failed to get license' }, 500);
	}
});

/**
 * POST /v1/license/grant
 * Admin endpoint to grant a license to a user
 */
router.post('/grant', async (c: Context) => {
	const { userId, appId, expiresAt } = (await c.req.json()) as {
		userId?: string;
		appId?: string;
		expiresAt?: number;
	};

	if (!userId || !appId || !expiresAt) {
		return c.json({ error: 'Missing required fields' }, 400);
	}

	try {
		const db = getDb();
		const _now = Math.floor(Date.now() / 1000);

		// Validate app exists
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: 'App not found' }, 404);
		}

		// Create or update license
		const license = await licenseQueries.createOrUpdate(db, 0, app.id, {
			expires_at: expiresAt,
		});

		return c.json({
			message: 'License granted',
			license,
		});
	} catch (error) {
		console.error('License grant error:', error);
		return c.json({ error: 'Failed to grant license' }, 500);
	}
});

export const licenseRoutes = router;
