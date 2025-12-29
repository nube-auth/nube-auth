/**
 * Drizzle ORM Migration Instructions (PostgreSQL)
 *
 * To generate migrations from schema changes:
 *
 * 1. Update schema in ./src/schema.ts
 *
 * 2. Generate migration:
 *    pnpm run db:generate
 *
 * 3. Apply migration to database:
 *    pnpm run db:push
 *
 * For development, use:
 *    pnpm run db:studio
 *
 * This opens Drizzle Studio at localhost:4983 to inspect your database.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

/**
 * Run migrations on application startup
 */
export async function runMigrations() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL environment variable is required");
	}

	const pool = new Pool({
		connectionString: process.env.DATABASE_URL,
	});

	const db = drizzle(pool, { schema });

	console.log("Running database migrations...");
	await migrate(db, { migrationsFolder: "./drizzle" });
	console.log("✅ Database migrations completed");

	await pool.end();
}
