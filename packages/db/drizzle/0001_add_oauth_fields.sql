-- Add OAuth configuration fields to projects table
ALTER TABLE "projects" ADD COLUMN "google_client_id" text;
ALTER TABLE "projects" ADD COLUMN "google_client_secret" text;
ALTER TABLE "projects" ADD COLUMN "github_client_id" text;
ALTER TABLE "projects" ADD COLUMN "github_client_secret" text;

-- Add oauth_inherit_source to apps table (defaults to 'proofa' for existing rows)
ALTER TABLE "apps" ADD COLUMN "oauth_inherit_source" text NOT NULL DEFAULT 'proofa';
