import { getDb, paymentProviderConfigQueries, promotionProviderRefQueries } from "@nube-auth/db";
import { createId, idPatterns } from "@nube-auth/shared";
import { Hono } from "hono";
import { z } from "zod";

import { formatProviderRef, resolveApp, resolvePromotion } from "./shared.js";

const providerRefRoutes = new Hono();

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

providerRefRoutes.post("/:promoId/provider-refs", async (c) => {
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
providerRefRoutes.get("/:promoId/provider-refs", async (c) => {
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
providerRefRoutes.delete("/:promoId/provider-refs/:refId", async (c) => {
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

export { providerRefRoutes };
