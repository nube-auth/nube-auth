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

	// Log URL format for debugging (not the full URL for security)
	const urlPrefix = url.substring(0, Math.min(20, url.length));
	console.log(`Connecting to database: ${urlPrefix}...`);

	const pool = new Pool({
		connectionString: url,
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

// Export all query helpers
export {
	appQueries,
	auditLogQueries,
	authCodeQueries,
	emailVerificationQueries,
	identityQueries,
	invitationQueries,
	licenseQueries,
	paymentConfigQueries,
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
	withTransaction,
	executeAtomic,
	withRetry,
} from "./utils/transaction.js";
