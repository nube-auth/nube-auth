/**
 * Payment Testing Playground Routes
 * Admin-only endpoints for testing payment flows without manual setup
 */

import {
	appQueries,
	desc,
	eq,
	getDb,
	inArray,
	payment_transactions,
	purchases,
	testSessionQueries,
	userQueries,
	webhook_logs,
} from "@nube-auth/db";
import { serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";

import { assertProjectAdmin, log } from "./shared.js";

const statusRoutes = new Hono();

/**
 * GET /v1/admin/test/status/:sessionId
 * Get test session status with transactions, licenses, and events
 */
statusRoutes.get("/status/:sessionId", async (c: Context) => {
	try {
		const sessionId = c.req.param("sessionId");

		if (!sessionId) {
			return c.json({ error: "Missing sessionId" }, 400);
		}

		const db = getDb();

		// Find test session
		const session = await testSessionQueries.findByPublicId(db, sessionId);
		if (!session) {
			return c.json({ error: "Test session not found" }, 404);
		}

		// Get test app and user data
		const testApp = session.test_app_id ? await appQueries.findByInternalId_(db, session.test_app_id) : null;

		const testUser = session.test_user_id ? await userQueries.findByInternalId_(db, session.test_user_id) : null;
		const callerId = c.req.header("X-Nube-User-Id");
		if (!testApp || !callerId || !(await assertProjectAdmin(db, callerId, testApp.project_id))) {
			return c.json({ error: "Forbidden" }, 403);
		}

		// Get transactions for test user/app
		let transactions: {
			public_id: string;
			status: string;
			amount_cents: number;
			currency: string;
			type: string;
			provider: string;
			created_at: Date;
		}[] = [];
		if (testApp) {
			const appPurchases = await db
				.select({ id: purchases.id, public_id: purchases.public_id })
				.from(purchases)
				.where(eq(purchases.app_id, testApp.id));

			if (appPurchases.length > 0) {
				const purchaseIds = appPurchases.map((p) => p.id);
				transactions = await db
					.select({
						public_id: payment_transactions.public_id,
						status: payment_transactions.status,
						amount_cents: payment_transactions.amount_cents,
						currency: payment_transactions.currency,
						type: payment_transactions.type,
						provider: payment_transactions.provider,
						created_at: payment_transactions.created_at,
					})
					.from(payment_transactions)
					.where(inArray(payment_transactions.purchase_id, purchaseIds))
					.orderBy(desc(payment_transactions.created_at));
			}
		}

		// Get license for test user/app (if exists)
		let license = null;
		if (testUser && testApp) {
			license = await db.query.licenses.findFirst({
				where: (licenses, { and: andOp, eq: eqCol }) =>
					andOp(eqCol(licenses.user_id, testUser.id), eqCol(licenses.app_id, testApp.id)),
				orderBy: (licenses, { desc: descOp }) => [descOp(licenses.created_at)],
			});
		}

		// Get webhook events related to this test app
		let webhookEvents: {
			public_id: string;
			event_type: string;
			status: string;
			provider: string;
			received_at: Date;
		}[] = [];
		if (testApp) {
			webhookEvents = await db
				.select({
					public_id: webhook_logs.public_id,
					event_type: webhook_logs.event_type,
					status: webhook_logs.status,
					provider: webhook_logs.provider,
					received_at: webhook_logs.received_at,
				})
				.from(webhook_logs)
				.where(eq(webhook_logs.provider, session.provider))
				.orderBy(desc(webhook_logs.received_at))
				.limit(20);
		}

		// Look up actual plan name
		let planName = session.plan_id || "Unknown";
		if (session.plan_id) {
			const plan = await db.query.plans.findFirst({
				where: (plans, { eq: eqCol }) => eqCol(plans.public_id, session.plan_id!),
				columns: { name: true },
			});
			if (plan) planName = plan.name;
		}

		return c.json({
			sessionId: session.public_id,
			status: session.status,
			provider: session.provider,
			checkoutUrl: session.checkout_url,
			testData: {
				app: testApp
					? {
							id: testApp.public_id,
							name: testApp.name,
							publicId: testApp.public_id,
						}
					: null,
				user: testUser
					? {
							id: testUser.public_id,
							email: testUser.primary_email,
							publicId: testUser.public_id,
						}
					: null,
				plan: {
					id: session.plan_id,
					name: planName,
				},
			},
			transactions,
			license: license
				? {
						id: license.public_id,
						status: license.status,
						validUntil: license.valid_until?.toISOString() ?? null,
					}
				: null,
			webhookEvents,
			expiresAt: session.expires_at.toISOString(),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to get test session status");
		return c.json({ error: "Failed to get session status" }, 500);
	}
});

export { statusRoutes };
