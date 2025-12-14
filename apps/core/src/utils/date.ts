/**
 * Timestamp and date utilities
 */

/**
 * Get current Unix timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get current date as ISO string
 */
export function getCurrentISO(): string {
  return new Date().toISOString();
}

/**
 * Add seconds to current time and return as timestamp
 */
export function getExpirationTimestamp(seconds: number): number {
  return getCurrentTimestamp() + seconds;
}

/**
 * Add seconds to current time and return as ISO string
 */
export function getExpirationISO(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

/**
 * Check if timestamp has expired
 */
export function isExpired(expiresAt: number | Date | string): boolean {
  const expiresAtMs =
    typeof expiresAt === 'number'
      ? expiresAt * 1000
      : new Date(expiresAt).getTime();
  return Date.now() > expiresAtMs;
}

/**
 * Get time remaining in seconds
 */
export function getTimeRemaining(expiresAt: number | Date | string): number {
  const expiresAtMs =
    typeof expiresAt === 'number'
      ? expiresAt * 1000
      : new Date(expiresAt).getTime();
  return Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
}
