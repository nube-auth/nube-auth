/**
 * Billing Routes Index
 *
 * Combines all billing-related routes
 * 
 * NOTE: Phase 2 implementation pending
 * - Stripe/Paddle/LemonSqueezy adapter integration
 * - Checkout session creation and management
 * - Webhook event processing
 * - Refund handling
 */

import { createLogger } from "@proofa/shared";
import { Hono } from "hono";

const log = createLogger("billing-routes");

export const billingRoutes = new Hono();

// Stub endpoints for Phase 2 implementation
billingRoutes.post("/checkout", (c) => {
	return c.json({
		success: false,
		error: "Billing module pending Phase 2 implementation",
	}, 501);
});

billingRoutes.post("/webhooks/:provider", (c) => {
	log.debug(
		{ provider: c.req.param("provider") },
		"Webhook placeholder - Phase 2 implementation pending"
	);
	return c.json({ success: true }, 200);
});

billingRoutes.post("/refunds", (c) => {
	return c.json({
		success: false,
		error: "Refunds pending Phase 2 implementation",
	}, 501);
});

export { billingRoutes as default };
