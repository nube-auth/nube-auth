CREATE TABLE "apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"enabled_providers" jsonb DEFAULT '["google"]' NOT NULL,
	"app_tokens" jsonb NOT NULL,
	"security_settings" jsonb NOT NULL,
	"plan_settings" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "license_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"license_id" integer NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" varchar(50) NOT NULL,
	"changed_by_user_id" integer,
	"changed_by_system" boolean DEFAULT false NOT NULL,
	"payment_transaction_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "license_history_public_id_unique" UNIQUE("public_id")
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
	"is_test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "licenses_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "licenses_user_app_unique" UNIQUE("user_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "payment_provider_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"project_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"environment" varchar(20) NOT NULL,
	"credentials" text NOT NULL,
	"webhook_secret" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_provider_configs_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "payment_provider_configs_project_provider_env_unique" UNIQUE("project_id","provider","environment")
);
--> statement-breakpoint
CREATE TABLE "payment_routing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"app_id" integer NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"conditions" jsonb DEFAULT '{}' NOT NULL,
	"provider_config_id" integer NOT NULL,
	"traffic_percentage" integer DEFAULT 100 NOT NULL,
	"name" varchar(255),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_routing_rules_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"purchase_id" integer NOT NULL,
	"license_id" integer NOT NULL,
	"provider_config_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_transaction_id" varchar(255) NOT NULL,
	"provider_customer_id" varchar(255),
	"type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"discount_applied_cents" integer DEFAULT 0 NOT NULL,
	"discount_applied" boolean DEFAULT false NOT NULL,
	"promotion_id" integer,
	"promotion_code_id" integer,
	"provider_discount_id" varchar(255),
	"description" text,
	"metadata" jsonb,
	"transaction_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"dispute_reason" varchar(255),
	"resolved_at" timestamp,
	"created_by_user_id" integer,
	"notes" text,
	CONSTRAINT "payment_transactions_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "payment_transactions_provider_id_unique" UNIQUE("provider_config_id","provider_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "plan_provider_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"plan_id" integer NOT NULL,
	"provider_config_id" integer NOT NULL,
	"billing_type" varchar(50) NOT NULL,
	"interval" varchar(20),
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"provider_price_id" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plan_provider_prices_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "plan_provider_prices_provider_price_id_unique" UNIQUE("provider_price_id")
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
	CONSTRAINT "project_invitations_public_id_unique" UNIQUE("public_id")
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
CREATE TABLE "promotion_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"promotion_id" integer NOT NULL,
	"app_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_codes_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "promotion_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "promotion_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"promotion_code_id" integer NOT NULL,
	"purchase_id" integer NOT NULL,
	"app_id" integer NOT NULL,
	"subject_type" varchar(50) NOT NULL,
	"subject_id" integer NOT NULL,
	"discount_cents" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_redemptions_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"app_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"discount_type" varchar(20) NOT NULL,
	"discount_value" integer NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_public_id_unique" UNIQUE("public_id")
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
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"app_id" integer NOT NULL,
	"subject_type" varchar(50) DEFAULT 'user' NOT NULL,
	"subject_id" integer NOT NULL,
	"plan_provider_price_id" integer NOT NULL,
	"provider_config_id" integer NOT NULL,
	"promotion_code_id" integer,
	"provider_session_id" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payment_transaction_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_public_id_unique" UNIQUE("public_id")
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
	"ip_address" varchar(50),
	"user_agent" text,
	CONSTRAINT "sessions_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"purchase_id" integer NOT NULL,
	"license_id" integer NOT NULL,
	"provider_config_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_subscription_id" varchar(255) NOT NULL,
	"provider_customer_id" varchar(255),
	"plan_provider_price_id" integer NOT NULL,
	"status" varchar(50) NOT NULL,
	"billing_interval" varchar(20) NOT NULL,
	"billing_period_start" timestamp,
	"billing_period_end" timestamp,
	"next_billing_date" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"ended_at" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "subscriptions_provider_subscription_unique" UNIQUE("provider_config_id","provider_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"admin_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"mode" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"test_app_id" integer,
	"test_user_id" integer,
	"plan_id" varchar(255),
	"checkout_url" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_sessions_public_id_unique" UNIQUE("public_id")
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
	"is_test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_id" varchar(255),
	"request_body" jsonb NOT NULL,
	"request_headers" jsonb,
	"signature" text,
	"ip_address" varchar(50),
	"status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processing_started_at" timestamp,
	"processing_completed_at" timestamp,
	"processing_duration_ms" integer,
	"payment_transaction_id" integer,
	"license_id" integer,
	"error_message" text,
	"error_stack" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_retry_at" timestamp,
	"response_status" integer,
	"response_body" jsonb,
	"metadata" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_logs_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "webhook_logs_provider_event_unique" UNIQUE("provider","event_id")
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
ALTER TABLE "license_history" ADD CONSTRAINT "license_history_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_history" ADD CONSTRAINT "license_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_history" ADD CONSTRAINT "license_history_payment_transaction_id_payment_transactions_id_fk" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_configs" ADD CONSTRAINT "payment_provider_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_configs" ADD CONSTRAINT "payment_provider_configs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_configs" ADD CONSTRAINT "payment_provider_configs_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_routing_rules" ADD CONSTRAINT "payment_routing_rules_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_routing_rules" ADD CONSTRAINT "payment_routing_rules_provider_config_id_payment_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "public"."payment_provider_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_provider_config_id_payment_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "public"."payment_provider_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_promotion_code_id_promotion_codes_id_fk" FOREIGN KEY ("promotion_code_id") REFERENCES "public"."promotion_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_provider_prices" ADD CONSTRAINT "plan_provider_prices_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_provider_prices" ADD CONSTRAINT "plan_provider_prices_provider_config_id_payment_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "public"."payment_provider_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_codes" ADD CONSTRAINT "promotion_codes_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_codes" ADD CONSTRAINT "promotion_codes_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_promotion_code_id_promotion_codes_id_fk" FOREIGN KEY ("promotion_code_id") REFERENCES "public"."promotion_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_usage_logs" ADD CONSTRAINT "provider_usage_logs_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_usage_logs" ADD CONSTRAINT "provider_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_plan_provider_price_id_plan_provider_prices_id_fk" FOREIGN KEY ("plan_provider_price_id") REFERENCES "public"."plan_provider_prices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_provider_config_id_payment_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "public"."payment_provider_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_provider_config_id_payment_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "public"."payment_provider_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_provider_price_id_plan_provider_prices_id_fk" FOREIGN KEY ("plan_provider_price_id") REFERENCES "public"."plan_provider_prices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_test_app_id_apps_id_fk" FOREIGN KEY ("test_app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_test_user_id_users_id_fk" FOREIGN KEY ("test_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_payment_transaction_id_payment_transactions_id_fk" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apps_project_id_idx" ON "apps" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "apps_is_test_idx" ON "apps" USING btree ("is_test","created_at");--> statement-breakpoint
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
CREATE INDEX "license_history_license_id_idx" ON "license_history" USING btree ("license_id");--> statement-breakpoint
CREATE INDEX "license_history_change_type_idx" ON "license_history" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX "license_history_reason_idx" ON "license_history" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "license_history_created_at_idx" ON "license_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "licenses_user_id_idx" ON "licenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "licenses_app_id_idx" ON "licenses" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "licenses_plan_id_idx" ON "licenses" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "licenses_status_idx" ON "licenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "licenses_is_test_idx" ON "licenses" USING btree ("is_test","created_at");--> statement-breakpoint
CREATE INDEX "payment_provider_configs_project_id_idx" ON "payment_provider_configs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "payment_provider_configs_provider_idx" ON "payment_provider_configs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "payment_provider_configs_is_default_idx" ON "payment_provider_configs" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "idx_routing_rules_app_priority" ON "payment_routing_rules" USING btree ("app_id","priority");--> statement-breakpoint
CREATE INDEX "idx_routing_rules_provider" ON "payment_routing_rules" USING btree ("provider_config_id");--> statement-breakpoint
CREATE INDEX "idx_routing_rules_app_id" ON "payment_routing_rules" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_license_id_idx" ON "payment_transactions" USING btree ("license_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_purchase_id_idx" ON "payment_transactions" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_provider_transaction_idx" ON "payment_transactions" USING btree ("provider_transaction_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_provider_config_id_idx" ON "payment_transactions" USING btree ("provider_config_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_type_idx" ON "payment_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_transactions_transaction_date_idx" ON "payment_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "payment_transactions_promotion_id_idx" ON "payment_transactions" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "plan_provider_prices_plan_id_idx" ON "plan_provider_prices" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_provider_prices_provider_config_id_idx" ON "plan_provider_prices" USING btree ("provider_config_id");--> statement-breakpoint
CREATE INDEX "plan_provider_prices_billing_type_idx" ON "plan_provider_prices" USING btree ("billing_type");--> statement-breakpoint
CREATE INDEX "plans_app_id_idx" ON "plans" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "plans_slug_idx" ON "plans" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "plans_status_idx" ON "plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_invitations_project_email_idx" ON "project_invitations" USING btree ("project_id","email");--> statement-breakpoint
CREATE INDEX "project_invitations_project_id_idx" ON "project_invitations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_invitations_email_idx" ON "project_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "project_invitations_expires_at_idx" ON "project_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "project_members_project_id_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_id_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_owner_user_id_idx" ON "projects" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "promotion_codes_promotion_id_idx" ON "promotion_codes" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "promotion_codes_app_id_idx" ON "promotion_codes" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "promotion_codes_code_idx" ON "promotion_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "promotion_codes_is_active_idx" ON "promotion_codes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "promotion_redemptions_promotion_code_id_idx" ON "promotion_redemptions" USING btree ("promotion_code_id");--> statement-breakpoint
CREATE INDEX "promotion_redemptions_purchase_id_idx" ON "promotion_redemptions" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "promotion_redemptions_app_id_idx" ON "promotion_redemptions" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "promotion_redemptions_subject_idx" ON "promotion_redemptions" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "promotions_app_id_idx" ON "promotions" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "promotions_is_active_idx" ON "promotions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "provider_usage_logs_provider_id_idx" ON "provider_usage_logs" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_usage_logs_app_id_idx" ON "provider_usage_logs" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "provider_usage_logs_created_at_idx" ON "provider_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "provider_usage_logs_status_idx" ON "provider_usage_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "provider_usage_logs_type_operation_idx" ON "provider_usage_logs" USING btree ("provider_type","operation");--> statement-breakpoint
CREATE INDEX "purchases_app_id_idx" ON "purchases" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "purchases_subject_idx" ON "purchases" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "purchases_status_idx" ON "purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "purchases_provider_session_id_idx" ON "purchases" USING btree ("provider_session_id");--> statement-breakpoint
CREATE INDEX "purchases_payment_transaction_id_idx" ON "purchases" USING btree ("payment_transaction_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_app_id_idx" ON "sessions" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "subscriptions_purchase_id_idx" ON "subscriptions" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "subscriptions_license_id_idx" ON "subscriptions" USING btree ("license_id");--> statement-breakpoint
CREATE INDEX "subscriptions_provider_config_id_idx" ON "subscriptions" USING btree ("provider_config_id");--> statement-breakpoint
CREATE INDEX "subscriptions_provider_subscription_id_idx" ON "subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_next_billing_date_idx" ON "subscriptions" USING btree ("next_billing_date");--> statement-breakpoint
CREATE INDEX "test_sessions_admin_id_idx" ON "test_sessions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "test_sessions_provider_idx" ON "test_sessions" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "test_sessions_status_idx" ON "test_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_sessions_expires_at_idx" ON "test_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "test_sessions_created_at_idx" ON "test_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_primary_email_idx" ON "users" USING btree ("primary_email");--> statement-breakpoint
CREATE INDEX "users_public_id_idx" ON "users" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "users_is_test_idx" ON "users" USING btree ("is_test","created_at");--> statement-breakpoint
CREATE INDEX "webhook_logs_provider_idx" ON "webhook_logs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_logs_event_type_idx" ON "webhook_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "webhook_logs_event_id_idx" ON "webhook_logs" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_status_idx" ON "webhook_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_logs_received_at_idx" ON "webhook_logs" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "webhook_logs_payment_transaction_id_idx" ON "webhook_logs" USING btree ("payment_transaction_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_license_id_idx" ON "webhook_logs" USING btree ("license_id");