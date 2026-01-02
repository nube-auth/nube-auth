CREATE TABLE "apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"client_secret" text NOT NULL,
	"service_token" text NOT NULL,
	"redirect_uris" jsonb NOT NULL,
	"allowed_hosts" jsonb,
	"cors_origins" jsonb,
	"enabled_providers" jsonb DEFAULT '["google"]' NOT NULL,
	"session_ttl_days" integer DEFAULT 28 NOT NULL,
	"account_lockout_minutes" integer DEFAULT 30 NOT NULL,
	"cache_ttl_minutes" integer DEFAULT 60 NOT NULL,
	"rate_limit" integer DEFAULT 100 NOT NULL,
	"selected_payment_provider_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "apps_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "apps_project_slug_unique" UNIQUE("project_id","slug")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"app_id" integer,
	"project_id" integer,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(255),
	"changes" jsonb,
	"ip_address" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "auth_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"app_id" integer NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text,
	"code_challenge_method" varchar(10),
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_codes_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "auth_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"locked_until" timestamp,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verifications_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"email" varchar(255),
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "identities_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "identities_provider_user_id_unique" UNIQUE("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"app_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"role" varchar(50),
	"plan_id" integer NOT NULL,
	"license_duration_days" integer,
	"custom_message" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"consumed_at" timestamp,
	"consumed_by_user_id" integer,
	"deleted_at" timestamp,
	CONSTRAINT "invitations_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "invitations_email_app_unique" UNIQUE("email","app_id")
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"app_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "licenses_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "licenses_user_app_unique" UNIQUE("user_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "payment_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"slug" varchar(255),
	"entity_type" varchar(20) NOT NULL,
	"entity_id" integer,
	"provider" varchar(50) NOT NULL,
	"environment" varchar(20) NOT NULL,
	"credentials" text NOT NULL,
	"previous_credentials" text,
	"credentials_rotated_at" timestamp,
	"webhook_secret" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "payment_providers_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "payment_providers_entity_provider_env_unique" UNIQUE("entity_type","entity_id","provider","environment")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"app_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"monthly_price" integer,
	"yearly_price" integer,
	"one_time_price" integer,
	"duration_days" integer,
	"trial_enabled" boolean DEFAULT false NOT NULL,
	"trial_days" integer,
	"features" jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "plans_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "project_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"project_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"invited_by_user_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"accepted_by_user_id" integer,
	"deleted_at" timestamp,
	CONSTRAINT "project_invitations_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "project_invitations_project_email_unique" UNIQUE("project_id","email")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "project_members_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "project_members_project_user_unique" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"owner_user_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "projects_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "provider_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_type" varchar(20) NOT NULL,
	"provider_id" integer NOT NULL,
	"app_id" integer,
	"user_id" integer,
	"operation" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"ip_address" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"app_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "sessions_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"primary_email" varchar(255),
	"primary_email_verified" boolean DEFAULT false NOT NULL,
	"name" varchar(255),
	"avatar_url" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_consumed_by_user_id_users_id_fk" FOREIGN KEY ("consumed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_providers" ADD CONSTRAINT "payment_providers_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_providers" ADD CONSTRAINT "payment_providers_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_usage_logs" ADD CONSTRAINT "provider_usage_logs_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_usage_logs" ADD CONSTRAINT "provider_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apps_project_id_idx" ON "apps" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_app_id_idx" ON "audit_logs" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "audit_logs_project_id_idx" ON "audit_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_codes_code_idx" ON "auth_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "auth_codes_user_id_idx" ON "auth_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_codes_expires_at_idx" ON "auth_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "email_verifications_email_idx" ON "email_verifications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_verifications_expires_at_idx" ON "email_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "email_verifications_locked_until_idx" ON "email_verifications" USING btree ("locked_until");--> statement-breakpoint
CREATE INDEX "identities_user_id_idx" ON "identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "identities_provider_idx" ON "identities" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "invitations_app_id_idx" ON "invitations" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "invitations_project_id_idx" ON "invitations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invitations_plan_id_idx" ON "invitations" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_expires_at_idx" ON "invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "licenses_user_id_idx" ON "licenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "licenses_app_id_idx" ON "licenses" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "licenses_plan_id_idx" ON "licenses" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "licenses_status_idx" ON "licenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_providers_entity_idx" ON "payment_providers" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "payment_providers_provider_idx" ON "payment_providers" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "plans_app_id_idx" ON "plans" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "plans_slug_idx" ON "plans" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "plans_status_idx" ON "plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_invitations_project_id_idx" ON "project_invitations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_invitations_email_idx" ON "project_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "project_invitations_expires_at_idx" ON "project_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "project_members_project_id_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_id_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_owner_user_id_idx" ON "projects" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "provider_usage_logs_provider_id_idx" ON "provider_usage_logs" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_usage_logs_app_id_idx" ON "provider_usage_logs" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "provider_usage_logs_created_at_idx" ON "provider_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "provider_usage_logs_status_idx" ON "provider_usage_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "provider_usage_logs_type_operation_idx" ON "provider_usage_logs" USING btree ("provider_type","operation");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_app_id_idx" ON "sessions" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_primary_email_idx" ON "users" USING btree ("primary_email");--> statement-breakpoint
CREATE INDEX "users_public_id_idx" ON "users" USING btree ("public_id");