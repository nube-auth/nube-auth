import { createLogger as createSharedLogger, serializeError } from "@proofa/shared";

/**
 * Create a logger instance for a specific module
 * Replaces console.log/console.error usage
 *
 * @param module - Module name for logging context
 * @returns Logger instance
 *
 * @example
 * const log = createLogger("auth-routes");
 * log.info({ userId: "123" }, "User logged in");
 * log.error({ err: serializeError(error) }, "Login failed");
 */
export function createLogger(module: string) {
	return createSharedLogger(module);
}

/**
 * Export serializeError for consistent error formatting
 */
export { serializeError };

/**
 * Type-safe logging helpers
 */
export const loggers = {
	auth: createSharedLogger("auth"),
	admin: createSharedLogger("admin-routes"),
	user: createSharedLogger("user-routes"),
	oauth: createSharedLogger("oauth"),
	payment: createSharedLogger("payment"),
	email: createSharedLogger("email"),
	redis: createSharedLogger("redis"),
	session: createSharedLogger("session"),
	middleware: createSharedLogger("middleware"),
} as const;

/**
 * Audit logger for security-sensitive operations
 */
import { createAuditLogger } from "@proofa/shared";
export const auditLogger = createAuditLogger(createSharedLogger("audit"));
