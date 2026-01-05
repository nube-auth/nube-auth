import crypto from "node:crypto";

/**
 * Encryption utility for sensitive data like OAuth secrets
 * Uses AES-256-GCM for encryption
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // For GCM mode
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment variable
 * In production, this should be a strong random key stored securely
 */
function getEncryptionKey(): string {
	const key = process.env['ENCRYPTION_KEY'];
	if (!key) {
		throw new Error("ENCRYPTION_KEY environment variable is not set");
	}
	if (key.length < 32) {
		throw new Error("ENCRYPTION_KEY must be at least 32 characters long");
	}
	return key;
}

/**
 * Derive a key from the encryption key using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
	return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha512");
}

/**
 * Encrypt a string value
 * Returns a base64-encoded string containing: salt:iv:tag:encrypted_data
 */
export function encrypt(plaintext: string): string {
	if (!plaintext) {
		return "";
	}

	const encryptionKey = getEncryptionKey();

	// Generate random salt and IV
	const salt = crypto.randomBytes(SALT_LENGTH);
	const iv = crypto.randomBytes(IV_LENGTH);

	// Derive key from encryption key
	const key = deriveKey(encryptionKey, salt);

	// Create cipher
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

	// Encrypt the data
	let encrypted = cipher.update(plaintext, "utf8", "hex");
	encrypted += cipher.final("hex");

	// Get authentication tag
	const tag = cipher.getAuthTag();

	// Combine salt, IV, tag, and encrypted data
	const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, "hex")]);

	// Return as base64
	return combined.toString("base64");
}

/**
 * Decrypt an encrypted string
 * Expects a base64-encoded string containing: salt:iv:tag:encrypted_data
 */
export function decrypt(encryptedData: string): string {
	if (!encryptedData) {
		return "";
	}

	const encryptionKey = getEncryptionKey();

	// Decode from base64
	const combined = Buffer.from(encryptedData, "base64");

	// Extract components
	const salt = combined.subarray(0, SALT_LENGTH);
	const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
	const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
	const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

	// Derive key from encryption key
	const key = deriveKey(encryptionKey, salt);

	// Create decipher
	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(tag);

	// Decrypt the data
	let decrypted = decipher.update(encrypted.toString("hex"), "hex", "utf8");
	decrypted += decipher.final("utf8");

	return decrypted;
}

/**
 * Check if a value is encrypted (basic check)
 */
export function isEncrypted(value: string): boolean {
	if (!value) {
		return false;
	}

	try {
		// Try to decode as base64
		const decoded = Buffer.from(value, "base64");
		// Check if it has the expected minimum length (salt + iv + tag + some data)
		return decoded.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
	} catch {
		return false;
	}
}

/**
 * Mask a secret for display (show first 4 and last 4 characters)
 */
export function maskSecret(secret: string): string {
	if (!secret || secret.length < 12) {
		return "••••••••";
	}
	return `${secret.substring(0, 4)}${"•".repeat(secret.length - 8)}${secret.substring(secret.length - 4)}`;
}
