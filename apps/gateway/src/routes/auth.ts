import type { Context } from 'hono';
import { Router } from 'hono';

const authRouter = new Router();

/**
 * GET /auth/start
 * Initiates the OAuth flow
 */
authRouter.get('/start', async (c: Context) => {
  try {
    const appId = c.get('appId') as string;
    const state = Math.random().toString(36).substring(7);

    // Store state in Redis for validation on callback
    // TODO: implement state storage in sessionService

    return c.json({
      message: 'OAuth flow initiated',
      appId,
      state,
    });
  } catch (error) {
    console.error('Auth start error:', error);
    return c.json({ error: 'Failed to initiate OAuth flow' }, 500);
  }
});

/**
 * GET /auth/callback
 * Handles OAuth callback from auth provider
 */
authRouter.get('/callback', async (c: Context) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const appId = c.get('appId') as string;

    if (!code || !state) {
      return c.json({ error: 'Missing code or state' }, 400);
    }

    // TODO: implement callback handling
    // 1. Validate state from Redis
    // 2. Exchange code for token via Core service
    // 3. Create session in Redis
    // 4. Set cookie and redirect

    return c.json({
      message: 'OAuth callback received',
      appId,
      code,
    });
  } catch (error) {
    console.error('Auth callback error:', error);
    return c.json({ error: 'Failed to process OAuth callback' }, 500);
  }
});

export default authRouter;
