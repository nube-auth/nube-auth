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
	TRIALING: "trialing",
	EXPIRED: "expired",
	CANCELED: "canceled",
	SUSPENDED: "suspended",
} as const;

export type LicenseStatusType = (typeof LICENSE_STATUSES)[keyof typeof LICENSE_STATUSES];

/**
 * License sources — how the license was created
 */
export const LICENSE_SOURCES = {
	PURCHASE: "purchase",
	ADMIN_GRANT: "admin_grant",
	AUTO_FREE: "auto_free",
	INVITATION: "invitation",
	WEBHOOK: "webhook",
} as const;

export type LicenseSourceType = (typeof LICENSE_SOURCES)[keyof typeof LICENSE_SOURCES];

/**
 * Subscription statuses
 */
export const SUBSCRIPTION_STATUSES = {
	TRIALING: "trialing",
	ACTIVE: "active",
	PAST_DUE: "past_due",
	CANCELED: "canceled",
	UNPAID: "unpaid",
	ENDED: "ended",
	PAUSED: "paused",
} as const;

export type SubscriptionStatusType = (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES];

/**
 * Supported currencies (v1)
 * All stored and compared in lowercase (ISO 4217).
 *
 * Provider coverage (all 6 currencies supported by all 3 providers):
 *   Stripe       — 135+ currencies, all 6 supported natively
 *   LemonSqueezy — 130+ currencies, all 6 supported (display currency; settlement in USD)
 *   Dodo         — INR supported with dedicated wallet + UPI/Rupay payment methods;
 *                  non-USD currencies use Adaptive Currency (billing_currency on checkout)
 *
 * Note: JPY excluded from v1 — it is a zero-decimal currency requiring special
 * amount handling (amount_cents = whole yen, not hundredths). Add in v2.
 */
export const SUPPORTED_CURRENCIES = ["usd", "eur", "gbp", "cad", "aud", "inr"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Price billing types
 */
export const BILLING_TYPES = {
	RECURRING: "recurring",
	ONE_TIME: "one_time",
} as const;

export type BillingType = (typeof BILLING_TYPES)[keyof typeof BILLING_TYPES];

/**
 * Price billing intervals (for recurring prices)
 */
export const BILLING_INTERVALS = {
	MONTH: "month",
	YEAR: "year",
} as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[keyof typeof BILLING_INTERVALS];

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
