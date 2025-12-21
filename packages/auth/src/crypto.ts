import * as crypto from "node:crypto";
import { OTP_LENGTH } from "@proofa/shared";

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
	return Math.floor(Math.random() * 1000000)
		.toString()
		.padStart(OTP_LENGTH, "0");
}

/**
 * Hash OTP using bcrypt-like approach
 * (In production, use bcrypt library)
 */
export function hashOTP(otp: string): string {
	// For MVP, use simple PBKDF2 hashing
	return crypto.pbkdf2Sync(otp, "proofa-otp-salt", 100000, 64, "sha256").toString("hex");
}

/**
 * Verify OTP against hash
 */
export function verifyOTP(otp: string, hash: string): boolean {
	const otpHash = hashOTP(otp);
	return otpHash === hash;
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
 * Validate S2S token
 */
export function validateS2SToken(token: string, expectedToken: string): boolean {
	return token === expectedToken;
}
