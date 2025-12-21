import type { Context } from 'hono';

export interface AppError extends Error {
	status?: number;
	code?: string;
	details?: Record<string, any>;
}

/**
 * Global error handler middleware
 * Catches and formats all application errors
 */
export async function errorHandler(err: AppError, c: Context) {
	const status = err.status || 500;
	const code = err.code || 'INTERNAL_ERROR';

	console.error(`[${code}] ${err.message}`, {
		stack: err.stack,
		details: err.details,
	});

	return c.json(
		{
			error: {
				message: err.message,
				code,
				...(process.env.NODE_ENV === 'development' && { details: err.details }),
			},
		},
		status,
	);
}
