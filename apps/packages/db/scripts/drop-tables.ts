#!/usr/bin/env node
/**
 * Drop All Tables Script
 *
 * WARNING: This will DELETE ALL DATA in your database!
 * Only use this in development when you want to start fresh.
 *
 * Usage:
 *   pnpm run db:drop
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const configDir = typeof __dirname === "string" ? __dirname : dirname(fileURLToPath(import.meta.url));

// Load .env and .env.local from workspace root
dotenv.config({ path: resolve(configDir, "../../../../.env.local"), override: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error("❌ DATABASE_URL environment variable is required");
	process.exit(1);
}

const DATABASE_SCHEMA = process.env.DATABASE_SCHEMA ?? "public";

console.log("⚠️  WARNING: This will DELETE ALL TABLES and DATA!");
console.log(`📍 Database: ${DATABASE_URL}`);
console.log(`🗂️  Schema: ${DATABASE_SCHEMA}`);
console.log("");

function quoteIdent(identifier: string) {
	return `"${identifier.replaceAll('"', '""')}"`;
}

function shouldUseSsl(url: string) {
	if (process.env.DATABASE_SSL === "true") return true;
	if (process.env.PGSSLMODE === "require") return true;
	try {
		const parsed = new URL(url);
		const sslmode = parsed.searchParams.get("sslmode");
		return sslmode === "require" || sslmode === "verify-full";
	} catch {
		return false;
	}
}

async function dropAllTables() {
	const { Client } = pg;
	const client = new Client({
		connectionString: DATABASE_URL,
		ssl: DATABASE_URL ? (shouldUseSsl(DATABASE_URL) ? { rejectUnauthorized: false } : undefined) : undefined,
	});

	try {
		await client.connect();

		// Check what tables exist first
		console.log("🔍 Checking existing tables...");
		try {
			const result = await client.query(
				`
					SELECT schemaname, tablename
					FROM pg_catalog.pg_tables
					WHERE schemaname = $1
					ORDER BY tablename
				`,
				[DATABASE_SCHEMA],
			);

			const existingTables = result.rows.map((row) => `${row.schemaname}.${row.tablename}`);

			if (existingTables.length > 0) {
				console.log(`   Found ${existingTables.length} tables:`, existingTables.join(", "));
			} else {
				console.log("   No tables found. Database is already empty.");
				console.log("");
				return;
			}
		} catch (error: any) {
			console.warn("   ⚠ Could not check existing tables:", error?.message ?? error);
		}

		console.log("");
		console.log("🗑️  Dropping tables...");

		console.log("🔥 Executing drop statements...");

		const tablesResult = await client.query(
			`
				SELECT schemaname, tablename
				FROM pg_catalog.pg_tables
				WHERE schemaname = $1
				ORDER BY tablename
			`,
			[DATABASE_SCHEMA],
		);

		for (const row of tablesResult.rows as Array<{ schemaname: string; tablename: string }>) {
			const schema = quoteIdent(row.schemaname);
			const table = quoteIdent(row.tablename);

			try {
				await client.query(`DROP TABLE IF EXISTS ${schema}.${table} CASCADE`);
				console.log(`   ✓ Dropped ${row.schemaname}.${row.tablename}`);
			} catch (error: any) {
				console.warn(`   ⚠ Could not drop ${row.schemaname}.${row.tablename}:`, error?.message ?? error);
			}
		}

		// Run VACUUM to reclaim space
		try {
			console.log("🧹 Running VACUUM...");
			await client.query("VACUUM");
		} catch (error: any) {
			console.warn("   ⚠ Could not run VACUUM (not critical):", error?.message ?? error);
		}

		// Verify tables are dropped
		console.log("");
		console.log("🔍 Verifying tables are dropped...");
		try {
			const result = await client.query(
				`
					SELECT schemaname, tablename
					FROM pg_catalog.pg_tables
					WHERE schemaname = $1
					ORDER BY tablename
				`,
				[DATABASE_SCHEMA],
			);

			const remainingTables = result.rows.map((row) => `${row.schemaname}.${row.tablename}`);

			if (remainingTables.length > 0) {
				console.warn("⚠️  Some tables still exist:", remainingTables.join(", "));
			} else {
				console.log("✅ Verified: All application tables are dropped!");
			}
		} catch (error: any) {
			console.warn("⚠️  Could not verify (non-critical):", error?.message ?? error);
		}

		console.log("");
		console.log("✅ Drop operation completed!");
		console.log("");
		console.log("💡 Next steps:");
		console.log("   1. Run: pnpm run db:push (to create fresh tables)");
		console.log("   2. Create default plans for your apps");
		console.log("");
	} catch (error) {
		console.error("❌ Error dropping tables:", error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

// Run the script
dropAllTables();
