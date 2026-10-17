import {
	getDb,
	paymentProviderConfigQueries,
	planQueries,
	promotionCodeQueries,
	promotionPlanQueries,
	promotionProviderRefQueries,
	promotionQueries,
	readSealedSecret,
} from "@nube-auth/db";
import { createId, idPatterns, serializeError } from "@nube-auth/shared";
import { Hono } from "hono";
import { z } from "zod";
import { createProviderAdapter } from "../../../../billing/adapters/index.js";
import { decryptProviderCredentials } from "../../../../utils/encryption.js";

import {
	formatCode,
	formatPromotion,
	formatProviderRef,
	log,
	resolveApp,
	resolvePromotion,
	syncPromotionToProviders,
} from "./shared.js";

const recordRoutes = new Hono();

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

recordRoutes.post("/", async (c) => {
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
recordRoutes.get("/", async (c) => {
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
recordRoutes.get("/:promoId", async (c) => {
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

recordRoutes.patch("/:promoId", async (c) => {
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
recordRoutes.delete("/:promoId", async (c) => {
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
			if (!config?.is_active) continue;

			let credentials: unknown;
			try {
				credentials = decryptProviderCredentials(config);
			} catch {
				continue;
			}

			if (config.provider === "dodo" && config.environment) {
				(credentials as any).environment = config.environment === "production" ? "live_mode" : "test_mode";
				(credentials as any).webhookSecret = readSealedSecret(config.webhook_secret_enc);
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
recordRoutes.post("/:promoId/sync-to-providers", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	await syncPromotionToProviders(promo, app.project_id);

	const db = getDb();
	const refs = await promotionProviderRefQueries.findByPromotionId(db, promo.id);

	return c.json({ synced: true, providerRefs: refs.map(formatProviderRef) });
});

export { recordRoutes };
