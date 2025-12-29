import { pgTable, serial, text, varchar, integer, timestamp, boolean, index, unique, jsonb } from "drizzle-orm/pg-core";

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
	(table) => ({
		emailIdx: index("users_primary_email_idx").on(table.primary_email),
		publicIdIdx: index("users_public_id_idx").on(table.public_id),
	}),
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
	(table) => ({
		providerUnique: unique("identities_provider_user_id_unique").on(table.provider, table.provider_user_id),
		userIdIdx: index("identities_user_id_idx").on(table.user_id),
		providerIdx: index("identities_provider_idx").on(table.provider),
	}),
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
	(table) => ({
		userIdIdx: index("sessions_user_id_idx").on(table.user_id),
		appIdIdx: index("sessions_app_id_idx").on(table.app_id),
		expiresAtIdx: index("sessions_expires_at_idx").on(table.expires_at),
	}),
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
		google_client_id: text("google_client_id"),
		google_client_secret: text("google_client_secret"),
		github_client_id: text("github_client_id"),
		github_client_secret: text("github_client_secret"),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		slugUnique: unique("projects_slug_unique").on(table.slug),
		ownerIdx: index("projects_owner_user_id_idx").on(table.owner_user_id),
	}),
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
	},
	(table) => ({
		projectUserUnique: unique("project_members_project_user_unique").on(table.project_id, table.user_id),
		projectIdIdx: index("project_members_project_id_idx").on(table.project_id),
		userIdIdx: index("project_members_user_id_idx").on(table.user_id),
	}),
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
	},
	(table) => ({
		projectEmailUnique: unique("project_invitations_project_email_unique").on(table.project_id, table.email),
		projectIdIdx: index("project_invitations_project_id_idx").on(table.project_id),
		emailIdx: index("project_invitations_email_idx").on(table.email),
		expiresAtIdx: index("project_invitations_expires_at_idx").on(table.expires_at),
	}),
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
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		appIdIdx: index("plans_app_id_idx").on(table.app_id),
		slugIdx: index("plans_slug_idx").on(table.slug),
		statusIdx: index("plans_status_idx").on(table.status),
	}),
);

/**
 * OAuth Providers table
 * OAuth provider configurations at platform, project, and app levels
 */
export const oauth_providers = pgTable(
	"oauth_providers",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		entity_type: varchar("entity_type", { length: 20 }).notNull(), // 'platform', 'project', 'app'
		entity_id: integer("entity_id"), // null for platform, project_id or app_id
		provider: varchar("provider", { length: 50 }).notNull(), // 'google', 'github', etc.
		credentials: text("credentials").notNull(), // Encrypted JSON
		previous_credentials: text("previous_credentials"), // For credential rotation
		credentials_rotated_at: timestamp("credentials_rotated_at"),
		is_active: boolean("is_active").notNull().default(true),
		metadata: jsonb("metadata"),
		created_by_user_id: integer("created_by_user_id").references(() => users.id),
		updated_by_user_id: integer("updated_by_user_id").references(() => users.id),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		deleted_at: timestamp("deleted_at"), // Soft delete
	},
	(table) => ({
		entityIdx: index("oauth_providers_entity_idx").on(table.entity_type, table.entity_id),
		providerIdx: index("oauth_providers_provider_idx").on(table.provider),
		entityProviderUnique: unique("oauth_providers_entity_provider_unique").on(
			table.entity_type,
			table.entity_id,
			table.provider,
		),
	}),
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
		deleted_at: timestamp("deleted_at"), // Soft delete
	},
	(table) => ({
		entityIdx: index("payment_providers_entity_idx").on(table.entity_type, table.entity_id),
		providerIdx: index("payment_providers_provider_idx").on(table.provider),
		entityProviderEnvUnique: unique("payment_providers_entity_provider_env_unique").on(
			table.entity_type,
			table.entity_id,
			table.provider,
			table.environment,
		),
	}),
);

/**
 * App OAuth Selections table
 * Maps which OAuth providers are enabled for each app
 */
export const app_oauth_selections = pgTable(
	"app_oauth_selections",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		oauth_provider_id: integer("oauth_provider_id")
			.notNull()
			.references(() => oauth_providers.id),
		is_enabled: boolean("is_enabled").notNull().default(true),
		display_order: integer("display_order").notNull().default(0),
		custom_button_text: varchar("custom_button_text", { length: 100 }),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		appProviderUnique: unique("app_oauth_selections_app_provider_unique").on(table.app_id, table.oauth_provider_id),
		appIdIdx: index("app_oauth_selections_app_id_idx").on(table.app_id),
		providerIdIdx: index("app_oauth_selections_provider_id_idx").on(table.oauth_provider_id),
	}),
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
		client_secret: text("client_secret").notNull(),
		service_token: text("service_token").notNull(),
		redirect_uris: jsonb("redirect_uris").notNull(),
		allowed_hosts: jsonb("allowed_hosts"),
		cors_origins: jsonb("cors_origins"),
		oauth_inherit_source: text("oauth_inherit_source").notNull().default("proofa"), // 'proofa' | 'project' | 'app'
		google_client_id: text("google_client_id"),
		google_client_secret: text("google_client_secret"),
		github_client_id: text("github_client_id"),
		github_client_secret: text("github_client_secret"),
		session_ttl_days: integer("session_ttl_days").notNull().default(28),
		account_lockout_minutes: integer("account_lockout_minutes").notNull().default(30),
		cache_ttl_minutes: integer("cache_ttl_minutes").notNull().default(60),
		rate_limit: integer("rate_limit").notNull().default(100),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		projectSlugUnique: unique("apps_project_slug_unique").on(table.project_id, table.slug),
		projectIdIdx: index("apps_project_id_idx").on(table.project_id),
	}),
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
	(table) => ({
		codeIdx: index("auth_codes_code_idx").on(table.code),
		userIdIdx: index("auth_codes_user_id_idx").on(table.user_id),
		expiresAtIdx: index("auth_codes_expires_at_idx").on(table.expires_at),
	}),
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
	},
	(table) => ({
		userAppUnique: unique("licenses_user_app_unique").on(table.user_id, table.app_id),
		userIdIdx: index("licenses_user_id_idx").on(table.user_id),
		appIdIdx: index("licenses_app_id_idx").on(table.app_id),
		planIdIdx: index("licenses_plan_id_idx").on(table.plan_id),
		statusIdx: index("licenses_status_idx").on(table.status),
	}),
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
	(table) => ({
		emailIdx: index("email_verifications_email_idx").on(table.email),
		expiresAtIdx: index("email_verifications_expires_at_idx").on(table.expires_at),
		lockedUntilIdx: index("email_verifications_locked_until_idx").on(table.locked_until),
	}),
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
	(table) => ({
		userIdx: index("audit_logs_user_id_idx").on(table.user_id),
		appIdx: index("audit_logs_app_id_idx").on(table.app_id),
		projectIdx: index("audit_logs_project_id_idx").on(table.project_id),
		actionIdx: index("audit_logs_action_idx").on(table.action),
		createdAtIdx: index("audit_logs_created_at_idx").on(table.created_at),
	}),
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
	},
	(table) => ({
		emailAppUnique: unique("invitations_email_app_unique").on(table.email, table.app_id),
		appIdIdx: index("invitations_app_id_idx").on(table.app_id),
		projectIdIdx: index("invitations_project_id_idx").on(table.project_id),
		planIdx: index("invitations_plan_id_idx").on(table.plan_id),
		emailIdx: index("invitations_email_idx").on(table.email),
		expiresAtIdx: index("invitations_expires_at_idx").on(table.expires_at),
	}),
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
	(table) => ({
		providerIdIdx: index("provider_usage_logs_provider_id_idx").on(table.provider_id),
		appIdIdx: index("provider_usage_logs_app_id_idx").on(table.app_id),
		createdAtIdx: index("provider_usage_logs_created_at_idx").on(table.created_at),
		statusIdx: index("provider_usage_logs_status_idx").on(table.status),
		providerTypeOperationIdx: index("provider_usage_logs_type_operation_idx").on(table.provider_type, table.operation),
	}),
);

/**
 * Payment Configurations table (LEGACY - for backward compatibility)
 * Stores encrypted payment provider credentials for projects and apps
 * NOTE: New code should use payment_providers table instead
 */
export const payment_configurations = pgTable(
	"payment_configurations",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		scope_type: varchar("scope_type", { length: 20 }).notNull(), // 'project' or 'app'
		scope_id: integer("scope_id").notNull(), // project_id or app_id
		provider: varchar("provider", { length: 50 }).notNull(), // 'stripe', 'lemonsqueezy', 'dodo'
		is_active: boolean("is_active").notNull().default(true),
		test_mode: boolean("test_mode").notNull().default(true),
		config: text("config").notNull(), // Encrypted JSON config
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		scopeIdx: index("payment_configurations_scope_idx").on(table.scope_type, table.scope_id),
		providerIdx: index("payment_configurations_provider_idx").on(table.provider),
		scopeProviderUnique: unique("payment_configurations_scope_provider_unique").on(
			table.scope_type,
			table.scope_id,
			table.provider,
		),
	}),
);
