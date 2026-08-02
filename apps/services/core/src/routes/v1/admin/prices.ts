/**
 * Admin Price Management Routes (v2)
 *
 * Prices are commercial terms attached to plans.
 * Pricing is immutable (amount/type can't change — create a new price instead).
 *
 * Mounted at: /v1/admin/apps/:appId/plans/:planId/prices
 */

import { appQueries, auditLogQueries, eq, getDb, planQueries, priceQueries, userQueries } from "@nube-auth/db";
import { prices } from "@nube-auth/db/schema";
import {
	BILLING_INTERVALS,
	BILLING_TYPES,
	createLogger,
	id,
	SUPPORTED_CURRENCIES,
	serializeError,
} from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { enqueuePlanSync } from "../../../billing/queue.js";

const log = createLogger("admin-prices");
const pricesRouter = new Hono();

function getUserIdHeader(c: Context): string | null {
	return c.req.header("X-Nube-User-Id") || null;
}

const billingTypeValues = Object.values(BILLING_TYPES) as [string, ...string[]];
const billingIntervalValues = Object.values(BILLING_INTERVALS) as [string, ...string[]];

// Validation schemas
const CreatePriceSchema = z
	.object({
		billingType: z.enum(billingTypeValues),
		interval: z.enum(billingIntervalValues).optional().nullable(),
		amountCents: z.number().int().nonnegative(),
		currency: z
			.string()
			.transform((v) => v.toLowerCase())
			.pipe(z.enum(SUPPORTED_CURRENCIES))
			.default("usd"),
		durationDays: z.number().int().positive().optional().nullable(),
		trialEnabled: z.boolean().optional().default(false),
		trialDays: z.number().int().positive().optional().nullable(),
		externalProvider: z.string().max(50).optional().nullable(),
		externalPriceId: z.string().max(255).optional().nullable(),
	})
	.refine(
		(data) => {
			// Recurring prices must have an interval
			if (data.billingType === "recurring" && !data.interval) {
				return false;
			}
			return true;
		},
		{ message: "Recurring prices require an interval (month or year)" },
	)
	.refine(
		(data) => {
			// Trial only makes sense for recurring prices
			if (data.trialEnabled && data.billingType !== "recurring") {
				return false;
			}
			return true;
		},
		{ message: "Trials are only available for recurring prices" },
	);

// Only non-immutable fields can be updated
const UpdatePriceSchema = z.object({
	trialEnabled: z.boolean().optional(),
	trialDays: z.number().int().positive().optional().nullable(),
	externalProvider: z.string().max(50).optional().nullable(),
	externalPriceId: z.string().max(255).optional().nullable(),
	isActive: z.boolean().optional(),
});

function formatPrice(price: typeof prices.$inferSelect, planPublicId: string) {
	return {
		priceId: price.public_id,
		planId: planPublicId,
		billingType: price.billing_type,
		interval: price.interval,
		amountCents: price.amount_cents,
		currency: price.currency,
		durationDays: price.duration_days,
		trialEnabled: price.trial_enabled,
		trialDays: price.trial_days,
		externalProvider: price.external_provider,
		externalPriceId: price.external_price_id,
		isActive: price.is_active,
		createdAt: price.created_at.toISOString(),
		updatedAt: price.updated_at.toISOString(),
	};
}

/**
 * POST /prices
 * Create a new price for the plan
 */
pricesRouter.post("/", async (c: Context) => {
	try {
		const userPublicId = getUserIdHeader(c);
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const appId = c.req.param("appId");
		const planId = c.req.param("planId");
		const body = await c.req.json();
		const validated = CreatePriceSchema.parse(body);

		const db = getDb();

		const adminUser = await userQueries.findByPublicId(db, userPublicId);
		if (!adminUser) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) return c.json({ error: "Plan not found" }, 404);

		const [price] = await db
			.insert(prices)
			.values({
				public_id: id.price(),
				plan_id: plan.id,
				app_id: app.id,
				billing_type: validated.billingType,
				interval: validated.interval ?? null,
				amount_cents: validated.amountCents,
				currency: validated.currency,
				duration_days: validated.durationDays ?? null,
				trial_enabled: validated.trialEnabled,
				trial_days: validated.trialDays ?? null,
				external_provider: validated.externalProvider ?? null,
				external_price_id: validated.externalPriceId ?? null,
			})
			.returning();

		if (!price) return c.json({ error: "Failed to create price" }, 500);

		log.info({ priceId: price.public_id, planId: plan.public_id }, "Price created");

		await auditLogQueries.create(db, {
			public_id: id.auditLog(),
			user_id: adminUser.id,
			project_id: app.project_id,
			app_id: app.id,
			action: "price.created",
			entity_type: "price",
			entity_id: price.public_id,
			changes: {
				planId: plan.public_id,
				billingType: price.billing_type,
				interval: price.interval,
				amountCents: price.amount_cents,
				currency: price.currency,
			},
			ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
		});

		// Trigger async sync of parent plan to payment providers
		enqueuePlanSync({ planId: plan.public_id }).catch((error) => {
			log.error({ err: serializeError(error as Error), planId: plan.public_id }, "Failed to enqueue plan sync");
		});

		return c.json({ price: formatPrice(price, plan.public_id) }, 201);
	} catch (error) {
		if (error instanceof z.ZodError) return c.json({ error: "Validation error", details: error.issues }, 400);
		log.error({ err: serializeError(error as Error) }, "Create price error");
		return c.json({ error: "Failed to create price" }, 500);
	}
});

/**
 * GET /prices
 * List all prices for the plan
 */
pricesRouter.get("/", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const planId = c.req.param("planId");
		const includeInactive = c.req.query("includeInactive") === "true";

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) return c.json({ error: "Plan not found" }, 404);

		const pricesList = includeInactive
			? await priceQueries.findByPlanId(db, plan.id)
			: await priceQueries.findActiveByPlanId(db, plan.id);

		return c.json({
			prices: pricesList.map((price) => formatPrice(price, plan.public_id)),
			total: pricesList.length,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "List prices error");
		return c.json({ error: "Failed to list prices" }, 500);
	}
});

/**
 * GET /prices/:priceId
 * Get single price details
 */
pricesRouter.get("/:priceId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const planId = c.req.param("planId");
		const priceId = c.req.param("priceId");

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) return c.json({ error: "Plan not found" }, 404);

		const price = await priceQueries.findByPublicId(db, priceId);
		if (!price || price.plan_id !== plan.id) return c.json({ error: "Price not found" }, 404);

		return c.json({ price: formatPrice(price, plan.public_id) });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get price error");
		return c.json({ error: "Failed to get price" }, 500);
	}
});

/**
 * PATCH /prices/:priceId
 * Update mutable price fields only (trial, external refs, active status)
 * Amount, billing type, and interval are immutable — create a new price instead.
 */
pricesRouter.patch("/:priceId", async (c: Context) => {
	try {
		const userPublicId = getUserIdHeader(c);
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const appId = c.req.param("appId");
		const planId = c.req.param("planId");
		const priceId = c.req.param("priceId");
		const body = await c.req.json();
		const validated = UpdatePriceSchema.parse(body);

		const db = getDb();

		const adminUser = await userQueries.findByPublicId(db, userPublicId);
		if (!adminUser) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) return c.json({ error: "Plan not found" }, 404);

		const existingPrice = await priceQueries.findByPublicId(db, priceId);
		if (!existingPrice || existingPrice.plan_id !== plan.id) return c.json({ error: "Price not found" }, 404);

		const [updatedPrice] = await db
			.update(prices)
			.set({
				trial_enabled: validated.trialEnabled,
				trial_days: validated.trialDays,
				external_provider: validated.externalProvider,
				external_price_id: validated.externalPriceId,
				is_active: validated.isActive,
				updated_at: new Date(),
			})
			.where(eq(prices.id, existingPrice.id))
			.returning();

		if (!updatedPrice) return c.json({ error: "Failed to update price" }, 500);

		log.info({ priceId: updatedPrice.public_id }, "Price updated");

		await auditLogQueries.create(db, {
			public_id: id.auditLog(),
			user_id: adminUser.id,
			project_id: app.project_id,
			app_id: app.id,
			action: "price.updated",
			entity_type: "price",
			entity_id: updatedPrice.public_id,
			changes: validated,
			ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
		});

		return c.json({ price: formatPrice(updatedPrice, plan.public_id) });
	} catch (error) {
		if (error instanceof z.ZodError) return c.json({ error: "Validation error", details: error.issues }, 400);
		log.error({ err: serializeError(error as Error) }, "Update price error");
		return c.json({ error: "Failed to update price" }, 500);
	}
});

/**
 * POST /prices/:priceId/sync
 * Manually trigger sync of the parent plan (and all its prices) to all active payment providers.
 */
pricesRouter.post("/:priceId/sync", async (c: Context) => {
	try {
		const userPublicId = getUserIdHeader(c);
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const appId = c.req.param("appId");
		const planId = c.req.param("planId");
		const priceId = c.req.param("priceId");

		const db = getDb();

		const adminUser = await userQueries.findByPublicId(db, userPublicId);
		if (!adminUser) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) return c.json({ error: "Plan not found" }, 404);

		const price = await priceQueries.findByPublicId(db, priceId);
		if (!price || price.plan_id !== plan.id) return c.json({ error: "Price not found" }, 404);

		await enqueuePlanSync({ planId: plan.public_id });

		log.info({ priceId: price.public_id, planId: plan.public_id }, "Manual price sync enqueued");

		return c.json({ message: "Sync job enqueued", priceId: price.public_id, planId: plan.public_id });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Sync price error");
		return c.json({ error: "Failed to enqueue sync" }, 500);
	}
});

/**
 * DELETE /prices/:priceId
 * Deactivate a price (soft delete)
 */
pricesRouter.delete("/:priceId", async (c: Context) => {
	try {
		const userPublicId = getUserIdHeader(c);
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const appId = c.req.param("appId");
		const planId = c.req.param("planId");
		const priceId = c.req.param("priceId");

		const db = getDb();

		const adminUser = await userQueries.findByPublicId(db, userPublicId);
		if (!adminUser) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) return c.json({ error: "Plan not found" }, 404);

		const price = await priceQueries.findByPublicId(db, priceId);
		if (!price || price.plan_id !== plan.id) return c.json({ error: "Price not found" }, 404);

		await priceQueries.deactivate(db, price.id);

		log.info({ priceId: price.public_id }, "Price deactivated");

		await auditLogQueries.create(db, {
			public_id: id.auditLog(),
			user_id: adminUser.id,
			project_id: app.project_id,
			app_id: app.id,
			action: "price.deleted",
			entity_type: "price",
			entity_id: price.public_id,
			changes: { billingType: price.billing_type, amountCents: price.amount_cents },
			ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
		});

		return c.json({ message: "Price deactivated successfully", priceId: price.public_id });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete price error");
		return c.json({ error: "Failed to delete price" }, 500);
	}
});

export { pricesRouter };
