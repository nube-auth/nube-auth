-- Drop All Tables Script
-- Run this to completely reset your database
-- Tables are dropped in reverse dependency order to avoid FK constraint errors

-- Disable foreign key checks (optional, but helps with SQLite)
PRAGMA foreign_keys = OFF;

-- ============================================
-- Drop tables in reverse dependency order
-- ============================================

-- Drop audit logs (references users, apps, projects)
DROP TABLE IF EXISTS "audit_logs";

-- Drop email verifications (no FK dependencies)
DROP TABLE IF EXISTS "email_verifications";

-- Drop auth codes (references users, apps)
DROP TABLE IF EXISTS "auth_codes";

-- Drop invitations (references apps, projects, plans, users)
DROP TABLE IF EXISTS "invitations";

-- Drop licenses (references users, apps, plans)
DROP TABLE IF EXISTS "licenses";

-- Drop plans (references apps)
DROP TABLE IF EXISTS "plans";

-- Drop apps (references projects)
DROP TABLE IF EXISTS "apps";

-- Drop project members (references projects, users)
DROP TABLE IF EXISTS "project_members";

-- Drop projects (references users)
DROP TABLE IF EXISTS "projects";

-- Drop sessions (references users)
DROP TABLE IF EXISTS "sessions";

-- Drop identities (references users)
DROP TABLE IF EXISTS "identities";

-- Drop users (root table)
DROP TABLE IF EXISTS "users";

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;

-- Optional: Vacuum to reclaim space
VACUUM;
