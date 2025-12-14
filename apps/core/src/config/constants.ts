/**
 * Application constants
 * TTLs, limits, and other configuration values
 */

export const TTL = {
  // Session TTL - 7 days
  SESSION: 7 * 24 * 60 * 60,
  // JWT expiration - 1 hour
  JWT: 60 * 60,
  // Email verification code - 10 minutes
  EMAIL_CODE: 10 * 60,
  // OAuth state - 10 minutes
  OAUTH_STATE: 10 * 60,
  // Refresh token - 30 days
  REFRESH_TOKEN: 30 * 24 * 60 * 60,
} as const;

export const LIMITS = {
  // Max login attempts before rate limit
  MAX_LOGIN_ATTEMPTS: 5,
  // Rate limit window - 15 minutes
  RATE_LIMIT_WINDOW: 15 * 60,
  // Max email verification attempts
  MAX_EMAIL_ATTEMPTS: 3,
  // Max OAuth callback attempts
  MAX_OAUTH_ATTEMPTS: 3,
} as const;

export const PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
} as const;

export const AUTH_ROUTES = {
  START: '/v1/auth/start',
  CALLBACK: '/v1/auth/callback/:provider',
} as const;

export const EMAIL_ROUTES = {
  START: '/v1/email/start',
  VERIFY: '/v1/email/verify',
} as const;

export const LICENSE_ROUTES = {
  GET: '/v1/license',
} as const;

export const ADMIN_ROUTES = {
  GRANT_LICENSE: '/v1/admin/license/grant',
} as const;
