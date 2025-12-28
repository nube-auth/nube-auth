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

import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "../../../");

// Load environment variables
dotenv.config({ path: resolve(rootDir, ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

if (!DATABASE_URL) {
	console.error("❌ DATABASE_URL environment variable is required");
	process.exit(1);
}

console.log("⚠️  WARNING: This will DELETE ALL TABLES and DATA!");
console.log(`📍 Database: ${DATABASE_URL}`);
console.log("");

// Create database client
const db = createClient({
	url: DATABASE_URL,
	authToken: DATABASE_AUTH_TOKEN,
});

async function dropAllTables() {
	try {
		// Check what tables exist first
		console.log("🔍 Checking existing tables...");
		try {
			const result = await db.execute(`
				SELECT name FROM sqlite_master 
				WHERE type='table' 
				AND name NOT LIKE 'sqlite_%'
				AND name NOT LIKE '__drizzle_%'
				ORDER BY name
			`);
			
			const existingTables = result.rows.map((row: any) => row.name || row[0]);
			
			if (existingTables.length > 0) {
				console.log(`   Found ${existingTables.length} tables:`, existingTables.join(", "));
			} else {
				console.log("   No tables found. Database is already empty.");
				console.log("");
				return;
			}
		} catch (error) {
			console.warn("   ⚠ Could not check existing tables:", error.message);
		}

		console.log("");
		console.log("🗑️  Dropping tables...");
		
		// Drop tables in reverse dependency order
		const tablesToDrop = [
			"audit_logs",
			"email_verifications",
			"auth_codes",
			"invitations",
			"licenses",
			"plans",
			"apps",
			"project_members",
			"projects",
			"sessions",
			"identities",
			"users",
		];

		console.log("🔥 Executing drop statements...");
		
		for (const table of tablesToDrop) {
			try {
				await db.execute(`DROP TABLE IF EXISTS "${table}"`);
				console.log(`   ✓ Dropped ${table}`);
			} catch (error) {
				console.warn(`   ⚠ Could not drop ${table}:`, error.message);
			}
		}

		// Run VACUUM to reclaim space
		try {
			console.log("🧹 Running VACUUM...");
			await db.execute("VACUUM");
		} catch (error) {
			console.warn("   ⚠ Could not run VACUUM (not critical):", error.message);
		}

		// Verify tables are dropped
		console.log("");
		console.log("🔍 Verifying tables are dropped...");
		try {
			const result = await db.execute(`
				SELECT name FROM sqlite_master 
				WHERE type='table' 
				AND name NOT LIKE 'sqlite_%'
				AND name NOT LIKE '__drizzle_%'
			`);
			
			const remainingTables = result.rows.map((row: any) => row.name || row[0]);
			
			if (remainingTables.length > 0) {
				console.warn("⚠️  Some tables still exist:", remainingTables.join(", "));
			} else {
				console.log("✅ Verified: All application tables are dropped!");
			}
		} catch (error) {
			console.warn("⚠️  Could not verify (non-critical):", error.message);
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
		db.close();
	}
}

// Run the script
dropAllTables();
