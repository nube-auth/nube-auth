/**
 * Plan Sync Worker (v2)
 * 
 * Syncs plan prices to all configured payment providers:
 * 1. Creates product in provider (Stripe, LemonSqueezy, etc.)
 * 2. Creates provider prices for each active price
 * 3. Stores external refs on the price record
 * 4. Implements retry logic with exponential backoff
 */

import { getDb, planQueries, appQueries, priceQueries } from "@proofa/db";
import { prices, payment_provider_configs } from "@proofa/db/schema";
import { eq } from "@proofa/db";
import { createLogger, serializeError } from "@proofa/shared";
import { QueueClient } from "@proofa/queue";
import { createProviderAdapter } from "../../core/src/billing/adapters/index.js";
import { decryptString } from "../../core/src/utils/encryption.js";

const log = createLogger("sync-plan-worker");

interface SyncPlanJob {
	planId: string; // Plan public_id
	retryCount?: number;
}

interface SyncResult {
	success: boolean;
	planId: string;
	synced: {
		provider: string;
		productId: string;
		prices: Array<{ interval: string; priceId: string }>;
	}[];
	failed: {
		provider: string;
		error: string;
	}[];
}

/**
 * Process sync-plan-to-providers job
 */
export async function syncPlanToProviders(job: SyncPlanJob): Promise<SyncResult> {
	const { planId, retryCount = 0 } = job;

	log.info({ planId, retryCount }, "Starting plan sync to providers");

	const db = getDb();

	// Get plan
	const plan = await planQueries.findByPublicId(db, planId);
	if (!plan) {
		log.error({ planId }, "Plan not found");
		throw new Error(`Plan not found: ${planId}`);
	}

	// Get app
	const app = await appQueries.findById(db, plan.app_id);
	if (!app) {
		log.error({ planId, appId: plan.app_id }, "App not found");
		throw new Error(`App not found for plan: ${planId}`);
	}

	// Get active prices for this plan (v2: pricing lives on prices table)
	const activePrices = await priceQueries.findActiveByPlanId(db, plan.id);

	if (activePrices.length === 0) {
		log.warn({ planId }, "No active prices found for plan");
		return { success: true, planId, synced: [], failed: [] };
	}

	// Get all active payment providers for the project
	const providers = await db.query.payment_provider_configs.findMany({
		where: eq(payment_provider_configs.project_id, app.project_id),
		columns: {
			id: true,
			public_id: true,
			provider: true,
			credentials: true,
			environment: true,
			webhook_secret: true,
			is_active: true,
		},
	});

	const activeProviders = providers.filter((p) => p.is_active);

	if (activeProviders.length === 0) {
		log.warn({ planId, projectId: app.project_id }, "No active payment providers found");
		return { success: true, planId, synced: [], failed: [] };
	}

	log.info(
		{ planId, providersCount: activeProviders.length, pricesCount: activePrices.length },
		"Found active providers and prices to sync",
	);

	const syncedProviders: SyncResult["synced"] = [];
	const failedProviders: SyncResult["failed"] = [];

	// Sync to each provider
	for (const provider of activeProviders) {
		try {
			log.info({ planId, provider: provider.provider }, "Syncing to provider");

			// Decrypt credentials
			let credentials: unknown;
			try {
				const credentialsJson = decryptString(provider.credentials);
				credentials = JSON.parse(credentialsJson);
			} catch (error) {
				log.error(
					{ err: serializeError(error as Error), providerId: provider.public_id },
					"Failed to decrypt provider credentials",
				);
				failedProviders.push({
					provider: provider.provider,
					error: "Failed to decrypt credentials",
				});
				continue;
			}

			// Add environment field for Dodo
			if (provider.provider === "dodo" && provider.environment) {
				(credentials as any).environment = provider.environment === "production" ? "live_mode" : "test_mode";
				(credentials as any).webhookSecret = provider.webhook_secret || (credentials as any).webhookSecret;
			}

			// Create adapter
			const adapter = createProviderAdapter(provider.provider, credentials);

			// Create product in provider
			const product = await adapter.createProduct({
				name: plan.name,
				description: plan.description ?? "",
			});

			log.info(
				{ planId, provider: provider.provider, productId: product.productId },
				"Product created in provider",
			);

			const syncedPrices: Array<{ interval: string; priceId: string }> = [];

			// Create a provider price for each active price record
			for (const priceRecord of activePrices) {
				try {
					const providerPrice = await adapter.createPrice({
						productId: product.productId,
						amountCents: priceRecord.amount_cents,
						currency: priceRecord.currency,
						interval: priceRecord.billing_type === "one_time" || priceRecord.billing_type === "lifetime"
							? "one_time"
							: (priceRecord.interval as "month" | "year"),
					});

					// Store external ref directly on the price record
					await db
						.update(prices)
						.set({
							external_provider: provider.provider,
							external_price_id: providerPrice.priceId,
							updated_at: new Date(),
						})
						.where(eq(prices.id, priceRecord.id));

					log.info(
						{
							planId,
							priceId: priceRecord.public_id,
							provider: provider.provider,
							providerPriceId: providerPrice.priceId,
						},
						"Price synced to provider",
					);

					syncedPrices.push({
						interval: priceRecord.interval ?? priceRecord.billing_type,
						priceId: providerPrice.priceId,
					});
				} catch (error) {
					log.error(
						{
							err: serializeError(error as Error),
							planId,
							priceId: priceRecord.public_id,
							provider: provider.provider,
						},
						"Failed to create price in provider",
					);
				}
			}

			if (syncedPrices.length > 0) {
				syncedProviders.push({
					provider: provider.provider,
					productId: product.productId,
					prices: syncedPrices,
				});
			} else {
				failedProviders.push({
					provider: provider.provider,
					error: "No prices created (all price syncs failed)",
				});
			}
		} catch (error) {
			log.error(
				{
					err: serializeError(error as Error),
					planId,
					provider: provider.provider,
				},
				"Failed to sync to provider",
			);

			failedProviders.push({
				provider: provider.provider,
				error: (error as Error).message,
			});
		}
	}

	const success = failedProviders.length === 0;
	const result: SyncResult = {
		success,
		planId,
		synced: syncedProviders,
		failed: failedProviders,
	};

	if (success) {
		log.info({ planId, syncedCount: syncedProviders.length }, "Plan synced to all providers");
	} else {
		log.error(
			{
				planId,
				syncedCount: syncedProviders.length,
				failedCount: failedProviders.length,
			},
			"Plan sync completed with failures",
		);

		// Retry logic with exponential backoff
		if (retryCount < 5) {
			const delays = [0, 5, 30, 120, 1440]; // minutes: 0, 5min, 30min, 2hr, 24hr
			const delayMinutes = delays[retryCount] ?? 0;

			log.info(
				{ planId, retryCount: retryCount + 1, delayMinutes },
				"Scheduling retry for failed providers",
			);

			const queueClient = new QueueClient();
			const queue = queueClient.getQueue("billing");
			await queue.add(
				"sync-plan-to-providers",
				{ planId, retryCount: retryCount + 1 } as any,
				{ delay: delayMinutes * 60 * 1000 },
			);
		} else {
			log.error({ planId }, "Max retries reached, giving up on plan sync");
			await sendSyncFailureNotification(plan.public_id, failedProviders);
		}
	}

	if (success) {
		await sendSyncSuccessNotification(plan.public_id, syncedProviders);
	}

	return result;
}

async function sendSyncSuccessNotification(
	planId: string,
	synced: SyncResult["synced"],
): Promise<void> {
	log.info(
		{ planId, providers: synced.map((s) => s.provider) },
		"Plan sync successful - notification sent",
	);
	// TODO(@devendra): Implement actual notification (email, webhook, etc.)
}

async function sendSyncFailureNotification(
	planId: string,
	failed: SyncResult["failed"],
): Promise<void> {
	log.error(
		{ planId, failures: failed },
		"Plan sync failed after max retries - notification sent",
	);
	// TODO(@devendra): Implement actual notification (email, webhook, etc.)
}

export const planSyncJob = {
	name: "sync-plan-to-providers",
	handler: syncPlanToProviders,
};
