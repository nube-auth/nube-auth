// Re-export all types
export type {
  User,
  Identity,
  Session,
  Project,
  ProjectMember,
  App,
  License,
  AuthCode,
  EmailVerification,
  AuditLog,
  ApiResponse,
  AuthContext,
} from './types/index.js';

// Re-export ID generators and validation
export { id, idPatterns, validateId, createId } from './id.js';
export type { IdType } from './id.js';

// Re-export constants
export {
  CORE_SESSION_TTL_DAYS,
  CORE_SESSION_TTL_SECONDS,
  CORE_SESSION_REFRESH_INTERVAL_HOURS,
  APP_SESSION_MIN_DAYS,
  APP_SESSION_MAX_DAYS,
  APP_SESSION_DEFAULT_DAYS,
  OTP_LENGTH,
  OTP_TTL_MINUTES,
  OTP_LOCKOUT_MINUTES,
  OTP_MAX_ATTEMPTS,
  AUTH_CODE_TTL_SECONDS,
  CACHE_TTL_DEFAULT_MINUTES,
  RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE,
  RATE_LIMIT_OTP_SEND_PER_HOUR,
  RATE_LIMIT_AUTH_START_PER_5MIN,
  RATE_LIMIT_EMAIL_VERIFY_PER_OTP,
  ACCOUNT_LOCKOUT_DEFAULT_MINUTES,
  PROVIDERS,
  LICENSE_PLANS,
  LICENSE_STATUSES,
  LICENSE_SOURCES,
  ROLES,
  AUDIT_ACTIONS,
  ERROR_CODES,
  type ProviderType,
  type LicensePlanType,
  type LicenseStatusType,
  type LicenseSourceType,
  type RoleType,
  type AuditActionType,
  type ErrorCodeType,
} from './constants/index.js';

// Re-export port configuration
export {
  DEFAULT_PORTS,
  INFRA_PORTS,
  getPort,
  ports,
  getServiceUrl,
} from './constants/ports.js';

// Re-export utilities
export {
  getCurrentEpoch,
  addDays,
  isExpired,
  formatEpoch,
} from './utils/date.js';

// Re-export secret validation utilities
export {
  validateSecret,
  validateSecrets,
  generateSecret,
} from './utils/secrets.js';
