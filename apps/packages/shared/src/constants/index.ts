/**
 * Core session TTL (365 days rolling)
 */
export const CORE_SESSION_TTL_SECONDS = 365 * 24 * 60 * 60; // 365 days = 31536000 seconds
export const CORE_SESSION_REFRESH_INTERVAL_SECONDS = 30 * 24 * 60 * 60; // 30 days = 2592000 seconds

/**
 * App session TTL constraints (in days)
 */
export const APP_SESSION_MIN_DAYS = 1;
export const APP_SESSION_MAX_DAYS = 365;
export const APP_SESSION_DEFAULT_DAYS = 28;

/**
 * OTP and email verification
 */
export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_LOCKOUT_MINUTES = 30;
export const OTP_MAX_ATTEMPTS = 3;

/**
 * Auth code TTL (single-use, short-lived)
 */
export const AUTH_CODE_TTL_SECONDS = 120; // 2 minutes

/**
 * Cache TTL for /me endpoint (default 10 minutes, per-app configurable)
 */
export const CACHE_TTL_DEFAULT_MINUTES = 10;

/**
 * Rate limiting defaults
 */
export const RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE = 100;
export const RATE_LIMIT_OTP_SEND_PER_HOUR = 3;
export const RATE_LIMIT_AUTH_START_PER_5MIN = 10;
export const RATE_LIMIT_EMAIL_VERIFY_PER_OTP = 5;

/**
 * Account lockout (after failed login attempts)
 */
export const ACCOUNT_LOCKOUT_DEFAULT_MINUTES = 15;

/**
 * OAuth provider names
 */
export const PROVIDERS = {
	GOOGLE: "google",
	GITHUB: "github",
} as const;

export type ProviderType = (typeof PROVIDERS)[keyof typeof PROVIDERS];

/**
 * License plans
 */
export const LICENSE_PLANS = {
	FREE: "free",
	TRIAL: "trial",
	PRO: "pro",
	TEAM: "team",
	ENTERPRISE: "enterprise",
} as const;

export type LicensePlanType = (typeof LICENSE_PLANS)[keyof typeof LICENSE_PLANS];

/**
 * License statuses
 */
export const LICENSE_STATUSES = {
	ACTIVE: "active",
	EXPIRED: "expired",
	CANCELED: "canceled",
	SUSPENDED: "suspended",
} as const;

export type LicenseStatusType = (typeof LICENSE_STATUSES)[keyof typeof LICENSE_STATUSES];

/**
 * License sources
 */
export const LICENSE_SOURCES = {
	MANUAL: "manual",
	PROMO: "promo",
	STRIPE: "stripe",
	LEMONSQUEEZY: "lemonsqueezy",
	INTERNAL: "internal",
} as const;

export type LicenseSourceType = (typeof LICENSE_SOURCES)[keyof typeof LICENSE_SOURCES];

/**
 * Project/App member roles
 */
export const ROLES = {
	OWNER: "owner",
	ADMIN: "admin",
	MEMBER: "member",
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

/**
 * Audit log actions
 */
export const AUDIT_ACTIONS = {
	CREATE: "create",
	UPDATE: "update",
	DELETE: "delete",
	GRANT: "grant",
	REVOKE: "revoke",
	LOGIN: "login",
	LOGOUT: "logout",
} as const;

export type AuditActionType = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Standard error codes
 */
export const ERROR_CODES = {
	// Auth errors
	INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
	INVALID_OTP: "INVALID_OTP",
	OTP_LOCKED: "OTP_LOCKED",
	SESSION_EXPIRED: "SESSION_EXPIRED",
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	INVALID_S2S_TOKEN: "INVALID_S2S_TOKEN",

	// Resource errors
	NOT_FOUND: "NOT_FOUND",
	ALREADY_EXISTS: "ALREADY_EXISTS",
	CONFLICT: "CONFLICT",

	// Validation errors
	INVALID_INPUT: "INVALID_INPUT",
	VALIDATION_ERROR: "VALIDATION_ERROR",

	// Rate limiting
	RATE_LIMITED: "RATE_LIMITED",

	// Server errors
	INTERNAL_ERROR: "INTERNAL_ERROR",
	SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCodeType = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
