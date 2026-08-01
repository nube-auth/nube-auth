/**
 * Encryption utilities for sensitive data
 * 
 * Uses AES-256-GCM for authenticated encryption with DEK-wrapping (Envelope Encryption):
 * 
 *   KEK (Key Encryption Key) = PAYMENT_CONFIGS_KEY env var (32-byte hex)
 *   DEK (Data Encryption Key) = random 32 bytes, unique per row
 *   
 *   credentials          = AES-256-GCM(plaintext, DEK)     — stored in DB
 *   credentials_dek      = AES-256-GCM-WRAP(DEK, KEK)      — stored in DB
 * 
 * Key rotation only re-wraps DEKs — credentials column never changes.
 * Old KEKs can be deleted immediately after re-wrapping completes.
 */

import crypto from "node:crypto";
import { env } from "../config/env";

// ── Key Management ──────────────────────────────────────────────────────────────

/**
 * Get the master KEK from environment config.
 * @throws Error if key is missing or invalid
 */
export function getEncryptionKey(): Buffer {
	const keyHex = env.PAYMENT_CONFIGS_KEY;
	if (!keyHex) {
		throw new Error("Missing PAYMENT_CONFIGS_KEY env var");
	}
	return parseKey(keyHex);
}

/**
 * Parse and validate a 32-byte hex key string.
 * @throws Error if key is invalid
 */
export function parseKey(keyHex: string): Buffer {
	const buf = Buffer.from(keyHex, "hex");
	if (buf.length !== 32) {
		throw new Error("Encryption key must be 32-byte hex (64 hex chars for AES-256-GCM)");
	}
	return buf;
}

// ── Low-level AES-256-GCM ──────────────────────────────────────────────────────

/**
 * AES-256-GCM encrypt.
 * @returns base64(iv).base64(tag).base64(ciphertext)
 */
function aesEncrypt(plaintext: string, key: Buffer): string {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
	const ciphertext = Buffer.concat([
		cipher.update(Buffer.from(plaintext, "utf8")),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

/**
 * AES-256-GCM decrypt.
 * @param encrypted - format: base64(iv).base64(tag).base64(ciphertext)
 */
function aesDecrypt(encrypted: string, key: Buffer): string {
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
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// ── DEK-Wrapping (Envelope Encryption) ──────────────────────────────────────────

/**
 * Generate a random 32-byte Data Encryption Key.
 */
export function generateDEK(): Buffer {
	return crypto.randomBytes(32);
}

/**
 * Wrap a DEK with the KEK (AES-256-GCM key encryption).
 * @returns base64(iv).base64(tag).base64(encrypted_dek)
 */
export function wrapDEK(dek: Buffer, kek: Buffer): string {
	return aesEncrypt(dek.toString("base64"), kek);
}

/**
 * Unwrap a DEK with the KEK.
 * @throws Error if unwrap fails (wrong KEK, tampered data)
 */
export function unwrapDEK(wrappedDek: string, kek: Buffer): Buffer {
	const dekB64 = aesDecrypt(wrappedDek, kek);
	const dek = Buffer.from(dekB64, "base64");
	if (dek.length !== 32) {
		throw new Error("Unwrapped DEK is invalid (expected 32 bytes)");
	}
	return dek;
}

/**
 * Re-wrap a DEK with a new KEK (for key rotation).
 */
export function rewrappedDEK(wrappedDek: string, oldKek: Buffer, newKek: Buffer): string {
	const dek = unwrapDEK(wrappedDek, oldKek);
	return wrapDEK(dek, newKek);
}

/**
 * Seal (encrypt) a string using DEK-wrapping.
 * 
 * @returns { sealed: encrypted data, wrappedDek: wrapped DEK }
 */
export function seal(plaintext: string, kek: Buffer, dek?: Buffer): { sealed: string; wrappedDek: string } {
	const dataKey = dek ?? generateDEK();
	return {
		sealed: aesEncrypt(plaintext, dataKey),
		wrappedDek: wrapDEK(dataKey, kek),
	};
}

/**
 * Unseal (decrypt) a string using DEK-wrapping.
 */
export function unseal(sealed: string, wrappedDek: string, kek: Buffer): string {
	const dek = unwrapDEK(wrappedDek, kek);
	return aesDecrypt(sealed, dek);
}

/**
 * Seal credentials object (JSON-encodes, then encrypts with DEK-wrapping).
 */
export function sealCredentials(
	credentials: Record<string, unknown>,
	kek: Buffer,
	dek?: Buffer,
): { sealed: string; wrappedDek: string } {
	return seal(JSON.stringify(credentials), kek, dek);
}

/**
 * Unseal credentials object (decrypts with DEK-wrapping, then JSON-parses).
 */
export function unsealCredentials(sealed: string, wrappedDek: string, kek: Buffer): Record<string, string> {
	const json = unseal(sealed, wrappedDek, kek);
	return JSON.parse(json);
}

// ── High-level Provider Credentials API ─────────────────────────────────────────

/**
 * Decrypt a payment provider config's credentials.
 * Supports both DEK-wrapped (new) and direct KEK (legacy) rows transparently.
 * 
 * Tries PRIMARY key first, then PREVIOUS key (if set) for zero-downtime rotation.
 * This means you can rotate keys without any decrypt failures during the gap
 * between re-wrapping DEKs and restarting services.
 * 
 * @param config - Row with credentials (encrypted) and credentials_dek (wrapped DEK, null for legacy)
 * @param kek - Optional override KEK (defaults to PAYMENT_CONFIGS_KEY env var)
 */
export function decryptProviderCredentials(
	config: { credentials: string; credentials_dek: string | null },
	kek?: Buffer,
): Record<string, string> {
	const primaryKey = kek ?? getEncryptionKey();
	const previousKeyHex = env.PAYMENT_CONFIGS_KEY_PREVIOUS;
	const previousKey = previousKeyHex && previousKeyHex.length === 64
		? parseKey(previousKeyHex)
		: null;

	const keys = previousKey ? [primaryKey, previousKey] : [primaryKey];

	for (const key of keys) {
		try {
			if (config.credentials_dek) {
				return unsealCredentials(config.credentials, config.credentials_dek, key);
			}
			// Legacy: direct KEK encryption, no DEK
			return JSON.parse(decryptString(config.credentials, key));
		} catch (error) {
			if (key === previousKey) throw error; // last key failed, propagate
			// primary key failed, try previous
		}
	}

	throw new Error("Failed to decrypt credentials with all available keys");
}

/**
 * Encrypt a payment provider config's credentials.
 * Always uses DEK-wrapping.
 * 
 * @param credentials - Plaintext credentials object
 * @param kek - Optional override KEK
 * @returns { sealed (→ credentials column), wrappedDek (→ credentials_dek column) }
 */
export function encryptProviderCredentials(
	credentials: Record<string, unknown>,
	kek?: Buffer,
): { sealed: string; wrappedDek: string } {
	return sealCredentials(credentials, kek ?? getEncryptionKey());
}

// ── Legacy API (direct KEK encryption, for backward compatibility) ──────────────

/**
 * Encrypt a string directly with the KEK (legacy — prefer seal/unseal).
 */
export function encryptString(plaintext: string, key?: Buffer): string {
	return aesEncrypt(plaintext, key ?? getEncryptionKey());
}

/**
 * Decrypt a string encrypted with encryptString (legacy — prefer unseal).
 */
export function decryptString(encrypted: string, key?: Buffer): string {
	return aesDecrypt(encrypted, key ?? getEncryptionKey());
}

/**
 * Encrypt credentials object directly with the KEK (legacy — prefer sealCredentials).
 */
export function encryptCredentials(credentials: Record<string, unknown>, key?: Buffer): string {
	return encryptString(JSON.stringify(credentials), key);
}

/**
 * Decrypt credentials object directly with the KEK (legacy — prefer unsealCredentials).
 */
export function decryptCredentials(encrypted: string, key?: Buffer): Record<string, string> {
	return JSON.parse(decryptString(encrypted, key));
}

/**
 * Securely wipe a string from memory (best effort)
 * Note: JavaScript doesn't guarantee memory wiping, but this helps
 */
export function wipeString(str: string): void {
	if (typeof str !== "string") return;
	// @ts-expect-error - accessing internal V8 string buffer
	const buf = str.buffer as ArrayBufferLike | undefined;
	if (buf && typeof crypto !== "undefined") {
		try {
			crypto.randomFillSync(new Uint8Array(buf));
		} catch {
			// Ignore errors - this is best effort
		}
	}
}
