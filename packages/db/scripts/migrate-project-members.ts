#!/usr/bin/env tsx

/**
 * Migration script: Add public_id to existing project_members records
 * 
 * This script populates the public_id column for existing project_members
 * records after the schema migration has been applied.
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-project-members.ts
 */

import { eq, isNull } from "drizzle-orm";
import { createId } from "@proofa/shared";
import { getDb, project_members } from "../src/index.js";

async function migrateProjectMembers() {
	console.log("🔄 Starting project_members migration...");
	
	try {
		const db = getDb();
		
		// Find all project_members without public_id
		const membersWithoutPublicId = await db
			.select()
			.from(project_members)
			.where(isNull(project_members.public_id))
			.all();
		
		if (membersWithoutPublicId.length === 0) {
			console.log("✅ No project_members records need migration");
			return;
		}
		
		console.log(`📝 Found ${membersWithoutPublicId.length} project_members records to migrate`);
		
		// Update each record with a new public_id
		let updated = 0;
		for (const member of membersWithoutPublicId) {
			const publicId = createId("projectMember");
			
			await db
				.update(project_members)
				.set({ public_id: publicId })
				.where(eq(project_members.id, member.id));
			
			updated++;
			
			if (updated % 10 === 0) {
				console.log(`⏳ Updated ${updated}/${membersWithoutPublicId.length} records...`);
			}
		}
		
		console.log(`✅ Successfully updated ${updated} project_members records with public_ids`);
		
		// Verify the migration
		const remainingWithoutPublicId = await db
			.select()
			.from(project_members)
			.where(isNull(project_members.public_id))
			.all();
		
		if (remainingWithoutPublicId.length === 0) {
			console.log("✅ Migration verification passed - all records have public_ids");
		} else {
			console.error(`❌ Migration verification failed - ${remainingWithoutPublicId.length} records still missing public_ids`);
			process.exit(1);
		}
		
	} catch (error) {
		console.error("❌ Migration failed:", error);
		process.exit(1);
	}
}

// Run the migration
migrateProjectMembers()
	.then(() => {
		console.log("🎉 Migration completed successfully");
		process.exit(0);
	})
	.catch((error) => {
		console.error("💥 Migration failed:", error);
		process.exit(1);
	});