import { Hono } from 'hono';

const router = new Hono();

/**
 * GET /v1/license
 * Retrieves current license information
 */
router.get('/', (c) => {
  return c.json({
    message: 'License information',
    status: 'active',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

export const licenseRoutes = router;
