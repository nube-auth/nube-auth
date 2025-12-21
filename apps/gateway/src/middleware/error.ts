import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { ContentfulStatusCode } from "hono/utils/http-status";

interface ErrorResponse {
	error: string;
	message?: string;
	statusCode: number;
	requestId?: string;
}

class AppError extends Error {
	constructor(
		public statusCode: number,
		message: string,
		public code?: string,
	) {
		super(message);
	}
}

/**
 * Global error handling middleware
 * Catches all errors and returns structured error responses
 */
export const errorMiddleware = createMiddleware(async (c: Context, next): Promise<Response | void> => {
	try {
		await next();
	} catch (error) {
		const requestId = c.get("requestId") as string | undefined;
		let statusCode: ContentfulStatusCode = 500;
		let errorMessage = "Internal Server Error";
		let errorCode = "INTERNAL_ERROR";

		if (error instanceof AppError) {
			statusCode = error.statusCode as ContentfulStatusCode;
			errorMessage = error.message;
			errorCode = error.code || "APP_ERROR";
		} else if (error instanceof Error) {
			errorMessage = error.message;
		}

		const response: ErrorResponse = {
			error: errorCode,
			message: errorMessage,
			statusCode,
			...(requestId && { requestId }),
		};

		console.error("Request error:", {
			requestId,
			statusCode,
			error: errorMessage,
			stack: error instanceof Error ? error.stack : undefined,
		});

		return c.json(response, statusCode);
	}
});

export { AppError };
