import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

/**
 * Initialize PostgreSQL client and Drizzle ORM
 */
export function createDbClient() {
	const url = process.env.DATABASE_URL;

	if (!url) {
		throw new Error("DATABASE_URL environment variable is not set");
	}

	// Log database connection (sanitized - no credentials)
	try {
		const parsed = new URL(url);
		// Only log protocol, host, and database name - no credentials
		const sanitized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
		console.log(`Connecting to database: ${sanitized}`);
	} catch (_error) {
		// Fallback if URL parsing fails
		console.log("Connecting to database...");
	}

	const pool = new Pool({
		connectionString: url,
		// Connection pool configuration for optimal performance
		max: 20, // Maximum number of clients in the pool
		min: 5, // Minimum number of clients in the pool
		idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
		connectionTimeoutMillis: 2000, // Timeout for new connections
		// Enable keep-alive to detect broken connections
		keepAlive: true,
		keepAliveInitialDelayMillis: 10000,
	});

	return drizzle(pool, { schema });
}

/**
 * Type for the database client
 */
export type DbClient = ReturnType<typeof createDbClient>;

/**
 * Singleton database instance
 */
let dbInstance: DbClient | null = null;

/**
 * Get or create database instance
 */
export function getDb(): DbClient {
	if (!dbInstance) {
		dbInstance = createDbClient();
	}
	return dbInstance;
}

// Export drizzle-orm operators for queries
export { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
// Export provider helpers
export { paymentProviderQueries } from "./providers.js";
// Export all query helpers
export {
	appQueries,
	auditLogQueries,
	authCodeQueries,
	emailVerificationQueries,
	identityQueries,
	invitationQueries,
	licenseQueries,
	planQueries,
	projectInvitationQueries,
	projectMemberQueries,
	projectQueries,
	sessionQueries,
	userQueries,
} from "./queries.js";
// Export schema for migrations and types
export * from "./schema.js";
// Export transaction utilities
export {
	executeAtomic,
	withRetry,
	withTransaction,
} from "./utils/transaction.js";
