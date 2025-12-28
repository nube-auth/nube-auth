#!/usr/bin/env node
/**
 * Check Apps Script
 * 
 * Quick script to check what apps exist in the database
 */

import { createClient } from "@libsql/client";
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

console.log(`📍 Checking database: ${DATABASE_URL.substring(0, 30)}...`);
console.log("");

// Create database client
const db = createClient({
	url: DATABASE_URL,
	authToken: DATABASE_AUTH_TOKEN,
});

async function checkApps() {
	try {
		// Check apps
		const apps = await db.execute("SELECT public_id, name, slug, project_id FROM apps ORDER BY created_at DESC");
		
		console.log(`📱 Apps found: ${apps.rows.length}`);
		if (apps.rows.length > 0) {
			console.log("");
			for (const row of apps.rows) {
				console.log(`  - ${row.name || row[1]} (slug: ${row.slug || row[2]})`);
				console.log(`    ID: ${row.public_id || row[0]}`);
				console.log(`    Project: ${row.project_id || row[3]}`);
				console.log("");
			}
		}

		// Check projects
		const projects = await db.execute("SELECT public_id, name, slug FROM projects");
		console.log(`📦 Projects found: ${projects.rows.length}`);
		if (projects.rows.length > 0) {
			console.log("");
			for (const row of projects.rows) {
				console.log(`  - ${row.name || row[1]} (slug: ${row.slug || row[2]})`);
				console.log(`    ID: ${row.public_id || row[0]}`);
				console.log("");
			}
		}

	} catch (error) {
		console.error("❌ Error checking database:", error);
		process.exit(1);
	} finally {
		db.close();
	}
}

// Run the script
checkApps();
