import * as crypto from "node:crypto";
import { OTP_LENGTH } from "@nube-auth/shared";

/**
 * Generate a cryptographically secure random 6-digit OTP
 */
export function generateOTP(): string {
	return crypto.randomInt(0, 1000000).toString().padStart(OTP_LENGTH, "0");
}

/**
 * Hash OTP using PBKDF2 with a random per-OTP salt.
 * Returns "salt:hash" string.
 */
export function hashOTP(otp: string): string {
	const salt = crypto.randomBytes(16).toString("hex");
	const hash = crypto.pbkdf2Sync(otp, salt, 100000, 64, "sha256").toString("hex");
	return `${salt}:${hash}`;
}

/**
 * Verify OTP against stored "salt:hash" using constant-time comparison
 */
export function verifyOTP(otp: string, storedHash: string): boolean {
	const [salt, hash] = storedHash.split(":");
	if (!salt || !hash) return false;
	const otpHash = crypto.pbkdf2Sync(otp, salt, 100000, 64, "sha256").toString("hex");
	if (otpHash.length !== hash.length) return false;
	return crypto.timingSafeEqual(Buffer.from(otpHash), Buffer.from(hash));
}

/**
 * Generate a random session token
 */
export function generateSessionToken(length = 32): string {
	return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate S2S authentication token
 */
export function generateS2SToken(length = 32): string {
	return crypto.randomBytes(length).toString("hex");
}

/**
 * Validate S2S token using constant-time comparison
 */
export function validateS2SToken(token: string, expectedToken: string): boolean {
	if (token.length !== expectedToken.length) return false;
	return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}
