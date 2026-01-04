/**
 * Application constants
 * TTLs, limits, and other configuration values
 * Can be overridden by environment variables
 */

import { env } from "./env";

export const TTL = {
	// Session TTL - 7 days
	SESSION: env.SESSION_TTL_SECONDS ?? 365 * 24 * 60 * 60,
	// JWT expiration - 1 hour
	JWT: env.JWT_TTL_SECONDS ?? 60 * 60,
	// Email verification code - 10 minutes
	EMAIL_CODE: env.EMAIL_CODE_TTL_SECONDS ?? 10 * 60,
	// OAuth state - 10 minutes
	OAUTH_STATE: env.OAUTH_STATE_TTL_SECONDS ?? 10 * 60,
	// Refresh token - 30 days
	REFRESH_TOKEN: env.REFRESH_TOKEN_TTL_SECONDS ?? 30 * 24 * 60 * 60,
} as const;

export const LIMITS = {
	// Max login attempts before rate limit
	MAX_LOGIN_ATTEMPTS: env.MAX_LOGIN_ATTEMPTS ?? 5,
	// Rate limit window - 15 minutes
	RATE_LIMIT_WINDOW: env.RATE_LIMIT_WINDOW_SECONDS ?? 15 * 60,
	// Max email verification attempts
	MAX_EMAIL_ATTEMPTS: env.MAX_EMAIL_ATTEMPTS ?? 3,
	// Max OAuth callback attempts
	MAX_OAUTH_ATTEMPTS: env.MAX_OAUTH_ATTEMPTS ?? 3,
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
