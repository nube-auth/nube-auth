// Session & Token TTLs (in seconds)
export const SESSION_TTL = 24 * 60 * 60; // 24 hours
export const CACHE_TTL = 2 * 60; // 2 minutes
export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
export const TOKEN_EXPIRY_BUFFER = 60; // 1 minute

// Rate limiting
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_ATTEMPT_WINDOW = 15 * 60; // 15 minutes
export const MAX_REQUESTS_PER_MINUTE = 100;

// Cookie settings
export const COOKIE_NAME = 'gateway_session';
export const COOKIE_PATH = '/';
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
export const SECURE_COOKIES = process.env.NODE_ENV === 'production';
export const SAME_SITE = 'Lax' as const;

// Routes configuration
export const PUBLIC_ROUTES = [
  '/auth/start',
  '/auth/callback',
  '/health',
];

export const AUTH_REQUIRED_ROUTES = [
  '/me',
  '/me/profile',
  '/me/sessions',
  '/me/logout',
  '/admin',
];

// Headers
export const REQUEST_ID_HEADER = 'X-Request-ID';
export const SERVICE_TOKEN_HEADER = 'X-Proofa-Service-Token';
export const APP_ID_HEADER = 'X-App-ID';

// CORS
export const CORS_DEFAULT_METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'];
export const CORS_CREDENTIALS = true;

// Logging
export const LOG_REQUEST_BODY = process.env.NODE_ENV === 'development';
export const LOG_RESPONSE_BODY = process.env.NODE_ENV === 'development';
