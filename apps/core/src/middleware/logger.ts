import { Context, Next } from 'hono';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID middleware
 * Adds unique request ID for tracking and logging
 */
export async function requestIdMiddleware(c: Context, next: Next) {
  const requestId = c.req.header('x-request-id') || uuidv4();
  c.set('requestId', requestId);

  // Log request
  const method = c.req.method;
  const path = c.req.path;
  const startTime = Date.now();

  console.log(`[${requestId}] ${method} ${path} - Started`);

  await next();

  const duration = Date.now() - startTime;
  const status = c.res.status;

  console.log(
    `[${requestId}] ${method} ${path} - Completed in ${duration}ms (${status})`
  );
}
