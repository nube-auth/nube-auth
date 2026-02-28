import {
	appQueries,
	getDb,
	licenseHistoryQueries,
	licenseQueries,
	planQueries,
	priceQueries,
	subscriptionQueries,
	userQueries,
} from "@proofa/db";
import { createId, createLogger, idPatterns, serializeError } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";

const log = createLogger("admin-subscription-routes");

/**
 * App-scoped admin subscription routes.
 * Mounted at: /v1/admin/apps/:appId/subscriptions
 */
export const subscriptionsRouter = new Hono();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSubscription(sub: any, extras?: { user?: any; plan?: any; price?: any }) {
	return {
		subscriptionId: sub.public_id,
		userId: extras?.user?.public_id,
		userEmail: extras?.user?.primary_email,
		userName: extras?.user?.name,
		plan: extras?.plan
			? { planId: extras.plan.public_id, name: extras.plan.name, slug: extras.plan.slug }
			: undefined,
		price: extras?.price
			? {
					priceId: extras.price.public_id,
					billingType: extras.price.billing_type,
					interval: extras.price.interval,
					amountCents: extras.price.amount_cents,
				}
			: undefined,
		status: sub.status,
		provider: sub.provider,
		billingInterval: sub.billing_interval,
		billingPeriodStart: sub.billing_period_start
			? new Date(sub.billing_period_start).toISOString()
			: null,
		billingPeriodEnd: sub.billing_period_end
			? new Date(sub.billing_period_end).toISOString()
			: null,
		nextBillingDate: sub.next_billing_date
			? new Date(sub.next_billing_date).toISOString()
			: null,
		cancelAtPeriodEnd: sub.cancel_at_period_end,
		canceledAt: sub.canceled_at
			? new Date(sub.canceled_at).toISOString()
			: null,
		trialStart: sub.trial_start
			? new Date(sub.trial_start).toISOString()
			: null,
		trialEnd: sub.trial_end
			? new Date(sub.trial_end).toISOString()
			: null,
		amountCents: sub.amount_cents,
		currency: sub.currency,
		createdAt: new Date(sub.created_at).toISOString(),
		updatedAt: new Date(sub.updated_at).toISOString(),
	};
}

// ---------------------------------------------------------------------------
// GET / — List subscriptions for app
// ---------------------------------------------------------------------------

subscriptionsRouter.get("/", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const statusFilter = c.req.query("status") as string | undefined;

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const allSubs = await subscriptionQueries.findByAppId(db, app.id);

		const filtered = statusFilter
			? allSubs.filter((s) => s.status === statusFilter)
			: allSubs;

		const results = await Promise.all(
			filtered.map(async (sub) => {
				const user = await userQueries.findById(db, sub.user_id);
				const license = sub.license_id
					? await licenseQueries.findById(db, sub.license_id)
					: null;
				const plan = license
					? await planQueries.findById(db, license.plan_id)
					: null;
				const price = sub.price_id
					? await priceQueries.findById(db, sub.price_id)
					: null;
				return formatSubscription(sub, { user, plan, price });
			}),
		);

		return c.json({ subscriptions: results, total: results.length });
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error) },
			"List subscriptions error",
		);
		return c.json({ error: "Failed to list subscriptions" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /:subId — Get subscription detail
// ---------------------------------------------------------------------------

subscriptionsRouter.get("/:subId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const subId = c.req.param("subId");

		if (!idPatterns.subscription.test(subId))
			return c.json({ error: "Invalid subscriptionId" }, 400);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const sub = await subscriptionQueries.findByPublicId(db, subId);
		if (!sub || sub.app_id !== app.id)
			return c.json({ error: "Subscription not found" }, 404);

		const user = await userQueries.findById(db, sub.user_id);
		const license = sub.license_id
			? await licenseQueries.findById(db, sub.license_id)
			: null;
		const plan = license
			? await planQueries.findById(db, license.plan_id)
			: null;
		const price = sub.price_id
			? await priceQueries.findById(db, sub.price_id)
			: null;

		return c.json(formatSubscription(sub, { user, plan, price }));
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error) },
			"Get subscription error",
		);
		return c.json({ error: "Failed to get subscription" }, 500);
	}
});

// ---------------------------------------------------------------------------
// PATCH /:subId — Admin cancel / pause subscription
// ---------------------------------------------------------------------------

const AdminUpdateSubSchema = z.object({
	action: z.enum(["cancel", "pause", "resume"]),
	note: z.string().max(500).optional(),
});

subscriptionsRouter.patch("/:subId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const subId = c.req.param("subId");
		const body = await c.req.json();
		const validated = AdminUpdateSubSchema.parse(body);

		if (!idPatterns.subscription.test(subId))
			return c.json({ error: "Invalid subscriptionId" }, 400);

		const adminUserId = c.req.header("X-Proofa-User-Id");
		if (!adminUserId) return c.json({ error: "Unauthorized" }, 401);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const sub = await subscriptionQueries.findByPublicId(db, subId);
		if (!sub || sub.app_id !== app.id)
			return c.json({ error: "Subscription not found" }, 404);

		const now = new Date();
		const updateData: Record<string, unknown> = {};

		switch (validated.action) {
			case "cancel":
				updateData["status"] = "canceled";
				updateData["canceled_at"] = now;
				updateData["cancel_at_period_end"] = false; // admin cancel is immediate
				updateData["ended_at"] = now;
				break;
			case "pause":
				updateData["status"] = "paused";
				break;
			case "resume":
				if (sub.status !== "paused" && sub.status !== "canceled")
					return c.json(
						{ error: "Can only resume paused or canceled subscriptions" },
						400,
					);
				updateData["status"] = "active";
				updateData["canceled_at"] = null;
				updateData["cancel_at_period_end"] = false;
				break;
		}

		const updated = await subscriptionQueries.update(db, sub.id, updateData);

		// Write license history if subscription has a linked license
		if (sub.license_id) {
			const adminUser = await userQueries.findByPublicId(db, adminUserId);
			await licenseHistoryQueries.create(db, {
				public_id: createId("licenseHistory"),
				license_id: sub.license_id,
				change_type: "status_changed",
				old_value: { subscription_status: sub.status },
				new_value: { subscription_status: updateData["status"], action: validated.action },
				reason: "admin_manual",
				changed_by_user_id: adminUser?.id ?? null,
				changed_by_system: false,
				notes: validated.note ?? null,
			});

			// If admin cancel, also transition license to free plan
			if (validated.action === "cancel") {
				const freePlan = await planQueries.findByAppAndSlug(db, app.id, "free");
				if (freePlan) {
					await licenseQueries.transitionToFreePlan(db, sub.license_id, freePlan.id);
				}
			}
		}

		log.info(
			{ subId, action: validated.action, appId },
			"Subscription updated by admin",
		);

		return c.json({
			subscriptionId: updated.public_id,
			status: updated.status,
			canceledAt: updated.canceled_at
				? new Date(updated.canceled_at).toISOString()
				: null,
			updatedAt: new Date(updated.updated_at).toISOString(),
		});
	} catch (error) {
		if (error instanceof z.ZodError)
			return c.json({ error: "Invalid request", details: error.issues }, 400);
		log.error(
			{ err: serializeError(error as Error) },
			"Admin subscription update error",
		);
		return c.json({ error: "Failed to update subscription" }, 500);
	}
});
