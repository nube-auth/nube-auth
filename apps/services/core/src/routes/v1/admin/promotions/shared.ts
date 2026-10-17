import { createProviderAdapter, decryptProviderCredentials } from "@nube-auth/billing";
import {
	appQueries,
	getDb,
	paymentProviderConfigQueries,
	priceProviderRefQueries,
	priceQueries,
	promotionPlanQueries,
	promotionProviderRefQueries,
	promotionQueries,
	readSealedSecret,
} from "@nube-auth/db";
import { createId, createLogger, idPatterns, serializeError } from "@nube-auth/shared";

/**
 * Sync a promotion to all active payment providers for a project.
 * Creates provider coupon objects and stores mappings in promotion_provider_refs.
 * Safe to call multiple times — skips providers that already have an active ref.
 */
export async function syncPromotionToProviders(
	promo: {
		id: number;
		public_id: string;
		name: string;
		discount_type: string;
		discount_value: number;
		max_redemptions: number | null;
		ends_at: Date | null;
	},
	projectId: number,
): Promise<void> {
	const db = getDb();

	// Collect provider-specific product/price IDs for plan-restricted promotions.
	// Primary source: price_provider_refs (new junction table, populated after re-sync).
	// Fallback source: prices.external_price_id (legacy single-provider column, always populated).
	const planTargets = await promotionPlanQueries.findByPromotionId(db, promo.id);

	// Map: providerConfigId → ids[]  (primary — from price_provider_refs)
	const refsByProviderConfigId = new Map<number, { provider: string; ids: string[] }>();
	// Map: providerName → ids[]  (fallback — from prices.external_price_id)
	const legacyIdsByProviderName = new Map<string, string[]>();

	if (planTargets.length > 0) {
		for (const pt of planTargets) {
			const activePrices = await priceQueries.findActiveByPlanId(db, pt.plan_id);
			for (const price of activePrices) {
				// Primary: use price_provider_refs if available
				const refs = await priceProviderRefQueries.findByPriceId(db, price.id);
				if (refs.length > 0) {
					for (const ref of refs) {
						if (!refsByProviderConfigId.has(ref.provider_config_id)) {
							refsByProviderConfigId.set(ref.provider_config_id, { provider: ref.provider, ids: [] });
						}
						// Stripe: use external_product_id (prod_xxx); others: use external_price_id
						const idToUse =
							ref.provider === "stripe" && ref.external_product_id
								? ref.external_product_id
								: ref.external_price_id;
						const entry = refsByProviderConfigId.get(ref.provider_config_id)!;
						if (!entry.ids.includes(idToUse)) entry.ids.push(idToUse);
					}
				} else if ((price as any).external_provider && (price as any).external_price_id) {
					// Fallback: prices were synced before price_provider_refs table existed
					const providerName = (price as any).external_provider as string;
					const externalId = (price as any).external_price_id as string;
					if (!legacyIdsByProviderName.has(providerName)) {
						legacyIdsByProviderName.set(providerName, []);
					}
					const legacyIds = legacyIdsByProviderName.get(providerName)!;
					if (!legacyIds.includes(externalId)) legacyIds.push(externalId);
				}
			}
		}
	}

	const providers = await paymentProviderConfigQueries.findByProjectId(db, projectId);
	const activeProviders = providers.filter((p: any) => p.is_active);

	for (const provider of activeProviders) {
		try {
			// Skip if mapping already exists for this provider
			const existing = await promotionProviderRefQueries.findByPromotionAndProvider(db, promo.id, provider.id);
			if (existing) continue;

			// Decrypt credentials
			let credentials: unknown;
			try {
				credentials = decryptProviderCredentials(provider);
			} catch {
				log.error({ providerId: provider.public_id }, "Failed to decrypt credentials for coupon sync");
				continue;
			}

			if (provider.provider === "dodo" && provider.environment) {
				(credentials as any).environment = provider.environment === "production" ? "live_mode" : "test_mode";
				(credentials as any).webhookSecret = readSealedSecret(provider.webhook_secret_enc);
			}

			// Resolve product IDs: prefer price_provider_refs (primary), fall back to legacy column
			const restrictionEntry = refsByProviderConfigId.get(provider.id);
			const legacyIds = legacyIdsByProviderName.get(provider.provider);
			const restrictedToProductIds =
				restrictionEntry && restrictionEntry.ids.length > 0
					? restrictionEntry.ids
					: legacyIds && legacyIds.length > 0
						? legacyIds
						: undefined;

			const adapter = createProviderAdapter(provider.provider, credentials);

			const result = await adapter.createCoupon({
				name: promo.name,
				discountType: promo.discount_type as "percent" | "fixed",
				discountValue: promo.discount_value,
				...(promo.max_redemptions && { maxRedemptions: promo.max_redemptions }),
				...(promo.ends_at && { expiresAt: promo.ends_at }),
				...(restrictedToProductIds && { restrictedToProductIds }),
				metadata: {
					nube_promotion_id: promo.public_id,
				},
			});

			await promotionProviderRefQueries.create(db, {
				public_id: createId("promotionProviderRef"),
				promotion_id: promo.id,
				provider_config_id: provider.id,
				provider_coupon_id: result.couponId,
				provider_object_type: result.objectType,
			});

			log.info(
				{ promotionId: promo.public_id, provider: provider.provider, couponId: result.couponId },
				"Promotion synced to provider",
			);
		} catch (error) {
			// Non-fatal: log and continue to next provider
			log.error(
				{ err: serializeError(error as Error), promotionId: promo.public_id, provider: provider.provider },
				"Failed to sync promotion to provider",
			);
		}
	}
}

export const log = createLogger("admin-promotions-routes");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatPromotion(
	promo: any,
	extras?: { plans?: { planId: string; name: string }[]; codes?: any[]; providerRefs?: any[] },
) {
	return {
		promotionId: promo.public_id,
		name: promo.name,
		discountType: promo.discount_type,
		discountValue: promo.discount_value,
		startsAt: promo.starts_at,
		endsAt: promo.ends_at,
		allowedIntervals: promo.allowed_intervals,
		isNewCustomersOnly: promo.is_new_customers_only,
		maxRedemptions: promo.max_redemptions,
		currentRedemptions: promo.current_redemptions,
		isActive: promo.is_active,
		plans: extras?.plans ?? [],
		codes: extras?.codes ?? [],
		providerRefs: extras?.providerRefs ?? [],
		createdAt: promo.created_at,
		updatedAt: promo.updated_at,
	};
}

export function formatCode(code: any) {
	return {
		codeId: code.public_id,
		code: code.code,
		maxUses: code.max_uses,
		currentUses: code.current_uses,
		isActive: code.is_active,
		createdAt: code.created_at,
	};
}

export function formatProviderRef(ref: any) {
	return {
		refId: ref.public_id,
		providerConfigId: ref.provider_config_id, // enriched below when needed
		providerCouponId: ref.provider_coupon_id,
		providerObjectType: ref.provider_object_type,
		isActive: ref.is_active,
		createdAt: ref.created_at,
	};
}

// ---------------------------------------------------------------------------
// Middleware: resolve appId param
// ---------------------------------------------------------------------------

export async function resolveApp(c: any) {
	const appPublicId = c.req.param("appId");
	if (!appPublicId || !idPatterns.app.test(appPublicId)) {
		return null;
	}
	const db = getDb();
	return appQueries.findByPublicId(db, appPublicId);
}

export async function resolvePromotion(c: any, appId: number) {
	const promoPublicId = c.req.param("promoId");
	if (!promoPublicId) return null;
	const db = getDb();
	const promo = await promotionQueries.findByPublicId(db, promoPublicId);
	if (!promo || promo.app_id !== appId) return null;
	return promo;
}
