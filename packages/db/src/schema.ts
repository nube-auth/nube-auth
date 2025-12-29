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
		created_at: timestamp("created_at").notNull().defaultNow(),
		last_seen_at: timestamp("last_seen_at").notNull().defaultNow(),
		expires_at: timestamp("expires_at").notNull(),
		revoked_at: timestamp("revoked_at"),
	},
	(table) => ({
		userIdIdx: index("sessions_user_id_idx").on(table.user_id),
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
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		slugUnique: unique("projects_slug_unique").on(table.slug),
		ownerIdx: index("projects_owner_user_id_idx").on(table.owner_user_id),
	}),
);

/**
 * ProjectMembers table
 * User memberships in projects
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
		role: varchar("role", { length: 50 }).notNull(),
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		projectUserUnique: unique("project_members_project_user_unique").on(table.project_id, table.user_id),
		projectIdx: index("project_members_project_id_idx").on(table.project_id),
		userIdx: index("project_members_user_id_idx").on(table.user_id),
		publicIdIdx: index("project_members_public_id_idx").on(table.public_id),
	}),
);

/**
 * Project Invitations table
 * Pending invitations to join a project
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
		role: varchar("role", { length: 50 }).notNull(),
		invited_by_user_id: integer("invited_by_user_id")
			.notNull()
			.references(() => users.id),
		status: varchar("status", { length: 50 }).notNull(),
		created_at: timestamp("created_at").notNull().defaultNow(),
		expires_at: timestamp("expires_at").notNull(),
	},
	(table) => ({
		projectEmailUnique: unique("project_invitations_project_email_unique").on(table.project_id, table.email),
		projectIdx: index("project_invitations_project_id_idx").on(table.project_id),
		emailIdx: index("project_invitations_email_idx").on(table.email),
	}),
);

/**
 * Plans table
 * Subscription plans for apps
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
		status: varchar("status", { length: 50 }).notNull().default("active"),
		display_order: integer("display_order").notNull().default(0),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		appIdIdx: index("plans_app_id_idx").on(table.app_id),
		slugIdx: index("plans_slug_idx").on(table.slug),
		statusIdx: index("plans_status_idx").on(table.status),
		appSlugUnique: unique("plans_app_slug_unique").on(table.app_id, table.slug),
	}),
);

/**
 * OAuth Providers table
 * Stores OAuth provider configurations at platform, project, and app levels
 */
export const oauth_providers = pgTable(
	"oauth_providers",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		entity_type: varchar("entity_type", { length: 20 }).notNull(),
		entity_id: integer("entity_id"),
		provider: varchar("provider", { length: 50 }).notNull(),
		is_active: boolean("is_active").notNull().default(true),
		credentials: text("credentials").notNull(),
		previous_credentials: text("previous_credentials"),
		credentials_rotated_at: timestamp("credentials_rotated_at"),
		metadata: jsonb("metadata"),
		created_by_user_id: integer("created_by_user_id").references(() => users.id),
		updated_by_user_id: integer("updated_by_user_id").references(() => users.id),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => ({
		entityIdx: index("oauth_providers_entity_idx").on(table.entity_type, table.entity_id),
		providerIdx: index("oauth_providers_provider_idx").on(table.provider),
		isActiveIdx: index("oauth_providers_is_active_idx").on(table.is_active),
		deletedAtIdx: index("oauth_providers_deleted_at_idx").on(table.deleted_at),
		entityProviderUnique: unique("oauth_providers_entity_provider_unique").on(
			table.entity_type,
			table.entity_id,
			table.provider
		),
	}),
);

/**
 * Payment Providers table
 * Stores payment provider configurations at platform, project, and app levels
 */
export const payment_providers = pgTable(
	"payment_providers",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		entity_type: varchar("entity_type", { length: 20 }).notNull(),
		entity_id: integer("entity_id"),
		provider: varchar("provider", { length: 50 }).notNull(),
		is_active: boolean("is_active").notNull().default(true),
		environment: varchar("environment", { length: 20 }).notNull().default("test"),
		credentials: text("credentials").notNull(),
		previous_credentials: text("previous_credentials"),
		credentials_rotated_at: timestamp("credentials_rotated_at"),
		webhook_secret: text("webhook_secret"),
		metadata: jsonb("metadata"),
		created_by_user_id: integer("created_by_user_id").references(() => users.id),
		updated_by_user_id: integer("updated_by_user_id").references(() => users.id),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => ({
		entityIdx: index("payment_providers_entity_idx").on(table.entity_type, table.entity_id),
		providerIdx: index("payment_providers_provider_idx").on(table.provider),
		environmentIdx: index("payment_providers_environment_idx").on(table.environment),
		isActiveIdx: index("payment_providers_is_active_idx").on(table.is_active),
		deletedAtIdx: index("payment_providers_deleted_at_idx").on(table.deleted_at),
		entityProviderEnvUnique: unique("payment_providers_entity_provider_env_unique").on(
			table.entity_type,
			table.entity_id,
			table.provider,
			table.environment
		),
	}),
);

/**
 * App OAuth Selections table
 * Junction table for apps to select which OAuth providers to enable
 */
export const app_oauth_selections = pgTable(
	"app_oauth_selections",
	{
		id: serial("id").primaryKey(),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id, { onDelete: "cascade" }),
		oauth_provider_id: integer("oauth_provider_id")
			.notNull()
			.references(() => oauth_providers.id, { onDelete: "cascade" }),
		is_enabled: boolean("is_enabled").notNull().default(true),
		display_order: integer("display_order").notNull().default(0),
		custom_button_text: varchar("custom_button_text", { length: 100 }),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		appOAuthUnique: unique("app_oauth_selections_app_oauth_unique").on(table.app_id, table.oauth_provider_id),
		appIdIdx: index("app_oauth_selections_app_id_idx").on(table.app_id),
		isEnabledIdx: index("app_oauth_selections_is_enabled_idx").on(table.is_enabled),
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
		allowed_hosts: jsonb("allowed_hosts").notNull(),
		redirect_uris: jsonb("redirect_uris").notNull(),
		required_providers: jsonb("required_providers").notNull(),
		is_active: boolean("is_active").notNull().default(true),
		licensing_required: boolean("licensing_required").notNull().default(true),
		default_plan_id: integer("default_plan_id").references(() => plans.id),
		app_session_ttl_days: integer("app_session_ttl_days").notNull().default(28),
		account_lockout_minutes: integer("account_lockout_minutes").notNull().default(15),
		cache_ttl_minutes: integer("cache_ttl_minutes").notNull().default(10),
		cors_allowed_origins: jsonb("cors_allowed_origins"),
		rate_limit_requests_per_minute: integer("rate_limit_requests_per_minute").notNull().default(100),
		selected_payment_provider_id: integer("selected_payment_provider_id").references(() => payment_providers.id),
		webhook_base_url: text("webhook_base_url"),
		client_secret: text("client_secret").notNull(),
		service_token: text("service_token").notNull(),
		email_from_name: varchar("email_from_name", { length: 255 }),
		email_from_address: varchar("email_from_address", { length: 255 }),
		email_reply_to: varchar("email_reply_to", { length: 255 }),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		projectSlugUnique: unique("apps_project_slug_unique").on(table.project_id, table.slug),
		projectIdx: index("apps_project_id_idx").on(table.project_id),
		isActiveIdx: index("apps_is_active_idx").on(table.is_active),
		defaultPlanIdx: index("apps_default_plan_id_idx").on(table.default_plan_id),
		selectedPaymentProviderIdx: index("apps_selected_payment_provider_id_idx").on(table.selected_payment_provider_id),
	}),
);

/**
 * AuthCodes table
 * Single-use authorization codes
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
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		redirect_uri: text("redirect_uri").notNull(),
		created_at: timestamp("created_at").notNull().defaultNow(),
		expires_at: timestamp("expires_at").notNull(),
		consumed_at: timestamp("consumed_at"),
	},
	(table) => ({
		userIdx: index("auth_codes_user_id_idx").on(table.user_id),
		appIdx: index("auth_codes_app_id_idx").on(table.app_id),
		expiresAtIdx: index("auth_codes_expires_at_idx").on(table.expires_at),
		consumedIdx: index("auth_codes_consumed_at_idx").on(table.consumed_at),
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
		status: varchar("status", { length: 50 }).notNull(),
		source: varchar("source", { length: 50 }).notNull(),
		valid_from: timestamp("valid_from").notNull(),
		valid_until: timestamp("valid_until"),
		entitlements: jsonb("entitlements"),
		provider: varchar("provider", { length: 50 }),
		provider_ref_id: varchar("provider_ref_id", { length: 255 }),
		metadata: jsonb("metadata"),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		userAppUnique: unique("licenses_user_app_unique").on(table.user_id, table.app_id),
		userIdx: index("licenses_user_id_idx").on(table.user_id),
		appIdx: index("licenses_app_id_idx").on(table.app_id),
		planIdx: index("licenses_plan_id_idx").on(table.plan_id),
		statusIdx: index("licenses_status_idx").on(table.status),
		validUntilIdx: index("licenses_valid_until_idx").on(table.valid_until),
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
