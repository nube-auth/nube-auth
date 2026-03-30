import crypto from "node:crypto";

/**
 * Token generation and hashing utilities
 */

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
	return crypto.randomBytes(length).toString("hex");
}

/**
 * Hash a value using SHA-256
 */
export function hashToken(token: string): string {
	return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a token against its hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
	return hashToken(token) === hash;
}

/**
 * Generate a cryptographically secure random numeric OTP.
 * Uses crypto.randomInt (CSPRNG) — never Math.random().
 */
export function generateOTP(length: number = 6): string {
	let otp = "";
	for (let i = 0; i < length; i++) {
		otp += crypto.randomInt(0, 10).toString();
	}
	return otp;
}

/**
 * Generate JWT-like token
 */
export function generateJWT(payload: Record<string, any>, secret: string, expiresIn: number = 3600): string {
	const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
	const now = Math.floor(Date.now() / 1000);
	const body = Buffer.from(
		JSON.stringify({
			...payload,
			iat: now,
			exp: now + expiresIn,
		}),
	).toString("base64url");

	const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");

	return `${header}.${body}.${signature}`;
}
