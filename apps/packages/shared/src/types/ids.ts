/**
 * Type-safe ID system to prevent exposing internal database IDs
 *
 * Usage:
 * - InternalId: Never expose in API responses or send between services
 * - PublicId: Safe to expose in APIs, client-facing data
 */

/**
 * Internal database ID - NEVER expose outside the service that owns the data
 * These are auto-increment integers used only for database operations
 */
export type InternalId = number & { readonly __brand: "InternalId" };

/**
 * Public ID - Safe to expose in APIs and between services
 * These are prefixed strings like "USER0abc123", "PRJ0xyz789"
 */
export type PublicId = string & { readonly __brand: "PublicId" };

/**
 * Create an internal ID (for type safety within database layer)
 * Should only be used when reading from database
 */
export function internalId(id: number): InternalId {
	return id as InternalId;
}

/**
 * Create a public ID (for type safety in API responses)
 */
export function publicId(id: string): PublicId {
	return id as PublicId;
}

/**
 * Extract raw number from internal ID (for database queries)
 */
export function unwrapInternalId(id: InternalId): number {
	return id as number;
}

/**
 * Extract raw string from public ID (for API usage)
 */
export function unwrapPublicId(id: PublicId): string {
	return id as string;
}

/**
 * Type guard to check if ID is internal (number)
 */
export function isInternalId(id: unknown): id is InternalId {
	return typeof id === "number";
}

/**
 * Type guard to check if ID is public (string with prefix)
 */
export function isPublicId(id: unknown): id is PublicId {
	return typeof id === "string" && /^[A-Z]{3,4}0[a-zA-Z0-9]+$/.test(id);
}
