import {
	activationQueries,
	appQueries,
	getDb,
	licenseHistoryQueries,
	licenseQueries,
	planQueries,
	priceQueries,
	userQueries,
} from "@nube-auth/db";
import { createId, createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import { cache } from "@nube-auth/cache";
import { fireWebhookEvent } from "../../../utils/outbound-events.js";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";

const log = createLogger("admin-license-routes");

/**
 * App-scoped license management routes.
 * Mounted at: /v1/admin/apps/:appId/licenses
 */
export const licenseManagementRouter = new Hono();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLicense(
	license: any,
	extras?: { app?: any; user?: any; plan?: any; price?: any },
) {
	return {
		licenseId: license.public_id,
		appId: extras?.app?.public_id,
		userId: extras?.user?.public_id,
		userEmail: extras?.user?.primary_email,
		userName: extras?.user?.name,
		plan: extras?.plan
			? {
					planId: extras.plan.public_id,
					name: extras.plan.name,
					slug: extras.plan.slug,
				}
			: undefined,
		price: extras?.price
			? {
					priceId: extras.price.public_id,
					billingType: extras.price.billing_type,
					interval: extras.price.interval,
					amountCents: extras.price.amount_cents,
				}
			: undefined,
		status: license.status,
		source: license.source,
		validUntil: license.valid_until
			? new Date(license.valid_until).toISOString()
			: null,
		maxActivations: license.max_activations,
		isTest: license.is_test,
		createdAt: new Date(license.created_at).toISOString(),
		updatedAt: new Date(license.updated_at).toISOString(),
	};
}

/**
 * Bust gateway cache entries for a user+app license so the next
 * GET /v1/license/:appId and GET /v1/me/subscription return fresh data.
 */
function bustLicenseCache(userPublicId: string, appPublicId: string): void {
	cache.delete(`gateway:license:${userPublicId}:${appPublicId}`).catch(() => {});
	cache.delete(`gateway:sub:${userPublicId}:${appPublicId}`).catch(() => {});
}

// ---------------------------------------------------------------------------
// POST /grant — Admin grant license
// ---------------------------------------------------------------------------

const GrantLicenseSchema = z.object({
	userId: z.string().regex(idPatterns.user),
	planId: z.string().regex(idPatterns.plan),
	priceId: z.string().regex(idPatterns.price).optional(),
	source: z.enum(["admin_grant", "invitation"]).default("admin_grant"),
	durationDays: z.number().int().positive().optional(),
	maxActivations: z.number().int().positive().optional(),
	note: z.string().max(500).optional(),
});

licenseManagementRouter.post("/grant", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const body = await c.req.json();
		const validated = GrantLicenseSchema.parse(body);

		const adminUserId = c.req.header("X-Nube-User-Id");
		if (!adminUserId) return c.json({ error: "Unauthorized" }, 401);

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const user = await userQueries.findByPublicId(db, validated.userId);
		if (!user) return c.json({ error: "User not found" }, 404);

		const plan = await planQueries.findByPublicId(db, validated.planId);
		if (!plan || plan.app_id !== app.id)
			return c.json({ error: "Plan not found for this app" }, 404);

		let priceRow: any = null;
		if (validated.priceId) {
			priceRow = await priceQueries.findByPublicId(db, validated.priceId);
			if (!priceRow || priceRow.plan_id !== plan.id)
				return c.json({ error: "Price not found for this plan" }, 404);
		}

		let validUntil: Date | null = null;
		if (validated.durationDays) {
			validUntil = new Date(
				Date.now() + validated.durationDays * 24 * 60 * 60 * 1000,
			);
		}

		const license = await licenseQueries.upsert(db, user.id, app.id, {
			public_id: createId("license"),
			plan_id: plan.id,
			price_id: priceRow?.id ?? null,
			status: "active",
			source: validated.source,
			valid_until: validUntil,
			max_activations: validated.maxActivations ?? null,
			metadata: validated.note ? { note: validated.note } : null,
		});

		// Write history
		const adminUser = await userQueries.findByPublicId(db, adminUserId);
		await licenseHistoryQueries.create(db, {
			public_id: createId("licenseHistory"),
			license_id: license.id,
			change_type: "created",
			old_value: null,
			new_value: {
				plan_id: plan.public_id,
				status: "active",
				source: validated.source,
			},
			reason: "admin_manual",
			changed_by_user_id: adminUser?.id ?? null,
			changed_by_system: false,
			notes: validated.note ?? null,
		});

		log.info(
			{ licenseId: license.public_id, userId: validated.userId, appId },
			"License granted by admin",
		);

		try {
			await fireWebhookEvent(db, app.id, "license.created", {
				licenseId: license.public_id,
				userId: user.public_id,
				status: "active",
				plan: { planId: plan.public_id, name: plan.name, slug: plan.slug },
				validUntil: license.valid_until
					? new Date(license.valid_until).toISOString()
					: null,
				maxActivations: license.max_activations,
				source: validated.source,
				grantedAt: new Date().toISOString(),
			});
		} catch (webhookError) {
			log.error(
				{ err: serializeError(webhookError as Error), licenseId: license.public_id },
				"Failed to fire license.created webhook",
			);
		}

		bustLicenseCache(user.public_id, appId);

		return c.json(
			{
				licenseId: license.public_id,
				status: license.status,
				plan: {
					planId: plan.public_id,
					name: plan.name,
					slug: plan.slug,
				},
				source: license.source,
				validUntil: license.valid_until
					? new Date(license.valid_until).toISOString()
					: null,
				maxActivations: license.max_activations,
				createdAt: new Date(license.created_at).toISOString(),
			},
			201,
		);
	} catch (error) {
		if (error instanceof z.ZodError)
			return c.json({ error: "Invalid request", details: error.issues }, 400);
		log.error(
			{ err: serializeError(error as Error) },
			"Grant license error",
		);
		return c.json({ error: "Failed to grant license" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET / — List licenses for app
// ---------------------------------------------------------------------------

licenseManagementRouter.get("/", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const statusFilter = c.req.query("status") as string | undefined;
		const sourceFilter = c.req.query("source") as string | undefined;

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const allLicenses = await licenseQueries.findByAppId(db, app.id);

		const filtered = allLicenses.filter((l) => {
			if (statusFilter && l.status !== statusFilter) return false;
			if (sourceFilter && l.source !== sourceFilter) return false;
			return true;
		});

		const results = await Promise.all(
			filtered.map(async (license) => {
				const user = await userQueries.findByInternalId_(db, license.user_id);
				const plan = await planQueries.findByInternalId_(db, license.plan_id);
				const price = license.price_id
					? await priceQueries.findByInternalId_(db, license.price_id)
					: null;
				return formatLicense(license, { app, user, plan, price });
			}),
		);

		return c.json({ licenses: results, total: results.length });
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error) },
			"List licenses error",
		);
		return c.json({ error: "Failed to list licenses" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /summary — License statistics for app
// ---------------------------------------------------------------------------

licenseManagementRouter.get("/summary", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const allLicenses = await licenseQueries.findByAppId(db, app.id);

		const statusCounts: Record<string, number> = {};
		const sourceCounts: Record<string, number> = {};
		const planCounts: Record<string, number> = {};
		const uniqueUsers = new Set<number>();

		for (const license of allLicenses) {
			statusCounts[license.status] =
				(statusCounts[license.status] ?? 0) + 1;
			sourceCounts[license.source] =
				(sourceCounts[license.source] ?? 0) + 1;
			uniqueUsers.add(license.user_id);

			const plan = await planQueries.findByInternalId_(db, license.plan_id);
			if (plan) {
				planCounts[plan.slug] = (planCounts[plan.slug] ?? 0) + 1;
			}
		}

		return c.json({
			total: allLicenses.length,
			uniqueUsers: uniqueUsers.size,
			statusCounts,
			sourceCounts,
			planCounts,
		});
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error) },
			"License summary error",
		);
		return c.json({ error: "Failed to get license summary" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /:licenseId — Get single license detail
// ---------------------------------------------------------------------------

licenseManagementRouter.get("/:licenseId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const licenseId = c.req.param("licenseId");

		if (!idPatterns.license.test(licenseId))
			return c.json({ error: "Invalid licenseId" }, 400);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const license = await licenseQueries.findByPublicId(db, licenseId);
		if (!license || license.app_id !== app.id)
			return c.json({ error: "License not found" }, 404);

		const user = await userQueries.findByInternalId_(db, license.user_id);
		const plan = await planQueries.findByInternalId_(db, license.plan_id);
		const price = license.price_id
			? await priceQueries.findByInternalId_(db, license.price_id)
			: null;

		const activeCount = await activationQueries.countActiveByLicenseId(
			db,
			license.id,
		);

		const result = formatLicense(license, { app, user, plan, price });
		return c.json({
			...result,
			activations: { current: activeCount, max: license.max_activations },
			metadata: license.metadata,
		});
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error) },
			"Get license error",
		);
		return c.json({ error: "Failed to get license" }, 500);
	}
});

// ---------------------------------------------------------------------------
// PATCH /:licenseId — Update license (extend, change plan, suspend, etc.)
// ---------------------------------------------------------------------------

const UpdateLicenseSchema = z.object({
	status: z
		.enum(["active", "trialing", "expired", "canceled", "suspended"])
		.optional(),
	planId: z.string().regex(idPatterns.plan).optional(),
	validUntil: z.number().nullable().optional(),
	maxActivations: z.number().int().positive().nullable().optional(),
	note: z.string().max(500).optional(),
});

licenseManagementRouter.patch("/:licenseId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const licenseId = c.req.param("licenseId");
		const body = await c.req.json();
		const validated = UpdateLicenseSchema.parse(body);

		if (!idPatterns.license.test(licenseId))
			return c.json({ error: "Invalid licenseId" }, 400);

		const adminUserId = c.req.header("X-Nube-User-Id");
		if (!adminUserId) return c.json({ error: "Unauthorized" }, 401);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const license = await licenseQueries.findByPublicId(db, licenseId);
		if (!license || license.app_id !== app.id)
			return c.json({ error: "License not found" }, 404);

		const oldSnapshot: Record<string, unknown> = {
			status: license.status,
			plan_id: license.plan_id,
			valid_until: license.valid_until,
			max_activations: license.max_activations,
		};

		const updateData: Record<string, unknown> = {};
		let changeType = "status_changed";

		if (validated.status !== undefined) {
			updateData["status"] = validated.status;
		}

		if (validated.planId !== undefined) {
			const newPlan = await planQueries.findByPublicId(db, validated.planId);
			if (!newPlan || newPlan.app_id !== app.id)
				return c.json({ error: "Plan not found for this app" }, 404);
			updateData["plan_id"] = newPlan.id;
			changeType = "plan_changed";
		}

		if (validated.validUntil !== undefined) {
			updateData["valid_until"] = validated.validUntil
				? new Date(validated.validUntil)
				: null;
			if (!validated.status && !validated.planId) {
				changeType =
					validated.validUntil &&
					validated.validUntil > (license.valid_until?.getTime() ?? 0)
						? "expiry_extended"
						: "expiry_reduced";
			}
		}

		if (validated.maxActivations !== undefined) {
			updateData["max_activations"] = validated.maxActivations;
		}

		if (Object.keys(updateData).length === 0) {
			return c.json({ error: "No valid fields to update" }, 400);
		}

		const updateResults = await licenseQueries.update(
			db,
			license.id,
			updateData,
		);
		const updated = updateResults[0];
		if (!updated)
			return c.json({ error: "Failed to update license" }, 500);

		// Write history
		const adminUser = await userQueries.findByPublicId(db, adminUserId);
		await licenseHistoryQueries.create(db, {
			public_id: createId("licenseHistory"),
			license_id: license.id,
			change_type: changeType,
			old_value: oldSnapshot,
			new_value: {
				status: updated.status,
				plan_id: updated.plan_id,
				valid_until: updated.valid_until,
				max_activations: updated.max_activations,
			},
			reason: "admin_manual",
			changed_by_user_id: adminUser?.id ?? null,
			changed_by_system: false,
			notes: validated.note ?? null,
		});

		log.info({ licenseId, changeType }, "License updated by admin");

		try {
			const licenseUser = await userQueries.findByInternalId_(db, license.user_id);
			const updatedPlan = await planQueries.findByInternalId_(db, updated.plan_id);
			let webhookEvent: string | null = null;

			if (validated.planId !== undefined) {
				// Determine upgrade vs downgrade by comparing display_order
				const oldPlan = await planQueries.findByInternalId_(db, license.plan_id);
				const oldOrder = oldPlan?.display_order ?? 0;
				const newOrder = updatedPlan?.display_order ?? 0;
				webhookEvent = newOrder >= oldOrder ? "license.upgraded" : "license.downgraded";
			} else if (validated.status === "canceled") {
				webhookEvent = "license.canceled";
			} else if (validated.status === "active" && license.status !== "active") {
				webhookEvent = "license.reactivated";
			} else if (validated.status === "expired") {
				webhookEvent = "license.expired";
			}

			if (webhookEvent) {
				await fireWebhookEvent(db, app.id, webhookEvent, {
					licenseId: updated.public_id,
					userId: licenseUser?.public_id ?? null,
					status: updated.status,
					plan: updatedPlan
						? { planId: updatedPlan.public_id, name: updatedPlan.name, slug: updatedPlan.slug }
						: null,
					validUntil: updated.valid_until
						? new Date(updated.valid_until).toISOString()
						: null,
					source: "admin_manual",
					changedAt: new Date().toISOString(),
				});
			}
		} catch (webhookError) {
			log.error(
				{ err: serializeError(webhookError as Error), licenseId },
				"Failed to fire license update webhook",
			);
		}

		// Bust gateway cache so next GET /v1/license/:appId returns fresh data
		const licenseOwner = await userQueries.findByInternalId_(db, license.user_id);
		if (licenseOwner) bustLicenseCache(licenseOwner.public_id, appId);

		return c.json({
			licenseId: updated.public_id,
			status: updated.status,
			validUntil: updated.valid_until
				? new Date(updated.valid_until).toISOString()
				: null,
			maxActivations: updated.max_activations,
			updatedAt: new Date(updated.updated_at).toISOString(),
		});
	} catch (error) {
		if (error instanceof z.ZodError)
			return c.json({ error: "Invalid request", details: error.issues }, 400);
		log.error(
			{ err: serializeError(error as Error) },
			"Update license error",
		);
		return c.json({ error: "Failed to update license" }, 500);
	}
});

// ---------------------------------------------------------------------------
// DELETE /:licenseId — Revoke license (transitions to free plan if available)
// ---------------------------------------------------------------------------

licenseManagementRouter.delete("/:licenseId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const licenseId = c.req.param("licenseId");

		if (!idPatterns.license.test(licenseId))
			return c.json({ error: "Invalid licenseId" }, 400);

		const adminUserId = c.req.header("X-Nube-User-Id");
		if (!adminUserId) return c.json({ error: "Unauthorized" }, 401);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const license = await licenseQueries.findByPublicId(db, licenseId);
		if (!license || license.app_id !== app.id)
			return c.json({ error: "License not found" }, 404);

		// Try to transition to free plan; fall back to soft delete
		const freePlan = await planQueries.findByAppAndSlug(db, app.id, "free");
		if (freePlan) {
			await licenseQueries.transitionToFreePlan(db, license.id, freePlan.id);
		} else {
			await licenseQueries.delete(db, license.id);
		}

		// Write history
		const adminUser = await userQueries.findByPublicId(db, adminUserId);
		await licenseHistoryQueries.create(db, {
			public_id: createId("licenseHistory"),
			license_id: license.id,
			change_type: freePlan ? "plan_changed" : "deleted",
			old_value: { plan_id: license.plan_id, status: license.status },
			new_value: freePlan
				? { plan_id: freePlan.id, status: "active", source: "auto_free" }
				: { status: "deleted" },
			reason: "admin_manual",
			changed_by_user_id: adminUser?.id ?? null,
			changed_by_system: false,
			notes: null,
		});

		log.info({ licenseId, appId }, "License revoked by admin");

		try {
			const licenseUser = await userQueries.findByInternalId_(db, license.user_id);
			await fireWebhookEvent(db, app.id, "license.canceled", {
				licenseId: license.public_id,
				userId: licenseUser?.public_id ?? null,
				status: freePlan ? "active" : "canceled",
				plan: freePlan
					? { planId: freePlan.public_id, name: freePlan.name, slug: freePlan.slug }
					: null,
				source: "admin_manual",
				revokedAt: new Date().toISOString(),
			});
		} catch (webhookError) {
			log.error(
				{ err: serializeError(webhookError as Error), licenseId },
				"Failed to fire license.canceled webhook",
			);
		}

		// Bust gateway cache so next GET /v1/license/:appId returns fresh data
		const revokedUser = await userQueries.findByInternalId_(db, license.user_id);
		if (revokedUser) bustLicenseCache(revokedUser.public_id, appId);

		return c.json({
			message: freePlan
				? "License revoked — transitioned to free plan"
				: "License revoked",
			licenseId,
			status: freePlan ? "active" : "deleted",
			plan: freePlan
				? { planId: freePlan.public_id, slug: "free" }
				: null,
		});
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error) },
			"Revoke license error",
		);
		return c.json({ error: "Failed to revoke license" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /:licenseId/history — License change history (audit trail)
// ---------------------------------------------------------------------------

licenseManagementRouter.get("/:licenseId/history", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const licenseId = c.req.param("licenseId");

		if (!idPatterns.license.test(licenseId))
			return c.json({ error: "Invalid licenseId" }, 400);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const license = await licenseQueries.findByPublicId(db, licenseId);
		if (!license || license.app_id !== app.id)
			return c.json({ error: "License not found" }, 404);

		const history = await licenseHistoryQueries.findByLicenseId(
			db,
			license.id,
		);

		const entries = history.map((h) => ({
			historyId: h.public_id,
			changeType: h.change_type,
			oldValue: h.old_value,
			newValue: h.new_value,
			reason: h.reason,
			changedBySystem: h.changed_by_system,
			notes: h.notes,
			createdAt: new Date(h.created_at).toISOString(),
		}));

		return c.json({ history: entries, total: entries.length });
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error) },
			"Get license history error",
		);
		return c.json({ error: "Failed to get license history" }, 500);
	}
});
