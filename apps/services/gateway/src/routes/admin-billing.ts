/**
 * Admin Billing Routes
 * Phase 2 Implementation Pending
 */

import { Hono } from "hono";
import { createLogger } from "@proofa/shared";

const log = createLogger("admin-billing-routes");

export const adminBillingRoutes = new Hono();

// All billing routes return 501 Not Implemented
adminBillingRoutes.all("/*", (c) => {
	log.debug("Admin billing route (Phase 2 implementation pending)");
	return c.json({
		error: "Admin billing functionality pending Phase 2 implementation",
	}, 501);
});
