import { createId, serializeError } from "@nube-auth/shared";
import type { Context, Next } from "hono";
import type pino from "pino";

/**
 * HTTP request/response logger middleware using pino
 */
export function httpLogger(log: pino.Logger) {
	return async (c: Context, next: Next) => {
		const requestId = c.req.header("x-nube-request-id") || createId("request");
		const method = c.req.method;
		const path = c.req.path;
		const startTime = Date.now();

		// Create child logger with request context
		const reqLog = log.child({ requestId, method, path });

		// Store logger in context for use in routes
		c.set("log", reqLog);
		c.set("requestId", requestId);

		reqLog.debug("Request started");

		try {
			await next();

			const duration = Date.now() - startTime;
			const status = c.res.status;
			const userId = c.get("userId") as string | undefined;
			const appId = c.get("appId") as string | undefined;

			const logData = { status, duration, ...(userId && { userId }), ...(appId && { appId }) };
			const logLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "debug";
			reqLog[logLevel](logData, "Request completed");
		} catch (error) {
			const duration = Date.now() - startTime;
			reqLog.error({ err: serializeError(error), duration }, "Request failed");
			throw error;
		}
	};
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
	return createId("request");
}
