import pino from "pino";

/**
 * Log levels for the application
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Create a configured pino logger instance
 *
 * @param name - The name/module of the logger (e.g., 'core', 'gateway', 'auth')
 * @param options - Additional pino options
 */
export function createLogger(
	name: string,
	options: {
		level?: LogLevel;
		pretty?: boolean;
	} = {},
) {
	const isProduction = process.env.NODE_ENV === "production";
	const level = options.level ?? (isProduction ? "info" : "debug");
	const pretty = options.pretty ?? !isProduction;

	const transport = pretty
		? {
				target: "pino-pretty",
				options: {
					colorize: true,
					translateTime: "SYS:standard",
					ignore: "pid,hostname",
				},
			}
		: undefined;

	return pino({
		name,
		level,
		...(transport && { transport }),
		base: {
			env: process.env.NODE_ENV ?? "development",
		},
		formatters: {
			level: (label) => ({ level: label }),
		},
	});
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(parent: pino.Logger, bindings: Record<string, unknown>) {
	return parent.child(bindings);
}

/**
 * Default logger instance for quick imports
 */
export const logger = createLogger("app");

/**
 * HTTP request log serializer
 */
export function serializeRequest(req: { method?: string; url?: string; headers?: Record<string, string> }) {
	return {
		method: req.method,
		url: req.url,
		userAgent: req.headers?.["user-agent"],
	};
}

/**
 * HTTP response log serializer
 */
export function serializeResponse(res: { status?: number; headers?: Record<string, string> }) {
	return {
		status: res.status,
		contentType: res.headers?.["content-type"],
	};
}

/**
 * Error serializer for logging
 */
export function serializeError(err: unknown): Record<string, unknown> {
	if (err instanceof Error) {
		const serialized: Record<string, unknown> = {
			name: err.name,
			message: err.message,
			stack: err.stack,
		};
		// Copy any additional properties from error subclasses
		for (const key of Object.keys(err)) {
			if (!(key in serialized)) {
				serialized[key] = (err as unknown as Record<string, unknown>)[key];
			}
		}
		return serialized;
	}
	return { error: String(err) };
}
