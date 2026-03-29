import { randomBytes } from "node:crypto";

/**
 * Converts a string to a URL-safe slug.
 * - Lowercases, trims, replaces non-alphanumeric chars with hyphens
 * - Collapses multiple hyphens, strips leading/trailing hyphens
 *
 * @example slugify("Hello World!") → "hello-world"
 * @example slugify("  Pro Plan  ") → "pro-plan"
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Generates a plan slug that embeds the app slug for global context.
 * Pattern: `{appSlug}-{planNameSlugified}`
 * e.g., app "Pingpong" + plan "Pro" → "pingpong-pro"
 *
 * If the base slug is already taken (per-app unique constraint), appends a
 * random 4-char hex postfix up to MAX_ATTEMPTS times before falling back to
 * a base-36 timestamp suffix.
 */
export async function generatePlanSlug(
	checkExists: (slug: string) => Promise<boolean>,
	appSlug: string,
	planName: string,
): Promise<string> {
	const base = `${appSlug}-${slugify(planName)}`;

	if (!(await checkExists(base))) return base;

	const MAX_ATTEMPTS = 5;
	for (let i = 0; i < MAX_ATTEMPTS; i++) {
		const postfix = randomBytes(2).toString("hex"); // 4 hex chars
		const candidate = `${base}-${postfix}`;
		if (!(await checkExists(candidate))) return candidate;
	}

	// Fallback: base-36 timestamp (highly unlikely to collide)
	return `${base}-${Date.now().toString(36)}`;
}

/**
 * Generic slug generator from a name string.
 * Used for apps (scoped per project) and projects (globally scoped).
 *
 * Falls back to a random postfix if the base slug is already taken.
 *
 * @param checkExists - async function that returns true if the slug is already in use
 * @param name        - raw display name to convert into a slug
 */
export async function generateSlugFromName(
	checkExists: (slug: string) => Promise<boolean>,
	name: string,
): Promise<string> {
	const base = slugify(name);

	if (!(await checkExists(base))) return base;

	const MAX_ATTEMPTS = 5;
	for (let i = 0; i < MAX_ATTEMPTS; i++) {
		const postfix = randomBytes(2).toString("hex");
		const candidate = `${base}-${postfix}`;
		if (!(await checkExists(candidate))) return candidate;
	}

	return `${base}-${Date.now().toString(36)}`;
}

/** @alias generateSlugFromName — kept for backward-compat */
export const generateAppSlug = generateSlugFromName;

/** @alias generateSlugFromName — for project slug generation (globally unique) */
export const generateProjectSlug = generateSlugFromName;
