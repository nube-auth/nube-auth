/**
 * Admin Plan Management Routes (v2 — Capability Only)
 *
 * Plans define what users get. No pricing information.
 * Pricing lives on the prices table, exposed via nested /:planId/prices routes.
 */

import { Hono } from "hono";
import { z } from "zod";
import { getDb, appQueries, planQueries, priceQueries, userQueries, auditLogQueries } from "@nube-auth/db";
import { plans } from "@nube-auth/db/schema";
import { eq } from "@nube-auth/db";
import type { Context } from "hono";
import { createLogger, serializeError, id } from "@nube-auth/shared";
import { pricesRouter } from "./prices.js";
import { enqueuePlanSync } from "../../../billing/queue.js";
import { generatePlanSlug } from "../../../utils/slug.js";

const log = createLogger("admin-plans");
const plansRouter = new Hono();

function getUserIdHeader(c: Context): string | null {
	const header = c.req.header("X-Nube-User-Id");
	return header || null;
}

// Validation schemas

const CreatePlanSchema = z.object({
	name: z.string().min(1).max(255),
	// slug is optional — if omitted, server auto-generates as "{appSlug}-{planName}"
	// with a random postfix to resolve collisions
	slug: z.string().min(1).max(100).regex(/^[a-z0-9-_]+$/).optional(),
	description: z.string().optional(),
	features: z.array(z.string()).optional().default([]),
	displayOrder: z.number().int().nonnegative().optional().default(0),
	isActive: z.boolean().optional().default(true),
});

const UpdatePlanSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	description: z.string().optional().nullable(),
	features: z.array(z.string()).optional(),
	displayOrder: z.number().int().nonnegative().optional(),
	status: z.enum(["active", "archived"]).optional(),
	isActive: z.boolean().optional(),
});

// Helpers

function formatPlan(plan: {
	public_id: string;
	name: string;
	slug: string;
	description: string | null;
	features: unknown;
	status: string;
	display_order: number;
	is_active: boolean;
	created_at: Date;
	updated_at: Date;
}, appPublicId: string) {
	return {
		planId: plan.public_id,
		appId: appPublicId,
		name: plan.name,
		slug: plan.slug,
		description: plan.description,
		features: plan.features,
		status: plan.status,
		displayOrder: plan.display_order,
		isActive: plan.is_active,
		createdAt: plan.created_at.toISOString(),
		updatedAt: plan.updated_at.toISOString(),
	};
}

// POST / — Create a new plan

plansRouter.post("/", async (c: Context) => {
	try {
		const userPublicId = getUserIdHeader(c);
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const appId = c.req.param("appId");
		const body = await c.req.json();
		const validated = CreatePlanSchema.parse(body);

		const db = getDb();

		const adminUser = await userQueries.findByPublicId(db, userPublicId);
		if (!adminUser) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		// If caller supplied a slug, validate it is not already taken
		// Otherwise, auto-generate as "{appSlug}-{planName}" with collision handling
		const planSlug = validated.slug
			? validated.slug
			: await generatePlanSlug(
					(slug) => planQueries.findByAppAndSlug(db, app.id, slug).then(Boolean),
					app.slug,
					validated.name,
				);

		if (validated.slug) {
			const existing = await planQueries.findByAppAndSlug(db, app.id, planSlug);
			if (existing) {
				return c.json({ error: "Plan with this slug already exists for this app" }, 400);
			}
		}

		const [plan] = await db
			.insert(plans)
			.values({
				public_id: id.plan(),
				app_id: app.id,
				name: validated.name,
				slug: planSlug,
				description: validated.description,
				features: validated.features,
				display_order: validated.displayOrder,
				is_active: validated.isActive,
			})
			.returning();

		if (!plan) return c.json({ error: "Failed to create plan" }, 500);

		log.info({ planId: plan.public_id, appId: app.public_id }, "Plan created");

		await auditLogQueries.create(db, {
			public_id: id.auditLog(),
			user_id: adminUser.id,
			project_id: app.project_id,
			app_id: app.id,
			action: "plan.created",
			entity_type: "plan",
			entity_id: plan.public_id,
			changes: { name: plan.name, slug: plan.slug },
			ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
		});

		// Trigger async sync to payment providers
		enqueuePlanSync({ planId: plan.public_id }).catch((error) => {
			log.error({ err: serializeError(error as Error), planId: plan.public_id }, "Failed to enqueue plan sync");
		});

		return c.json({ plan: formatPlan(plan, app.public_id) }, 201);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Validation error", details: error.issues }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Create plan error");
		return c.json({ error: "Failed to create plan" }, 500);
	}
});

// GET / — List plans for app

plansRouter.get("/", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const includeInactive = c.req.query("includeInactive") === "true";
		const includePrices = c.req.query("includePrices") === "true";

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const plansList = includeInactive
			? await planQueries.findByAppId(db, app.id)
			: await planQueries.findActiveByAppId(db, app.id);

		let result: unknown[];
		if (includePrices) {
			result = await Promise.all(
				plansList.map(async (plan) => ({
					...formatPlan(plan, app.public_id),
					prices: (await priceQueries.findActiveByPlanId(db, plan.id)).map((p) => ({
						priceId: p.public_id,
						billingType: p.billing_type,
						interval: p.interval,
						amountCents: p.amount_cents,
						currency: p.currency,
						durationDays: p.duration_days,
						trialEnabled: p.trial_enabled,
						trialDays: p.trial_days,
						isActive: p.is_active,
					})),
				})),
			);
		} else {
			result = plansList.map((plan) => formatPlan(plan, app.public_id));
		}

		return c.json({ plans: result, total: plansList.length });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "List plans error");
		return c.json({ error: "Failed to list plans" }, 500);
	}
});

// GET /:planId — Single plan

plansRouter.get("/:planId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const planId = c.req.param("planId");

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) return c.json({ error: "Plan not found" }, 404);

		const planPrices = await priceQueries.findActiveByPlanId(db, plan.id);

		return c.json({
			plan: {
				...formatPlan(plan, app.public_id),
				prices: planPrices.map((p) => ({
					priceId: p.public_id,
					billingType: p.billing_type,
					interval: p.interval,
					amountCents: p.amount_cents,
					currency: p.currency,
					durationDays: p.duration_days,
					trialEnabled: p.trial_enabled,
					trialDays: p.trial_days,
					isActive: p.is_active,
				})),
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get plan error");
		return c.json({ error: "Failed to get plan" }, 500);
	}
});

// PATCH /:planId — Update plan (no versioning)

plansRouter.patch("/:planId", async (c: Context) => {
	try {
		const userPublicId = getUserIdHeader(c);
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const appId = c.req.param("appId");
		const planId = c.req.param("planId");
		const body = await c.req.json();
		const validated = UpdatePlanSchema.parse(body);

		const db = getDb();

		const adminUser = await userQueries.findByPublicId(db, userPublicId);
		if (!adminUser) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const existing = await planQueries.findByPublicId(db, planId);
		if (!existing || existing.app_id !== app.id) return c.json({ error: "Plan not found" }, 404);

		const [updatedPlan] = await db
			.update(plans)
			.set({
				name: validated.name,
				description: validated.description,
				features: validated.features,
				display_order: validated.displayOrder,
				status: validated.status,
				is_active: validated.isActive,
				updated_at: new Date(),
			})
			.where(eq(plans.id, existing.id))
			.returning();

		if (!updatedPlan) return c.json({ error: "Failed to update plan" }, 500);

		log.info({ planId: updatedPlan.public_id }, "Plan updated");

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

		return c.json({ plan: formatPlan(updatedPlan, app.public_id) });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Validation error", details: error.issues }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Update plan error");
		return c.json({ error: "Failed to update plan" }, 500);
	}
});

// DELETE /:planId — Soft delete

plansRouter.delete("/:planId", async (c: Context) => {
	try {
		const userPublicId = getUserIdHeader(c);
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const appId = c.req.param("appId");
		const planId = c.req.param("planId");

		const db = getDb();

		const adminUser = await userQueries.findByPublicId(db, userPublicId);
		if (!adminUser) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) return c.json({ error: "Plan not found" }, 404);

		await db
			.update(plans)
			.set({ is_active: false, deleted_at: new Date(), updated_at: new Date() })
			.where(eq(plans.id, plan.id));

		log.info({ planId: plan.public_id }, "Plan soft deleted");

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

		return c.json({ message: "Plan deleted successfully", planId: plan.public_id });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete plan error");
		return c.json({ error: "Failed to delete plan" }, 500);
	}
});

// Nested prices routes
plansRouter.route("/:planId/prices", pricesRouter);

export { plansRouter };
