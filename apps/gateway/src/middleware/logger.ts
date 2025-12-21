import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getEnv } from '../config/env';

interface RequestLog {
	requestId: string;
	timestamp: string;
	method: string;
	path: string;
	statusCode?: number;
	duration?: number;
	userId?: string;
	appId?: string;
	error?: string;
}

const isDevelopment = () => getEnv().NODE_ENV === 'development';

/**
 * Request logging middleware
 * Logs incoming requests and outgoing responses with request IDs
 */
export const loggerMiddleware = createMiddleware(async (c: Context, next) => {
	const requestId = c.get('requestId') as string;
	const startTime = Date.now();

	const log: RequestLog = {
		requestId,
		timestamp: new Date().toISOString(),
		method: c.req.method,
		path: c.req.path,
		userId: c.get('userId') as string | undefined,
		appId: c.get('appId') as string | undefined,
	};

	try {
		if (isDevelopment()) {
			console.log('→ Incoming request:', {
				...log,
				headers: c.req.header('content-type'),
			});
		}

		await next();

		log.statusCode = c.res.status;
		log.duration = Date.now() - startTime;

		const logLevel = c.res.status >= 400 ? 'warn' : 'info';
		if (isDevelopment()) {
			console[logLevel as any]('← Response:', log);
		}
	} catch (error) {
		log.duration = Date.now() - startTime;
		log.error = error instanceof Error ? error.message : 'Unknown error';

		console.error('✗ Request error:', log);
		throw error;
	}
});

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
