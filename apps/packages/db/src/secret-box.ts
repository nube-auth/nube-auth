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

export function presentedSecretMatches(
	presented: string,
	stored: { hash?: string | null; legacy?: string | null },
): boolean {
	if (stored.hash && secretsEqual(digestSecret(presented), stored.hash)) return true;
	if (stored.legacy && secretsEqual(presented, stored.legacy)) return true;
	return false;
}

function encryptionKey(kekHex?: string): Buffer {
	const hex = kekHex ?? process.env["PAYMENT_CONFIGS_KEY"];
	if (!hex) throw new Error("PAYMENT_CONFIGS_KEY is required to seal a secret");
	const key = Buffer.from(hex, "hex");
	if (key.length !== 32) throw new Error("PAYMENT_CONFIGS_KEY must be 32-byte hex");
	return key;
}

/** Envelope-encrypt a revealable secret. Legacy plaintext is returned unchanged by openSecret. */
export function sealSecret(plaintext: string, kekHex?: string): string {
	const key = encryptionKey(kekHex);
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
	if (!stored.startsWith(PREFIX)) return stored;
	const key = encryptionKey(kekHex);
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

export function protectSecret(plaintext: string, kekHex?: string): { hash: string; enc: string } {
	return { hash: digestSecret(plaintext), enc: sealSecret(plaintext, kekHex) };
}

export function revealStoredSecret(
	tokens: Record<string, unknown> | null | undefined,
	encField: string,
	legacyField: string,
	kekHex?: string,
): string | null {
	const encrypted = tokens?.[encField];
	if (typeof encrypted === "string" && encrypted.length > 0) return openSecret(encrypted, kekHex);
	const legacy = tokens?.[legacyField];
	return typeof legacy === "string" && legacy.length > 0 ? legacy : null;
}
