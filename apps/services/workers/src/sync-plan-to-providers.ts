/**
 * Plan Sync Worker (v2)
 * 
 * Syncs plan prices to all configured payment providers:
 * 1. Creates product in provider (Stripe, LemonSqueezy, etc.)
 * 2. Creates provider prices for each active price
 * 3. Stores external refs on the price record
 * 4. Implements retry logic with exponential backoff
 */

import { getDb, planQueries, appQueries, priceQueries, priceProviderRefQueries, prices } from "@nube-auth/db";
import { payment_provider_configs } from "@nube-auth/db/schema";
import { eq } from "@nube-auth/db";
import { createId } from "@nube-auth/shared";
import { createLogger, serializeError } from "@nube-auth/shared";
import { QueueClient } from "@nube-auth/queue";
import { createProviderAdapter } from "@nube-auth/billing";
import { decryptProviderCredentials } from "@nube-auth/billing";

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
	const app = await appQueries.findByInternalId_(db, plan.app_id);
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
			credentials_dek: true,
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

			// Idempotency: only create provider resources for prices that don't already
			// have an active mapping in price_provider_refs for this provider config.
			const existingRefsByPriceId = new Map<number, Awaited<ReturnType<typeof priceProviderRefQueries.findByPriceAndProvider>>>();
			for (const priceRecord of activePrices) {
				const existingRef = await priceProviderRefQueries.findByPriceAndProvider(db, priceRecord.id, provider.id);
				existingRefsByPriceId.set(priceRecord.id, existingRef);
			}

			const pricesToCreate = activePrices.filter((priceRecord) => !existingRefsByPriceId.get(priceRecord.id));

			if (pricesToCreate.length === 0) {
				log.info(
					{ planId, provider: provider.provider, pricesCount: activePrices.length },
					"All active prices already synced for provider, skipping",
				);
				const existingProductId = activePrices
					.map((p) => existingRefsByPriceId.get(p.id)?.external_product_id)
					.find((v): v is string => typeof v === "string" && v.length > 0);

				syncedProviders.push({
					provider: provider.provider,
					productId: existingProductId ?? "__already_synced__",
					prices: [],
				});
				continue;
			}

// Decrypt credentials (supports DEK-wrapped and legacy)
			let credentials: unknown;
			try {
				credentials = decryptProviderCredentials(provider);
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

		// ── Naming convention ─────────────────────────────────────────────────────
		// Product:  "[App Name] — [Plan Name]"  e.g. "Pingpong — Pro"
		// Description prefix: "[nube:<app-slug>/<plan-slug>]" for easy grepping
		// Price label: "[Plan Name] — [Interval] ([CURRENCY] [Amount])"
		//              e.g. "Pro — Monthly (USD 9.99)", "Pro — Lifetime (INR 4999.00)"
		// ─────────────────────────────────────────────────────────────────────────
		const productName = `${app.name} — ${plan.name}`;
		const productDescription = `[nube:${app.slug}/${plan.slug}]${plan.description ? ` ${plan.description}` : ""}`;
		const productMetadata: Record<string, string> = {
			nube_app_id: app.public_id,
			nube_app_slug: app.slug,
			nube_plan_id: plan.public_id,
			nube_plan_slug: plan.slug,
			nube_env: provider.environment ?? "production",
		};

		// Reuse the existing provider product when available (Stripe), otherwise create one.
		// For Dodo this value is typically null because each Dodo price is its own product.
		const existingProductId = activePrices
			.map((p) => existingRefsByPriceId.get(p.id)?.external_product_id)
			.find((v): v is string => typeof v === "string" && v.length > 0);

		const productId = existingProductId
			?? (
				await adapter.createProduct({
					name: productName,
					description: productDescription,
					metadata: productMetadata,
				})
			).productId;

		if (!existingProductId) {
			log.info(
				{ planId, provider: provider.provider, productId },
				"Product created in provider",
			);
		} else {
			log.info(
				{ planId, provider: provider.provider, productId },
				"Reusing existing provider product",
			);
		}

		const syncedPrices: Array<{ interval: string; priceId: string }> = [];

		// Create provider prices only for missing refs.
		for (const priceRecord of pricesToCreate) {
			try {
			const billingInterval: "month" | "year" | "one_time" =
				priceRecord.billing_type === "one_time"
					? "one_time"
					: (priceRecord.interval as "month" | "year");

			const intervalLabel =
				billingInterval === "one_time"
					? "One-time"
					: billingInterval === "month"
						? "Monthly"
						: "Yearly";
				const amountFormatted = `${priceRecord.currency.toUpperCase()} ${(priceRecord.amount_cents / 100).toFixed(2)}`;
				const priceLabel = `${app.name} — ${plan.name} — ${intervalLabel} (${amountFormatted})`;

				const providerPrice = await adapter.createPrice({
					productId,
					amountCents: priceRecord.amount_cents,
					currency: priceRecord.currency,
					interval: billingInterval,
					label: priceLabel,
					metadata: {
						nube_app_id: app.public_id,
						nube_plan_id: plan.public_id,
						nube_price_id: priceRecord.public_id,
						nube_env: provider.environment ?? "production",
					},
				});

				// Store external ref in price_provider_refs (supports multiple providers per price)
				await priceProviderRefQueries.upsert(db, {
					public_id: createId("priceProviderRef"),
					price_id: priceRecord.id,
					provider_config_id: provider.id,
					provider: provider.provider,
					external_price_id: providerPrice.priceId,
					external_product_id: productId !== "__dodo_no_product__" ? productId : null,
				});

				// Also keep the legacy external_price_id column in sync for backwards compatibility
				// (queries that still use prices.external_price_id will work for single-provider setups)
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
					productId,
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
			const queue = queueClient.getQueue("sync-plan");
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
