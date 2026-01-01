/**
 * Application constants
 * TTLs, limits, and other configuration values
 * Can be overridden by environment variables
 */

export const TTL = {
	// Session TTL - 7 days
	SESSION: process.env.SESSION_TTL ? parseInt(process.env.SESSION_TTL, 10) : 365 * 24 * 60 * 60,
	// JWT expiration - 1 hour
	JWT: process.env.JWT_TTL ? parseInt(process.env.JWT_TTL, 10) : 60 * 60,
	// Email verification code - 10 minutes
	EMAIL_CODE: process.env.EMAIL_CODE_TTL ? parseInt(process.env.EMAIL_CODE_TTL, 10) : 10 * 60,
	// OAuth state - 10 minutes
	OAUTH_STATE: process.env.OAUTH_STATE_TTL ? parseInt(process.env.OAUTH_STATE_TTL, 10) : 10 * 60,
	// Refresh token - 30 days
	REFRESH_TOKEN: process.env.REFRESH_TOKEN_TTL ? parseInt(process.env.REFRESH_TOKEN_TTL, 10) : 30 * 24 * 60 * 60,
} as const;

export const LIMITS = {
	// Max login attempts before rate limit
	MAX_LOGIN_ATTEMPTS: process.env.MAX_LOGIN_ATTEMPTS ? parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) : 5,
	// Rate limit window - 15 minutes
	RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW ? parseInt(process.env.RATE_LIMIT_WINDOW, 10) : 15 * 60,
	// Max email verification attempts
	MAX_EMAIL_ATTEMPTS: process.env.MAX_EMAIL_ATTEMPTS ? parseInt(process.env.MAX_EMAIL_ATTEMPTS, 10) : 3,
	// Max OAuth callback attempts
	MAX_OAUTH_ATTEMPTS: process.env.MAX_OAUTH_ATTEMPTS ? parseInt(process.env.MAX_OAUTH_ATTEMPTS, 10) : 3,
} as const;

export const PROVIDERS = {
	GOOGLE: "google",
	GITHUB: "github",
} as const;

export const AUTH_ROUTES = {
	START: "/v1/auth/start",
	CALLBACK: "/v1/auth/callback/:provider",
} as const;

export const EMAIL_ROUTES = {
	START: "/v1/email/start",
	VERIFY: "/v1/email/verify",
} as const;

export const LICENSE_ROUTES = {
	GET: "/v1/license",
} as const;

export const ADMIN_ROUTES = {
	GRANT_LICENSE: "/v1/admin/license/grant",
} as const;
