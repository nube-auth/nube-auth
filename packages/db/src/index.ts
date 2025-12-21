import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

/**
 * Initialize Turso/LibSQL client and Drizzle ORM
 */
export function createDbClient() {
	const client = createClient({
		url: process.env.DATABASE_URL!,
		authToken: process.env.DATABASE_AUTH_TOKEN!,
	});

	return drizzle(client, { schema });
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
	licenseQueries,
	projectMemberQueries,
	projectQueries,
	sessionQueries,
	userQueries,
} from "./queries.js";
// Export schema for migrations and types
export * from "./schema.js";
