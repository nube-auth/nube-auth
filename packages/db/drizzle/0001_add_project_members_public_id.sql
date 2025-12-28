-- Add public_id column to project_members table with migration for existing records
-- This migration should be applied after the schema changes

-- Step 1: Add the public_id column (nullable initially)
ALTER TABLE "project_members" ADD COLUMN "public_id" text;

-- Step 2: Create unique index for public_id (will be enforced after data update)
-- We'll add this after the data migration

-- Note: The actual population of public_id values should be done via the 
-- migration script in packages/db/scripts/migrate-project-members.ts
-- This ensures proper ID generation using the same algorithm as the application.