import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

/**
 * Users table
 * Stores platform users
 */
export const users = pgTable(
	"users",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		primary_email: varchar("primary_email", { length: 255 }),
		primary_email_verified: boolean("primary_email_verified").notNull().default(false),
		name: varchar("name", { length: 255 }),
		avatar_url: text("avatar_url"),
		is_admin: boolean("is_admin").notNull().default(false),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("users_primary_email_idx").on(table.primary_email),
		index("users_public_id_idx").on(table.public_id),
	],
);

/**
 * Identities table
 * OAuth/provider identities linked to users
 */
export const identities = pgTable(
	"identities",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		provider: varchar("provider", { length: 50 }).notNull(),
		provider_user_id: varchar("provider_user_id", { length: 255 }).notNull(),
		email: varchar("email", { length: 255 }),
		email_verified: boolean("email_verified").notNull().default(false),
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		unique("identities_provider_user_id_unique").on(table.provider, table.provider_user_id),
		index("identities_user_id_idx").on(table.user_id),
		index("identities_provider_idx").on(table.provider),
	],
);

/**
 * Sessions table (Core Sessions)
 * Global user sessions across all apps
 */
export const sessions = pgTable(
	"sessions",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		app_id: integer("app_id"),
		created_at: timestamp("created_at").notNull().defaultNow(),
		last_seen_at: timestamp("last_seen_at").notNull().defaultNow(),
		expires_at: timestamp("expires_at").notNull(),
		revoked_at: timestamp("revoked_at"),
	},
	(table) => [
		index("sessions_user_id_idx").on(table.user_id),
		index("sessions_app_id_idx").on(table.app_id),
		index("sessions_expires_at_idx").on(table.expires_at),
	],
);

/**
 * Projects table
 * Projects owned by users
 */
export const projects = pgTable(
	"projects",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		name: varchar("name", { length: 255 }).notNull(),
		slug: varchar("slug", { length: 255 }).notNull(),
		description: text("description"),
		owner_user_id: integer("owner_user_id")
			.notNull()
			.references(() => users.id),
		is_active: boolean("is_active").notNull().default(true),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => [
		unique("projects_slug_unique").on(table.slug),
		index("projects_owner_user_id_idx").on(table.owner_user_id),
	],
);

/**
 * Project Members table
 * Users belonging to projects
 */
export const project_members = pgTable(
	"project_members",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		project_id: integer("project_id")
			.notNull()
			.references(() => projects.id),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		role: varchar("role", { length: 50 }).notNull().default("member"),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => [
		unique("project_members_project_user_unique").on(table.project_id, table.user_id),
		index("project_members_project_id_idx").on(table.project_id),
		index("project_members_user_id_idx").on(table.user_id),
	],
);

/**
 * Project Invitations table
 * Pending invitations to join projects
 */
export const project_invitations = pgTable(
	"project_invitations",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		project_id: integer("project_id")
			.notNull()
			.references(() => projects.id),
		email: varchar("email", { length: 255 }).notNull(),
		role: varchar("role", { length: 50 }).notNull().default("member"),
		invited_by_user_id: integer("invited_by_user_id")
			.notNull()
			.references(() => users.id),
		status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'accepted', 'expired'
		expires_at: timestamp("expires_at").notNull(),
		created_at: timestamp("created_at").notNull().defaultNow(),
		accepted_at: timestamp("accepted_at"),
		accepted_by_user_id: integer("accepted_by_user_id").references(() => users.id),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => [
		index("project_invitations_project_email_idx").on(table.project_id, table.email),
		index("project_invitations_project_id_idx").on(table.project_id),
		index("project_invitations_email_idx").on(table.email),
		index("project_invitations_expires_at_idx").on(table.expires_at),
	],
);

/**
 * Plans table
 * Subscription/licensing plans
 */
export const plans = pgTable(
	"plans",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		app_id: integer("app_id").notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		slug: varchar("slug", { length: 255 }).notNull(),
		description: text("description"),
		monthly_price: integer("monthly_price"),
		yearly_price: integer("yearly_price"),
		one_time_price: integer("one_time_price"),
		duration_days: integer("duration_days"),
		trial_enabled: boolean("trial_enabled").notNull().default(false),
		trial_days: integer("trial_days"),
		features: jsonb("features"),
		status: varchar("status", { length: 20 }).notNull().default("active"),
		display_order: integer("display_order").notNull().default(0),
		is_active: boolean("is_active").notNull().default(true),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => [
		index("plans_app_id_idx").on(table.app_id),
		index("plans_slug_idx").on(table.slug),
		index("plans_status_idx").on(table.status),
	],
);

/**
 * Payment Providers table
 * Payment provider configurations at platform, project, and app levels
 */
export const payment_providers = pgTable(
	"payment_providers",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		name: varchar("name", { length: 255 }),
		slug: varchar("slug", { length: 255 }),
		entity_type: varchar("entity_type", { length: 20 }).notNull(), // 'platform', 'project', 'app'
		entity_id: integer("entity_id"), // null for platform, project_id or app_id
		provider: varchar("provider", { length: 50 }).notNull(), // 'stripe', 'lemonsqueezy', 'dodo'
		environment: varchar("environment", { length: 20 }).notNull(), // 'test' or 'production'
		credentials: text("credentials").notNull(), // Encrypted JSON
		previous_credentials: text("previous_credentials"), // For credential rotation
		credentials_rotated_at: timestamp("credentials_rotated_at"),
		webhook_secret: text("webhook_secret"),
		is_active: boolean("is_active").notNull().default(true),
		metadata: jsonb("metadata"),
		created_by_user_id: integer("created_by_user_id").references(() => users.id),
		updated_by_user_id: integer("updated_by_user_id").references(() => users.id),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => [
		index("payment_providers_entity_idx").on(table.entity_type, table.entity_id),
		index("payment_providers_provider_idx").on(table.provider),
		unique("payment_providers_entity_provider_env_unique").on(
			table.entity_type,
			table.entity_id,
			table.provider,
			table.environment,
		),
	],
);

/**
 * Apps table
 * Applications within projects
 */
export const apps = pgTable(
	"apps",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		project_id: integer("project_id")
			.notNull()
			.references(() => projects.id),
		name: varchar("name", { length: 255 }).notNull(),
		slug: varchar("slug", { length: 255 }).notNull(),
		description: text("description"),
		enabled_providers: jsonb("enabled_providers").notNull().default('["google"]'),
		app_tokens: jsonb("app_tokens").notNull(),
		security_settings: jsonb("security_settings").notNull(),
		plan_settings: jsonb("plan_settings").notNull(),
		selected_payment_provider_id: integer("selected_payment_provider_id"),
		is_active: boolean("is_active").notNull().default(true),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => [
		unique("apps_project_slug_unique").on(table.project_id, table.slug),
		index("apps_project_id_idx").on(table.project_id),
	],
);

/**
 * Auth Codes table
 * Temporary codes for OAuth flows
 */
export const auth_codes = pgTable(
	"auth_codes",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		code: varchar("code", { length: 255 }).notNull().unique(),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		app_id: integer("app_id").notNull(),
		redirect_uri: text("redirect_uri").notNull(),
		code_challenge: text("code_challenge"),
		code_challenge_method: varchar("code_challenge_method", { length: 10 }),
		expires_at: timestamp("expires_at").notNull(),
		consumed_at: timestamp("consumed_at"),
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("auth_codes_code_idx").on(table.code),
		index("auth_codes_user_id_idx").on(table.user_id),
		index("auth_codes_expires_at_idx").on(table.expires_at),
	],
);

/**
 * Licenses table
 * User licenses for apps
 */
export const licenses = pgTable(
	"licenses",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		plan_id: integer("plan_id")
			.notNull()
			.references(() => plans.id),
		status: varchar("status", { length: 20 }).notNull().default("active"),
		valid_until: timestamp("valid_until"),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => [
		unique("licenses_user_app_unique").on(table.user_id, table.app_id),
		index("licenses_user_id_idx").on(table.user_id),
		index("licenses_app_id_idx").on(table.app_id),
		index("licenses_plan_id_idx").on(table.plan_id),
		index("licenses_status_idx").on(table.status),
	],
);

/**
 * Payment Transactions table
 * Tracks all payment transactions across all providers
 * Links to licenses for audit trail and reconciliation
 */
export const payment_transactions = pgTable(
	"payment_transactions",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),

		// Link to license
		license_id: integer("license_id")
			.notNull()
			.references(() => licenses.id),

		// Provider info
		provider: varchar("provider", { length: 50 }).notNull(), // 'stripe', 'lemonsqueezy', 'dodo'
		provider_transaction_id: varchar("provider_transaction_id", { length: 255 }).notNull(),
		provider_customer_id: varchar("provider_customer_id", { length: 255 }),

		// Transaction details
		type: varchar("type", { length: 50 }).notNull(), // 'purchase', 'renewal', 'refund', 'chargeback', 'manual_adjustment'
		status: varchar("status", { length: 20 }).notNull(), // 'success', 'failed', 'pending', 'disputed'

		// Amount tracking (always in smallest currency unit - cents)
		amount_cents: integer("amount_cents").notNull(),
		currency: varchar("currency", { length: 3 }).notNull().default("usd"),

		// Metadata
		description: text("description"),
		metadata: jsonb("metadata"), // Provider-specific data, plan details snapshot

		// Timeline
		transaction_date: timestamp("transaction_date").notNull(), // When it happened in provider
		created_at: timestamp("created_at").notNull().defaultNow(),

		// For disputes/chargebacks
		dispute_reason: varchar("dispute_reason", { length: 255 }),
		resolved_at: timestamp("resolved_at"),

		// Admin audit
		created_by_user_id: integer("created_by_user_id").references(() => users.id),
		notes: text("notes"),
	},
	(table) => [
		index("payment_transactions_license_id_idx").on(table.license_id),
		index("payment_transactions_provider_transaction_idx").on(
			table.provider_transaction_id
		),
		index("payment_transactions_provider_idx").on(table.provider),
		index("payment_transactions_type_idx").on(table.type),
		index("payment_transactions_status_idx").on(table.status),
		index("payment_transactions_transaction_date_idx").on(table.transaction_date),
		unique("payment_transactions_provider_id_unique").on(
			table.provider,
			table.provider_transaction_id,
		),
	],
);

/**
 * Webhook Logs table
 * Tracks all incoming webhook requests for debugging and reprocessing
 */
export const webhook_logs = pgTable(
	"webhook_logs",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),

		// Provider identification
		provider: varchar("provider", { length: 50 }).notNull(), // 'stripe', 'lemonsqueezy', 'dodo'
		event_type: varchar("event_type", { length: 100 }).notNull(), // e.g., 'checkout.session.completed'
		event_id: varchar("event_id", { length: 255 }), // Provider's event ID (for deduplication)

		// Request data
		request_body: jsonb("request_body").notNull(), // Full webhook payload
		request_headers: jsonb("request_headers"), // Headers (signature, content-type, etc.)
		signature: text("signature"), // Webhook signature for verification
		ip_address: varchar("ip_address", { length: 50 }),

		// Processing status
		status: varchar("status", { length: 20 }).notNull().default("not_started"), 
		// 'not_started', 'processing', 'completed', 'failed', 'signature_failed', 'skipped'
		
		// Processing timeline
		received_at: timestamp("received_at").notNull().defaultNow(),
		processing_started_at: timestamp("processing_started_at"),
		processing_completed_at: timestamp("processing_completed_at"),
		processing_duration_ms: integer("processing_duration_ms"), // Calculated: completed - started

		// Results
		payment_transaction_id: integer("payment_transaction_id").references(() => payment_transactions.id),
		license_id: integer("license_id").references(() => licenses.id),
		
		// Error tracking
		error_message: text("error_message"),
		error_stack: text("error_stack"),
		retry_count: integer("retry_count").notNull().default(0),
		last_retry_at: timestamp("last_retry_at"),

		// Response details
		response_status: integer("response_status"), // HTTP status code we returned
		response_body: jsonb("response_body"), // Response we sent back

		// Metadata
		metadata: jsonb("metadata"), // Any extracted metadata (userId, appId, etc.)
		notes: text("notes"), // Admin notes for manual investigation

		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("webhook_logs_provider_idx").on(table.provider),
		index("webhook_logs_event_type_idx").on(table.event_type),
		index("webhook_logs_event_id_idx").on(table.event_id),
		index("webhook_logs_status_idx").on(table.status),
		index("webhook_logs_received_at_idx").on(table.received_at),
		index("webhook_logs_payment_transaction_id_idx").on(table.payment_transaction_id),
		index("webhook_logs_license_id_idx").on(table.license_id),
		// Optional: unique constraint on (provider, event_id) if providers guarantee unique event IDs
		unique("webhook_logs_provider_event_unique").on(table.provider, table.event_id),
	],
);

/**
 * EmailVerifications table
 * OTP codes for email verification
 */
export const email_verifications = pgTable(
	"email_verifications",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		email: varchar("email", { length: 255 }).notNull(),
		otp_hash: text("otp_hash").notNull(),
		attempts: integer("attempts").notNull().default(0),
		expires_at: timestamp("expires_at").notNull(),
		locked_until: timestamp("locked_until"),
		consumed_at: timestamp("consumed_at"),
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("email_verifications_email_idx").on(table.email),
		index("email_verifications_expires_at_idx").on(table.expires_at),
		index("email_verifications_locked_until_idx").on(table.locked_until),
	],
);

/**
 * AuditLogs table
 * Audit trail for all state-changing actions
 */
export const audit_logs = pgTable(
	"audit_logs",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		app_id: integer("app_id").references(() => apps.id),
		project_id: integer("project_id").references(() => projects.id),
		action: varchar("action", { length: 50 }).notNull(),
		entity_type: varchar("entity_type", { length: 50 }).notNull(),
		entity_id: varchar("entity_id", { length: 255 }),
		changes: jsonb("changes"),
		ip_address: varchar("ip_address", { length: 50 }),
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("audit_logs_user_id_idx").on(table.user_id),
		index("audit_logs_app_id_idx").on(table.app_id),
		index("audit_logs_project_id_idx").on(table.project_id),
		index("audit_logs_action_idx").on(table.action),
		index("audit_logs_created_at_idx").on(table.created_at),
	],
);

/**
 * Invitations table
 * User invitations to apps
 */
export const invitations = pgTable(
	"invitations",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		email: varchar("email", { length: 255 }).notNull(),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		project_id: integer("project_id")
			.notNull()
			.references(() => projects.id),
		role: varchar("role", { length: 50 }),
		plan_id: integer("plan_id")
			.notNull()
			.references(() => plans.id),
		license_duration_days: integer("license_duration_days"),
		custom_message: text("custom_message"),
		expires_at: timestamp("expires_at").notNull(),
		created_at: timestamp("created_at").notNull().defaultNow(),
		consumed_at: timestamp("consumed_at"),
		consumed_by_user_id: integer("consumed_by_user_id").references(() => users.id),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => [
		unique("invitations_email_app_unique").on(table.email, table.app_id),
		index("invitations_app_id_idx").on(table.app_id),
		index("invitations_project_id_idx").on(table.project_id),
		index("invitations_plan_id_idx").on(table.plan_id),
		index("invitations_email_idx").on(table.email),
		index("invitations_expires_at_idx").on(table.expires_at),
	],
);

/**
 * Provider Usage Logs table
 * Tracks usage of OAuth and payment providers for monitoring and debugging
 */
export const provider_usage_logs = pgTable(
	"provider_usage_logs",
	{
		id: serial("id").primaryKey(),
		provider_type: varchar("provider_type", { length: 20 }).notNull(),
		provider_id: integer("provider_id").notNull(),
		app_id: integer("app_id").references(() => apps.id),
		user_id: integer("user_id").references(() => users.id),
		operation: varchar("operation", { length: 50 }).notNull(),
		status: varchar("status", { length: 20 }).notNull(),
		error_message: text("error_message"),
		metadata: jsonb("metadata"),
		ip_address: varchar("ip_address", { length: 50 }),
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("provider_usage_logs_provider_id_idx").on(table.provider_id),
		index("provider_usage_logs_app_id_idx").on(table.app_id),
		index("provider_usage_logs_created_at_idx").on(table.created_at),
		index("provider_usage_logs_status_idx").on(table.status),
		index("provider_usage_logs_type_operation_idx").on(table.provider_type, table.operation),
	],
);
