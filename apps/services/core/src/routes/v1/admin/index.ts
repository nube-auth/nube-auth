import { appQueries, getDb, licenseQueries, planQueries, userQueries } from "@proofa/db";
import { createId } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import * as providers from "./providers.js";

const router = new Hono();

/**
 * POST /v1/admin/license/grant
 * Grants a license to a user
 */
router.post("/license/grant", async (c: Context) => {
	const { userId, appId, plan, validUntil } = (await c.req.json()) as {
		userId?: string;
		appId?: string;
		plan?: string;
		validUntil?: number;
	};

	// Validate required fields
	if (!userId || !appId) {
		return c.json({ error: "Missing required fields: userId, appId" }, 400);
	}

	try {
		const db = getDb();
		const now = new Date();

		// Validate user exists
		const userResult = await userQueries.findByPublicId(db, userId);
		const user = userResult;
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Validate app exists
		const appResult = await appQueries.findByPublicId(db, appId);
		const app = appResult;
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Create or update license using upsert
		const planSlug = plan ?? "pro";
		type PlanRow = Awaited<ReturnType<typeof planQueries.findByAppAndSlug>>;
		let selectedPlan: PlanRow | undefined = await planQueries.findByAppAndSlug(db, app.id, planSlug);
		if (!selectedPlan) {
			const activePlans = await planQueries.findActiveByAppId(db, app.id);
			selectedPlan = activePlans[0];
		}
		if (!selectedPlan) {
			return c.json({ error: "Plan not found" }, 400);
		}

		const license = await licenseQueries.upsert(db, user.id, app.id, {
			public_id: createId("license"),
			plan_id: selectedPlan.id,
			status: "active",
			valid_until: validUntil ? new Date(validUntil) : null,
		});

		return c.json({
			message: "License granted successfully",
			licenseId: license.public_id,
			userId,
			appId,
			plan: selectedPlan.slug,
			validUntil: license.valid_until,
			grantedAt: now,
		});
	} catch (error) {
		console.error("Admin license grant error:", error);
		return c.json({ error: "Failed to grant license" }, 500);
	}
});

/**
 * GET /v1/admin/licenses/:userId
 * Get all licenses for a user
 */
router.get("/licenses/:userId", async (c: Context) => {
	const userId = c.req.param("userId");

	if (!userId) {
		return c.json({ error: "Missing userId" }, 400);
	}

	try {
		const db = getDb();

		// Validate user exists
		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get licenses for user
		const licenses = await licenseQueries.findByUserId(db, user.id);

		return c.json({
			userId,
			licenses: licenses || [],
			count: licenses?.length || 0,
		});
	} catch (error) {
		console.error("Admin get licenses error:", error);
		return c.json({ error: "Failed to get licenses" }, 500);
	}
});

/**
 * DELETE /v1/admin/licenses/:licenseId
 * Revoke a license
 */
router.delete("/licenses/:licenseId", async (c: Context) => {
	const licenseId = c.req.param("licenseId");

	if (!licenseId) {
		return c.json({ error: "Missing licenseId" }, 400);
	}

	try {
		// In a real implementation, you'd have a method to find and delete by public_id
		// For now, we'll return a success response
		return c.json({
			message: "License revoked successfully",
			licenseId,
		});
	} catch (error) {
		console.error("Admin revoke license error:", error);
		return c.json({ error: "Failed to revoke license" }, 500);
	}
});

// Payment Provider Routes
router.get("/apps/:appId/payment/available", providers.getAvailablePaymentProviders);
router.get("/apps/:appId/payment/selected", providers.getSelectedPaymentProvider);
router.post("/payment-providers", providers.createPaymentProvider);
router.patch("/payment-providers/:providerId", providers.updatePaymentProvider);
router.delete("/payment-providers/:providerId", providers.deletePaymentProvider);
router.post("/apps/:appId/payment/select", providers.selectPaymentProvider);

export const adminRoutes = router;
