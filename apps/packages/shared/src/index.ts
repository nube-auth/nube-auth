// Re-export all types

// Re-export ID types for type safety
export {
	type InternalId,
	type PublicId,
	internalId,
	publicId,
	unwrapInternalId,
	unwrapPublicId,
	isInternalId,
	isPublicId,
} from "./types/ids.js";

// Re-export email service (Node.js only - not for browser)
// Backend services should import directly: import { createEmailService } from "@proofa/shared/email"
// Type-only export to prevent bundling in browser builds
export type { EmailConfig, EmailOptions } from "./email.js";
// Re-export audit logging
export {
	type AuditEvent,
	AuditEventType,
	AuditLogger,
	AuditSeverity,
	createAuditLogger,
} from "./audit.js";
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
	CORE_SESSION_REFRESH_INTERVAL_SECONDS,

	CORE_SESSION_TTL_SECONDS,
	ERROR_CODES,
	type ErrorCodeType,
	LICENSE_PLANS,
	LICENSE_SOURCES,
	LICENSE_STATUSES,
	type LicensePlanType,
	type LicenseSourceType,
	type LicenseStatusType,
	SUBSCRIPTION_STATUSES,
	type SubscriptionStatusType,
	BILLING_TYPES,
	type BillingType,
	BILLING_INTERVALS,
	type BillingInterval,
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
// Re-export environment utilities (Node.js only - not for browser)
// Note: These functions use Node.js APIs and should NOT be imported in browser code
// Backend services should import directly: import { loadEnv } from "@proofa/shared/env-loader"
// Type-only export to prevent bundling in browser builds
export type {} from "./env-loader.js";
export type { IdType } from "./id.js";
// Re-export ID generators and validation
export { createId, id, idPatterns, validateId } from "./id.js";
// Re-export middleware (Node.js only - uses Redis)
// Browser builds should not import these
// Backend services should import directly if needed
export type { LockoutConfig } from "./middleware/lockout.js";
export type {
	ApiResponse,
	App,
	AppEntitlement,
	AppTokens,
	AuditLog,
	AuthCode,
	AuthContext,
	EmailVerification,
	Identity,
	License,
	PlanSettings,
	Project,
	ProjectMember,
	SecuritySettings,
	Session,
	SessionEntitlements,
	TrialConfig,
	User,
} from "./types/index.js";
// Re-export schemas
export * from "./types/schemas/index.js";
// Re-export credential utilities
export {
	decryptOAuthCredentials,
	decryptPaymentCredentials,
	encryptOAuthCredentials,
	encryptPaymentCredentials,
	maskOAuthCredentials,
	maskPaymentCredentials,
	type OAuthCredentials,
	type PaymentCredentials,
	safeDecryptOAuthCredentials,
	safeDecryptPaymentCredentials,
	validateOAuthCredentials,
	validatePaymentCredentials,
} from "./utils/credentials.js";
// Re-export utilities
export {
	addDays,
	formatEpoch,
	getCurrentEpoch,
	isExpired,
} from "./utils/date.js";
// Re-export encryption utilities
export {
	decrypt,
	encrypt,
	isEncrypted,
	maskSecret,
} from "./utils/encryption.js";

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
