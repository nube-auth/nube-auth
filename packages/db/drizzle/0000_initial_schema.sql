CREATE TABLE `apps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`allowed_hosts` text NOT NULL,
	`redirect_uris` text NOT NULL,
	`required_providers` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`licensing_required` integer DEFAULT 1 NOT NULL,
	`default_plan_id` integer,
	`app_session_ttl_days` integer DEFAULT 28 NOT NULL,
	`account_lockout_minutes` integer DEFAULT 15 NOT NULL,
	`cache_ttl_minutes` integer DEFAULT 10 NOT NULL,
	`cors_allowed_origins` text,
	`rate_limit_requests_per_minute` integer DEFAULT 100 NOT NULL,
	`payment_provider` text,
	`payment_test_mode` integer DEFAULT 1,
	`lemon_squeezy_store_id` text,
	`lemon_squeezy_api_key` text,
	`lemon_squeezy_webhook_secret` text,
	`dodo_api_key` text,
	`dodo_secret_key` text,
	`dodo_webhook_secret` text,
	`stripe_publishable_key` text,
	`stripe_secret_key` text,
	`stripe_webhook_secret` text,
	`webhook_url` text,
	`webhook_events` text,
	`oauth_inherit_source` text DEFAULT 'proofa' NOT NULL,
	`google_client_id` text,
	`google_client_secret` text,
	`github_client_id` text,
	`github_client_secret` text,
	`client_secret` text NOT NULL,
	`service_token` text NOT NULL,
	`email_from_name` text,
	`email_from_address` text,
	`email_reply_to` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`app_id` integer,
	`project_id` integer,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`changes` text,
	`ip_address` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `auth_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`code` text NOT NULL,
	`user_id` integer NOT NULL,
	`app_id` integer NOT NULL,
	`redirect_uri` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`email` text NOT NULL,
	`otp_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`locked_until` integer,
	`consumed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `identities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`email` text,
	`email_verified` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`email` text NOT NULL,
	`app_id` integer NOT NULL,
	`project_id` integer NOT NULL,
	`role` text,
	`plan_id` integer NOT NULL,
	`license_duration_days` integer,
	`custom_message` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`consumed_at` integer,
	`consumed_by_user_id` integer,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consumed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`app_id` integer NOT NULL,
	`plan_id` integer NOT NULL,
	`status` text NOT NULL,
	`source` text NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_until` integer,
	`entitlements` text,
	`provider` text,
	`provider_ref_id` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payment_configurations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` integer NOT NULL,
	`provider` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`test_mode` integer DEFAULT 1 NOT NULL,
	`config` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`app_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`monthly_price` integer,
	`yearly_price` integer,
	`one_time_price` integer,
	`duration_days` integer,
	`trial_enabled` integer DEFAULT 0 NOT NULL,
	`trial_days` integer,
	`features` text,
	`status` text DEFAULT 'active' NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`project_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`invited_by_user_id` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`project_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`owner_user_id` integer NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`google_client_id` text,
	`google_client_secret` text,
	`github_client_id` text,
	`github_client_secret` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`primary_email` text,
	`primary_email_verified` integer DEFAULT 0 NOT NULL,
	`name` text,
	`avatar_url` text,
	`is_admin` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apps_public_id_unique` ON `apps` (`public_id`);--> statement-breakpoint
CREATE INDEX `apps_project_id_idx` ON `apps` (`project_id`);--> statement-breakpoint
CREATE INDEX `apps_is_active_idx` ON `apps` (`is_active`);--> statement-breakpoint
CREATE INDEX `apps_default_plan_id_idx` ON `apps` (`default_plan_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `apps_project_slug_unique` ON `apps` (`project_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `audit_logs_public_id_unique` ON `audit_logs` (`public_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_user_id_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_app_id_idx` ON `audit_logs` (`app_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_project_id_idx` ON `audit_logs` (`project_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_codes_public_id_unique` ON `auth_codes` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_codes_code_unique` ON `auth_codes` (`code`);--> statement-breakpoint
CREATE INDEX `auth_codes_user_id_idx` ON `auth_codes` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_codes_app_id_idx` ON `auth_codes` (`app_id`);--> statement-breakpoint
CREATE INDEX `auth_codes_expires_at_idx` ON `auth_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `auth_codes_consumed_at_idx` ON `auth_codes` (`consumed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_verifications_public_id_unique` ON `email_verifications` (`public_id`);--> statement-breakpoint
CREATE INDEX `email_verifications_email_idx` ON `email_verifications` (`email`);--> statement-breakpoint
CREATE INDEX `email_verifications_expires_at_idx` ON `email_verifications` (`expires_at`);--> statement-breakpoint
CREATE INDEX `email_verifications_locked_until_idx` ON `email_verifications` (`locked_until`);--> statement-breakpoint
CREATE UNIQUE INDEX `identities_public_id_unique` ON `identities` (`public_id`);--> statement-breakpoint
CREATE INDEX `identities_user_id_idx` ON `identities` (`user_id`);--> statement-breakpoint
CREATE INDEX `identities_provider_idx` ON `identities` (`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `identities_provider_user_id_unique` ON `identities` (`provider`,`provider_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_public_id_unique` ON `invitations` (`public_id`);--> statement-breakpoint
CREATE INDEX `invitations_app_id_idx` ON `invitations` (`app_id`);--> statement-breakpoint
CREATE INDEX `invitations_project_id_idx` ON `invitations` (`project_id`);--> statement-breakpoint
CREATE INDEX `invitations_plan_id_idx` ON `invitations` (`plan_id`);--> statement-breakpoint
CREATE INDEX `invitations_email_idx` ON `invitations` (`email`);--> statement-breakpoint
CREATE INDEX `invitations_expires_at_idx` ON `invitations` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_email_app_unique` ON `invitations` (`email`,`app_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `licenses_public_id_unique` ON `licenses` (`public_id`);--> statement-breakpoint
CREATE INDEX `licenses_user_id_idx` ON `licenses` (`user_id`);--> statement-breakpoint
CREATE INDEX `licenses_app_id_idx` ON `licenses` (`app_id`);--> statement-breakpoint
CREATE INDEX `licenses_plan_id_idx` ON `licenses` (`plan_id`);--> statement-breakpoint
CREATE INDEX `licenses_status_idx` ON `licenses` (`status`);--> statement-breakpoint
CREATE INDEX `licenses_valid_until_idx` ON `licenses` (`valid_until`);--> statement-breakpoint
CREATE UNIQUE INDEX `licenses_user_app_unique` ON `licenses` (`user_id`,`app_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_configurations_public_id_unique` ON `payment_configurations` (`public_id`);--> statement-breakpoint
CREATE INDEX `payment_configurations_scope_idx` ON `payment_configurations` (`scope_type`,`scope_id`);--> statement-breakpoint
CREATE INDEX `payment_configurations_provider_idx` ON `payment_configurations` (`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_configurations_scope_provider_unique` ON `payment_configurations` (`scope_type`,`scope_id`,`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `plans_public_id_unique` ON `plans` (`public_id`);--> statement-breakpoint
CREATE INDEX `plans_app_id_idx` ON `plans` (`app_id`);--> statement-breakpoint
CREATE INDEX `plans_slug_idx` ON `plans` (`slug`);--> statement-breakpoint
CREATE INDEX `plans_status_idx` ON `plans` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `plans_app_slug_unique` ON `plans` (`app_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_invitations_public_id_unique` ON `project_invitations` (`public_id`);--> statement-breakpoint
CREATE INDEX `project_invitations_project_id_idx` ON `project_invitations` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_invitations_email_idx` ON `project_invitations` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_invitations_project_email_unique` ON `project_invitations` (`project_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_members_public_id_unique` ON `project_members` (`public_id`);--> statement-breakpoint
CREATE INDEX `project_members_project_id_idx` ON `project_members` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_members_user_id_idx` ON `project_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_members_public_id_idx` ON `project_members` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_members_project_user_unique` ON `project_members` (`project_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_public_id_unique` ON `projects` (`public_id`);--> statement-breakpoint
CREATE INDEX `projects_owner_user_id_idx` ON `projects` (`owner_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_public_id_unique` ON `sessions` (`public_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_public_id_unique` ON `users` (`public_id`);--> statement-breakpoint
CREATE INDEX `users_primary_email_idx` ON `users` (`primary_email`);--> statement-breakpoint
CREATE INDEX `users_public_id_idx` ON `users` (`public_id`);