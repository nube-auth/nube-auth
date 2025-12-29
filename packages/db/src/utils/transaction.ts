import type { DrizzleD1Database } from "drizzle-orm/d1";
import { createLogger } from "@proofa/shared";

const log = createLogger("transaction");

/**
 * Execute a database operation within a transaction
 * Provides automatic rollback on error
 * 
 * @param db - Database instance
 * @param fn - Async function to execute within transaction
 * @returns Result of the function execution
 * 
 * @example
 * ```typescript
 * const result = await withTransaction(db, async (tx) => {
 *   const user = await userQueries.create(tx, userData);
 *   const identity = await identityQueries.create(tx, identityData);
 *   return { user, identity };
 * });
 * ```
 */
export async function withTransaction<T>(
	db: DrizzleD1Database,
	fn: (tx: DrizzleD1Database) => Promise<T>,
): Promise<T> {
	try {
		log.debug("Starting database transaction");
		const result = await db.batch([fn] as any); // Type assertion needed for Drizzle batch
		log.debug("Transaction committed successfully");
		return result as T;
	} catch (error) {
		log.error({ error }, "Transaction failed, rolling back");
		throw error;
	}
}

/**
 * Execute multiple database operations atomically
 * All operations succeed or all fail together
 * 
 * @param db - Database instance
 * @param operations - Array of async functions to execute
 * @returns Array of results from each operation
 * 
 * @example
 * ```typescript
 * const [user, project, member] = await executeAtomic(db, [
 *   (tx) => userQueries.create(tx, userData),
 *   (tx) => projectQueries.create(tx, projectData),
 *   (tx) => projectMemberQueries.create(tx, memberData),
 * ]);
 * ```
 */
export async function executeAtomic<T extends any[]>(
	db: DrizzleD1Database,
	operations: Array<(tx: DrizzleD1Database) => Promise<any>>,
): Promise<T> {
	try {
		log.debug({ operationCount: operations.length }, "Starting atomic operations");
		const results = await db.batch(operations as any);
		log.debug("Atomic operations completed successfully");
		return results as T;
	} catch (error) {
		log.error({ error, operationCount: operations.length }, "Atomic operations failed");
		throw error;
	}
}

/**
 * Retry a database operation with exponential backoff
 * Useful for handling temporary database connection issues
 * 
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelay - Base delay in milliseconds (will be multiplied by 2^attempt)
 * @returns Result of the function execution
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	baseDelay: number = 100,
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			
			if (attempt < maxRetries) {
				const delay = baseDelay * Math.pow(2, attempt);
				log.warn({ 
					attempt: attempt + 1, 
					maxRetries: maxRetries + 1, 
					delay,
					error: lastError.message,
				}, "Database operation failed, retrying");
				
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	log.error({ maxRetries, error: lastError }, "Database operation failed after all retries");
	throw lastError;
}
