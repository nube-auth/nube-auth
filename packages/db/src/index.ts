import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

/**
 * Initialize Turso/LibSQL client and Drizzle ORM
 */
export function createDbClient() {
	const url = process.env.DATABASE_URL;
	const authToken = process.env.DATABASE_AUTH_TOKEN;

	if (!url) {
		throw new Error("DATABASE_URL environment variable is not set");
	}

	if (!authToken) {
		throw new Error("DATABASE_AUTH_TOKEN environment variable is not set");
	}

	// Log URL format for debugging (not the full URL for security)
	const urlPrefix = url.substring(0, Math.min(20, url.length));
	console.log(`Connecting to database: ${urlPrefix}...`);

	const client = createClient({
		url,
		authToken,
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
	invitationQueries,
	licenseQueries,
	planQueries,
	projectMemberQueries,
	projectQueries,
	sessionQueries,
	userQueries,
} from "./queries.js";
// Export schema for migrations and types
export * from "./schema.js";
