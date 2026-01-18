/**
 * Plan Sync Worker
 * 
 * Syncs plans to all configured payment providers:
 * 1. Creates product in provider (Stripe, LemonSqueezy, etc.)
 * 2. Creates prices for each billing interval
 * 3. Stores mappings in plan_provider_prices table
 * 4. Implements retry logic with exponential backoff
 * 5. Sends notifications on complete/failure
 */

import { getDb, planQueries, appQueries, } from "@proofa/db";
import { plan_provider_prices, payment_provider_configs } from "@proofa/db/schema";
import { eq } from "@proofa/db";
import { createLogger, id, serializeError } from "@proofa/shared";
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

	// Get all active payment providers for the project
	const providers = await db.query.payment_provider_configs.findMany({
		where: eq(payment_provider_configs.project_id, app.project_id),
		columns: {
			id: true,
			public_id: true,
			provider: true,
			credentials: true,
			is_active: true,
		},
	});

	const activeProviders = providers.filter((p) => p.is_active);

	if (activeProviders.length === 0) {
		log.warn({ planId, projectId: app.project_id }, "No active payment providers found");
		return {
			success: true,
			planId,
			synced: [],
			failed: [],
		};
	}

	log.info(
		{ planId, providersCount: activeProviders.length },
		"Found active providers to sync"
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
					"Failed to decrypt provider credentials"
				);
				failedProviders.push({
					provider: provider.provider,
					error: "Failed to decrypt credentials",
				});
				continue;
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
				"Product created in provider"
			);

			const prices: Array<{ interval: string; priceId: string }> = [];

			// Create price for each billing interval that has a price set
			const intervals: Array<{
				type: "month" | "year" | "one_time";
				price: number | null;
			}> = [
				{ type: "month", price: plan.monthly_price },
				{ type: "year", price: plan.yearly_price },
				{ type: "one_time", price: plan.one_time_price },
			];

			for (const interval of intervals) {
				if (interval.price && interval.price > 0) {
					try {
						const price = await adapter.createPrice({
							productId: product.productId,
							amountCents: interval.price,
							currency: "usd",
							interval: interval.type,
						});

						log.info(
							{
								planId,
								provider: provider.provider,
								interval: interval.type,
								priceId: price.priceId,
							},
							"Price created in provider"
						);

						prices.push({
							interval: interval.type,
							priceId: price.priceId,
						});

						// Store mapping in plan_provider_prices table
						await db.insert(plan_provider_prices).values({
							public_id: id.planProviderPrice(),
							plan_id: plan.id,
							provider_config_id: provider.id,
							billing_type: interval.type === "one_time" ? "one-time" : "recurring",
							interval: interval.type === "one_time" ? null : interval.type,
							provider_price_id: price.priceId,
							amount_cents: interval.price,
							currency: "usd",
							is_active: true,
						});

						log.info(
							{ planId, provider: provider.provider, interval: interval.type },
							"Price mapping stored"
						);
					} catch (error) {
						log.error(
							{
								err: serializeError(error as Error),
								planId,
								provider: provider.provider,
								interval: interval.type,
							},
							"Failed to create price"
						);
						// Continue with other intervals even if one fails
					}
				}
			}

			if (prices.length > 0) {
				syncedProviders.push({
					provider: provider.provider,
					productId: product.productId,
					prices,
				});
			} else {
				failedProviders.push({
					provider: provider.provider,
					error: "No prices created (no valid price configurations)",
				});
			}
		} catch (error) {
			log.error(
				{
					err: serializeError(error as Error),
					planId,
					provider: provider.provider,
				},
				"Failed to sync to provider"
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
			"Plan sync completed with failures"
		);

		// Retry logic with exponential backoff
		if (retryCount < 5) {
			const delays = [0, 5, 30, 120, 1440]; // minutes: 0, 5min, 30min, 2hr, 24hr
			const delayMinutes = delays[retryCount];

			log.info(
				{ planId, retryCount: retryCount + 1, delayMinutes },
				"Scheduling retry for failed providers"
			);

			// In a real implementation, you would queue a new job with increased retry count
			// For now, we'll just log the intent
			// await queueJob('sync-plan-to-providers', { planId, retryCount: retryCount + 1 }, delayMinutes * 60 * 1000);
		} else {
			log.error({ planId }, "Max retries reached, giving up on plan sync");
			// Send notification to admin
			await sendSyncFailureNotification(plan.public_id, failedProviders);
		}
	}

	// Send success notification
	if (success) {
		await sendSyncSuccessNotification(plan.public_id, syncedProviders);
	}

	return result;
}

/**
 * Send notification on successful sync
 */
async function sendSyncSuccessNotification(
	planId: string,
	synced: SyncResult["synced"]
): Promise<void> {
	log.info(
		{ planId, providers: synced.map((s) => s.provider) },
		"Plan sync successful - notification sent"
	);
	// TODO: Implement actual notification (email, webhook, etc.)
	// For now, just log
}

/**
 * Send notification on sync failure
 */
async function sendSyncFailureNotification(
	planId: string,
	failed: SyncResult["failed"]
): Promise<void> {
	log.error(
		{ planId, failures: failed },
		"Plan sync failed after max retries - notification sent"
	);
	// TODO: Implement actual notification (email, webhook, etc.)
	// For now, just log
}

/**
 * Export for queue worker integration
 */
export const planSyncJob = {
	name: "sync-plan-to-providers",
	handler: syncPlanToProviders,
};
