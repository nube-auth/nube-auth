import crypto from "node:crypto";

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
	return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate session token
 */
export function generateSessionToken(): string {
	return generateToken(32);
}

/**
 * Generate OAuth state token
 */
export function generateStateToken(): string {
	return generateToken(32);
}

/**
 * Hash a token (for storage)
 */
export function hashToken(token: string): string {
	return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verify token against hash using constant-time comparison
 */
export function verifyToken(token: string, hash: string): boolean {
	const computed = hashToken(token);
	if (computed.length !== hash.length) return false;
	return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}
