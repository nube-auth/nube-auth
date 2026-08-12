import type { ColumnBaseConfig } from "drizzle-orm";
import { SQL, StringChunk, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

/**
 * Type utilities for type-safe nested path access in JSONB columns
 */

/**
 * Get all possible paths to string properties in a nested object
 * (unused - kept for reference and future use)
 */
// type PathsToStringProperty<T> = T extends object
// 	? {
// 			[K in keyof T & string]: T[K] extends string
// 				? K
// 				: T[K] extends object
// 					? `${K & string}.${PathsToStringProperty<T[K]>}`
// 					: never;
// 		}[keyof T & string]
// 	: never;

/**
 * Get all paths (including objects) in a nested structure
 * Supports dot notation: "field", "field.nested", "field.nested.property"
 */
type NestedKeyOf<ObjectType> = {
	[Key in keyof ObjectType & (number | string)]: ObjectType[Key] extends Array<infer ArrayType>
		?
				| `${Key}.${number}`
				| `${Key}`
				| (ArrayType extends object ? `${Key}.${number}.${NestedKeyOf<ArrayType>}` : never)
		: ObjectType[Key] extends object
			? `${Key}.${NestedKeyOf<ObjectType[Key]>}` | `${Key}`
			: `${Key}`;
}[keyof ObjectType & (number | string)];

/**
 * Extract value type at a specific nested path
 */
type _AtPath<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
	? Key extends keyof T
		? Rest extends NestedKeyOf<T[Key]>
			? _AtPath<T[Key], Rest>
			: never
		: Key extends `${number}`
			? T extends Array<infer ArrayType>
				? ArrayType extends object
					? _AtPath<ArrayType, Rest>
					: never
				: never
			: never
	: Path extends keyof T
		? T[Path]
		: never;

/**
 * Public type alias for extracting values at a specific path
 */
export type AtPath<T, Path extends string> = _AtPath<T, Path>;

/**
 * Extract the data type from a PgColumn with JSONB
 */
type ExtractJsonbData<T> =
	T extends PgColumn<infer Config, any, any> ? (Config extends { data: infer Data } ? Data : never) : never;

/**
 * Generic JSONB field extractor - creates SQL for accessing nested JSONB paths
 * Used for SELECT queries to extract specific nested values
 *
 * @example
 * ```typescript
 * const query = db
 *   .select({
 *     redirectUris: jsonbField(apps.security_settings, 'redirectUris')
 *   })
 *   .from(apps);
 * ```
 */
export function jsonbField<
	TColumn extends PgColumn<ColumnBaseConfig<"json", "PgJsonb">, any, any>,
	TPath extends NestedKeyOf<ExtractJsonbData<TColumn>>, // Used for type inference
>(column: TColumn, path: TPath): SQL<AtPath<ExtractJsonbData<TColumn>, TPath>> {
	const pathParts = path.split(".");
	let sql_str = "";

	pathParts.forEach((part, index) => {
		if (index === pathParts.length - 1) {
			// Last part - use ->> to get text
			sql_str += ` ->> '${part}'`;
			return;
		}
		// Intermediate parts - use -> to navigate
		sql_str += ` -> '${part}'`;
	});

	return new SQL<AtPath<ExtractJsonbData<TColumn>, TPath>>([column, new StringChunk(sql_str)]);
}

/**
 * JSONB update operation descriptor
 * Specifies how to update a specific path in a JSONB column
 */
interface JsonbUpdateOp<T = any> {
	path: string; // Dot-separated path: "field", "field.nested.property"
	value: T; // The new value at this path
}

// ── Path Validation ─────────────────────────────────────────────────────────────

const PATH_PART_REGEX = /^[a-zA-Z0-9_-]+$/;

function validatePathPart(part: string, context: string): void {
	if (!PATH_PART_REGEX.test(part)) {
		throw new Error(
			`Invalid JSONB path segment "${part}" in ${context}. Only alphanumeric, underscore, and hyphen are allowed.`,
		);
	}
}

function validatePath(path: string, context: string): string[] {
	const parts = path.split(".");
	for (const part of parts) {
		validatePathPart(part, context);
	}
	return parts;
}

/**
 * Build PostgreSQL JSONB set operation for a single path
 * Uses jsonb_set for deep updates with full type safety.
 * Paths are validated to prevent SQL injection.
 *
 * @example
 * ```typescript
 * // Updates security_settings.redirectUris to ["new.com"]
 * buildJsonbSetClause(apps.security_settings, {
 *   path: 'redirectUris',
 *   value: ["new.com"]
 * })
 * // Generates: jsonb_set(security_settings, '{redirectUris}', to_jsonb(["new.com"]))
 * ```
 */
export function buildJsonbSetClause<TColumn extends PgColumn<ColumnBaseConfig<"json", "PgJsonb">, any, any>>(
	column: TColumn,
	operation: JsonbUpdateOp,
): SQL {
	const pathParts = validatePath(operation.path, "buildJsonbSetClause");
	const pathArray = pathParts.map((p) => `"${p}"`).join(", ");
	// Use to_jsonb for safe value binding instead of raw string interpolation
	return sql`jsonb_set(${column}, '{${sql.raw(pathArray)}}', to_jsonb(${operation.value}))`;
}

/**
 * Build PostgreSQL JSONB delete operation for a path
 * Uses #- operator to remove keys/subtrees atomically.
 * Paths are validated to prevent SQL injection.
 *
 * ⚠️ Important: This uses the #- operator which removes the key entirely.
 * For removing array elements, this is a footgun - use setArrayIndex(null) instead.
 *
 * @example
 * ```typescript
 * // Remove oauth.github config entirely
 * buildJsonbDeleteClause(apps.security_settings, 'oauth.github')
 * // Generates: security_settings #- '{oauth,github}'
 *
 * // Remove oauth provider
 * buildJsonbDeleteClause(apps.security_settings, 'oauth')
 * // Generates: security_settings #- '{oauth}'
 * ```
 */
export function buildJsonbDeleteClause<TColumn extends PgColumn<ColumnBaseConfig<"json", "PgJsonb">, any, any>>(
	column: TColumn,
	path: string,
): SQL {
	// Path array for #- operator: {oauth,github} not {"oauth","github"}
	// PostgreSQL #- expects an array literal without quotes around each element
	const pathParts = validatePath(path, "buildJsonbDeleteClause");
	const pathArray = pathParts.join(",");
	return sql`${column} #- '{${sql.raw(pathArray)}}'`;
}

/**
 * Build PostgreSQL JSONB merge operation for multiple updates
 * Uses || operator for shallow merges at the top level.
 * Keys are validated to prevent SQL injection.
 *
 * @example
 * ```typescript
 * // Merges multiple updates into security_settings
 * buildJsonbMergeClause(apps.security_settings, {
 *   redirectUris: ["new.com"],
 *   rateLimit: 500
 * })
 * // Generates: security_settings || to_jsonb({...})
 * ```
 */
export function buildJsonbMergeClause<T extends Record<string, any>>(
	column: PgColumn<ColumnBaseConfig<"json", "PgJsonb">, any, any>,
	updates: Partial<T>,
): SQL {
	// Validate all keys to prevent injection through object keys
	for (const key of Object.keys(updates)) {
		validatePathPart(key, "buildJsonbMergeClause key");
	}
	return sql`${column} || ${updates}::jsonb`;
}

/**
 * Create a type-safe JSONB update builder for complex nested updates
 * Chains multiple jsonb_set operations for deep updates
 *
 * @example
 * ```typescript
 * const updateChain = createJsonbUpdateChain(apps.security_settings)
 *   .set('redirectUris', ["new.com"])
 *   .set('sessionTtlDays', 30)
 *   .build();
 *
 * await db.update(apps)
 *   .set({ security_settings: updateChain })
 *   .where(eq(apps.id, appId));
 * ```
 */
export class JsonbUpdateChain<
	TColumn extends PgColumn<ColumnBaseConfig<"json", "PgJsonb">, any, any>,
	TData = ExtractJsonbData<TColumn>,
> {
	private column: TColumn;
	private operations: JsonbUpdateOp[] = [];
	private deleteOps: string[] = [];

	constructor(column: TColumn) {
		this.column = column;
	}

	/**
	 * Add a set operation for a specific path
	 *
	 * ⚠️ Warning: Path cannot contain numeric segments (array indices).
	 * Numeric indices like "redirectUris.0" will not update array elements safely.
	 * Instead, replace the entire array atomically:
	 * ```typescript
	 * .set("redirectUris", [...newUris])  // ✅ Safe
	 * .set("redirectUris.0", newUri)       // ❌ Unsafe
	 * ```
	 */
	set<TPath extends NestedKeyOf<TData>>(path: TPath, value: AtPath<TData, TPath>): this {
		// Validate path doesn't contain numeric segments (array indices)
		const segments = path.split(".");
		const hasNumericSegment = segments.some((seg) => /^\d+$/.test(seg));
		if (hasNumericSegment) {
			throw new Error(
				`Cannot update array element by index: "${path}". ` +
					`Array mutations are unsafe in JSONB. ` +
					`Replace the entire array instead: .set("${segments[0]}", [...])`,
			);
		}

		this.operations.push({ path, value });
		return this;
	}

	/**
	 * Delete a key or subtree from a specific path
	 * Uses PostgreSQL #- operator atomically
	 *
	 * ⚠️ Warning: This removes the key entirely, including nested objects.
	 * For arrays, this is a footgun - it will shift array indices.
	 * Use setArrayIndex(path, index, null) for array elements instead.
	 *
	 * @example
	 * ```typescript
	 * chain.delete("oauth.github")  // Remove entire GitHub config
	 * chain.delete("secrets")        // Remove secrets field
	 * ```
	 */
	delete(path: string): this {
		// Validate path doesn't contain numeric segments (array indices)
		const segments = path.split(".");
		const hasNumericSegment = segments.some((seg) => /^\d+$/.test(seg));
		if (hasNumericSegment) {
			throw new Error(
				`Cannot delete array element by index: "${path}". ` +
					`Array mutations are unsafe in JSONB. ` +
					`Use setArrayIndex(path, index, null) or rebuild the array instead.`,
			);
		}

		this.deleteOps.push(path);
		return this;
	}

	/**
	 * Build the final SQL expression
	 * Chains jsonb_set operations for each update, then applies deletes
	 */
	build(): SQL {
		if (this.operations.length === 0 && this.deleteOps.length === 0) {
			return sql`${this.column}`;
		}

		// Start with the column reference
		let currentExpr: any = this.column;

		// Apply all set operations first
		for (const op of this.operations) {
			const pathArray = op.path
				.split(".")
				.map((p) => `"${p}"`)
				.join(",");
			const valueStr = JSON.stringify(op.value);

			currentExpr = new SQL([
				new StringChunk(`jsonb_set(`),
				currentExpr,
				new StringChunk(`, '{${pathArray}}', '${valueStr}'::jsonb)`),
			]);
		}

		// Apply all delete operations last
		for (const path of this.deleteOps) {
			const pathArray = path
				.split(".")
				.map((p) => `"${p}"`)
				.join(",");
			currentExpr = new SQL([currentExpr, new StringChunk(` #- '{${pathArray}}'`)]);
		}

		return currentExpr as SQL;
	}
}

/**
 * Factory function to create a JSONB update chain
 */
export function createJsonbUpdateChain<TColumn extends PgColumn<ColumnBaseConfig<"json", "PgJsonb">, any, any>>(
	column: TColumn,
): JsonbUpdateChain<TColumn> {
	return new JsonbUpdateChain(column);
}

/**
 * Atomic JSONB update using PostgreSQL operators
 * No read-modify-write cycle - entirely database-side
 *
 * @deprecated - Use query helpers (appQueries.*) or individual functions directly
 *
 * Usage in query helpers:
 * @example
 * ```typescript
 * export const appQueries = {
 *   async updateSecuritySettings(
 *     db: DbClient,
 *     appId: number,
 *     updates: Partial<SecuritySettings>
 *   ) {
 *     // Atomic merge at DB level - no lost updates!
 *     return db.update(apps)
 *       .set({
 *         security_settings: buildJsonbMergeClause(apps.security_settings, updates),
 *         updated_at: new Date(),
 *       })
 *       .where(eq(apps.id, appId))
 *       .returning();
 *   }
 * };
 * ```
 */
export function atomicJsonbUpdate<
	_TTable extends PgTable, // Used for type inference
	TColumn extends PgColumn<ColumnBaseConfig<"json", "PgJsonb">, any, any>,
>(
	_table: _TTable, // Used for type inference
	column: TColumn,
	_idValue: number, // Used for type inference
	_updates: Record<string, any>, // Used for type inference
) {
	return {
		merge: (partialData: Record<string, any>) => buildJsonbMergeClause(column, partialData),
		set: (path: string, value: any) => buildJsonbSetClause(column, { path, value }),
		chain: () => createJsonbUpdateChain(column),
	};
}

/**
 * Helper to validate JSONB data structure before storing
 * Works with Zod schemas for runtime validation
 *
 * @example
 * ```typescript
 * // Validate before update
 * const validatedSettings = SecuritySettingsSchema.parse(updates);
 * const merged = buildJsonbMergeClause(apps.security_settings, validatedSettings);
 * ```
 */
export function validateAndBuildJsonbUpdate<T>(data: unknown, schema: { parse: (data: unknown) => T }): T {
	// Schema will throw on validation error
	return schema.parse(data);
}
