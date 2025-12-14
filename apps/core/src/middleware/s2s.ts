import { Context, Next } from 'hono';

/**
 * S2S token validation middleware
 * Validates server-to-server authentication tokens for gateway communication
 */
export async function s2sMiddleware(c: Context, next: Next) {
  try {
    const s2sToken = c.req.header('x-s2s-token');

    if (!s2sToken) {
      return c.json({ error: 'Missing S2S token' }, 401);
    }

    // TODO: Validate S2S token against environment secret
    // This is a stub for S2S validation logic

    // Add S2S context to request
    (c as any).s2sTokenValid = true;

    await next();
  } catch (error) {
    return c.json({ error: 'S2S authentication failed' }, 401);
  }
}
