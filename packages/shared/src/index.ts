// Re-export all types
export type {
	ApiResponse,
	App,
	AuditLog,
	AuthCode,
	AuthContext,
	EmailVerification,
	Identity,
	License,
	Project,
	ProjectMember,
	Session,
	User,
} from "./types/index.js";

// Re-export schemas
export * from "./types/schemas/index.js";

// Re-export constants
export {
	ACCOUNT_LOCKOUT_DEFAULT_MINUTES,
	APP_SESSION_DEFAULT_DAYS,
	APP_SESSION_MAX_DAYS,
	APP_SESSION_MIN_DAYS,
	AUDIT_ACTIONS,
	AUTH_CODE_TTL_SECONDS,
	type AuditActionType,
	CACHE_TTL_DEFAULT_MINUTES,
	CORE_SESSION_REFRESH_INTERVAL_HOURS,
	CORE_SESSION_TTL_DAYS,
	CORE_SESSION_TTL_SECONDS,
	ERROR_CODES,
	type ErrorCodeType,
	LICENSE_PLANS,
	LICENSE_SOURCES,
	LICENSE_STATUSES,
	type LicensePlanType,
	type LicenseSourceType,
	type LicenseStatusType,
	OTP_LENGTH,
	OTP_LOCKOUT_MINUTES,
	OTP_MAX_ATTEMPTS,
	OTP_TTL_MINUTES,
	PROVIDERS,
	type ProviderType,
	RATE_LIMIT_AUTH_START_PER_5MIN,
	RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE,
	RATE_LIMIT_EMAIL_VERIFY_PER_OTP,
	RATE_LIMIT_OTP_SEND_PER_HOUR,
	ROLES,
	type RoleType,
} from "./constants/index.js";
// Re-export port configuration
export {
	DEFAULT_PORTS,
	getPort,
	getServiceUrl,
	INFRA_PORTS,
	ports,
} from "./constants/ports.js";
export type { IdType } from "./id.js";
// Re-export ID generators and validation
export { createId, id, idPatterns, validateId } from "./id.js";

// Re-export utilities
export {
	addDays,
	formatEpoch,
	getCurrentEpoch,
	isExpired,
} from "./utils/date.js";
// Re-export logger utilities
export {
	createChildLogger,
	createLogger,
	type LogLevel,
	logger,
	serializeError,
	serializeRequest,
	serializeResponse,
} from "./utils/logger.js";
// Re-export secret validation utilities
export {
	generateSecret,
	validateSecret,
	validateSecrets,
} from "./utils/secrets.js";
// Re-export encryption utilities
export {
	encrypt,
	decrypt,
	isEncrypted,
	maskSecret,
} from "./utils/encryption.js";
// Re-export credential utilities
export {
	encryptOAuthCredentials,
	decryptOAuthCredentials,
	encryptPaymentCredentials,
	decryptPaymentCredentials,
	maskOAuthCredentials,
	maskPaymentCredentials,
	validateOAuthCredentials,
	validatePaymentCredentials,
	safeDecryptOAuthCredentials,
	safeDecryptPaymentCredentials,
	type OAuthCredentials,
	type PaymentCredentials,
} from "./utils/credentials.js";
// Re-export environment utilities (Node.js only - not for browser)
// Note: These are exported but should only be used in Node.js environments
// Browser builds should not import these
export type { } from "./env-loader.js"; // Type-only export to prevent bundling
// Actual exports available via direct import: import { loadEnv } from "@proofa/shared/env-loader"

// Re-export error handling utilities
export {
	AppError,
	createErrorResponse,
	createSuccessResponse,
	type ErrorCode,
	type ErrorResponse,
	ErrorResponses,
	getErrorCodeFromStatus,
	isErrorResponse,
	isSuccessResponse,
	type SuccessResponse,
} from "./utils/errors.js";

// Re-export validation utilities
export {
	booleanSchema,
	dateRangeSchema,
	emailSchema,
	formatValidationErrors,
	nonNegativeIntSchema,
	paginationSchema,
	positiveIntSchema,
	publicIdSchema,
	slugSchema,
	urlSchema,
	validateBody,
	validateParams,
	validateQuery,
	validateRequest,
} from "./utils/validation.js";

// Re-export middleware
export {
	corsMiddleware,
	setAppCorsOrigins,
} from "./middleware/cors.js";

export {
	checkLockout,
	clearLockout,
	DEFAULT_LOCKOUT_CONFIG,
	getAttemptCount,
	getEmailFromBody,
	getIpFromRequest,
	lockAccount,
	lockoutMiddleware,
	type LockoutConfig,
	recordFailedAttempt,
} from "./middleware/lockout.js";

// Re-export audit logging
export {
	AuditEventType,
	AuditSeverity,
	type AuditEvent,
	AuditLogger,
	createAuditLogger,
} from "./audit.js";