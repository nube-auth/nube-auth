import { createLogger, serializeError } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { env } from "../config/env";
import { coreClient } from "../lib/core-client";
import { getDb, and, eq } from "@proofa/db";
import { plans, licenses, apps } from "@proofa/db/schema";
import Stripe from "stripe";

const log = createLogger("payments-routes");

// Initialize Stripe client
const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2025-01-27",
});

export const paymentsRoutes = new Hono();

/**
 * GET /v1/payment/plans/:appId
 * Get all available plans for an app
 */
paymentsRoutes.get("/plans/:appId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");

		const db = getDb();
		const appPlans = await db
			.select()
			.from(plans)
			.where(and(eq(plans.app_id, parseInt(appId, 10)), eq(plans.is_active, true)))
			.orderBy(plans.display_order);

		return c.json({
			plans: appPlans.map((plan) => ({
				publicId: plan.public_id,
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
			})),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch plans");
		return c.json({ error: "Failed to fetch plans" }, 500);
	}
});

/**
 * POST /v1/payment/checkout
 * Create a Stripe checkout session for subscription
 * Body: { appId, planId, interval?: 'month' | 'year' | 'one-time' }
 */
paymentsRoutes.post("/checkout", async (c: Context) => {
	try {
		// Get authenticated user from session
		const sessionCookie = getCookie(c, "proofa_user_session");
		if (!sessionCookie) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		// Parse session and get user
		const coreSessionId = sessionCookie;
		const user = await coreClient.exchangeSession(coreSessionId);
		if (!user) {
			return c.json({ error: "Invalid session" }, 401);
		}

		const { appId, planId, interval = "month" } = await c.req.json<{
			appId: string;
			planId: string;
			interval?: "month" | "year" | "one-time";
		}>();

		const db = getDb();

		// Get the plan details
		const plan = await db
			.select()
			.from(plans)
			.where(eq(plans.public_id, planId))
			.then((rows) => rows[0]);

		if (!plan) {
			return c.json({ error: "Plan not found" }, 404);
		}

		// Verify user has access to this app
		const app = await db.select().from(apps).where(eq(apps.public_id, appId)).then((rows) => rows[0]);

		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// TODO: Update to use payment_provider_configs table
		// For now, using hardcoded Stripe configuration
		// const paymentProvider = await db
		//   .select()
		//   .from(payment_provider_configs)
		//   .where(
		//     and(
		//       eq(payment_provider_configs.app_id, app.id),
		//       eq(payment_provider_configs.provider, "stripe"),
		//       eq(payment_provider_configs.is_active, true),
		//       eq(payment_provider_configs.is_default, true)
		//     )
		//   )
		//   .then((rows) => rows[0]);
		//
		// if (!paymentProvider) {
		//   return c.json({ error: "Payment provider not configured" }, 500);
		// }

		// Determine price based on interval
		let price = 0;
		let productName = plan.name;

		if (interval === "month" && plan.monthly_price) {
			price = plan.monthly_price;
		} else if (interval === "year" && plan.yearly_price) {
			price = plan.yearly_price;
			productName = `${plan.name} (Annual)`;
		} else if (interval === "one-time" && plan.one_time_price) {
			price = plan.one_time_price;
			productName = `${plan.name} (One-time)`;
		} else {
			return c.json({ error: `Pricing not available for ${interval} billing` }, 400);
		}

		// Create Stripe checkout session
		const session = await stripe.checkout.sessions.create({
			mode: interval === "one-time" ? "payment" : "subscription",
			success_url: `${env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${env.FRONTEND_URL}/payment-canceled`,
			customer_email: user.email,
			line_items: [
				{
					price_data: {
						currency: "usd",
						product_data: {
							name: productName,
							description: plan.description || undefined,
						},
						unit_amount: price,
						recurring:
							interval !== "one-time"
								? {
										interval: interval as "month" | "year",
										interval_count: 1,
									}
								: undefined,
					},
					quantity: 1,
				},
			],
			metadata: {
				userId: user.userId.toString(),
				appId: app.public_id,
				planId: plan.public_id,
				interval: interval,
			},
		});

		log.info(
			{
				userId: user.userId,
				checkoutSessionId: session.id,
				appId: app.public_id,
				planId: plan.public_id,
			},
			"Checkout session created",
		);

		return c.json({
			checkoutUrl: session.url,
			sessionId: session.id,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Checkout creation failed");
		return c.json({ error: "Failed to create checkout session" }, 500);
	}
});

/**
 * POST /v1/payment/webhook
 * Stripe webhook endpoint for payment events
 */
paymentsRoutes.post("/webhook", async (c: Context) => {
	try {
		const body = await c.req.text();
		const signature = c.req.header("stripe-signature");

		if (!signature) {
			return c.json({ error: "Missing signature" }, 400);
		}

		// Verify webhook signature
		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET || "");
		} catch (err) {
			log.warn({ err: serializeError(err as Error) }, "Invalid webhook signature");
			return c.json({ error: "Invalid signature" }, 400);
		}

		const db = getDb();

		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				const { userId, appId, planId } = session.metadata as {
					userId: string;
					appId: string;
					planId: string;
				};

				// Get plan and app details
				const plan = await db
					.select()
					.from(plans)
					.where(eq(plans.public_id, planId))
					.then((rows) => rows[0]);

				const app = await db
					.select()
					.from(apps)
					.where(eq(apps.public_id, appId))
					.then((rows) => rows[0]);

				if (!plan || !app) {
					log.error({ planId, appId }, "Plan or app not found for webhook");
					return c.json({ error: "Plan or app not found" }, 404);
				}

				// Calculate valid_until date
				const validUntil = new Date();
				if (plan.duration_days) {
					validUntil.setDate(validUntil.getDate() + plan.duration_days);
				} else {
					// Default to 30 days if not specified
					validUntil.setDate(validUntil.getDate() + 30);
				}

				// Create or update license
				const existingLicense = await db
					.select()
					.from(licenses)
					.where(and(eq(licenses.user_id, parseInt(userId, 10)), eq(licenses.app_id, app.id)))
					.then((rows) => rows[0]);

				if (existingLicense) {
					// Update existing license
					await db
						.update(licenses)
						.set({
							plan_id: plan.id,
							status: "active",
							valid_until: validUntil,
							updated_at: new Date(),
						})
						.where(eq(licenses.id, existingLicense.id));

					log.info(
						{
							userId: parseInt(userId, 10),
							licenseId: existingLicense.public_id,
							planId: plan.public_id,
							validUntil: validUntil.toISOString(),
						},
						"License updated after payment",
					);
				} else {
					// Create new license
					const newLicense = await db
						.insert(licenses)
						.values({
							public_id: `lic_${Date.now()}_${Math.random().toString(36).substring(7)}`,
							user_id: parseInt(userId, 10),
							app_id: app.id,
							plan_id: plan.id,
							status: "active",
							valid_until: validUntil,
							stripe_customer_id: session.customer as string,
							stripe_subscription_id: session.subscription as string,
							created_at: new Date(),
							updated_at: new Date(),
						})
						.returning();

					log.info(
						{
							userId: parseInt(userId, 10),
							licenseId: newLicense[0]?.public_id,
							planId: plan.public_id,
							validUntil: validUntil.toISOString(),
						},
						"License created after payment",
					);
				}

				return c.json({ success: true });
			}

			case "customer.subscription.deleted": {
				const subscription = event.data.object as Stripe.Subscription;

				// Mark license as inactive
				const licensesToUpdate = await db
					.select()
					.from(licenses)
					.where(eq(licenses.stripe_subscription_id, subscription.id));

				for (const license of licensesToUpdate) {
					await db
						.update(licenses)
						.set({
							status: "canceled",
							updated_at: new Date(),
						})
						.where(eq(licenses.id, license.id));
				}

				log.info(
					{
						subscriptionId: subscription.id,
						licensesUpdated: licensesToUpdate.length,
					},
					"Subscription canceled, licenses updated",
				);

				return c.json({ success: true });
			}

			case "customer.subscription.updated": {
				const subscription = event.data.object as Stripe.Subscription;

				// Update license status based on subscription status
				const licensesToUpdate = await db
					.select()
					.from(licenses)
					.where(eq(licenses.stripe_subscription_id, subscription.id));

				const status = subscription.status === "active" ? "active" : "inactive";

				for (const license of licensesToUpdate) {
					await db
						.update(licenses)
						.set({
							status,
							updated_at: new Date(),
						})
						.where(eq(licenses.id, license.id));
				}

				log.info(
					{
						subscriptionId: subscription.id,
						newStatus: status,
						licensesUpdated: licensesToUpdate.length,
					},
					"Subscription updated, licenses synced",
				);

				return c.json({ success: true });
			}

			default:
				log.debug({ eventType: event.type }, "Unhandled webhook event");
				return c.json({ success: true });
		}
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Webhook processing error");
		return c.json({ error: "Webhook processing error" }, 500);
	}
});

/**
 * GET /v1/payment/license/:appId
 * Get user's license for an app
 */
paymentsRoutes.get("/license/:appId", async (c: Context) => {
	try {
		// Get authenticated user from session
		const sessionCookie = getCookie(c, "proofa_user_session");
		if (!sessionCookie) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		// Parse session and get user
		const coreSessionId = sessionCookie;
		const user = await coreClient.exchangeSession(coreSessionId);
		if (!user) {
			return c.json({ error: "Invalid session" }, 401);
		}

		const appId = c.req.param("appId");

		const db = getDb();

		// Get app
		const app = await db.select().from(apps).where(eq(apps.public_id, appId)).then((rows) => rows[0]);

		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get user's license for this app
		const license = await db
			.select()
			.from(licenses)
			.where(and(eq(licenses.user_id, user.userId), eq(licenses.app_id, app.id)))
			.then((rows) => rows[0]);

		if (!license) {
			return c.json({ error: "No active license", hasLicense: false }, 404);
		}

		// Check if license is still valid
		const isValid = license.valid_until ? new Date() < license.valid_until : true;

		return c.json({
			hasLicense: true,
			license: {
				publicId: license.public_id,
				status: license.status,
				validUntil: license.valid_until?.toISOString(),
				isValid,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch license");
		return c.json({ error: "Failed to fetch license" }, 500);
	}
});
