import { createId } from "@proofa/shared";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { DbClient } from "./index.js";
import { apps, payment_providers } from "./schema.js";

/**
 * Payment Provider Resolution
 * Resolves payment providers from Platform → Project → App hierarchy
 */
export const paymentProviderQueries = {
	/**
	 * Find payment provider by ID
	 */
	async findById(db: DbClient, providerId: number) {
		const results = await db.select().from(payment_providers).where(eq(payment_providers.id, providerId));
		return results[0];
	},

	/**
	 * Find payment provider by public ID
	 */
	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db.select().from(payment_providers).where(eq(payment_providers.public_id, publicId));
		return results[0];
	},

	/**
	 * Create payment provider (generic)
	 */
	async create(db: DbClient, data: any) {
		const results = await db.insert(payment_providers).values(data).returning();
		return results[0];
	},

	/**
	 * Update payment provider
	 */
	async update(db: DbClient, providerId: number, data: any) {
		const results = await db
			.update(payment_providers)
			.set({ ...data, updated_at: new Date() })
			.where(eq(payment_providers.id, providerId))
			.returning();
		return results[0];
	},

	/**
	 * Delete payment provider (soft delete)
	 */
	async delete(db: DbClient, providerId: number) {
		const results = await db
			.update(payment_providers)
			.set({ deleted_at: new Date() })
			.where(eq(payment_providers.id, providerId))
			.returning();
		return results[0];
	},

	/**
	 * Get selected payment provider for an app
	 */
	async getSelectedPaymentProvider(db: DbClient, appId: number) {
		const appResults = await db.select().from(apps).where(eq(apps.id, appId));
		const app = appResults[0];

		if (!app || !app.selected_payment_provider_id) return null;

		const results = await db
			.select()
			.from(payment_providers)
			.where(
				and(
					eq(payment_providers.id, app.selected_payment_provider_id),
					eq(payment_providers.is_active, true),
					isNull(payment_providers.deleted_at),
				),
			);

		return results[0] || null;
	},

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
			.where(eq(apps.id, appId));

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
			);

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
		const providerResults = await db
			.select()
			.from(payment_providers)
			.where(
				and(
					eq(payment_providers.entity_type, "app"),
					eq(payment_providers.entity_id, appId),
					eq(payment_providers.is_active, true),
					isNull(payment_providers.deleted_at),
				),
			)
			.orderBy(desc(payment_providers.created_at))
			.limit(1);
		return providerResults[0] || null;
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
	 * Marks the selected provider as active and all others as inactive
	 */
	async selectProviderForApp(db: DbClient, app_id: number, payment_provider_id: number) {
		// Deactivate all other providers for this app
		await db
			.update(payment_providers)
			.set({ is_active: false, updated_at: new Date() })
			.where(and(eq(payment_providers.entity_type, "app"), eq(payment_providers.entity_id, app_id)));

		// Activate the selected provider
		const results = await db
			.update(payment_providers)
			.set({ is_active: true, updated_at: new Date() })
			.where(eq(payment_providers.id, payment_provider_id))
			.returning();
		return results[0];
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
			.returning();
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
			.returning();
	},
};
