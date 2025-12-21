import { appQueries, getDb, licenseQueries, userQueries } from "@proofa/db";
import { createId } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";

const router = new Hono();

/**
 * GET /v1/license
 * Get license information for an app
 */
router.get("/", async (c: Context) => {
	const appId = c.req.query("appId");

	if (!appId) {
		return c.json({ error: "Missing appId" }, 400);
	}

	try {
		const db = getDb();
		const now = Math.floor(Date.now() / 1000);

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// In a real implementation, you'd query the license from the database
		// For now, return a placeholder
		return c.json({
			appId,
			status: "active",
			validUntil: now + 365 * 24 * 60 * 60, // 1 year from now
			plan: "pro",
		});
	} catch (error) {
		console.error("License get error:", error);
		return c.json({ error: "Failed to get license" }, 500);
	}
});

/**
 * POST /v1/license/grant
 * Admin endpoint to grant a license to a user
 */
router.post("/grant", async (c: Context) => {
	const { userId, appId, plan, validUntil } = (await c.req.json()) as {
		userId?: string;
		appId?: string;
		plan?: string;
		validUntil?: number;
	};

	if (!userId || !appId) {
		return c.json({ error: "Missing required fields: userId, appId" }, 400);
	}

	try {
		const db = getDb();
		const now = Math.floor(Date.now() / 1000);

		// Validate user exists
		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Validate app exists
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Create or update license using upsert
		const license = await licenseQueries.upsert(db, user.id, app.id, {
			public_id: createId("license"),
			plan: plan || "pro",
			status: "active",
			source: "manual",
			valid_from: now,
			valid_until: validUntil || null,
		});

		return c.json({
			message: "License granted",
			license: {
				id: license.public_id,
				plan: license.plan,
				status: license.status,
				validUntil: license.valid_until,
			},
		});
	} catch (error) {
		console.error("License grant error:", error);
		return c.json({ error: "Failed to grant license" }, 500);
	}
});

export const licenseRoutes = router;
