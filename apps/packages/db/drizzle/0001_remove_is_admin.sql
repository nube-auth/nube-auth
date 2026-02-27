-- Remove is_admin column from users table.
-- Authorization is now handled via project_members roles and session entitlements.
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_admin";
