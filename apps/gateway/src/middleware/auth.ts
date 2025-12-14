import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { sessionService } from '../services/sessionService';
import { APP_ID_HEADER } from '../config/constants';

/**
 * Session validation middleware
 * Validates session tokens from cookies and attaches user context to request
 */
export const authMiddleware = createMiddleware(async (c: Context, next) => {
  const sessionToken = c.req.cookie('gateway_session');
  const appId = c.get(APP_ID_HEADER) as string | undefined;

  if (!sessionToken || !appId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const session = await sessionService.getSession(sessionToken);

    if (!session || session.appId !== appId) {
      return c.json({ error: 'Invalid session' }, 401);
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      await sessionService.deleteSession(sessionToken);
      return c.json({ error: 'Session expired' }, 401);
    }

    // Attach session to context
    c.set('session', session);
    c.set('userId', session.userId);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Unauthorized' }, 401);
  }
});

/**
 * Optional auth middleware - doesn't fail if not authenticated
 */
export const optionalAuthMiddleware = createMiddleware(async (c: Context, next) => {
  const sessionToken = c.req.cookie('gateway_session');
  const appId = c.get(APP_ID_HEADER) as string | undefined;

  if (sessionToken && appId) {
    try {
      const session = await sessionService.getSession(sessionToken);

      if (session && session.appId === appId) {
        // Check if session is not expired
        if (new Date(session.expiresAt) > new Date()) {
          c.set('session', session);
          c.set('userId', session.userId);
        }
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }

  await next();
});
