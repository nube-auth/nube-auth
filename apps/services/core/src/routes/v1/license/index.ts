import { appQueries, apps, getDb, gte, licenses, licenseQueries, planQueries, userQueries } from "@proofa/db";
import { createId, createLogger, serializeError } from "@proofa/shared";
import { and, eq, or, isNull } from "@proofa/db";
import type { Context } from "hono";
import { Hono } from "hono";

const log = createLogger("license-routes");
const router = new Hono();

/**
 * GET /v1/license/:appId
 * Check if the authenticated user has an active license for the specified app
 */
router.get("/:appId", async (c: Context) => {
	const appId = c.req.param("appId");
	const userPublicId = c.req.header("X-User-Id") ?? c.req.header("x-user-id");

	if (!userPublicId) {
		return c.json({ error: "Unauthorized - missing user ID" }, 401);
	}

	if (!appId) {
		return c.json({ error: "Missing appId" }, 400);
	}

	try {
		const db = getDb();

		// Get user
		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) {
			log.warn({ userPublicId }, "User not found");
			return c.json({ error: "User not found" }, 404);
		}

		// Get app
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			log.warn({ appId }, "App not found");
			return c.json({ error: "App not found" }, 404);
		}

		// Check for active license (valid_until is null OR in the future)
		const license = (await db.query.licenses.findFirst({
			where: and(
				eq(licenses.user_id, user.id),
				eq(licenses.app_id, app.id),
				eq(licenses.status, "active"),
				or(
					isNull(licenses.valid_until),
					gte(licenses.valid_until, new Date())
				)
			),
			with: {
				plan: {
					columns: {
						id: true,
						public_id: true,
						name: true,
						slug: true,
						description: true,
						features: true,
					},
				},
			},
		})) as any;

		if (!license) {
			log.info(
				{ userId: user.public_id, appId },
				"No active license found"
			);
			return c.json({
				hasLicense: false,
				appId,
				message: "No active license found for this app",
			});
		}

		log.info(
			{
				userId: user.public_id,
				appId,
				licenseId: license.public_id,
				planId: license.plan.public_id,
			},
			"Active license found"
		);

		return c.json({
			hasLicense: true,
			license: {
				id: license.public_id,
				status: license.status,
				validUntil: license.valid_until,
				plan: {
					id: license.plan.public_id,
					name: license.plan.name,
					slug: license.plan.slug,
					description: license.plan.description,
					features: license.plan.features,
				},
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "License check error");
		return c.json({ error: "Failed to check license" }, 500);
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
			message: "License granted",
			license: {
				id: license.public_id,
				plan: selectedPlan.slug,
				status: license.status,
				validUntil: license.valid_until,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "License grant error");
		return c.json({ error: "Failed to grant license" }, 500);
	}
});

export const licenseRoutes = router;
