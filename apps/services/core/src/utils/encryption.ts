/**
 * Encryption utilities for sensitive data
 * 
 * Uses AES-256-GCM for authenticated encryption of credentials and secrets.
 * Requires PAYMENT_CONFIGS_KEY environment variable (32-byte hex).
 */

import crypto from "node:crypto";
import { env } from "../config/env";

/**
 * Get encryption key from environment
 * @throws Error if key is missing or invalid
 */
export function getEncryptionKey(): Buffer {
	const keyHex = env.PAYMENT_CONFIGS_KEY;
	if (!keyHex) {
		throw new Error("Missing PAYMENT_CONFIGS_KEY env var");
	}
	const buf = Buffer.from(keyHex, "hex");
	if (buf.length !== 32) {
		throw new Error("PAYMENT_CONFIGS_KEY must be 32-byte hex (64 hex chars for AES-256-GCM)");
	}
	return buf;
}

/**
 * Encrypt a string using AES-256-GCM
 * 
 * @param plaintext - String to encrypt
 * @returns Base64-encoded encrypted data in format: iv.tag.ciphertext
 */
export function encryptString(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = crypto.randomBytes(12); // 96-bit IV for GCM
	const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
	const ciphertext = Buffer.concat([
		cipher.update(Buffer.from(plaintext, "utf8")),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

/**
 * Decrypt a string encrypted with encryptString
 * 
 * @param encrypted - Encrypted string in format: iv.tag.ciphertext
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decryptString(encrypted: string): string {
	const key = getEncryptionKey();
	const parts = encrypted.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid encrypted data format");
	}
	const [ivB64, tagB64, ciphertextB64] = parts as [string, string, string];
	const iv = Buffer.from(ivB64, "base64");
	const tag = Buffer.from(tagB64, "base64");
	const ciphertext = Buffer.from(ciphertextB64, "base64");
	
	const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
	decipher.setAuthTag(tag);
	const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
	return plaintext.toString("utf8");
}

/**
 * Encrypt credentials object (converts to JSON first)
 * 
 * @param credentials - Credentials object to encrypt
 * @returns Encrypted string
 */
export function encryptCredentials(credentials: Record<string, unknown>): string {
	return encryptString(JSON.stringify(credentials));
}

/**
 * Decrypt and parse credentials object
 * 
 * @param encrypted - Encrypted credentials string
 * @returns Decrypted credentials object
 * @throws Error if decryption or JSON parsing fails
 */
export function decryptCredentials(encrypted: string): Record<string, string> {
	const decrypted = decryptString(encrypted);
	return JSON.parse(decrypted);
}

/**
 * Securely wipe a string from memory (best effort)
 * Note: JavaScript doesn't guarantee memory wiping, but this helps
 */
export function wipeString(str: string): void {
	if (typeof str !== "string") return;
	// Try to overwrite the string's internal buffer
	// This is best-effort as JS strings are immutable
	try {
		// @ts-expect-error - accessing internal buffer
		if (str.buffer) {
			// @ts-expect-error
			crypto.randomFillSync(str.buffer);
		}
	} catch {
		// Ignore errors - this is best effort
	}
}
