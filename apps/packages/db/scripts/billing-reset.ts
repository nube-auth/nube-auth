#!/usr/bin/env node
/**
 * Reset Billing & Payment Data
 *
 * Truncates all payment/billing-related tables while preserving users,
 * projects, sessions, and other non-billing data.
 *
 * Use this when you need to clean up test payment data or reset provider
 * configs after schema changes to the credentials encryption.
 *
 * Usage:
 *   pnpm --filter @nube-auth/db run billing:reset
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

// ── Tables to truncate — order respects foreign key constraints ──────────
const BILLING_TABLES = [
	// Level 0 — leaf tables (no FKs from other billing tables)
	"outbound_webhook_logs",
	"app_webhooks",
	"provider_usage_logs",
	"test_sessions",
	"webhook_logs",

	// Level 1 — depends on configs / prices / promotions
	"promotion_redemptions",
	"promotion_plans",
	"promotion_provider_refs",

	// Level 2 — depends on level 1
	"promotion_codes",
	"promotions",
	"price_provider_refs",

	// Level 3 — depends on level 2
	"payment_transactions",
	"subscriptions",
	"purchases",
	"licenses",
	"license_history",

	// Level 4 — depends on level 3
	"payment_routing_rules",
	"prices",

	// Level 5 — root config (references projects but nothing references it from above)
	"payment_provider_configs",
];

async function resetBilling() {
	const { Client } = pg;
	const client = new Client({
		connectionString: DATABASE_URL,
		ssl: DATABASE_URL ? (shouldUseSsl(DATABASE_URL) ? { rejectUnauthorized: false } : undefined) : undefined,
	});

	try {
		await client.connect();

		console.log("🧹 Resetting billing & payment data...");
		console.log("");

		for (const table of BILLING_TABLES) {
			try {
				const _result = await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
				console.log(`   ✓ Truncated ${table}`);
			} catch (error: any) {
				// Table may not exist yet (e.g. after a fresh push without migrations)
				if (error?.code === "42P01") {
					console.log(`   ⏭  Skipped ${table} (does not exist)`);
				} else {
					console.warn(`   ⚠  Failed to truncate ${table}: ${error?.message ?? error}`);
				}
			}
		}

		// Clean up any orphaned test sessions referenced by users
		// (test_sessions has a FK from users, but we want to keep users)
		try {
			await client.query("UPDATE users SET test_session_id = NULL");
			console.log("   ✓ Cleared test_session_id from users");
		} catch {
			// ignore — column may not exist
		}

		console.log("");
		console.log("✅ Billing reset complete.");
	} finally {
		await client.end();
	}
}

resetBilling().catch((error) => {
	console.error("❌ Billing reset failed:", error);
	process.exit(1);
});
