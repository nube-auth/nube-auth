import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getEnv } from './config/env';
import { errorMiddleware } from './middleware/error';
import { loggerMiddleware, generateRequestId } from './middleware/logger';
import { appResolverMiddleware } from './middleware/appResolver';
import { authMiddleware } from './middleware/auth';
import { REQUEST_ID_HEADER, PUBLIC_ROUTES, AUTH_REQUIRED_ROUTES } from './config/constants';
import { checkRedisHealth } from './redis/client';
import authRouter from './routes/auth';
import userRouter from './routes/user';
import adminRouter from './routes/admin';

// Initialize environment variables early
const env = getEnv();

// Create Hono app
const app = new Hono();

// Global middleware - applied to all routes

// Request ID middleware
app.use('*', (c, next) => {
  const requestId = c.req.header(REQUEST_ID_HEADER) || generateRequestId();
  c.set('requestId', requestId);
  c.header(REQUEST_ID_HEADER, requestId);
  return next();
});

// Error handling middleware
app.use('*', errorMiddleware);

// Logging middleware
app.use('*', loggerMiddleware);

// CORS middleware
app.use(
  '*',
  cors({
    origin: '*', // TODO: Scope to app allowed_hosts from config
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', REQUEST_ID_HEADER],
  })
);

// App resolver middleware - resolves app from hostname or query param
app.use('*', appResolverMiddleware);

// Health check endpoint (public)
app.get('/health', async (c) => {
  const redisHealthy = await checkRedisHealth();
  return c.json({
    status: redisHealthy ? 'ok' : 'degraded',
    redis: redisHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Public routes - no auth required
app.route('/auth', authRouter);

// Session validation middleware - applied to auth-required routes
app.use('/me', authMiddleware);
app.use('/admin', authMiddleware);

// Protected routes - auth required
app.route('/me', userRouter);
app.route('/admin', adminRouter);

// 404 handler
app.notFound((c) => {
  const requestId = c.get('requestId') as string;
  return c.json(
    {
      error: 'NOT_FOUND',
      message: 'Route not found',
      requestId,
    },
    404
  );
});

// Start server
const port = parseInt(env.PORT || '3002', 10);

export default {
  fetch: app.fetch,
  port,
};

// For Node.js HTTP server
if (import.meta.main) {
  const server = Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.log(`🚀 Gateway running at http://localhost:${port}`);
  console.log(`Environment: ${env.NODE_ENV}`);
}
