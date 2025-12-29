import { and, eq, inArray, isNull } from "drizzle-orm";
import { createId } from "@proofa/shared";
import type { DbClient } from "./index.js";
import { apps, oauth_providers, app_oauth_selections, payment_providers, projects } from "./schema.js";

/**
 * OAuth Provider Resolution
 * Resolves OAuth providers from Platform → Project → App hierarchy
 */
export const oauthProviderQueries = {
	/**
	 * Get all available OAuth providers for an app (from all 3 levels)
	 * Returns providers from platform, project, and app levels
	 */
	async getAvailableOAuthProviders(db: DbClient, appId: number) {
		// Get the app with its project
	const appResults = await db
		.select({
			id: apps.id,
			project_id: apps.project_id,
		})
		.from(apps)
		.where(eq(apps.id, appId))
		;

	const app = appResults[0];
	if (!app) return [];

	// Get all active OAuth providers from platform (entity_id = null), project, and app levels
	const providers = await db
		.select()
		.from(oauth_providers)
		.where(
			and(
				inArray(oauth_providers.entity_type, ["platform", "project", "app"]),
				eq(oauth_providers.is_active, true),
				isNull(oauth_providers.deleted_at),
			),
		)
		;

	// Filter to relevant providers (platform, this project, or this app)
	return providers.filter((p: any) => {
		if (p.entity_type === "platform" && p.entity_id === null) return true;
		if (p.entity_type === "project" && p.entity_id === app.project_id) return true;
		if (p.entity_type === "app" && p.entity_id === app.id) return true;
		return false;
	});
	},

	/**
	 * Get selected OAuth providers for an app with their credentials
	 * Returns only providers that the app has explicitly selected via app_oauth_selections
	 */
	async getOAuthProviders(db: DbClient, appId: number) {
		const selections = await db
			.select({
				selection_id: app_oauth_selections.id,
				is_enabled: app_oauth_selections.is_enabled,
				display_order: app_oauth_selections.display_order,
				custom_button_text: app_oauth_selections.custom_button_text,
				provider_id: oauth_providers.id,
				provider: oauth_providers.provider,
				entity_type: oauth_providers.entity_type,
				entity_id: oauth_providers.entity_id,
				credentials: oauth_providers.credentials,
				metadata: oauth_providers.metadata,
			})
			.from(app_oauth_selections)
			.innerJoin(oauth_providers, eq(app_oauth_selections.oauth_provider_id, oauth_providers.id))
			.where(
				and(
					eq(app_oauth_selections.app_id, appId),
					eq(app_oauth_selections.is_enabled, true),
					eq(oauth_providers.is_active, true),
					isNull(oauth_providers.deleted_at),
				),
			)
			.orderBy(app_oauth_selections.display_order)
			;

		return selections;
	},

	/**
	 * Get a specific OAuth provider by app and provider name
	 */
	async getOAuthProviderByName(db: DbClient, appId: number, providerName: string) {
		const providers = await this.getOAuthProviders(db, appId);
		return providers.find((p) => p.provider === providerName);
	},

	/**
	 * Create a platform-level OAuth provider
	 */
	async createPlatformProvider(db: DbClient, data: { provider: string; credentials: string; created_by_user_id?: number }) {
		const results = await db
			.insert(oauth_providers)
			.values({
				public_id: createId("oauthProvider"),
				entity_type: "platform",
				entity_id: null,
				provider: data.provider,
				credentials: data.credentials,
				is_active: true,
				created_by_user_id: data.created_by_user_id,
				updated_by_user_id: data.created_by_user_id,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returning();
		return results[0];
	},

	/**
	 * Create a project-level OAuth provider
	 */
	async createProjectProvider(
		db: DbClient,
		data: { project_id: number; provider: string; credentials: string; created_by_user_id?: number },
	) {
		const results = await db
			.insert(oauth_providers)
			.values({
				public_id: createId("oauthProvider"),
				entity_type: "project",
				entity_id: data.project_id,
				provider: data.provider,
				credentials: data.credentials,
				is_active: true,
				created_by_user_id: data.created_by_user_id,
				updated_by_user_id: data.created_by_user_id,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returning();
		return results[0];
	},

	/**
	 * Create an app-level OAuth provider
	 */
	async createAppProvider(
		db: DbClient,
		data: { app_id: number; provider: string; credentials: string; created_by_user_id?: number },
	) {
		const results = await db
			.insert(oauth_providers)
			.values({
				public_id: createId("oauthProvider"),
				entity_type: "app",
				entity_id: data.app_id,
				provider: data.provider,
				credentials: data.credentials,
				is_active: true,
				created_by_user_id: data.created_by_user_id,
				updated_by_user_id: data.created_by_user_id,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returning();
		return results[0];
	},

	/**
	 * Select an OAuth provider for an app
	 */
	async selectProviderForApp(
		db: DbClient,
		data: { app_id: number; oauth_provider_id: number; display_order?: number; custom_button_text?: string },
	) {
		return db
			.insert(app_oauth_selections)
			.values({
				app_id: data.app_id,
				oauth_provider_id: data.oauth_provider_id,
				is_enabled: true,
				display_order: data.display_order ?? 0,
				custom_button_text: data.custom_button_text,
			})
			.returning()
			;
	},

	/**
	 * Deselect an OAuth provider for an app
	 */
	async deselectProviderForApp(db: DbClient, app_id: number, oauth_provider_id: number) {
		return db
			.delete(app_oauth_selections)
			.where(and(eq(app_oauth_selections.app_id, app_id), eq(app_oauth_selections.oauth_provider_id, oauth_provider_id)))
			.returning()
			;
	},

	/**
	 * Update OAuth provider credentials (with rotation)
	 */
	async updateProviderCredentials(db: DbClient, provider_id: number, new_credentials: string, updated_by_user_id?: number) {
		// Get current credentials to store as previous
		const currentResults = await db.select().from(oauth_providers).where(eq(oauth_providers.id, provider_id));
		const current = currentResults[0];

		if (!current) throw new Error("OAuth provider not found");

		const results = await db
			.update(oauth_providers)
			.set({
				credentials: new_credentials,
				previous_credentials: current.credentials,
				credentials_rotated_at: new Date(),
				updated_by_user_id,
				updated_at: new Date(),
			})
			.where(eq(oauth_providers.id, provider_id))
			.returning()
			;
		return results[0];
	},

	/**
	 * Soft delete an OAuth provider
	 */
	async deleteProvider(db: DbClient, provider_id: number) {
		return db
			.update(oauth_providers)
			.set({ deleted_at: new Date() })
			.where(eq(oauth_providers.id, provider_id))
			.returning()
			;
	},
};

/**
 * Payment Provider Resolution
 * Resolves payment providers from Platform → Project → App hierarchy
 */
export const paymentProviderQueries = {
	/**
	 * Get all available payment providers for an app (from all 3 levels)
	 * Returns providers from platform, project, and app levels
	 */
	async getAvailablePaymentProviders(db: DbClient, appId: number, environment: "test" | "production" = "test") {
		// Get the app with its project
	const appResults = await db
		.select({
			id: apps.id,
			project_id: apps.project_id,
		})
		.from(apps)
		.where(eq(apps.id, appId))
		;

	const app = appResults[0];
	if (!app) return [];

	// Get all active payment providers from platform (entity_id = null), project, and app levels
	const providers = await db
		.select()
		.from(payment_providers)
		.where(
			and(
				inArray(payment_providers.entity_type, ["platform", "project", "app"]),
				eq(payment_providers.environment, environment),
				eq(payment_providers.is_active, true),
				isNull(payment_providers.deleted_at),
			),
		)
		;

	// Filter to relevant providers (platform, this project, or this app)
	return providers.filter((p: any) => {
		if (p.entity_type === "platform" && p.entity_id === null) return true;
		if (p.entity_type === "project" && p.entity_id === app.project_id) return true;
		if (p.entity_type === "app" && p.entity_id === app.id) return true;
		return false;
	});
	},

	/**
	 * Get the selected payment provider for an app
	 * Returns the single payment provider selected for this app
	 */
	async getPaymentProvider(db: DbClient, appId: number) {
		const appResults = await db
			.select({
				selected_payment_provider_id: apps.selected_payment_provider_id,
			})
			.from(apps)
			.where(eq(apps.id, appId))
			;

		const app = appResults[0];
		if (!app?.selected_payment_provider_id) return null;

		const providerResults = await db
			.select()
			.from(payment_providers)
			.where(
				and(
					eq(payment_providers.id, app.selected_payment_provider_id),
					eq(payment_providers.is_active, true),
					isNull(payment_providers.deleted_at),
				),
			)
			;

		return providerResults[0];
	},

	/**
	 * Create a platform-level payment provider
	 */
	async createPlatformProvider(
		db: DbClient,
		data: {
			provider: string;
			environment: "test" | "production";
			credentials: string;
			webhook_secret?: string;
			created_by_user_id?: number;
		},
	) {
		const results = await db
			.insert(payment_providers)
			.values({
				public_id: createId("paymentProvider"),
				entity_type: "platform",
				entity_id: null,
				provider: data.provider,
				environment: data.environment,
				credentials: data.credentials,
				webhook_secret: data.webhook_secret,
				is_active: true,
				created_by_user_id: data.created_by_user_id,
				updated_by_user_id: data.created_by_user_id,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returning();
		return results[0];
	},

	/**
	 * Create a project-level payment provider
	 */
	async createProjectProvider(
		db: DbClient,
		data: {
			project_id: number;
			provider: string;
			environment: "test" | "production";
			credentials: string;
			webhook_secret?: string;
			created_by_user_id?: number;
		},
	) {
		const results = await db
			.insert(payment_providers)
			.values({
				public_id: createId("paymentProvider"),
				entity_type: "project",
				entity_id: data.project_id,
				provider: data.provider,
				environment: data.environment,
				credentials: data.credentials,
				webhook_secret: data.webhook_secret,
				is_active: true,
				created_by_user_id: data.created_by_user_id,
				updated_by_user_id: data.created_by_user_id,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returning();
		return results[0];
	},

	/**
	 * Create an app-level payment provider
	 */
	async createAppProvider(
		db: DbClient,
		data: {
			app_id: number;
			provider: string;
			environment: "test" | "production";
			credentials: string;
			webhook_secret?: string;
			created_by_user_id?: number;
		},
	) {
		const results = await db
			.insert(payment_providers)
			.values({
				public_id: createId("paymentProvider"),
				entity_type: "app",
				entity_id: data.app_id,
				provider: data.provider,
				environment: data.environment,
				credentials: data.credentials,
				webhook_secret: data.webhook_secret,
				is_active: true,
				created_by_user_id: data.created_by_user_id,
				updated_by_user_id: data.created_by_user_id,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returning();
		return results[0];
	},

	/**
	 * Select a payment provider for an app
	 */
	async selectProviderForApp(db: DbClient, app_id: number, payment_provider_id: number) {
		return db
			.update(apps)
			.set({ selected_payment_provider_id: payment_provider_id })
			.where(eq(apps.id, app_id))
			.returning()
			;
	},

	/**
	 * Update payment provider credentials (with rotation)
	 */
	async updateProviderCredentials(
		db: DbClient,
		provider_id: number,
		new_credentials: string,
		webhook_secret?: string,
		updated_by_user_id?: number,
	) {
		// Get current credentials to store as previous
		const currentResults = await db.select().from(payment_providers).where(eq(payment_providers.id, provider_id));
		const current = currentResults[0];

		if (!current) throw new Error("Payment provider not found");

		const results = await db
			.update(payment_providers)
			.set({
				credentials: new_credentials,
				previous_credentials: current.credentials,
				credentials_rotated_at: new Date(),
				webhook_secret: webhook_secret ?? current.webhook_secret,
				updated_by_user_id,
				updated_at: new Date(),
			})
			.where(eq(payment_providers.id, provider_id))
			.returning()
			;
		return results[0];
	},

	/**
	 * Soft delete a payment provider
	 */
	async deleteProvider(db: DbClient, provider_id: number) {
		return db
			.update(payment_providers)
			.set({ deleted_at: new Date() })
			.where(eq(payment_providers.id, provider_id))
			.returning()
			;
	},
};
