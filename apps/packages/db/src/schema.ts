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
		is_test: boolean("is_test").notNull().default(false),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("users_primary_email_idx").on(table.primary_email),
		index("users_public_id_idx").on(table.public_id),
		index("users_is_test_idx").on(table.is_test, table.created_at),
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
		// Device/location tracking
		ip_address: varchar("ip_address", { length: 50 }),
		user_agent: text("user_agent"),
		country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2 country code
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
		icon: varchar("icon", { length: 50 }).notNull().default("folder"),
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
		icon: varchar("icon", { length: 50 }).notNull().default("application"),
		enabled_providers: jsonb("enabled_providers").notNull().default('["google"]'),
		app_tokens: jsonb("app_tokens").notNull(),
		security_settings: jsonb("security_settings").notNull(),
		plan_settings: jsonb("plan_settings").notNull(),
		// selected_payment_provider_id removed - use payment_routing_rules instead
		is_active: boolean("is_active").notNull().default(true),
		is_test: boolean("is_test").notNull().default(false),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		deleted_at: timestamp("deleted_at"),
	},
	(table) => [
		unique("apps_project_slug_unique").on(table.project_id, table.slug),
		index("apps_project_id_idx").on(table.project_id),
		index("apps_is_test_idx").on(table.is_test, table.created_at),
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
		is_test: boolean("is_test").notNull().default(false),
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
		index("licenses_is_test_idx").on(table.is_test, table.created_at),
	],
);

/**
 * License History table
 * Tracks all changes to licenses for audit trail
 */
export const license_history = pgTable(
	"license_history",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		license_id: integer("license_id")
			.notNull()
			.references(() => licenses.id),
		// What changed: created, plan_changed, status_changed, expiry_extended, expiry_reduced, deleted
		change_type: varchar("change_type", { length: 50 }).notNull(),
		// Old vs new values (JSON snapshot)
		old_value: jsonb("old_value"),
		new_value: jsonb("new_value"),
		// Why it changed: purchase, renewal, refund, admin_manual, system_auto, upgrade, downgrade
		reason: varchar("reason", { length: 50 }).notNull(),
		// Who changed it
		changed_by_user_id: integer("changed_by_user_id").references(() => users.id),
		changed_by_system: boolean("changed_by_system").notNull().default(false),
		// Link to payment (if applicable)
		payment_transaction_id: integer("payment_transaction_id").references(
			() => payment_transactions.id,
		),
		// Notes for admin/audit
		notes: text("notes"),
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("license_history_license_id_idx").on(table.license_id),
		index("license_history_change_type_idx").on(table.change_type),
		index("license_history_reason_idx").on(table.reason),
		index("license_history_created_at_idx").on(table.created_at),
	],
);

/**
 * Payment Provider Configs table
 * Payment provider configurations (renamed from payment_providers)
 */
export const payment_provider_configs = pgTable(
	"payment_provider_configs",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		project_id: integer("project_id")
			.notNull()
			.references(() => projects.id),
		provider: varchar("provider", { length: 50 }).notNull(), // 'stripe', 'lemonsqueezy', 'dodo'
		environment: varchar("environment", { length: 20 }).notNull(), // 'test' or 'production'
		credentials: text("credentials").notNull(), // Encrypted JSON
		webhook_secret: text("webhook_secret"),
		is_active: boolean("is_active").notNull().default(true),
		is_default: boolean("is_default").notNull().default(false),
		metadata: jsonb("metadata"),
		created_by_user_id: integer("created_by_user_id").references(() => users.id),
		updated_by_user_id: integer("updated_by_user_id").references(() => users.id),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("payment_provider_configs_project_id_idx").on(table.project_id),
		index("payment_provider_configs_provider_idx").on(table.provider),
		index("payment_provider_configs_is_default_idx").on(table.is_default),
		unique("payment_provider_configs_project_provider_env_unique").on(
			table.project_id,
			table.provider,
			table.environment,
		),
	],
);

/**
 * Plan Provider Prices table
 * Pricing per plan per provider (what can be purchased)
 */
export const plan_provider_prices = pgTable(
	"plan_provider_prices",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		plan_id: integer("plan_id")
			.notNull()
			.references(() => plans.id),
		provider_config_id: integer("provider_config_id")
			.notNull()
			.references(() => payment_provider_configs.id),
		billing_type: varchar("billing_type", { length: 50 }).notNull(), // 'recurring', 'one-time'
		interval: varchar("interval", { length: 20 }), // 'month', 'year' (null for one-time)
		amount_cents: integer("amount_cents").notNull(),
		currency: varchar("currency", { length: 3 }).notNull().default("usd"),
		provider_price_id: varchar("provider_price_id", { length: 255 }).notNull(), // e.g., Stripe price ID
		is_active: boolean("is_active").notNull().default(true),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("plan_provider_prices_plan_id_idx").on(table.plan_id),
		index("plan_provider_prices_provider_config_id_idx").on(table.provider_config_id),
		index("plan_provider_prices_billing_type_idx").on(table.billing_type),
		unique("plan_provider_prices_provider_price_id_unique").on(table.provider_price_id),
	],
);

/**
 * Purchases table
 * First-class record bridging checkout session to payment transaction
 * Enables Phase 2 multi-provider routing and reconciliation
 */
export const purchases = pgTable(
	"purchases",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),

		// Application & Subject
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		subject_type: varchar("subject_type", { length: 50 }).notNull().default("user"),
		// 'user' (Phase 1), 'organization' (Phase 2)
		subject_id: integer("subject_id").notNull(),
		// user_id (Phase 1), organization_id (Phase 2)

		// What was ordered
		plan_provider_price_id: integer("plan_provider_price_id")
			.notNull()
			.references(() => plan_provider_prices.id),
		// Direct link to price record (includes plan, provider, billing interval)

		// Where the purchase happens (routing)
		provider_config_id: integer("provider_config_id")
			.notNull()
			.references(() => payment_provider_configs.id),
		// Real FK for secrets, routing, webhook handling

		// Optional promotion
		promotion_code_id: integer("promotion_code_id"),
		// NULL if no promo, otherwise FK to redeemed code

		// Webhook reconciliation
		provider_session_id: varchar("provider_session_id", { length: 255 }).notNull(),
		// Stripe: checkout_session_id, LemonSqueezy: checkout_id, etc.

		// Status tracking
		status: varchar("status", { length: 20 }).notNull().default("pending"),
		// 'pending' (awaiting webhook), 'completed', 'expired', 'abandoned', 'failed'

		// Link to result (no FK constraint to avoid circular dependency - handled in app code)
		payment_transaction_id: integer("payment_transaction_id"),
		// Set when checkout completes (status → 'completed')
		// Note: Foreign key constraint on payment_transactions.id is enforced at application level

		// Timeline
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("purchases_app_id_idx").on(table.app_id),
		index("purchases_subject_idx").on(table.subject_type, table.subject_id),
		index("purchases_status_idx").on(table.status),
		index("purchases_provider_session_id_idx").on(table.provider_session_id),
		index("purchases_payment_transaction_id_idx").on(table.payment_transaction_id),
	],
);

/**
 * Promotions table
 * Promotion configurations
 */
export const promotions = pgTable(
	"promotions",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		name: varchar("name", { length: 255 }).notNull(), // Internal label: "Launch 50% off"
		discount_type: varchar("discount_type", { length: 20 }).notNull(), // 'percent', 'fixed'
		discount_value: integer("discount_value").notNull(), // 50 (for 50%) or cents (for $50)
		starts_at: timestamp("starts_at").notNull(),
		ends_at: timestamp("ends_at"),
		is_active: boolean("is_active").notNull().default(true),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("promotions_app_id_idx").on(table.app_id),
		index("promotions_is_active_idx").on(table.is_active),
	],
);

/**
 * Promotion Codes table
 * Individual promo codes tied to promotions
 */
export const promotion_codes = pgTable(
	"promotion_codes",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		promotion_id: integer("promotion_id")
			.notNull()
			.references(() => promotions.id),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		code: varchar("code", { length: 50 }).notNull().unique(),
		max_uses: integer("max_uses"),
		current_uses: integer("current_uses").notNull().default(0),
		is_active: boolean("is_active").notNull().default(true),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("promotion_codes_promotion_id_idx").on(table.promotion_id),
		index("promotion_codes_app_id_idx").on(table.app_id),
		index("promotion_codes_code_idx").on(table.code),
		index("promotion_codes_is_active_idx").on(table.is_active),
	],
);

/**
 * Promotion Redemptions table
 * Track when promo codes are used
 */
export const promotion_redemptions = pgTable(
	"promotion_redemptions",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		promotion_code_id: integer("promotion_code_id")
			.notNull()
			.references(() => promotion_codes.id),
		purchase_id: integer("purchase_id")
			.notNull()
			.references(() => purchases.id),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id),
		subject_type: varchar("subject_type", { length: 50 }).notNull(),
		subject_id: integer("subject_id").notNull(),
		discount_cents: integer("discount_cents").notNull(),
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("promotion_redemptions_promotion_code_id_idx").on(table.promotion_code_id),
		index("promotion_redemptions_purchase_id_idx").on(table.purchase_id),
		index("promotion_redemptions_app_id_idx").on(table.app_id),
		index("promotion_redemptions_subject_idx").on(table.subject_type, table.subject_id),
	],
);

/**
 * Payment Transactions table
 * Tracks all payment transactions across all providers
 * Links to purchases for audit trail and reconciliation
 */
export const payment_transactions = pgTable(
	"payment_transactions",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),

		// Link to purchase & license
		purchase_id: integer("purchase_id")
			.notNull()
			.references(() => purchases.id),
		license_id: integer("license_id")
			.notNull()
			.references(() => licenses.id),

		// Provider info (provider_config_id is the real join key)
		provider_config_id: integer("provider_config_id")
			.notNull()
			.references(() => payment_provider_configs.id),
		// Real FK for routing, secrets, webhook handling
		provider: varchar("provider", { length: 50 }).notNull(),
		// Denormalized convenience: 'stripe', 'lemonsqueezy', 'dodo'
		provider_transaction_id: varchar("provider_transaction_id", { length: 255 }).notNull(),
		provider_customer_id: varchar("provider_customer_id", { length: 255 }),

		// Transaction details
		type: varchar("type", { length: 50 }).notNull(), // 'purchase', 'renewal', 'refund', 'chargeback', 'manual_adjustment'
		status: varchar("status", { length: 20 }).notNull(), // 'success', 'failed', 'pending', 'disputed'

		// Amount tracking (always in smallest currency unit - cents)
		amount_cents: integer("amount_cents").notNull(),
		currency: varchar("currency", { length: 3 }).notNull().default("usd"),

		// Discount tracking (explicit flags for analytics & support)
		discount_applied_cents: integer("discount_applied_cents").notNull().default(0),
		// Actual amount provider applied (0 if validation failed or no promo)
		discount_applied: boolean("discount_applied").notNull().default(false),
		// Explicit truth flag: Did we successfully apply a discount?

		// Promotion tracking (Phase 1: max 1 per transaction)
		promotion_id: integer("promotion_id").references(() => promotions.id),
		promotion_code_id: integer("promotion_code_id").references(() => promotion_codes.id),
		provider_discount_id: varchar("provider_discount_id", { length: 255 }), // e.g., 'coupon_abc'

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
		index("payment_transactions_purchase_id_idx").on(table.purchase_id),
		index("payment_transactions_provider_transaction_idx").on(
			table.provider_transaction_id
		),
		index("payment_transactions_provider_config_id_idx").on(table.provider_config_id),
		index("payment_transactions_type_idx").on(table.type),
		index("payment_transactions_status_idx").on(table.status),
		index("payment_transactions_transaction_date_idx").on(table.transaction_date),
		index("payment_transactions_promotion_id_idx").on(table.promotion_id),
		unique("payment_transactions_provider_id_unique").on(
			table.provider_config_id,
			table.provider_transaction_id,
		),
	],
);

/**
 * Subscriptions table
 * Tracks recurring payment subscriptions across providers
 */
export const subscriptions = pgTable(
	"subscriptions",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),

		// Link to purchase & license
		purchase_id: integer("purchase_id")
			.notNull()
			.references(() => purchases.id),
		license_id: integer("license_id")
			.notNull()
			.references(() => licenses.id),

		// Provider info
		provider_config_id: integer("provider_config_id")
			.notNull()
			.references(() => payment_provider_configs.id),
		provider: varchar("provider", { length: 50 }).notNull(), // 'stripe', 'lemon_squeezy', 'paddle'
		provider_subscription_id: varchar("provider_subscription_id", { length: 255 }).notNull(),
		provider_customer_id: varchar("provider_customer_id", { length: 255 }),

		// Plan & pricing
		plan_provider_price_id: integer("plan_provider_price_id")
			.notNull()
			.references(() => plan_provider_prices.id),

		// Subscription status
		status: varchar("status", { length: 50 }).notNull(), // 'active', 'canceled', 'past_due', 'unpaid', 'trialing', 'paused'
		billing_interval: varchar("billing_interval", { length: 20 }).notNull(), // 'monthly', 'yearly', 'quarterly'

		// Billing period tracking
		billing_period_start: timestamp("billing_period_start"),
		billing_period_end: timestamp("billing_period_end"),
		next_billing_date: timestamp("next_billing_date"),

		// Cancellation tracking
		cancel_at_period_end: boolean("cancel_at_period_end").notNull().default(false),
		canceled_at: timestamp("canceled_at"),
		ended_at: timestamp("ended_at"),

		// Trial tracking
		trial_start: timestamp("trial_start"),
		trial_end: timestamp("trial_end"),

		// Amount tracking (always in smallest currency unit - cents)
		amount_cents: integer("amount_cents").notNull(),
		currency: varchar("currency", { length: 3 }).notNull().default("usd"),

		// Metadata
		metadata: jsonb("metadata"), // Provider-specific data

		// Timeline
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("subscriptions_purchase_id_idx").on(table.purchase_id),
		index("subscriptions_license_id_idx").on(table.license_id),
		index("subscriptions_provider_config_id_idx").on(table.provider_config_id),
		index("subscriptions_provider_subscription_id_idx").on(table.provider_subscription_id),
		index("subscriptions_status_idx").on(table.status),
		index("subscriptions_next_billing_date_idx").on(table.next_billing_date),
		unique("subscriptions_provider_subscription_unique").on(
			table.provider_config_id,
			table.provider_subscription_id,
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
 * Payment Routing Rules table
 * Controls dynamic provider selection based on context (country, currency, amount, etc.)
 */
export const payment_routing_rules = pgTable(
	"payment_routing_rules",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		app_id: integer("app_id")
			.notNull()
			.references(() => apps.id, { onDelete: "cascade" }),

		// Rule evaluation
		priority: integer("priority").notNull().default(100), // Lower = higher priority
		conditions: jsonb("conditions").notNull().default("{}"), // Empty = matches everything (catch-all)
		provider_config_id: integer("provider_config_id")
			.notNull()
			.references(() => payment_provider_configs.id, { onDelete: "cascade" }),

		// A/B testing support
		traffic_percentage: integer("traffic_percentage").notNull().default(100), // 0-100

		// Metadata
		name: varchar("name", { length: 255 }),
		description: text("description"),
		is_active: boolean("is_active").notNull().default(true),

		// Audit
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("idx_routing_rules_app_priority").on(table.app_id, table.priority),
		index("idx_routing_rules_provider").on(table.provider_config_id),
		index("idx_routing_rules_app_id").on(table.app_id),
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

/**
 * Test Sessions table
 * Manages payment testing playground sessions for admin testing
 */
export const test_sessions = pgTable(
	"test_sessions",
	{
		id: serial("id").primaryKey(),
		public_id: varchar("public_id", { length: 255 }).notNull().unique(),
		admin_id: integer("admin_id")
			.notNull()
			.references(() => users.id),
		provider: varchar("provider", { length: 50 }).notNull(),
		mode: varchar("mode", { length: 20 }).notNull(), // 'simulate' | 'live'
		status: varchar("status", { length: 20 }).notNull().default("active"), // 'active' | 'completed' | 'expired'
		test_app_id: integer("test_app_id").references(() => apps.id, { onDelete: "cascade" }),
		test_user_id: integer("test_user_id").references(() => users.id, { onDelete: "cascade" }),
		plan_id: varchar("plan_id", { length: 255 }),
		checkout_url: text("checkout_url"),
		expires_at: timestamp("expires_at").notNull(),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("test_sessions_admin_id_idx").on(table.admin_id),
		index("test_sessions_provider_idx").on(table.provider),
		index("test_sessions_status_idx").on(table.status),
		index("test_sessions_expires_at_idx").on(table.expires_at),
		index("test_sessions_created_at_idx").on(table.created_at),
	],
);
