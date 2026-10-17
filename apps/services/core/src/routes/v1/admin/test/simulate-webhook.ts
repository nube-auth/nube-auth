/**
 * Payment Testing Playground Routes
 * Admin-only endpoints for testing payment flows without manual setup
 */

import { appQueries, getDb, paymentProviderConfigQueries, testSessionQueries, userQueries } from "@nube-auth/db";
import { createId, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import type { PaymentDetails } from "../../../../billing/adapters/types.js";
import { processWebhookEvent } from "../../../../billing/services/webhook-processor.js";
import { normalizeEventType } from "../../../../billing/services/webhook-simulator.js";

import { assertProjectAdmin, log, testRateLimit } from "./shared.js";

const simulateRoutes = new Hono();

/**
 * POST /v1/admin/test/simulate-webhook
 * Simulate a webhook event for testing
 * Rate limited: 10 requests per hour per admin
 */
simulateRoutes.post("/simulate-webhook", testRateLimit, async (c: Context) => {
	try {
		const body = await c.req.json();
		const { sessionId, eventType, metadata } = body as {
			sessionId?: string;
			eventType?: string;
			metadata?: {
				amount?: number;
				newPlanId?: string;
				failureReason?: string;
			};
		};

		if (!sessionId || !eventType) {
			return c.json({ error: "Missing required fields: sessionId, eventType" }, 400);
		}

		const db = getDb();

		// Find test session
		const session = await testSessionQueries.findByPublicId(db, sessionId);
		if (!session) {
			return c.json({ error: "Test session not found" }, 404);
		}

		// Get test app and user
		const testApp = session.test_app_id ? await appQueries.findByInternalId_(db, session.test_app_id) : null;

		const testUser = session.test_user_id ? await userQueries.findByInternalId_(db, session.test_user_id) : null;

		if (!testApp || !testUser) {
			return c.json({ error: "Test app or user not found" }, 400);
		}

		const callerId = c.req.header("X-Nube-User-Id");
		if (!callerId || !(await assertProjectAdmin(db, callerId, testApp.project_id))) {
			return c.json({ error: "Forbidden" }, 403);
		}

		// Normalize event type for provider
		const provider = session.provider as "stripe" | "lemonsqueezy" | "dodo";
		const normalizedEventType = normalizeEventType(provider, eventType);

		// Find the provider config for this test session
		const project = await db.query.projects.findFirst({
			where: (projects, { eq: eqCol }) => eqCol(projects.id, testApp.project_id),
		});

		if (!project) {
			return c.json({ error: "Test project not found" }, 400);
		}

		const providerConfig = await paymentProviderConfigQueries.findByProjectAndProvider(
			db,
			project.id,
			provider,
			"test",
		);

		if (!providerConfig) {
			return c.json({ error: "Provider config not found. Re-initialize test session." }, 400);
		}

		log.info(
			{
				sessionId: session.public_id,
				provider: session.provider,
				eventType: normalizedEventType,
			},
			"Simulating webhook event",
		);

		// Map event type to PaymentDetails status
		const statusMap: Record<string, "succeeded" | "failed" | "canceled" | "refunded"> = {
			"payment.succeeded": "succeeded",
			"payment.failed": "failed",
			"subscription.canceled": "canceled",
			"charge.refunded": "refunded",
		};
		const paymentStatus = statusMap[eventType] || "succeeded";

		// Build PaymentDetails matching the real webhook processor interface
		const hasSubscription = eventType.includes("subscription") || paymentStatus === "succeeded";
		const paymentDetails: PaymentDetails = {
			transactionId: `txn_test_${createId("paymentTransaction")}`,
			amount: (metadata?.amount || 2900) / 100,
			currency: "usd",
			status: paymentStatus,
			customerId: `cus_test_${Date.now()}`,
			customerEmail: testUser.primary_email || "test@nube-auth.internal",
			...(hasSubscription ? { subscriptionId: `sub_test_${Date.now()}` } : {}),
			metadata: {
				userId: testUser.public_id,
				appId: testApp.public_id,
				planId: session.plan_id || "",
				testSessionId: session.public_id,
			},
		};

		// Process through the real webhook processor
		try {
			await processWebhookEvent({
				paymentDetails,
				providerConfigId: providerConfig.id,
				provider,
				eventType: normalizedEventType,
			});

			log.info(
				{
					sessionId: session.public_id,
					eventType,
					status: paymentStatus,
				},
				"Webhook event processed successfully",
			);

			// Query the actual results from the database
			const license = await db.query.licenses.findFirst({
				where: (licenses, { and: andOp, eq: eqCol }) =>
					andOp(eqCol(licenses.user_id, testUser.id), eqCol(licenses.app_id, testApp.id)),
				orderBy: (licenses, { desc: descOp }) => [descOp(licenses.created_at)],
			});

			const latestPurchase = await db.query.purchases.findFirst({
				where: (p, { eq: eqCol }) => eqCol(p.app_id, testApp.id),
				orderBy: (p, { desc: descOp }) => [descOp(p.created_at)],
			});

			return c.json({
				success: true,
				webhookEvent: {
					id: `evt_test_${Date.now()}`,
					type: normalizedEventType,
					processed: true,
					timestamp: new Date().toISOString(),
				},
				result: {
					purchase: latestPurchase
						? {
								id: latestPurchase.public_id,
								status: latestPurchase.status,
							}
						: null,
					license: license
						? {
								id: license.public_id,
								status: license.status,
								validUntil: license.valid_until?.toISOString() ?? null,
							}
						: null,
				},
			});
		} catch (error) {
			log.error(
				{
					err: serializeError(error as Error),
					sessionId: session.public_id,
				},
				"Failed to process simulated webhook",
			);

			return c.json(
				{
					error: "Failed to process webhook event",
					details: (error as Error).message,
				},
				500,
			);
		}
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to simulate webhook");
		return c.json({ error: "Failed to simulate webhook" }, 500);
	}
});

export { simulateRoutes };
