/**
 * Get current Unix timestamp in seconds
 */
export function getCurrentEpoch(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * Add days to current time and return Unix timestamp in seconds
 * @param days Number of days to add
 * @returns Unix timestamp in seconds
 */
export function addDays(days: number): number {
	return getCurrentEpoch() + days * 24 * 60 * 60;
}

/**
 * Check if a timestamp has expired
 * @param expiresAt Unix timestamp in seconds
 * @returns true if expired, false otherwise
 */
export function isExpired(expiresAt: number): boolean {
	return getCurrentEpoch() > expiresAt;
}

/**
 * Format Unix timestamp to ISO string
 * @param epoch Unix timestamp in seconds
 * @returns ISO 8601 string
 */
export function formatEpoch(epoch: number): string {
	return new Date(epoch * 1000).toISOString();
}
