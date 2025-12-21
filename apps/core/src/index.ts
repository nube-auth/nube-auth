import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { requestIdMiddleware } from './middleware/logger';
import { errorHandler } from './middleware/error';
import { authRoutes } from './routes/v1/auth';
import { emailRoutes } from './routes/v1/email';
import { licenseRoutes } from './routes/v1/license';
import { adminRoutes } from './routes/v1/admin';

const app = new Hono();

// Global middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', requestIdMiddleware);

// Routes
app.route('/v1/auth', authRoutes);
app.route('/v1/email', emailRoutes);
app.route('/v1/license', licenseRoutes);
app.route('/v1/admin', adminRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.onError(errorHandler);

// Start server
const port = parseInt(process.env.PORT || '3001', 10);
console.log(`🚀 Core server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Core server running at http://localhost:${port}`);

export default app;
