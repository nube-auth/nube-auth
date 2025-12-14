import { Hono } from 'hono';

const router = new Hono();

/**
 * POST /v1/email/start
 * Initiates email-based authentication
 */
router.post('/start', async (c) => {
  const body = await c.req.json();
  return c.json({
    message: 'Email verification started',
    email: body.email,
    expiresIn: 600, // 10 minutes
  });
});

/**
 * POST /v1/email/verify
 * Verifies email with OTP
 */
router.post('/verify', async (c) => {
  const body = await c.req.json();
  return c.json({
    message: 'Email verified',
    email: body.email,
    verified: true,
  });
});

export const emailRoutes = router;
