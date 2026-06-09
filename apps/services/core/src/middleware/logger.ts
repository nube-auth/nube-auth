import { createId } from "@nube-auth/shared";
import type { Context, Next } from "hono";
import type pino from "pino";

/**
 * Request ID middleware
 * Adds unique request ID for tracking and logging
 */
export async function requestIdMiddleware(c: Context, next: Next) {
	const requestId = c.req.header("x-request-id") || createId("request");
	c.set("requestId", requestId);
	await next();
}

/**
 * HTTP request/response logger middleware using pino
 */
export function httpLogger(log: pino.Logger) {
	return async (c: Context, next: Next) => {
		const requestId = c.req.header("x-request-id") || createId("request");
		const method = c.req.method;
		const path = c.req.path;
		const startTime = Date.now();

		// Create child logger with request context
		const reqLog = log.child({ requestId, method, path });

		// Store logger in context for use in routes
		c.set("log", reqLog);
		c.set("requestId", requestId);

		reqLog.debug("Request started");

		await next();

		const duration = Date.now() - startTime;
		const status = c.res.status;

		const logLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "debug";
		reqLog[logLevel]({ status, duration }, "Request completed");
	};
}
