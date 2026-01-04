/**
 * Payment Routes
 * Phase 2 Implementation Pending
 */

import { Hono } from "hono";
import { createLogger } from "@proofa/shared";

const log = createLogger("payment-routes");

export const paymentsRoutes = new Hono();

// All payment routes return 501 Not Implemented
paymentsRoutes.all("/*", (c) => {
	log.debug("Payment route (Phase 2 implementation pending)");
	return c.json({
		error: "Payment functionality pending Phase 2 implementation",
	}, 501);
});
