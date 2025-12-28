-- Initial schema for Proofa Core
-- This migration creates all tables from scratch with the correct schema

-- ============================================
-- Core User & Identity Tables
-- ============================================

CREATE TABLE "users" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "primary_email" text,
    "primary_email_verified" integer NOT NULL DEFAULT 0,
    "name" text,
    "avatar_url" text,
    "is_admin" integer NOT NULL DEFAULT 0,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL
);

CREATE INDEX "users_primary_email_idx" ON "users" ("primary_email");
CREATE INDEX "users_public_id_idx" ON "users" ("public_id");

CREATE TABLE "identities" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "user_id" integer NOT NULL,
    "provider" text NOT NULL,
    "provider_user_id" text NOT NULL,
    "email" text,
    "email_verified" integer NOT NULL DEFAULT 0,
    "created_at" integer NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX "identities_provider_user_id_unique" ON "identities" ("provider", "provider_user_id");
CREATE INDEX "identities_user_id_idx" ON "identities" ("user_id");
CREATE INDEX "identities_provider_idx" ON "identities" ("provider");

CREATE TABLE "sessions" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "user_id" integer NOT NULL,
    "created_at" integer NOT NULL,
    "last_seen_at" integer NOT NULL,
    "expires_at" integer NOT NULL,
    "revoked_at" integer,
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
);

CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expires_at");

-- ============================================
-- Project & App Tables
-- ============================================

CREATE TABLE "projects" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "description" text,
    "owner_user_id" integer NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX "projects_slug_unique" ON "projects" ("slug");
CREATE INDEX "projects_owner_user_id_idx" ON "projects" ("owner_user_id");

CREATE TABLE "project_members" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "project_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "role" text NOT NULL,
    "created_at" integer NOT NULL,
    FOREIGN KEY ("project_id") REFERENCES "projects"("id"),
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX "project_members_project_user_unique" ON "project_members" ("project_id", "user_id");
CREATE INDEX "project_members_project_id_idx" ON "project_members" ("project_id");
CREATE INDEX "project_members_user_id_idx" ON "project_members" ("user_id");

CREATE TABLE "project_invitations" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "project_id" integer NOT NULL,
    "email" text NOT NULL,
    "role" text NOT NULL,
    "invited_by_user_id" integer NOT NULL,
    "status" text NOT NULL,
    "created_at" integer NOT NULL,
    "expires_at" integer NOT NULL,
    FOREIGN KEY ("project_id") REFERENCES "projects"("id"),
    FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX "project_invitations_project_email_unique" ON "project_invitations" ("project_id", "email");
CREATE INDEX "project_invitations_project_id_idx" ON "project_invitations" ("project_id");
CREATE INDEX "project_invitations_email_idx" ON "project_invitations" ("email");

CREATE TABLE "apps" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "project_id" integer NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "description" text,
    "allowed_hosts" text NOT NULL,
    "redirect_uris" text NOT NULL,
    "required_providers" text NOT NULL,
    "is_active" integer NOT NULL DEFAULT 1,
    "licensing_required" integer NOT NULL DEFAULT 1,
    "default_plan_id" integer,
    "app_session_ttl_days" integer NOT NULL DEFAULT 28,
    "account_lockout_minutes" integer NOT NULL DEFAULT 15,
    "cache_ttl_minutes" integer NOT NULL DEFAULT 10,
    "cors_allowed_origins" text,
    "rate_limit_requests_per_minute" integer NOT NULL DEFAULT 100,
    -- Payment providers
    "payment_provider" text,
    "payment_test_mode" integer DEFAULT 1,
    -- LemonSqueezy
    "lemon_squeezy_store_id" text,
    "lemon_squeezy_api_key" text,
    "lemon_squeezy_webhook_secret" text,
    -- Dodo Payments
    "dodo_api_key" text,
    "dodo_secret_key" text,
    "dodo_webhook_secret" text,
    -- Stripe
    "stripe_publishable_key" text,
    "stripe_secret_key" text,
    "stripe_webhook_secret" text,
    -- Webhooks
    "webhook_url" text,
    "webhook_events" text,
    -- OAuth per app
    "google_client_id" text,
    "google_client_secret" text,
    "github_client_id" text,
    "github_client_secret" text,
    -- App API Keys
    "client_secret" text NOT NULL,
    "service_token" text NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("project_id") REFERENCES "projects"("id"),
    FOREIGN KEY ("default_plan_id") REFERENCES "plans"("id")
);

CREATE UNIQUE INDEX "apps_project_slug_unique" ON "apps" ("project_id", "slug");
CREATE INDEX "apps_project_id_idx" ON "apps" ("project_id");
CREATE INDEX "apps_is_active_idx" ON "apps" ("is_active");
CREATE INDEX "apps_default_plan_id_idx" ON "apps" ("default_plan_id");

-- ============================================
-- Plans Table (must be created before licenses and invitations)
-- ============================================

CREATE TABLE "plans" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "app_id" integer NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "description" text,
    "monthly_price" integer,
    "yearly_price" integer,
    "one_time_price" integer,
    "trial_enabled" integer NOT NULL DEFAULT 0,
    "trial_days" integer,
    "features" text,
    "status" text NOT NULL DEFAULT 'active',
    "display_order" integer NOT NULL DEFAULT 0,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("app_id") REFERENCES "apps"("id")
);

CREATE UNIQUE INDEX "plans_app_slug_unique" ON "plans" ("app_id", "slug");
CREATE INDEX "plans_app_id_idx" ON "plans" ("app_id");
CREATE INDEX "plans_slug_idx" ON "plans" ("slug");
CREATE INDEX "plans_status_idx" ON "plans" ("status");

-- ============================================
-- Licenses & Invitations (with plan_id FK)
-- ============================================

CREATE TABLE "licenses" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "user_id" integer NOT NULL,
    "app_id" integer NOT NULL,
    "plan_id" integer NOT NULL,
    "status" text NOT NULL,
    "source" text NOT NULL,
    "valid_from" integer NOT NULL,
    "valid_until" integer,
    "entitlements" text,
    "provider" text,
    "provider_ref_id" text,
    "metadata" text,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
    FOREIGN KEY ("app_id") REFERENCES "apps"("id"),
    FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
);

CREATE UNIQUE INDEX "licenses_user_app_unique" ON "licenses" ("user_id", "app_id");
CREATE INDEX "licenses_user_id_idx" ON "licenses" ("user_id");
CREATE INDEX "licenses_app_id_idx" ON "licenses" ("app_id");
CREATE INDEX "licenses_plan_id_idx" ON "licenses" ("plan_id");
CREATE INDEX "licenses_status_idx" ON "licenses" ("status");
CREATE INDEX "licenses_valid_until_idx" ON "licenses" ("valid_until");

CREATE TABLE "invitations" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "email" text NOT NULL,
    "app_id" integer NOT NULL,
    "project_id" integer NOT NULL,
    "role" text,
    "plan_id" integer NOT NULL,
    "license_duration_days" integer,
    "custom_message" text,
    "expires_at" integer NOT NULL,
    "created_at" integer NOT NULL,
    "consumed_at" integer,
    "consumed_by_user_id" integer,
    FOREIGN KEY ("app_id") REFERENCES "apps"("id"),
    FOREIGN KEY ("project_id") REFERENCES "projects"("id"),
    FOREIGN KEY ("plan_id") REFERENCES "plans"("id"),
    FOREIGN KEY ("consumed_by_user_id") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX "invitations_email_app_unique" ON "invitations" ("email", "app_id");
CREATE INDEX "invitations_app_id_idx" ON "invitations" ("app_id");
CREATE INDEX "invitations_project_id_idx" ON "invitations" ("project_id");
CREATE INDEX "invitations_plan_id_idx" ON "invitations" ("plan_id");
CREATE INDEX "invitations_email_idx" ON "invitations" ("email");
CREATE INDEX "invitations_expires_at_idx" ON "invitations" ("expires_at");

-- ============================================
-- Auth & Verification Tables
-- ============================================

CREATE TABLE "auth_codes" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "code" text NOT NULL UNIQUE,
    "user_id" integer NOT NULL,
    "app_id" integer NOT NULL,
    "redirect_uri" text NOT NULL,
    "created_at" integer NOT NULL,
    "expires_at" integer NOT NULL,
    "consumed_at" integer,
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
    FOREIGN KEY ("app_id") REFERENCES "apps"("id")
);

CREATE INDEX "auth_codes_user_id_idx" ON "auth_codes" ("user_id");
CREATE INDEX "auth_codes_app_id_idx" ON "auth_codes" ("app_id");
CREATE INDEX "auth_codes_expires_at_idx" ON "auth_codes" ("expires_at");
CREATE INDEX "auth_codes_consumed_at_idx" ON "auth_codes" ("consumed_at");

CREATE TABLE "email_verifications" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "email" text NOT NULL,
    "otp_hash" text NOT NULL,
    "attempts" integer NOT NULL DEFAULT 0,
    "expires_at" integer NOT NULL,
    "locked_until" integer,
    "consumed_at" integer,
    "created_at" integer NOT NULL
);

CREATE INDEX "email_verifications_email_idx" ON "email_verifications" ("email");
CREATE INDEX "email_verifications_expires_at_idx" ON "email_verifications" ("expires_at");
CREATE INDEX "email_verifications_locked_until_idx" ON "email_verifications" ("locked_until");

-- ============================================
-- Audit Logs
-- ============================================

CREATE TABLE "audit_logs" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "public_id" text NOT NULL UNIQUE,
    "user_id" integer NOT NULL,
    "app_id" integer,
    "project_id" integer,
    "action" text NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" text,
    "changes" text,
    "ip_address" text,
    "created_at" integer NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
    FOREIGN KEY ("app_id") REFERENCES "apps"("id"),
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
);

CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" ("user_id");
CREATE INDEX "audit_logs_app_id_idx" ON "audit_logs" ("app_id");
CREATE INDEX "audit_logs_project_id_idx" ON "audit_logs" ("project_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" ("action");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");
