import {
	appQueries,
	getDb,
	licenseHistoryQueries,
	licenseQueries,
	planQueries,
	priceQueries,
	subscriptionQueries,
	userQueries,
} from "@nube-auth/db";
import { createId, createLogger, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { fireWebhookEvent } from "../../../utils/outbound-events.js";

const log = createLogger("subscription-routes");
const router = new Hono();

// ---------------------------------------------------------------------------
// GET / — Get current user's subscription for an app
// ---------------------------------------------------------------------------

router.get("/", async (c: Context) => {
	try {
		const userPublicId = c.req.header("X-Nube-User-Id");
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const appId = c.req.query("appId");
		if (!appId) return c.json({ error: "Missing appId query parameter" }, 400);

		const db = getDb();

		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const sub = await subscriptionQueries.findActiveByUserAndApp(db, user.id, app.id);

		if (!sub) {
			return c.json({ subscription: null });
		}

		const license = sub.license_id ? await licenseQueries.findByInternalId_(db, sub.license_id) : null;
		const plan = license ? await planQueries.findByInternalId_(db, license.plan_id) : null;
		const price = sub.price_id ? await priceQueries.findByInternalId_(db, sub.price_id) : null;

		return c.json({
			subscription: {
				subscriptionId: sub.public_id,
				status: sub.status,
				plan: plan ? { planId: plan.public_id, name: plan.name, slug: plan.slug } : null,
				price: price
					? {
							priceId: price.public_id,
							billingType: price.billing_type,
							interval: price.interval,
							amountCents: price.amount_cents,
						}
					: null,
				billingPeriodEnd: sub.billing_period_end ? new Date(sub.billing_period_end).toISOString() : null,
				nextBillingDate: sub.next_billing_date ? new Date(sub.next_billing_date).toISOString() : null,
				cancelAtPeriodEnd: sub.cancel_at_period_end,
				canceledAt: sub.canceled_at ? new Date(sub.canceled_at).toISOString() : null,
				trialEnd: sub.trial_end ? new Date(sub.trial_end).toISOString() : null,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get subscription error");
		return c.json({ error: "Failed to get subscription" }, 500);
	}
});

// ---------------------------------------------------------------------------
// POST /cancel — Cancel subscription at period end
// ---------------------------------------------------------------------------

const CancelSchema = z.object({
	appId: z.string().min(1),
	reason: z.string().max(500).optional(),
});

router.post("/cancel", async (c: Context) => {
	try {
		const userPublicId = c.req.header("X-Nube-User-Id");
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const body = await c.req.json();
		const validated = CancelSchema.parse(body);

		const db = getDb();

		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, validated.appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const sub = await subscriptionQueries.findActiveByUserAndApp(db, user.id, app.id);
		if (!sub) return c.json({ error: "No active subscription found" }, 404);

		const now = new Date();
		const isTrial = sub.status === "trialing";

		// Trial cancellation is immediate per PRD §5.7
		if (isTrial) {
			await subscriptionQueries.update(db, sub.id, {
				status: "canceled",
				canceled_at: now,
				ended_at: now,
				cancel_at_period_end: false,
			});

			// Transition license to free plan immediately
			if (sub.license_id) {
				const freePlan = await planQueries.findByAppAndSlug(db, app.id, "free");
				if (freePlan) {
					await licenseQueries.transitionToFreePlan(db, sub.license_id, freePlan.id);
				}

				await licenseHistoryQueries.create(db, {
					public_id: createId("licenseHistory"),
					license_id: sub.license_id,
					change_type: "status_changed",
					old_value: { status: "trialing" },
					new_value: { status: "canceled", source: "auto_free" },
					reason: "user_canceled",
					changed_by_user_id: user.id,
					changed_by_system: false,
					notes: validated.reason ?? null,
				});
			}

			try {
				await fireWebhookEvent(db, app.id, "subscription.canceled", {
					subscriptionId: sub.public_id,
					licenseId: sub.license_id || null,
					userId: user.public_id,
					status: "canceled",
					cancelAtPeriodEnd: false,
					canceledAt: now.toISOString(),
					reason: validated.reason || "user_canceled",
				});
			} catch (webhookEventError) {
				log.error(
					{ err: serializeError(webhookEventError as Error), subId: sub.public_id },
					"Failed to emit subscription.canceled outbound event",
				);
			}

			return c.json({
				subscriptionId: sub.public_id,
				status: "canceled",
				canceledAt: now.toISOString(),
				accessUntil: now.toISOString(),
			});
		}

		// Non-trial: cancel at period end
		const accessUntil = sub.billing_period_end ?? sub.next_billing_date;

		await subscriptionQueries.update(db, sub.id, {
			status: "canceled",
			canceled_at: now,
			cancel_at_period_end: true,
		});

		// Write license history
		if (sub.license_id) {
			await licenseHistoryQueries.create(db, {
				public_id: createId("licenseHistory"),
				license_id: sub.license_id,
				change_type: "status_changed",
				old_value: { subscription_status: sub.status },
				new_value: { subscription_status: "canceled", cancel_at_period_end: true },
				reason: "user_canceled",
				changed_by_user_id: user.id,
				changed_by_system: false,
				notes: validated.reason ?? null,
			});
		}

		try {
			await fireWebhookEvent(db, app.id, "subscription.canceled", {
				subscriptionId: sub.public_id,
				licenseId: sub.license_id || null,
				userId: user.public_id,
				status: "canceled",
				cancelAtPeriodEnd: true,
				canceledAt: now.toISOString(),
				accessUntil: accessUntil ? new Date(accessUntil).toISOString() : null,
				reason: validated.reason || "user_canceled",
			});
		} catch (webhookEventError) {
			log.error(
				{ err: serializeError(webhookEventError as Error), subId: sub.public_id },
				"Failed to emit subscription.canceled outbound event",
			);
		}

		log.info({ subId: sub.public_id, userId: userPublicId }, "Subscription canceled by user");

		return c.json({
			subscriptionId: sub.public_id,
			status: "canceled",
			canceledAt: now.toISOString(),
			accessUntil: accessUntil ? new Date(accessUntil).toISOString() : null,
		});
	} catch (error) {
		if (error instanceof z.ZodError) return c.json({ error: "Invalid request", details: error.issues }, 400);
		log.error({ err: serializeError(error as Error) }, "Cancel subscription error");
		return c.json({ error: "Failed to cancel subscription" }, 500);
	}
});

// ---------------------------------------------------------------------------
// POST /resume — Resume a canceled subscription (before period ends)
// ---------------------------------------------------------------------------

const ResumeSchema = z.object({
	appId: z.string().min(1),
});

router.post("/resume", async (c: Context) => {
	try {
		const userPublicId = c.req.header("X-Nube-User-Id");
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const body = await c.req.json();
		const validated = ResumeSchema.parse(body);

		const db = getDb();

		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, validated.appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		// Find the most recent subscription (canceled with cancel_at_period_end)
		const sub = await subscriptionQueries.findByUserAndApp(db, user.id, app.id);
		if (!sub) return c.json({ error: "No subscription found" }, 404);

		if (sub.status !== "canceled" || !sub.cancel_at_period_end) {
			return c.json({ error: "Subscription cannot be resumed — it was not canceled at period end" }, 400);
		}

		// Check if billing period has already ended
		if (sub.billing_period_end && new Date(sub.billing_period_end) < new Date()) {
			return c.json({ error: "Billing period has already ended — cannot resume" }, 400);
		}

		await subscriptionQueries.update(db, sub.id, {
			status: "active",
			canceled_at: null,
			cancel_at_period_end: false,
		});

		// Write license history
		if (sub.license_id) {
			await licenseHistoryQueries.create(db, {
				public_id: createId("licenseHistory"),
				license_id: sub.license_id,
				change_type: "status_changed",
				old_value: { subscription_status: "canceled" },
				new_value: { subscription_status: "active", resumed: true },
				reason: "user_resumed",
				changed_by_user_id: user.id,
				changed_by_system: false,
				notes: null,
			});
		}

		try {
			await fireWebhookEvent(db, app.id, "subscription.resumed", {
				subscriptionId: sub.public_id,
				licenseId: sub.license_id || null,
				userId: user.public_id,
				status: "active",
				resumedAt: new Date().toISOString(),
				source: "user_action",
			});
		} catch (webhookEventError) {
			log.error(
				{ err: serializeError(webhookEventError as Error), subId: sub.public_id },
				"Failed to emit subscription.resumed outbound event",
			);
		}

		log.info({ subId: sub.public_id, userId: userPublicId }, "Subscription resumed by user");

		return c.json({
			subscriptionId: sub.public_id,
			status: "active",
			resumedAt: new Date().toISOString(),
		});
	} catch (error) {
		if (error instanceof z.ZodError) return c.json({ error: "Invalid request", details: error.issues }, 400);
		log.error({ err: serializeError(error as Error) }, "Resume subscription error");
		return c.json({ error: "Failed to resume subscription" }, 500);
	}
});

export const subscriptionRoutes = router;
