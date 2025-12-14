import { Hono } from 'hono';

const router = new Hono();

/**
 * POST /v1/admin/license/grant
 * Grants a license to a user (admin only)
 */
router.post('/license/grant', async (c) => {
  const body = await c.req.json();
  return c.json({
    message: 'License granted',
    userId: body.userId,
    licenseType: body.licenseType,
    grantedAt: new Date().toISOString(),
  });
});

export const adminRoutes = router;
