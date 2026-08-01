/**
 * Billing Routes Index
 *
 * Combines all billing-related routes including promo validation.
 */

import {
	appQueries,
	getDb,
	licenseQueries,
	planQueries,
	priceQueries,
	promotionCodeQueries,
	promotionPlanQueries,
	promotionQueries,
	promotionRedemptionQueries,
	userQueries,
} from "@nube-auth/db";
import { createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import { Hono } from "hono";
import { z } from "zod";
import { checkoutRoutes } from "./checkout.js";
import { webhookRoutes } from "./webhooks.js";
import { refundRoutes } from "./refunds-clean.js";

const log = createLogger("billing-routes");

export const billingRoutes = new Hono();

// ---------------------------------------------------------------------------
// POST /validate-promo — 9-step promo validation (PRD §7.5)
// ---------------------------------------------------------------------------

const validatePromoSchema = z.object({
	code: z.string().min(1).max(50),
	priceId: z.string(),
	appId: z.string(),
});

billingRoutes.post("/validate-promo", async (c) => {
	const body = await c.req.json();
	const parsed = validatePromoSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ valid: false, reason: "invalid_input" }, 400);
	}
	const { code, priceId, appId } = parsed.data;

	// Validate appId format
	if (!idPatterns.app.test(appId)) {
		return c.json({ valid: false, reason: "invalid_app" }, 400);
	}
	if (!idPatterns.price.test(priceId)) {
		return c.json({ valid: false, reason: "invalid_price" }, 400);
	}

	const db = getDb();

	// Resolve app
	const app = await appQueries.findByPublicId(db, appId);
	if (!app) {
		return c.json({ valid: false, reason: "app_not_found" }, 404);
	}

	// Step 1: Look up promotion_code → promotion
	const promoCode = await promotionCodeQueries.findByCode(db, code.toUpperCase());
	if (!promoCode || promoCode.app_id !== app.id) {
		return c.json({ valid: false, reason: "code_not_found" });
	}

	const promo = await promotionQueries.findByInternalId_(db, promoCode.promotion_id);
	if (!promo) {
		return c.json({ valid: false, reason: "promotion_not_found" });
	}

	// Step 2: Check promotion.is_active + within starts_at/ends_at window
	if (!promo.is_active) {
		return c.json({ valid: false, reason: "promotion_inactive" });
	}
	const now = new Date();
	if (now < promo.starts_at) {
		return c.json({ valid: false, reason: "promotion_not_started" });
	}
	if (promo.ends_at && now > promo.ends_at) {
		return c.json({ valid: false, reason: "promotion_expired" });
	}

	// Step 3: Check code.is_active + code.current_uses < code.max_uses
	if (!promoCode.is_active) {
		return c.json({ valid: false, reason: "code_inactive" });
	}
	if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
		return c.json({ valid: false, reason: "code_exhausted" });
	}

	// Step 4: Check promotion.max_redemptions (global cap)
	if (promo.max_redemptions !== null && promo.current_redemptions >= promo.max_redemptions) {
		return c.json({ valid: false, reason: "promotion_max_redemptions_reached" });
	}

	// Step 5: Look up Price → Plan
	const price = await priceQueries.findByPublicId(db, priceId);
	if (!price || price.app_id !== app.id) {
		return c.json({ valid: false, reason: "price_not_found" });
	}
	const plan = await planQueries.findByInternalId_(db, price.plan_id);
	if (!plan) {
		return c.json({ valid: false, reason: "plan_not_found" });
	}

	// Step 6: Check promotion_plans targeting
	const planTargets = await promotionPlanQueries.findByPromotionId(db, promo.id);
	if (planTargets.length > 0) {
		const targetPlanIds = planTargets.map((pt) => pt.plan_id);
		if (!targetPlanIds.includes(plan.id)) {
			return c.json({ valid: false, reason: "plan_not_eligible" });
		}
	}

	// Step 7: Check allowed_intervals includes price.interval
	if (promo.allowed_intervals !== null) {
		const intervals = promo.allowed_intervals as string[];
		if (price.interval && !intervals.includes(price.interval)) {
			return c.json({ valid: false, reason: "interval_not_eligible" });
		}
	}

	// Step 8: Check is_new_customers_only → user has no existing license for this app
	if (promo.is_new_customers_only) {
		const userPublicId = c.req.header("X-Nube-User-Id");
		if (!userPublicId) {
			return c.json({ valid: false, reason: "user_required" });
		}
		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) {
			return c.json({ valid: false, reason: "user_not_found" });
		}
		const existingLicense = await licenseQueries.findByUserAndApp(db, user.id, app.id);
		if (existingLicense) {
			return c.json({ valid: false, reason: "existing_customer" });
		}
	}

	// Step 9: Check user hasn't already redeemed this promotion
	const userPublicId = c.req.header("X-Nube-User-Id");
	if (userPublicId) {
		const user = await userQueries.findByPublicId(db, userPublicId);
		if (user) {
			const allCodes = await promotionCodeQueries.findByPromotionId(db, promo.id);
			const codeIds = allCodes.map((c) => c.id);
			const redemptions = await promotionRedemptionQueries.findByUserForPromotion(
				db,
				app.id,
				"user",
				user.id,
				codeIds,
			);
			if (redemptions.length > 0) {
				return c.json({ valid: false, reason: "already_redeemed" });
			}
		}
	}

	// Calculate discount
	let discountCents: number;
	if (promo.discount_type === "percent") {
		discountCents = Math.round((price.amount_cents * promo.discount_value) / 100);
	} else {
		discountCents = promo.discount_value;
	}
	// Cap discount at price amount
	discountCents = Math.min(discountCents, price.amount_cents);
	const adjustedTotal = price.amount_cents - discountCents;

	return c.json({
		valid: true,
		discountCents,
		adjustedTotal,
		promotion: {
			name: promo.name,
			discountType: promo.discount_type,
			discountValue: promo.discount_value,
		},
	});
});

// Mount real billing sub-routes
billingRoutes.route("/checkout", checkoutRoutes);
billingRoutes.route("/webhooks", webhookRoutes);
billingRoutes.route("/refunds", refundRoutes);

export { billingRoutes as default };
