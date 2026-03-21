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
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";

const { Pool } = pg;

/**
 * Run migrations on application startup
 */
export async function runMigrations() {
	if (!process.env['DATABASE_URL']) {
		throw new Error("DATABASE_URL environment variable is required");
	}

	const pool = new Pool({
		connectionString: process.env['DATABASE_URL'],
	});

	const db = drizzle(pool, { schema });

	// Resolve drizzle/ relative to this compiled file, not CWD.
	// When deployed via `pnpm deploy`, this file lives at:
	//   /app/node_modules/@nube-auth/db/dist/migrations.js
	// and the drizzle folder is at:
	//   /app/node_modules/@nube-auth/db/drizzle/
	const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");

	console.log("Running database migrations...");
	await migrate(db, { migrationsFolder });
	console.log("✅ Database migrations completed");

	await pool.end();
}
