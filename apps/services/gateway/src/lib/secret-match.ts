import { createHash, timingSafeEqual } from "node:crypto";

function digestSecret(value: string): string {
	return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function presentedSecretMatches(presented: string, stored: { hash?: string | null }): boolean {
	if (!stored.hash) return false;
	const left = Buffer.from(digestSecret(presented));
	const right = Buffer.from(stored.hash);
	return left.length === right.length && timingSafeEqual(left, right);
}
