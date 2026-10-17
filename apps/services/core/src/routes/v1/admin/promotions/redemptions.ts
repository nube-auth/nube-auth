import { getDb, promotionCodeQueries, promotionRedemptionQueries } from "@nube-auth/db";
import { Hono } from "hono";

import { resolveApp, resolvePromotion } from "./shared.js";

const redemptionRoutes = new Hono();

// ===========================================================================
// REDEMPTION HISTORY
// ===========================================================================

/**
 * GET /:promoId/redemptions — List redemptions for promotion
 */
redemptionRoutes.get("/:promoId/redemptions", async (c) => {
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

export { redemptionRoutes };
