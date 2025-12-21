import crypto from 'node:crypto';

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
	return crypto.randomBytes(length).toString('hex');
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
	return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify token against hash
 */
export function verifyToken(token: string, hash: string): boolean {
	return hashToken(token) === hash;
}

/**
 * Generate JWT-like token structure for validation
 * Note: For production, use a proper JWT library
 */
export function generateValidationToken(data: Record<string, any>, secret: string): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
	const payload = Buffer.from(JSON.stringify(data)).toString('base64url');

	const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

	return `${header}.${payload}.${signature}`;
}
