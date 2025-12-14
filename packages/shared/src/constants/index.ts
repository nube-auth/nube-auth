/**
 * Session TTL in days
 */
export const SESSION_TTL_DAYS = 28;

/**
 * App session TTL constraints (in days)
 */
export const APP_SESSION_MIN_DAYS = 1;
export const APP_SESSION_MAX_DAYS = 365;
export const APP_SESSION_DEFAULT_DAYS = 7;

/**
 * OAuth provider names
 */
export const PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
  EMAIL: 'email',
} as const;

export type ProviderType = (typeof PROVIDERS)[keyof typeof PROVIDERS];

/**
 * License plans
 */
export const LICENSE_PLANS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export type LicensePlanType = (typeof LICENSE_PLANS)[keyof typeof LICENSE_PLANS];

/**
 * License statuses
 */
export const LICENSE_STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  PENDING: 'pending',
} as const;

export type LicenseStatusType = (typeof LICENSE_STATUSES)[keyof typeof LICENSE_STATUSES];

/**
 * Project/App member roles
 */
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

/**
 * Standard error codes
 */
export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeType = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
