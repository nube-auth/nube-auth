/**
 * Admin Routes
 * Phase 2 Implementation Pending
 */

import { Hono } from "hono";
import { createLogger } from "@proofa/shared";

const log = createLogger("admin-routes");

export const adminRoutes = new Hono();

// All admin routes return 501 Not Implemented
adminRoutes.all("/*", (c) => {
	log.debug("Admin route (Phase 2 implementation pending)");
	return c.json({
		error: "Admin functionality pending Phase 2 implementation",
	}, 501);
});
