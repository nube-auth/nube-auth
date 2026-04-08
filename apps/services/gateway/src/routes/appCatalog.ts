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
 *   Authorization: Bearer <NUBE_APP_SECRET>
 *
 *   GET /v1/app/:appId/plans/:planId/prices
 *   Authorization: Bearer <NUBE_APP_SECRET>
 */

import { Hono } from "hono";
import { getDb, planQueries, priceQueries } from "@nube-auth/db";
import { createLogger, serializeError } from "@nube-auth/shared";
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
