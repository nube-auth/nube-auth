/**
 * Redis key patterns and constants
 */

// Session keys
export const SESSION_KEY_PREFIX = 'gateway:session';
export function getSessionKey(token: string): string {
	return `${SESSION_KEY_PREFIX}:${token}`;
}

// User cache keys
export const USER_KEY_PREFIX = 'gateway:user';
export function getUserKey(userId: string): string {
	return `${USER_KEY_PREFIX}:${userId}`;
}

// License cache keys
export const LICENSE_KEY_PREFIX = 'gateway:license';
export function getLicenseKey(appId: string): string {
	return `${LICENSE_KEY_PREFIX}:${appId}`;
}

// Project cache keys
export const PROJECT_KEY_PREFIX = 'gateway:project';
export function getProjectKey(projectId: string): string {
	return `${PROJECT_KEY_PREFIX}:${projectId}`;
}

// State storage for OAuth
export const STATE_KEY_PREFIX = 'gateway:oauth-state';
export function getOAuthStateKey(state: string): string {
	return `${STATE_KEY_PREFIX}:${state}`;
}

// Rate limiting keys
export const RATE_LIMIT_KEY_PREFIX = 'gateway:rate-limit';
export function getRateLimitKey(userId: string, action: string): string {
	return `${RATE_LIMIT_KEY_PREFIX}:${userId}:${action}`;
}

// Lock keys for distributed locking
export const LOCK_KEY_PREFIX = 'gateway:lock';
export function getLockKey(resource: string): string {
	return `${LOCK_KEY_PREFIX}:${resource}`;
}
