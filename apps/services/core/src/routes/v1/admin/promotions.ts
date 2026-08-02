import {
	appQueries,
	getDb,
	paymentProviderConfigQueries,
	planQueries,
	priceProviderRefQueries,
	priceQueries,
	promotionCodeQueries,
	promotionPlanQueries,
	promotionProviderRefQueries,
	promotionQueries,
	promotionRedemptionQueries,
} from "@nube-auth/db";
import { createId, createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import { Hono } from "hono";
import { z } from "zod";
import { createProviderAdapter } from "../../../billing/adapters/index.js";
import { decryptProviderCredentials } from "../../../utils/encryption.js";

/**
 * Sync a promotion to all active payment providers for a project.
 * Creates provider coupon objects and stores mappings in promotion_provider_refs.
 * Safe to call multiple times — skips providers that already have an active ref.
 */
async function syncPromotionToProviders(
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
				(credentials as any).webhookSecret = provider.webhook_secret || (credentials as any).webhookSecret;
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

const log = createLogger("admin-promotions-routes");

/**
 * App-scoped promotion management routes.
 * Mounted at: /v1/admin/apps/:appId/promotions
 */
export const promotionsRouter = new Hono();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPromotion(
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

function formatCode(code: any) {
	return {
		codeId: code.public_id,
		code: code.code,
		maxUses: code.max_uses,
		currentUses: code.current_uses,
		isActive: code.is_active,
		createdAt: code.created_at,
	};
}

function formatProviderRef(ref: any) {
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

async function resolveApp(c: any) {
	const appPublicId = c.req.param("appId");
	if (!appPublicId || !idPatterns.app.test(appPublicId)) {
		return null;
	}
	const db = getDb();
	return appQueries.findByPublicId(db, appPublicId);
}

async function resolvePromotion(c: any, appId: number) {
	const promoPublicId = c.req.param("promoId");
	if (!promoPublicId) return null;
	const db = getDb();
	const promo = await promotionQueries.findByPublicId(db, promoPublicId);
	if (!promo || promo.app_id !== appId) return null;
	return promo;
}

// ===========================================================================
// PROMOTION CRUD
// ===========================================================================

/**
 * POST / — Create promotion
 */
const createPromoSchema = z.object({
	name: z.string().min(1).max(255),
	discountType: z.enum(["percent", "fixed"]),
	discountValue: z.number().int().positive(),
	startsAt: z.coerce.date(),
	endsAt: z.coerce.date().optional(),
	allowedIntervals: z.array(z.enum(["month", "year"])).optional(),
	isNewCustomersOnly: z.boolean().optional().default(false),
	maxRedemptions: z.number().int().positive().optional(),
	planIds: z.array(z.string()).min(1, "At least one plan must be selected"),
});

promotionsRouter.post("/", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const body = await c.req.json();
	const parsed = createPromoSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
	const data = parsed.data;

	// Validate percent discount doesn't exceed 100
	if (data.discountType === "percent" && data.discountValue > 100) {
		return c.json({ error: "Percent discount cannot exceed 100" }, 400);
	}

	// Validate endsAt is after startsAt when both are provided
	if (data.endsAt && data.startsAt && data.endsAt <= data.startsAt) {
		return c.json({ error: "endsAt must be after startsAt" }, 400);
	}

	const db = getDb();

	// Resolve plan internal IDs if planIds provided
	const planInternalIds: number[] = [];
	if (data.planIds && data.planIds.length > 0) {
		for (const planPublicId of data.planIds) {
			if (!idPatterns.plan.test(planPublicId)) {
				return c.json({ error: `Invalid plan ID: ${planPublicId}` }, 400);
			}
			const plan = await planQueries.findByPublicId(db, planPublicId);
			if (!plan || plan.app_id !== app.id) {
				return c.json({ error: `Plan not found: ${planPublicId}` }, 404);
			}
			planInternalIds.push(plan.id);
		}
	}

	const promo = await promotionQueries.create(db, {
		public_id: createId("promotion"),
		app_id: app.id,
		name: data.name,
		discount_type: data.discountType,
		discount_value: data.discountValue,
		starts_at: data.startsAt,
		ends_at: data.endsAt ?? null,
		allowed_intervals: data.allowedIntervals ?? null,
		is_new_customers_only: data.isNewCustomersOnly,
		max_redemptions: data.maxRedemptions ?? null,
	});

	// Create plan targeting rows
	if (planInternalIds.length > 0) {
		await promotionPlanQueries.replaceForPromotion(db, promo.id, planInternalIds);
	}

	// Fetch plan items for response
	const planTargets = await promotionPlanQueries.findByPromotionId(db, promo.id);
	const planItems: { planId: string; name: string }[] = [];
	for (const pt of planTargets) {
		const plan = await planQueries.findByInternalId_(db, pt.plan_id);
		if (plan) planItems.push({ planId: plan.public_id, name: plan.name });
	}

	// Auto-sync coupon to all active payment providers (non-blocking)
	syncPromotionToProviders(promo, app.project_id).catch((err) =>
		log.error(
			{ err: serializeError(err as Error), promotionId: promo.public_id },
			"Background provider sync failed",
		),
	);

	return c.json(formatPromotion(promo, { plans: planItems }), 201);
});

/**
 * GET / — List promotions for app
 */
promotionsRouter.get("/", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const db = getDb();
	const activeOnly = c.req.query("active") === "true";

	const promos = activeOnly
		? await promotionQueries.findActiveByAppId(db, app.id)
		: await promotionQueries.findByAppId(db, app.id);

	const items = [];
	for (const promo of promos) {
		const planTargets = await promotionPlanQueries.findByPromotionId(db, promo.id);
		const planItems: { planId: string; name: string }[] = [];
		for (const pt of planTargets) {
			const plan = await planQueries.findByInternalId_(db, pt.plan_id);
			if (plan) planItems.push({ planId: plan.public_id, name: plan.name });
		}
		const codes = await promotionCodeQueries.findByPromotionId(db, promo.id);
		items.push(
			formatPromotion(promo, {
				plans: planItems,
				codes: codes.map(formatCode),
			}),
		);
	}

	return c.json({ promotions: items });
});

/**
 * GET /:promoId — Get promotion detail
 */
promotionsRouter.get("/:promoId", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const db = getDb();

	// Fetch plan targets
	const planTargets = await promotionPlanQueries.findByPromotionId(db, promo.id);
	const planItems: { planId: string; name: string }[] = [];
	for (const pt of planTargets) {
		const plan = await planQueries.findByInternalId_(db, pt.plan_id);
		if (plan) planItems.push({ planId: plan.public_id, name: plan.name });
	}

	// Fetch codes
	const codes = await promotionCodeQueries.findByPromotionId(db, promo.id);

	// Fetch provider refs
	const refs = await promotionProviderRefQueries.findByPromotionId(db, promo.id);

	return c.json(
		formatPromotion(promo, {
			plans: planItems,
			codes: codes.map(formatCode),
			providerRefs: refs.map(formatProviderRef),
		}),
	);
});

/**
 * PATCH /:promoId — Update promotion
 */
const updatePromoSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	startsAt: z.coerce.date().optional(),
	endsAt: z.coerce.date().nullable().optional(),
	allowedIntervals: z
		.array(z.enum(["month", "year"]))
		.nullable()
		.optional(),
	isNewCustomersOnly: z.boolean().optional(),
	maxRedemptions: z.number().int().positive().nullable().optional(),
	isActive: z.boolean().optional(),
	planIds: z.array(z.string()).optional(),
});

promotionsRouter.patch("/:promoId", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const body = await c.req.json();
	const parsed = updatePromoSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
	const data = parsed.data;

	// Validate endsAt is after startsAt when both are provided (use existing promo value as fallback)
	const effectiveStartsAt = data.startsAt ?? promo.starts_at;
	const effectiveEndsAt = data.endsAt !== undefined ? data.endsAt : promo.ends_at;
	if (effectiveEndsAt && effectiveStartsAt && effectiveEndsAt <= effectiveStartsAt) {
		return c.json({ error: "endsAt must be after startsAt" }, 400);
	}

	const db = getDb();
	const updateData: Record<string, unknown> = {};

	if (data.name !== undefined) updateData["name"] = data.name;
	if (data.startsAt !== undefined) updateData["starts_at"] = data.startsAt;
	if (data.endsAt !== undefined) updateData["ends_at"] = data.endsAt ?? null;
	if (data.allowedIntervals !== undefined) updateData["allowed_intervals"] = data.allowedIntervals;
	if (data.isNewCustomersOnly !== undefined) updateData["is_new_customers_only"] = data.isNewCustomersOnly;
	if (data.maxRedemptions !== undefined) updateData["max_redemptions"] = data.maxRedemptions;
	if (data.isActive !== undefined) updateData["is_active"] = data.isActive;

	const updated =
		Object.keys(updateData).length > 0 ? await promotionQueries.update(db, promo.id, updateData) : promo;

	// Update plan targeting if provided
	if (data.planIds !== undefined) {
		const planInternalIds: number[] = [];
		for (const planPublicId of data.planIds) {
			if (!idPatterns.plan.test(planPublicId)) {
				return c.json({ error: `Invalid plan ID: ${planPublicId}` }, 400);
			}
			const plan = await planQueries.findByPublicId(db, planPublicId);
			if (!plan || plan.app_id !== app.id) {
				return c.json({ error: `Plan not found: ${planPublicId}` }, 404);
			}
			planInternalIds.push(plan.id);
		}
		await promotionPlanQueries.replaceForPromotion(db, promo.id, planInternalIds);
	}

	// Fetch updated plan targets
	const planTargets = await promotionPlanQueries.findByPromotionId(db, promo.id);
	const planItems: { planId: string; name: string }[] = [];
	for (const pt of planTargets) {
		const plan = await planQueries.findByInternalId_(db, pt.plan_id);
		if (plan) planItems.push({ planId: plan.public_id, name: plan.name });
	}

	return c.json(formatPromotion(updated, { plans: planItems }));
});

/**
 * DELETE /:promoId — Deactivate promotion
 */
promotionsRouter.delete("/:promoId", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const db = getDb();
	await promotionQueries.deactivate(db, promo.id);

	// Best-effort: delete provider coupons so they can't be applied at checkout
	const refs = await promotionProviderRefQueries.findByPromotionId(db, promo.id);
	for (const ref of refs) {
		try {
			const config = await paymentProviderConfigQueries.findByInternalId_(db, ref.provider_config_id);
			if (!config || !config.is_active) continue;

			let credentials: unknown;
			try {
				credentials = decryptProviderCredentials(config);
			} catch {
				continue;
			}

			if (config.provider === "dodo" && config.environment) {
				(credentials as any).environment = config.environment === "production" ? "live_mode" : "test_mode";
				(credentials as any).webhookSecret = config.webhook_secret || (credentials as any).webhookSecret;
			}

			const adapter = createProviderAdapter(config.provider, credentials);
			await adapter.deleteCoupon(ref.provider_coupon_id);
			await promotionProviderRefQueries.deactivate(db, ref.id);
		} catch (error) {
			log.error(
				{ err: serializeError(error as Error), refId: ref.public_id },
				"Failed to delete provider coupon on deactivation",
			);
		}
	}

	return c.json({ success: true });
});

// ===========================================================================
// PROVIDER SYNC (manual trigger)
// ===========================================================================

/**
 * POST /:promoId/sync-to-providers
 * Manually (re-)sync a promotion to all active payment providers.
 * Idempotent — skips providers that already have an active mapping.
 */
promotionsRouter.post("/:promoId/sync-to-providers", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	await syncPromotionToProviders(promo, app.project_id);

	const db = getDb();
	const refs = await promotionProviderRefQueries.findByPromotionId(db, promo.id);

	return c.json({ synced: true, providerRefs: refs.map(formatProviderRef) });
});

// ===========================================================================
// PROMOTION CODES
// ===========================================================================

/**
 * POST /:promoId/codes — Create code for promotion
 */
const createCodeSchema = z.object({
	code: z
		.string()
		.min(1)
		.max(50)
		.transform((v) => v.toUpperCase()),
	maxUses: z.number().int().positive().optional(),
});

promotionsRouter.post("/:promoId/codes", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const body = await c.req.json();
	const parsed = createCodeSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
	const data = parsed.data;

	const db = getDb();

	// Check for duplicate code
	const existing = await promotionCodeQueries.findByCode(db, data.code);
	if (existing) {
		return c.json({ error: "Code already exists" }, 409);
	}

	const code = await promotionCodeQueries.create(db, {
		public_id: createId("promotionCode"),
		promotion_id: promo.id,
		app_id: app.id,
		code: data.code,
		max_uses: data.maxUses ?? null,
	});

	return c.json(formatCode(code), 201);
});

/**
 * GET /:promoId/codes — List codes for promotion
 */
promotionsRouter.get("/:promoId/codes", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const db = getDb();
	const codes = await promotionCodeQueries.findByPromotionId(db, promo.id);

	return c.json({ codes: codes.map(formatCode) });
});

/**
 * PATCH /:promoId/codes/:codeId — Update code
 */
const updateCodeSchema = z.object({
	isActive: z.boolean().optional(),
	maxUses: z.number().int().positive().nullable().optional(),
});

promotionsRouter.patch("/:promoId/codes/:codeId", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const codePublicId = c.req.param("codeId");
	const db = getDb();
	const code = await promotionCodeQueries.findByPublicId(db, codePublicId);
	if (!code || code.promotion_id !== promo.id) {
		return c.json({ error: "Code not found" }, 404);
	}

	const body = await c.req.json();
	const parsed = updateCodeSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
	const data = parsed.data;

	const updateData: Record<string, unknown> = {};
	if (data.isActive !== undefined) updateData["is_active"] = data.isActive;
	if (data.maxUses !== undefined) updateData["max_uses"] = data.maxUses;

	if (Object.keys(updateData).length === 0) {
		return c.json(formatCode(code));
	}

	const updated = await promotionCodeQueries.update(db, code.id, updateData);
	return c.json(formatCode(updated));
});

/**
 * DELETE /:promoId/codes/:codeId — Deactivate code
 */
promotionsRouter.delete("/:promoId/codes/:codeId", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const codePublicId = c.req.param("codeId");
	const db = getDb();
	const code = await promotionCodeQueries.findByPublicId(db, codePublicId);
	if (!code || code.promotion_id !== promo.id) {
		return c.json({ error: "Code not found" }, 404);
	}

	await promotionCodeQueries.update(db, code.id, { is_active: false });
	return c.json({ success: true });
});

// ===========================================================================
// PROVIDER REFS
// ===========================================================================

/**
 * POST /:promoId/provider-refs — Map promotion to provider coupon
 */
const createRefSchema = z.object({
	providerConfigId: z.string(),
	providerCouponId: z.string().min(1).max(255),
	providerObjectType: z.enum(["coupon", "promotion_code", "discount"]).optional().default("coupon"),
});

promotionsRouter.post("/:promoId/provider-refs", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const body = await c.req.json();
	const parsed = createRefSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
	const data = parsed.data;

	const db = getDb();

	// Resolve provider config
	const config = await paymentProviderConfigQueries.findByPublicId(db, data.providerConfigId);
	if (!config) {
		return c.json({ error: "Provider config not found" }, 404);
	}

	// Verify the provider config belongs to the same project as the app.
	// Without this check a caller could link a promotion to another tenant's payment config.
	if (config.project_id !== app.project_id) {
		return c.json({ error: "Provider config does not belong to this app's project" }, 403);
	}

	// Check for existing active mapping
	const existing = await promotionProviderRefQueries.findByPromotionAndProvider(db, promo.id, config.id);
	if (existing) {
		return c.json({ error: "Active mapping already exists for this provider. Deactivate it first." }, 409);
	}

	const ref = await promotionProviderRefQueries.create(db, {
		public_id: createId("promotionProviderRef"),
		promotion_id: promo.id,
		provider_config_id: config.id,
		provider_coupon_id: data.providerCouponId,
		provider_object_type: data.providerObjectType,
	});

	return c.json(formatProviderRef(ref), 201);
});

/**
 * GET /:promoId/provider-refs — List provider refs for promotion
 */
promotionsRouter.get("/:promoId/provider-refs", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const db = getDb();
	const refs = await promotionProviderRefQueries.findByPromotionId(db, promo.id);

	return c.json({ providerRefs: refs.map(formatProviderRef) });
});

/**
 * DELETE /:promoId/provider-refs/:refId — Deactivate provider ref
 */
promotionsRouter.delete("/:promoId/provider-refs/:refId", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const refPublicId = c.req.param("refId");
	if (!idPatterns.promotionProviderRef.test(refPublicId)) {
		return c.json({ error: "Invalid provider ref ID" }, 400);
	}

	const db = getDb();
	const ref = await promotionProviderRefQueries.findByPublicId(db, refPublicId);
	if (!ref || ref.promotion_id !== promo.id) {
		return c.json({ error: "Provider ref not found" }, 404);
	}

	await promotionProviderRefQueries.deactivate(db, ref.id);
	return c.json({ success: true });
});

// ===========================================================================
// REDEMPTION HISTORY
// ===========================================================================

/**
 * GET /:promoId/redemptions — List redemptions for promotion
 */
promotionsRouter.get("/:promoId/redemptions", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const db = getDb();

	// Get all codes for this promotion, then fetch redemptions for each
	const codes = await promotionCodeQueries.findByPromotionId(db, promo.id);
	const allRedemptions = [];

	for (const code of codes) {
		const redemptions = await promotionRedemptionQueries.findByPromotionCodeId(db, code.id);
		for (const r of redemptions) {
			allRedemptions.push({
				redemptionId: r.public_id,
				code: code.code,
				discountCents: r.discount_cents,
				subjectType: r.subject_type,
				createdAt: r.created_at,
			});
		}
	}

	return c.json({
		redemptions: allRedemptions,
		total: allRedemptions.length,
	});
});
