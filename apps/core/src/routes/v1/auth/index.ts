import { Hono } from 'hono';

const router = new Hono();

/**
 * GET /v1/auth/start
 * Initiates OAuth authentication flow
 */
router.get('/start', (c) => {
  return c.json({
    message: 'Auth flow initiated',
    providers: ['google', 'github'],
  });
});

/**
 * GET /v1/auth/callback/:provider
 * OAuth callback handler
 */
router.get('/callback/:provider', (c) => {
  const provider = c.req.param('provider');
  return c.json({
    message: `Callback for provider: ${provider}`,
    code: c.req.query('code'),
  });
});

export const authRoutes = router;
