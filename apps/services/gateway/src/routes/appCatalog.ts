/**
 * App Catalog Routes — /v1/app/:appId/...
 *
 * Server-to-server API for app backends to read their own plan and pricing
 * catalog. Authenticated by the app's `clientSecret` (via appSecretMiddleware).
 *
 * These endpoints return public-safe data only:
 * - No external_price_id / external_provider (billing-provider internals)
 * - No internal numeric IDs — public_id fields only
 *
 * Usage from a control plane:
 *   GET /v1/app/:appId/plans
 *   GET /v1/app/:appId/plans/:planId/prices
 *   GET /v1/app/:appId/users                   — bulk user+license sync (paginated)
 *   GET /v1/app/:appId/users/:userId            — single user profile
 *   GET /v1/app/:appId/users/:userId/license    — single user license
 *   Authorization: Bearer <NUBE_APP_SECRET>
 * Usage from a control plane:
 *   GET /v1/app/:appId/plans
 *   Authorization: Bearer <NUBE_APP_SECRET>
 *
 *   GET /v1/app/:appId/plans/:planId/prices
 *   Authorization: Bearer <NUBE_APP_SECRET>
 */

import { Hono } from "hono";
import { getDb, planQueries, priceQueries, userQueries, licenseQueries, subscriptionQueries, appQueries } from "@nube-auth/db";
import { createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { appSecretMiddleware } from "../middleware/appSecret.js";

const log = createLogger("app-catalog-routes");
export const appCatalogRoutes = new Hono();

// Every route in this file is gated by app-secret auth
appCatalogRoutes.use("/:appId/*", appSecretMiddleware);

/**
 * GET /v1/app/:appId/plans
 *
 * Returns all active (non-archived, non-deleted) plans for the app,
 * ordered by display_order ascending.
 *
 * Response:
 * {
 *   plans: [{
 *     planId: string,    // public_id
 *     name: string,
 *     slug: string,
 *     description: string | null,
 *     features: string[],
 *     displayOrder: number,
 *   }]
 * }
 */
appCatalogRoutes.get("/:appId/plans", async (c: Context) => {
	try {
		const resolvedApp = c.get("resolvedApp") as { id: number; public_id: string };
		const db = getDb();

		const plansList = await planQueries.findActiveByAppId(db, resolvedApp.id);

		return c.json({
			plans: plansList.map((plan) => ({
				planId: plan.public_id,
				name: plan.name,
				slug: plan.slug,
				description: plan.description ?? null,
				features: plan.features && !Array.isArray(plan.features) ? plan.features : {},
				displayOrder: plan.display_order,
			})),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get plans error");
		return c.json({ error: "Failed to get plans" }, 500);
	}
});

/**
 * GET /v1/app/:appId/plans/:planId/prices
 *
 * Returns all active prices for the given plan (identified by public_id).
 * The plan must belong to the authenticated app.
 *
 * Response:
 * {
 *   planId: string,
 *   prices: [{
 *     priceId: string,          // public_id
 *     billingType: string,      // 'recurring' | 'one_time'
 *     interval: string | null,  // 'month' | 'year' | null
 *     amountCents: number,      // e.g. 999 = $9.99
 *     currency: string,         // ISO 4217 lowercase, e.g. "usd"
 *     trialEnabled: boolean,
 *     trialDays: number | null,
 *   }]
 * }
 */
appCatalogRoutes.get("/:appId/plans/:planId/prices", async (c: Context) => {
	try {
		const resolvedApp = c.get("resolvedApp") as { id: number; public_id: string };
		const planPublicId = c.req.param("planId");
		const db = getDb();

		const plan = await planQueries.findByPublicId(db, planPublicId);
		if (!plan || plan.app_id !== resolvedApp.id) {
			return c.json({ error: "Plan not found" }, 404);
		}

		const pricesList = await priceQueries.findActiveByPlanId(db, plan.id);

		return c.json({
			planId: plan.public_id,
			prices: pricesList.map((price) => ({
				priceId: price.public_id,
				billingType: price.billing_type,
				interval: price.interval ?? null,
				amountCents: price.amount_cents,
				currency: price.currency,
				trialEnabled: price.trial_enabled,
				trialDays: price.trial_days ?? null,
			})),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get prices error");
		return c.json({ error: "Failed to get prices" }, 500);
	}
});

/**
 * GET /v1/app/:appId/users
 *
 * Server-to-server: paginated list of all users registered with this app,
 * each entry includes the user's current license and plan status.
 * Intended for a full initial sync or a periodic re-sync.
 *
 * Query params:
 *   limit  — records per page (default 100, max 500)
 *   page   — 1-based page number (default 1)
 *
 * Response:
 * {
 *   users: [{
 *     userId: string,
 *     email: string,
 *     name: string | null,
 *     emailVerified: boolean,
 *     createdAt: string,
 *     license: {
 *       licenseId: string,
 *       status: string,
 *       source: string | null,
 *       maxActivations: number | null,
 *       validFrom: number,
 *       validUntil: number | null,
 *       plan: { planId, slug, name, features } | null,
 *     } | null,
 *   }],
 *   total: number,
 *   page: number,
 *   limit: number,
 *   hasMore: boolean,
 * }
 */
appCatalogRoutes.get("/:appId/users", async (c: Context) => {
	try {
		const resolvedApp = c.get("resolvedApp") as { id: number; public_id: string };

		const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") ?? "100", 10) || 100), 500);
		const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
		const offset = (page - 1) * limit;

		const db = getDb();

		// Single query for all licenses belonging to this app
		const allLicenses = await licenseQueries.findByAppId(db, resolvedApp.id);
		const total = allLicenses.length;
		const paginated = allLicenses.slice(offset, offset + limit);

		if (paginated.length === 0) {
			return c.json({ users: [], total, page, limit, hasMore: false });
		}

		// Batch-resolve unique users and plans to avoid N+1
		const uniqueUserIds = [...new Set(paginated.map((l) => l.user_id))];
		const uniquePlanIds = [...new Set(paginated.map((l) => l.plan_id))];

		const [userRows, planRows] = await Promise.all([
			Promise.all(uniqueUserIds.map((id) => userQueries.findById(db, id))),
			Promise.all(uniquePlanIds.map((id) => planQueries.findById(db, id))),
		]);

		const userMap = new Map(userRows.filter(Boolean).map((u) => [u!.id, u!]));
		const planMap = new Map(planRows.filter(Boolean).map((p) => [p!.id, p!]));

		const users = paginated.map((license) => {
			const user = userMap.get(license.user_id);
			const plan = planMap.get(license.plan_id);

			return {
				userId: user?.public_id ?? null,
				email: user?.primary_email ?? null,
				name: user?.name ?? null,
				emailVerified: user?.primary_email_verified ?? false,
				createdAt: user ? new Date(user.created_at).toISOString() : null,
				license: {
					licenseId: license.public_id,
					status: license.status,
					source: license.source ?? null,
					maxActivations: license.max_activations ?? null,
					validFrom: Math.floor(license.created_at.getTime() / 1000),
					validUntil: license.valid_until
						? Math.floor(new Date(license.valid_until).getTime() / 1000)
						: null,
					plan: plan
						? {
								planId: plan.public_id,
								slug: plan.slug,
								name: plan.name,
								features: (plan.features as Record<string, unknown>) ?? {},
							}
						: null,
				},
			};
		});

		return c.json({
			users,
			total,
			page,
			limit,
			hasMore: offset + limit < total,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "S2S list users error");
		return c.json({ error: "Failed to list users" }, 500);
	}
});

/**
 * GET /v1/app/:appId/users/:userId/license
 *
 * Server-to-server: fetch a user's license and plan status for this app.
 * Authenticated with the app's clientSecret.
 *
 * Usage:
 *   GET /v1/app/APP0.../users/USER0.../license
 *   Authorization: Bearer <NUBE_APP_SECRET>
 *
 * Response:
 * {
 *   licenseId: string,
 *   status: "active" | "expired" | "canceled" | "suspended",
 *   source: string | null,
 *   maxActivations: number | null,
 *   validFrom: number,        // Unix timestamp (seconds)
 *   validUntil: number | null,
 *   plan: {
 *     planId: string,
 *     slug: string,
 *     name: string,
 *     features: Record<string, unknown>,
 *   } | null,
 *   subscription: {
 *     status: string,
 *     billingInterval: string | null,
 *     periodEnd: string | null,
 *   } | null,
 * }
 */
appCatalogRoutes.get("/:appId/users/:userId/license", async (c: Context) => {
	try {
		const resolvedApp = c.get("resolvedApp") as { id: number; public_id: string };
		const userPublicId = c.req.param("userId");

		if (!idPatterns.user.test(userPublicId)) {
			return c.json({ error: "Invalid userId" }, 400);
		}

		const db = getDb();

		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const license = await licenseQueries.findByUserAndApp(db, user.id, resolvedApp.id);
		if (!license) {
			return c.json({ error: "No license found for this user" }, 404);
		}

		// Resolve plan via price chain then direct plan_id
		const price = license.price_id ? await priceQueries.findById(db, license.price_id) : null;
		const plan = price
			? await planQueries.findById(db, price.plan_id)
			: await planQueries.findById(db, license.plan_id);

		// Attach subscription info if one exists
		const subscription = await subscriptionQueries.findActiveByUserAndApp(db, user.id, resolvedApp.id);

		return c.json({
			licenseId: license.public_id,
			status: license.status,
			source: license.source ?? null,
			maxActivations: license.max_activations ?? null,
			validFrom: Math.floor(license.created_at.getTime() / 1000),
			validUntil: license.valid_until ? Math.floor(new Date(license.valid_until).getTime() / 1000) : null,
			plan: plan
				? {
						planId: plan.public_id,
						slug: plan.slug,
						name: plan.name,
						features: (plan.features as Record<string, unknown>) ?? {},
					}
				: null,
			subscription: subscription
				? {
						status: subscription.status,
						billingInterval: subscription.billing_interval ?? null,
						periodEnd: subscription.billing_period_end
							? new Date(subscription.billing_period_end).toISOString()
							: null,
					}
				: null,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "S2S get user license error");
		return c.json({ error: "Failed to get user license" }, 500);
	}
});

/**
 * GET /v1/app/:appId/users/:userId
 *
 * Server-to-server: fetch basic profile for a user in the context of this app.
 * Authenticated with the app's clientSecret.
 *
 * Returns only data the app is entitled to see — no internal IDs,
 * no cross-app data.
 *
 * Usage:
 *   GET /v1/app/APP0.../users/USER0...
 *   Authorization: Bearer <NUBE_APP_SECRET>
 */
appCatalogRoutes.get("/:appId/users/:userId", async (c: Context) => {
	try {
		const userPublicId = c.req.param("userId");

		if (!idPatterns.user.test(userPublicId)) {
			return c.json({ error: "Invalid userId" }, 400);
		}

		const db = getDb();
		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		return c.json({
			userId: user.public_id,
			email: user.primary_email,
			name: user.name ?? null,
			avatarUrl: user.avatar_url ?? null,
			emailVerified: user.primary_email_verified ?? false,
			createdAt: new Date(user.created_at).toISOString(),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "S2S get user error");
		return c.json({ error: "Failed to get user" }, 500);
	}
});
