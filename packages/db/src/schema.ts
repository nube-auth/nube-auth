import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

/**
 * Users table
 * Stores platform users
 */
export const users = sqliteTable(
	"users",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		primary_email: text("primary_email"),
		primary_email_verified: integer("primary_email_verified").notNull().default(0),
		name: text("name"),
		avatar_url: text("avatar_url"),
		is_admin: integer("is_admin").notNull().default(0),
		created_at: integer("created_at").notNull(), // epoch seconds
		updated_at: integer("updated_at").notNull(), // epoch seconds
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
export const identities = sqliteTable(
	"identities",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		provider: text("provider").notNull(), // 'google', 'github', etc.
		provider_user_id: text("provider_user_id").notNull(),
		email: text("email"),
		email_verified: integer("email_verified").notNull().default(0),
		created_at: integer("created_at").notNull(),
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
export const sessions = sqliteTable(
	"sessions",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		created_at: integer("created_at").notNull(),
		last_seen_at: integer("last_seen_at").notNull(),
		expires_at: integer("expires_at").notNull(),
		revoked_at: integer("revoked_at"), // null = active
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
export const projects = sqliteTable(
	"projects",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		owner_user_id: integer("owner_user_id")
			.notNull()
			.references(() => users.id),
		created_at: integer("created_at").notNull(),
		updated_at: integer("updated_at").notNull(),
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
export const project_members = sqliteTable(
	"project_members",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		project_id: integer("project_id")
			.notNull()
			.references(() => projects.id),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		role: text("role").notNull(), // 'owner', 'admin', 'member'
		created_at: integer("created_at").notNull(),
	},
	(table) => ({
		projectUserUnique: unique("project_members_project_user_unique").on(table.project_id, table.user_id),
		projectIdx: index("project_members_project_id_idx").on(table.project_id),
		userIdx: index("project_members_user_id_idx").on(table.user_id),
	}),
);

/**
 * Apps table
 * Applications within projects
 */
export const apps = sqliteTable(
	"apps",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		project_id: integer("project_id")
			.notNull()
			.references(() => projects.id),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		description: text("description"), // optional app description
		allowed_hosts: text("allowed_hosts").notNull(), // JSON array
		redirect_uris: text("redirect_uris").notNull(), // JSON array
		required_providers: text("required_providers").notNull(), // JSON array
		is_active: integer("is_active").notNull().default(1),
		licensing_required: integer("licensing_required").notNull().default(1),
		default_plan_id: integer("default_plan_id"), // FK to plans table, nullable (FK enforced at DB level)
		app_session_ttl_days: integer("app_session_ttl_days").notNull().default(28),
		account_lockout_minutes: integer("account_lockout_minutes").notNull().default(15),
		cache_ttl_minutes: integer("cache_ttl_minutes").notNull().default(10),
		cors_allowed_origins: text("cors_allowed_origins"), // JSON array (optional)
		rate_limit_requests_per_minute: integer("rate_limit_requests_per_minute").notNull().default(100),
		// Payment provider fields
		payment_provider: text("payment_provider"), // 'lemonsqueezy' | 'dodo' | 'stripe' | null
		payment_test_mode: integer("payment_test_mode").default(1), // 1 = test, 0 = live
		// LemonSqueezy
		lemon_squeezy_store_id: text("lemon_squeezy_store_id"),
		lemon_squeezy_api_key: text("lemon_squeezy_api_key"),
		lemon_squeezy_webhook_secret: text("lemon_squeezy_webhook_secret"),
		// Dodo Payments
		dodo_api_key: text("dodo_api_key"),
		dodo_secret_key: text("dodo_secret_key"),
		dodo_webhook_secret: text("dodo_webhook_secret"),
		// Stripe (optional, future)
		stripe_publishable_key: text("stripe_publishable_key"),
		stripe_secret_key: text("stripe_secret_key"),
		stripe_webhook_secret: text("stripe_webhook_secret"),
		// Webhook configuration
		webhook_url: text("webhook_url"),
		webhook_events: text("webhook_events"), // JSON array
		// OAuth credentials per app
		google_client_id: text("google_client_id"),
		google_client_secret: text("google_client_secret"),
		github_client_id: text("github_client_id"),
		github_client_secret: text("github_client_secret"),
		created_at: integer("created_at").notNull(),
		updated_at: integer("updated_at").notNull(),
	},
	(table) => ({
		projectSlugUnique: unique("apps_project_slug_unique").on(table.project_id, table.slug),
		projectIdx: index("apps_project_id_idx").on(table.project_id),
		isActiveIdx: index("apps_is_active_idx").on(table.is_active),
		defaultPlanIdx: index("apps_default_plan_id_idx").on(table.default_plan_id),
	}),
);

/**
 * AuthCodes table
 * Single-use authorization codes
 */
export const auth_codes = sqliteTable(
	"auth_codes",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		code: text("code").notNull().unique(),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		redirect_uri: text("redirect_uri").notNull(),
		created_at: integer("created_at").notNull(),
		expires_at: integer("expires_at").notNull(),
		consumed_at: integer("consumed_at"), // null = unused
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
export const licenses = sqliteTable(
	"licenses",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		plan_id: integer("plan_id")
			.notNull()
			.references(() => plans.id), // FK to plans table
		status: text("status").notNull(), // 'active', 'expired', 'canceled', 'suspended'
		source: text("source").notNull(), // 'manual', 'promo', 'stripe', 'lemonsqueezy', 'internal'
		valid_from: integer("valid_from").notNull(),
		valid_until: integer("valid_until"), // null = lifetime
		entitlements: text("entitlements"), // JSON object
		provider: text("provider"), // payment provider
		provider_ref_id: text("provider_ref_id"), // provider ID
		metadata: text("metadata"), // JSON object
		created_at: integer("created_at").notNull(),
		updated_at: integer("updated_at").notNull(),
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
export const email_verifications = sqliteTable(
	"email_verifications",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		email: text("email").notNull(),
		otp_hash: text("otp_hash").notNull(), // bcrypt hashed
		attempts: integer("attempts").notNull().default(0),
		expires_at: integer("expires_at").notNull(),
		locked_until: integer("locked_until"), // null = not locked
		consumed_at: integer("consumed_at"), // null = unused
		created_at: integer("created_at").notNull(),
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
export const audit_logs = sqliteTable(
	"audit_logs",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		user_id: integer("user_id")
			.notNull()
			.references(() => users.id),
		app_id: integer("app_id").references(() => apps.id), // nullable
		project_id: integer("project_id").references(() => projects.id), // nullable
		action: text("action").notNull(), // 'create', 'update', 'delete', 'grant', 'revoke', 'login', 'logout'
		entity_type: text("entity_type").notNull(), // 'user', 'app', 'project', 'license', etc.
		entity_id: text("entity_id"), // ID of changed entity
		changes: text("changes"), // JSON object (before/after)
		ip_address: text("ip_address"), // requester IP
		created_at: integer("created_at").notNull(),
	},
	(table) => ({
		userIdx: index("audit_logs_user_id_idx").on(table.user_id),
		appIdx: index("audit_logs_app_id_idx").on(table.app_id),
		projectIdx: index("audit_logs_project_id_idx").on(table.project_id),
		actionIdx: index("audit_logs_action_idx").on(table.action),
		createdAtIdx: index("audit_logs_created_at_idx").on(table.created_at),
	}),
);

export const invitations = sqliteTable(
	"invitations",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		email: text("email").notNull(),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		project_id: integer("project_id")
			.notNull()
			.references(() => projects.id),
		role: text("role"), // 'admin' | 'member' | null (for regular app user)
		plan_id: integer("plan_id")
			.notNull()
			.references(() => plans.id), // FK to plans table
		license_duration_days: integer("license_duration_days"),
		custom_message: text("custom_message"), // optional welcome message
		expires_at: integer("expires_at").notNull(), // invitation expiry timestamp
		created_at: integer("created_at").notNull(),
		consumed_at: integer("consumed_at"), // when user signed up
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

export const plans = sqliteTable(
	"plans",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		public_id: text("public_id").notNull().unique(),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		name: text("name").notNull(), // 'Free', 'Pro', 'Enterprise', etc.
		slug: text("slug").notNull(), // 'free', 'pro', 'enterprise'
		description: text("description"),
		monthly_price: integer("monthly_price"), // in cents (e.g., 999 = $9.99)
		yearly_price: integer("yearly_price"), // in cents
		one_time_price: integer("one_time_price"), // in cents - one-time payment for lifetime access
		trial_enabled: integer("trial_enabled").notNull().default(0), // 0 = false, 1 = true
		trial_days: integer("trial_days"),
		features: text("features"), // JSON array of feature strings
		status: text("status").notNull().default("active"), // 'active' | 'inactive'
		display_order: integer("display_order").notNull().default(0),
		created_at: integer("created_at").notNull(),
		updated_at: integer("updated_at").notNull(),
	},
	(table) => ({
		appIdIdx: index("plans_app_id_idx").on(table.app_id),
		slugIdx: index("plans_slug_idx").on(table.slug),
		statusIdx: index("plans_status_idx").on(table.status),
		appSlugUnique: unique("plans_app_slug_unique").on(table.app_id, table.slug),
	}),
);
