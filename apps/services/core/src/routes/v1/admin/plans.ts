/**
 * Admin Plan Management Routes
 * 
 * Manages plans for apps:
 * - Create new plans
 * - List plans for an app
 * - Get single plan details
 * - Update plans (creates new version)
 * - Delete plans (soft delete)
 */

import { Hono } from "hono";
import { z } from "zod";
import { getDb, appQueries, planQueries, userQueries, auditLogQueries } from "@proofa/db";
import { plans } from "@proofa/db/schema";
import { eq, } from "@proofa/db";
import type { Context } from "hono";
import { createLogger, serializeError, id } from "@proofa/shared";

const log = createLogger("admin-plans");
const plansRouter = new Hono();

function getUserIdHeader(c: Context): string | null {
	const header = c.req.header("X-Proofa-User-Id");
	return header || null;
}

// Validation schemas
const CreatePlanSchema = z.object({
	appId: z.string(),
	name: z.string().min(1).max(255),
	slug: z.string().min(1).max(100).regex(/^[a-z0-9-_]+$/),
	description: z.string().optional(),
	monthlyPrice: z.number().int().nonnegative().optional().nullable(),
	yearlyPrice: z.number().int().nonnegative().optional().nullable(),
	oneTimePrice: z.number().int().nonnegative().optional().nullable(),
	durationDays: z.number().int().positive().optional().nullable(),
	trialEnabled: z.boolean().optional().default(false),
	trialDays: z.number().int().positive().optional().nullable(),
	features: z.record(z.string(), z.any()).optional().default({}),
	isActive: z.boolean().optional().default(true),
});

const UpdatePlanSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	description: z.string().optional(),
	monthlyPrice: z.number().int().nonnegative().optional().nullable(),
	yearlyPrice: z.number().int().nonnegative().optional().nullable(),
	oneTimePrice: z.number().int().nonnegative().optional().nullable(),
	durationDays: z.number().int().positive().optional().nullable(),
	trialEnabled: z.boolean().optional(),
	trialDays: z.number().int().positive().optional().nullable(),
	features: z.record(z.string(), z.any()).optional(),
	isActive: z.boolean().optional(),
});

/**
 * POST /v1/admin/plans
 * Create a new plan
 */
plansRouter.post("/", async (c: Context) => {
	try {
		const userPublicId = getUserIdHeader(c);
		if (!userPublicId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const body = await c.req.json();
		const validated = CreatePlanSchema.parse(body);

		const db = getDb();

		// Validate admin user exists
		const adminUser = await userQueries.findByPublicId(db, userPublicId);
		if (!adminUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Validate app exists
		const app = await appQueries.findByPublicId(db, validated.appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Validate at least one pricing option is set
		if (!validated.monthlyPrice && !validated.yearlyPrice && !validated.oneTimePrice) {
			return c.json(
				{ error: "At least one pricing option (monthly, yearly, or one-time) must be set" },
				400
			);
		}

		// Check if slug already exists for this app
		const existingPlan = await planQueries.findByAppAndSlug(db, app.id, validated.slug);
		if (existingPlan) {
			return c.json(
				{ error: `Plan with slug '${validated.slug}' already exists for this app` },
				400
			);
		}

		// Create plan
		const [plan] = await db
			.insert(plans)
			.values({
				public_id: id.plan(),
				app_id: app.id,
				name: validated.name,
				slug: validated.slug,
				description: validated.description,
				monthly_price: validated.monthlyPrice,
				yearly_price: validated.yearlyPrice,
				one_time_price: validated.oneTimePrice,
				duration_days: validated.durationDays,
				trial_enabled: validated.trialEnabled,
				trial_days: validated.trialDays,
				features: validated.features,
				is_active: validated.isActive,
			})
			.returning();

		if (!plan) {
			return c.json({ error: "Failed to create plan" }, 500);
		}

		log.info({ planId: plan.public_id, appId: app.public_id }, "Plan created");

		// Create audit log
		await auditLogQueries.create(db, {
			public_id: id.auditLog(),
			user_id: adminUser.id,
			project_id: app.project_id,
			app_id: app.id,
			action: "plan.created",
			entity_type: "plan",
			entity_id: plan.public_id,
			changes: {
				name: plan.name,
				slug: plan.slug,
				monthlyPrice: plan.monthly_price,
				yearlyPrice: plan.yearly_price,
				oneTimePrice: plan.one_time_price,
			},
			ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
		});

		return c.json({
			plan: {
				id: plan.public_id,
				appId: app.public_id,
				name: plan.name,
				slug: plan.slug,
				description: plan.description,
				monthlyPrice: plan.monthly_price,
				yearlyPrice: plan.yearly_price,
				oneTimePrice: plan.one_time_price,
				durationDays: plan.duration_days,
				trialEnabled: plan.trial_enabled,
				trialDays: plan.trial_days,
				features: plan.features,
				isActive: plan.is_active,
				createdAt: plan.created_at.toISOString(),
				updatedAt: plan.updated_at.toISOString(),
			},
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Validation error", details: error.issues }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Create plan error");
		return c.json({ error: "Failed to create plan" }, 500);
	}
});

/**
 * GET /v1/admin/plans/:appId
 * List all plans for an app
 */
plansRouter.get("/:appId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const includeInactive = c.req.query("includeInactive") === "true";

		const db = getDb();

		// Validate app exists
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get plans
		const plansList = includeInactive
			? await planQueries.findByAppId(db, app.id)
			: await planQueries.findActiveByAppId(db, app.id);

		return c.json({
			plans: plansList.map((plan) => ({
				id: plan.public_id,
				name: plan.name,
				slug: plan.slug,
				description: plan.description,
				monthlyPrice: plan.monthly_price,
				yearlyPrice: plan.yearly_price,
				oneTimePrice: plan.one_time_price,
				durationDays: plan.duration_days,
				trialEnabled: plan.trial_enabled,
				trialDays: plan.trial_days,
				features: plan.features,
				isActive: plan.is_active,
				createdAt: plan.created_at.toISOString(),
				updatedAt: plan.updated_at.toISOString(),
			})),
			total: plansList.length,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "List plans error");
		return c.json({ error: "Failed to list plans" }, 500);
	}
});

/**
 * GET /v1/admin/plans/:appId/:planId
 * Get single plan details
 */
plansRouter.get("/:appId/:planId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const planId = c.req.param("planId");

		const db = getDb();

		// Validate app exists
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get plan
		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) {
			return c.json({ error: "Plan not found" }, 404);
		}

		return c.json({
			plan: {
				id: plan.public_id,
				appId: app.public_id,
				name: plan.name,
				slug: plan.slug,
				description: plan.description,
				monthlyPrice: plan.monthly_price,
				yearlyPrice: plan.yearly_price,
				oneTimePrice: plan.one_time_price,
				durationDays: plan.duration_days,
				trialEnabled: plan.trial_enabled,
				trialDays: plan.trial_days,
				features: plan.features,
				isActive: plan.is_active,
				createdAt: plan.created_at.toISOString(),
				updatedAt: plan.updated_at.toISOString(),
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get plan error");
		return c.json({ error: "Failed to get plan" }, 500);
	}
});

/**
 * PATCH /v1/admin/plans/:appId/:planId
 * Update plan (creates new version if pricing changes)
 */
plansRouter.patch("/:appId/:planId", async (c: Context) => {
	try {
		const userPublicId = getUserIdHeader(c);
		if (!userPublicId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const appId = c.req.param("appId");
		const planId = c.req.param("planId");
		const body = await c.req.json();
		const validated = UpdatePlanSchema.parse(body);

		const db = getDb();

		// Validate admin user exists
		const adminUser = await userQueries.findByPublicId(db, userPublicId);
		if (!adminUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Validate app exists
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get existing plan
		const existingPlan = await planQueries.findByPublicId(db, planId);
		if (!existingPlan || existingPlan.app_id !== app.id) {
			return c.json({ error: "Plan not found" }, 404);
		}

		// Check if pricing is changing
		const pricingChanged =
			(validated.monthlyPrice !== undefined &&
				validated.monthlyPrice !== existingPlan.monthly_price) ||
			(validated.yearlyPrice !== undefined &&
				validated.yearlyPrice !== existingPlan.yearly_price) ||
			(validated.oneTimePrice !== undefined &&
				validated.oneTimePrice !== existingPlan.one_time_price);

		if (pricingChanged) {
			// Create new version
			const versionMatch = existingPlan.slug.match(/^(.+?)(?:_v(\d+))?$/);
			const baseSlug = versionMatch ? versionMatch[1] : existingPlan.slug;
			const currentVersion = versionMatch?.[2] ? parseInt(versionMatch[2], 10) : 1;
			const newSlug = `${baseSlug}_v${currentVersion + 1}`;

			// Mark old plan as inactive
			await db
				.update(plans)
				.set({ is_active: false, updated_at: new Date() })
				.where(eq(plans.id, existingPlan.id));

			// Create new version
			const [newPlan] = await db
				.insert(plans)
				.values({
					public_id: id.plan(),
					app_id: app.id,
					name: validated.name ?? existingPlan.name,
					slug: newSlug,
					description: validated.description ?? existingPlan.description,
					monthly_price: validated.monthlyPrice ?? existingPlan.monthly_price,
					yearly_price: validated.yearlyPrice ?? existingPlan.yearly_price,
					one_time_price: validated.oneTimePrice ?? existingPlan.one_time_price,
					duration_days: validated.durationDays ?? existingPlan.duration_days,
					trial_enabled: validated.trialEnabled ?? existingPlan.trial_enabled,
					trial_days: validated.trialDays ?? existingPlan.trial_days,
					features: validated.features ?? existingPlan.features,
					is_active: true,
				})
				.returning();

			if (!newPlan) {
				return c.json({ error: "Failed to create new plan version" }, 500);
			}

			log.info(
				{ oldPlanId: existingPlan.public_id, newPlanId: newPlan.public_id },
				"Plan versioned due to pricing change"
			);

			// Create audit log
			await auditLogQueries.create(db, {
				public_id: id.auditLog(),
				user_id: adminUser.id,
				project_id: app.project_id,
				app_id: app.id,
				action: "plan.versioned",
				entity_type: "plan",
				entity_id: newPlan.public_id,
				changes: {
					oldVersion: existingPlan.slug,
					newVersion: newPlan.slug,
					pricingChanges: {
						monthlyPrice: {
							old: existingPlan.monthly_price,
							new: newPlan.monthly_price,
						},
						yearlyPrice: { old: existingPlan.yearly_price, new: newPlan.yearly_price },
						oneTimePrice: {
							old: existingPlan.one_time_price,
							new: newPlan.one_time_price,
						},
					},
				},
				ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
			});

			return c.json({
				message: "New plan version created due to pricing changes",
				oldPlan: {
					id: existingPlan.public_id,
					slug: existingPlan.slug,
					isActive: false,
				},
				newPlan: {
					id: newPlan.public_id,
					slug: newPlan.slug,
					name: newPlan.name,
					description: newPlan.description,
					monthlyPrice: newPlan.monthly_price,
					yearlyPrice: newPlan.yearly_price,
					oneTimePrice: newPlan.one_time_price,
					durationDays: newPlan.duration_days,
					trialEnabled: newPlan.trial_enabled,
					trialDays: newPlan.trial_days,
					features: newPlan.features,
					isActive: newPlan.is_active,
					createdAt: newPlan.created_at.toISOString(),
					updatedAt: newPlan.updated_at.toISOString(),
				},
			});
		} else {
			// Update in place (non-pricing changes)
			const [updatedPlan] = await db
				.update(plans)
				.set({
					name: validated.name,
					description: validated.description,
					trial_enabled: validated.trialEnabled,
					trial_days: validated.trialDays,
					features: validated.features,
					is_active: validated.isActive,
					updated_at: new Date(),
				})
				.where(eq(plans.id, existingPlan.id))
				.returning();

			if (!updatedPlan) {
				return c.json({ error: "Failed to update plan" }, 500);
			}

			log.info({ planId: updatedPlan.public_id }, "Plan updated in place");

			// Create audit log
			await auditLogQueries.create(db, {
				public_id: id.auditLog(),
				user_id: adminUser.id,
				project_id: app.project_id,
				app_id: app.id,
				action: "plan.updated",
				entity_type: "plan",
				entity_id: updatedPlan.public_id,
				changes: validated,
				ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
			});

			return c.json({
				plan: {
					id: updatedPlan.public_id,
					appId: app.public_id,
					name: updatedPlan.name,
					slug: updatedPlan.slug,
					description: updatedPlan.description,
					monthlyPrice: updatedPlan.monthly_price,
					yearlyPrice: updatedPlan.yearly_price,
					oneTimePrice: updatedPlan.one_time_price,
					durationDays: updatedPlan.duration_days,
					trialEnabled: updatedPlan.trial_enabled,
					trialDays: updatedPlan.trial_days,
					features: updatedPlan.features,
					isActive: updatedPlan.is_active,
					createdAt: updatedPlan.created_at.toISOString(),
					updatedAt: updatedPlan.updated_at.toISOString(),
				},
			});
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Validation error", details: error.issues }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Update plan error");
		return c.json({ error: "Failed to update plan" }, 500);
	}
});

/**
 * DELETE /v1/admin/plans/:appId/:planId
 * Soft delete a plan
 */
plansRouter.delete("/:appId/:planId", async (c: Context) => {
	try {
		const userPublicId = getUserIdHeader(c);
		if (!userPublicId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const appId = c.req.param("appId");
		const planId = c.req.param("planId");

		const db = getDb();

		// Validate admin user exists
		const adminUser = await userQueries.findByPublicId(db, userPublicId);
		if (!adminUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Validate app exists
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get plan
		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) {
			return c.json({ error: "Plan not found" }, 404);
		}

		// Soft delete (mark as inactive + set deleted_at)
		await db
			.update(plans)
			.set({
				is_active: false,
				deleted_at: new Date(),
				updated_at: new Date(),
			})
			.where(eq(plans.id, plan.id));

		log.info({ planId: plan.public_id }, "Plan soft deleted");

		// Create audit log
		await auditLogQueries.create(db, {
			public_id: id.auditLog(),
			user_id: adminUser.id,
			project_id: app.project_id,
			app_id: app.id,
			action: "plan.deleted",
			entity_type: "plan",
			entity_id: plan.public_id,
			changes: { slug: plan.slug, name: plan.name },
			ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
		});

		return c.json({
			message: "Plan deleted successfully",
			planId: plan.public_id,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete plan error");
		return c.json({ error: "Failed to delete plan" }, 500);
	}
});

export { plansRouter };
