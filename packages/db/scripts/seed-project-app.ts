#!/usr/bin/env tsx
/**
 * Seed Script: Create Project, App, and Payment Configuration
 *
 * This script will:
 * 1. Find an existing user in the database
 * 2. Create a new project for that user
 * 3. Create an app within that project
 * 4. Configure a payment provider for the app
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createId, encrypt } from "@proofa/shared";
import { getDb } from "../src/index.js";
import { userQueries, projectQueries, appQueries, projectMemberQueries } from "../src/queries.js";
import { users } from "../src/schema.js";

const configDir = typeof __dirname === "string" ? __dirname : dirname(fileURLToPath(import.meta.url));

// Load .env and .env.local from workspace root
dotenv.config({ path: resolve(configDir, "../../../.env") });
dotenv.config({ path: resolve(configDir, "../../../.env.local"), override: true });

const db = getDb();

async function generateSecureToken(length: number = 32): Promise<string> {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

async function seedProjectAndApp() {
	try {
		console.log("🚀 Starting seed script...\n");

		// Step 1: Find an existing user or create one
		console.log("📋 Step 1: Finding an existing user...");
		const allUsers = await db.select().from(users).limit(10);

		let user;
		if (allUsers.length === 0) {
			console.log("   No users found. Creating a demo user...");
			user = await userQueries.create(db, {
				public_id: createId("user"),
				primary_email: "demo@example.com",
				primary_email_verified: true,
				name: "Demo User",
				is_admin: false,
				created_at: new Date(),
				updated_at: new Date(),
			});
			console.log(`   ✅ Created demo user: ${user.name}`);
		} else {
			user = allUsers[0];
			console.log(`   ✅ Found user: ${user.name || user.primary_email || user.public_id}`);
		}

		console.log(`   User ID: ${user.id}`);
		console.log(`   Public ID: ${user.public_id}\n`);

		// Step 2: Create a project
		console.log("📋 Step 2: Creating a project...");
		const timestamp = Date.now();
		const projectSlug = `project-${timestamp}`;

		const project = await projectQueries.create(db, {
			public_id: createId("project"),
			name: `Demo Project ${timestamp}`,
			slug: projectSlug,
			description: "A demo project created by seed script",
			owner_user_id: user.id,
			is_active: true,
			created_at: new Date(),
			updated_at: new Date(),
		});

		console.log(`✅ Created project: ${project.name}`);
		console.log(`   Project ID: ${project.id}`);
		console.log(`   Public ID: ${project.public_id}`);
		console.log(`   Slug: ${project.slug}\n`);

		// Step 2.1: Add the owner as a project member
		console.log("📋 Step 2.1: Adding owner as project member...");
		const projectMember = await projectMemberQueries.create(db, {
			public_id: createId("projectMember"),
			project_id: project.id,
			user_id: user.id,
			role: "owner",
			created_at: new Date(),
			updated_at: new Date(),
		});

		console.log(`✅ Added owner as project member with role: ${projectMember.role}\n`);

		// Step 3: Create an app
		console.log("📋 Step 3: Creating an app...");
		const appSlug = `app-${timestamp}`;
		const clientSecret = await generateSecureToken(64);
		const serviceToken = await generateSecureToken(64);

		const app = await appQueries.create(db, {
			public_id: createId("app"),
			project_id: project.id,
			name: `Demo App ${timestamp}`,
			slug: appSlug,
			description: "A demo app created by seed script",
			client_secret: clientSecret,
			service_token: serviceToken,
			redirect_uris: ["http://localhost:3000/callback"],
			allowed_hosts: ["localhost", "127.0.0.1"],
			cors_origins: ["http://localhost:3000"],
			enabled_providers: ["google", "github"],
			session_ttl_days: 28,
			account_lockout_minutes: 30,
			cache_ttl_minutes: 60,
			rate_limit: 100,
			is_active: true,
			created_at: new Date(),
			updated_at: new Date(),
		});

		console.log(`✅ Created app: ${app.name}`);
		console.log(`   App ID: ${app.id}`);
		console.log(`   Public ID: ${app.public_id}`);
		console.log(`   Slug: ${app.slug}`);
		console.log(`   Client Secret: ${clientSecret.substring(0, 10)}...`);
		console.log(`   Service Token: ${serviceToken.substring(0, 10)}...\n`);

		// Step 4: Payment provider configuration (TODO: Update to use payment_provider_configs table)
		console.log("📋 Step 4: Payment provider configuration skipped (deprecated API)\n");
		console.log("   ⚠️  Use payment_provider_configs table directly for new setup\n");

		// Summary
		console.log("=".repeat(60));
		console.log("🎉 Seed script completed successfully!\n");
		console.log("📊 Summary:");
		console.log(`   User: ${user.name || user.primary_email || user.public_id} (${user.public_id})`);
		console.log(`   Project: ${project.name} (${project.public_id})`);
		console.log(`   App: ${app.name} (${app.public_id})`);
		console.log("=".repeat(60));

		process.exit(0);
	} catch (error) {
		console.error("\n❌ Error running seed script:", error);
		process.exit(1);
	}
}

// Run the script
seedProjectAndApp();
