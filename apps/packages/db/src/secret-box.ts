import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PREFIX = "enc1:";

export function digestSecret(value: string): string {
	return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function secretsEqual(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	return a.length === b.length && timingSafeEqual(a, b);
}

export function presentedSecretMatches(presented: string, stored: { hash?: string | null }): boolean {
	return Boolean(stored.hash) && secretsEqual(digestSecret(presented), stored.hash as string);
}

function parseKey(hex: string): Buffer {
	const key = Buffer.from(hex, "hex");
	if (key.length !== 32) throw new Error("PAYMENT_CONFIGS_KEY must be 32-byte hex");
	return key;
}

function encryptionKeys(kekHex?: string): Buffer[] {
	if (kekHex) return [parseKey(kekHex)];
	const current = process.env["PAYMENT_CONFIGS_KEY"];
	if (!current) throw new Error("PAYMENT_CONFIGS_KEY is required to seal a secret");
	const previous = process.env["PAYMENT_CONFIGS_KEY_PREVIOUS"];
	return [parseKey(current), ...(previous ? [parseKey(previous)] : [])];
}

function decryptWithKey(stored: string, key: Buffer): string {
	const payload = JSON.parse(stored.slice(PREFIX.length)) as {
		iv: string;
		tag: string;
		ct: string;
		wiv: string;
		wtag: string;
		wdek: string;
	};
	const wrapDecipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.wiv, "base64"));
	wrapDecipher.setAuthTag(Buffer.from(payload.wtag, "base64"));
	const dek = Buffer.concat([wrapDecipher.update(Buffer.from(payload.wdek, "base64")), wrapDecipher.final()]);
	const decipher = createDecipheriv("aes-256-gcm", dek, Buffer.from(payload.iv, "base64"));
	decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
	return Buffer.concat([decipher.update(Buffer.from(payload.ct, "base64")), decipher.final()]).toString("utf8");
}

/** Envelope-encrypt a revealable secret. */
export function sealSecret(plaintext: string, kekHex?: string): string {
	const key = encryptionKeys(kekHex)[0];
	if (!key) throw new Error("PAYMENT_CONFIGS_KEY is required to seal a secret");
	const dek = randomBytes(32);
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", dek, iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();

	const wrapIv = randomBytes(12);
	const wrapCipher = createCipheriv("aes-256-gcm", key, wrapIv);
	const wrappedDek = Buffer.concat([wrapCipher.update(dek), wrapCipher.final()]);
	const wrapTag = wrapCipher.getAuthTag();

	return `${PREFIX}${JSON.stringify({
		iv: iv.toString("base64"),
		tag: tag.toString("base64"),
		ct: ciphertext.toString("base64"),
		wiv: wrapIv.toString("base64"),
		wtag: wrapTag.toString("base64"),
		wdek: wrappedDek.toString("base64"),
	})}`;
}

export function openSecret(stored: string, kekHex?: string): string {
	if (!stored.startsWith(PREFIX)) {
		throw new Error("Secret is not sealed");
	}
	const keys = encryptionKeys(kekHex);
	let lastError: Error | undefined;
	for (const key of keys) {
		try {
			return decryptWithKey(stored, key);
		} catch (error) {
			lastError = error as Error;
		}
	}
	throw lastError ?? new Error("Unable to open secret");
}

export function protectSecret(plaintext: string, kekHex?: string): { hash: string; enc: string } {
	return { hash: digestSecret(plaintext), enc: sealSecret(plaintext, kekHex) };
}

/** Open an enc1 value. Plaintext is returned only when it has not been sealed yet. */
export function readSealedSecret(stored: string | null | undefined, kekHex?: string): string | null {
	if (typeof stored !== "string" || stored.length === 0) return null;
	return openSecret(stored, kekHex);
}

export function revealStoredSecret(
	tokens: Record<string, unknown> | null | undefined,
	encField: string,
	kekHex?: string,
): string | null {
	const encrypted = tokens?.[encField];
	if (typeof encrypted === "string" && encrypted.length > 0) return openSecret(encrypted, kekHex);
	return null;
}
