import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { meRoutes } from './routes/me';
import { adminRoutes } from './routes/admin';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Auth middleware (applies to protected routes)
app.use('*', authMiddleware);

// Routes
app.route('/v1/auth', authRoutes);
app.route('/v1/me', meRoutes);
app.route('/v1/admin', adminRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('App error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
