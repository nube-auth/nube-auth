/**
 * Payment Testing Playground Routes
 * Admin-only endpoints for testing payment flows without manual setup
 */

import { getDb, eq, and, desc, inArray, testSessionQueries, userQueries, appQueries, planQueries, priceQueries, projectQueries, projectMemberQueries, paymentProviderConfigQueries, purchases, payment_transactions, webhook_logs } from "@proofa/db";
import { createId, createLogger, serializeError, publicId } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { env } from "../../../config/env.js";
import { normalizeEventType } from "../../../billing/services/webhook-simulator.js";
import type { PaymentDetails } from "../../../billing/adapters/types.js";
import { processWebhookEvent } from "../../../billing/services/webhook-processor.js";
import { rateLimitMiddleware } from "../../../middleware/rateLimit.js";

const log = createLogger("admin-test-routes");
const router = new Hono();

// Apply rate limiting to test endpoints: 10 requests per hour per admin
// Uses admin ID from X-User-Id header as identifier
const testRateLimit = rateLimitMiddleware({
	maxRequests: 10,
	windowSeconds: 3600, // 1 hour
	keyPrefix: "rate-limit:admin-test",
	identifier: async (c: Context) => {
		// Use admin ID from header as identifier
		const adminId = c.req.header("X-Proofa-User-Id");
		return adminId || "anonymous";
	},
});

/**
 * Validate test mode credentials
 * CRITICAL: Only allow sandbox/test credentials in playground
 */
async function validateTestModeCredentials(provider: string): Promise<boolean> {
	// For now, we'll check environment variables
	// In production, this should check actual provider configs
	if (provider === "stripe") {
		const apiKey = env.STRIPE_SECRET_KEY;
		return apiKey?.startsWith("sk_test_") || false;
	}
	
	if (provider === "lemonsqueezy" || provider === "lemon_squeezy") {
		// LemonSqueezy test mode check - would need to verify with actual config
		return true; // Placeholder - implement proper check
	}
	
	if (provider === "dodo") {
		// Dodo test mode check
		return true; // Placeholder - implement proper check
	}
	
	return false;
}

/**
 * POST /v1/admin/test/initialize
 * Initialize a test environment with app, user, and session
 * Rate limited: 10 requests per hour per admin
 */
router.post("/initialize", testRateLimit, async (c: Context) => {
	try {
		const body = await c.req.json();
		const { provider, planId, mode = "simulate" } = body as {
			provider?: "stripe" | "lemonsqueezy" | "dodo";
			planId?: string;
			mode?: "simulate" | "live";
		};

		// Validate provider
		if (!provider || !["stripe", "lemonsqueezy", "dodo"].includes(provider)) {
			return c.json({ error: "Invalid provider. Must be stripe, lemonsqueezy, or dodo" }, 400);
		}

		// Get admin user ID from header
		const adminPublicId = c.req.header("X-Proofa-User-Id");
		if (!adminPublicId) {
			return c.json({ error: "Unauthorized - no admin ID" }, 401);
		}

		const db = getDb();

		// Validate admin exists and has admin/owner role in at least one project
		const adminUser = await userQueries.findByPublicId(db, adminPublicId);
		if (!adminUser) {
			return c.json({ error: "Unauthorized - user not found" }, 403);
		}

		const memberships = await projectMemberQueries.findByUserId(db, adminUser.id);
		const hasAdminRole = memberships.some((m) => m.role === "owner" || m.role === "admin");
		if (!hasAdminRole) {
			return c.json({ error: "Unauthorized - not a project admin" }, 403);
		}

		// SECURITY: Validate test mode credentials
		const isTestMode = await validateTestModeCredentials(provider);
		if (!isTestMode) {
			log.error({ provider }, "Production credentials not allowed in test playground");
			return c.json({ 
				error: "Production credentials not allowed in test playground. Please configure test/sandbox credentials." 
			}, 403);
		}

		// Create test user
		const testUserEmail = `test+${provider}+${Date.now()}@proofa.internal`;
		const testUser = await userQueries.create(db, {
			public_id: publicId(createId("user")),
			primary_email: testUserEmail,
			primary_email_verified: true,
			name: `Test User (${provider})`,
			is_test: true,
		});

		log.info({ 
			testUserId: testUser.public_id, 
			email: testUserEmail 
		}, "Created test user");

		// Create or find a test project for this admin
		let testProject = await db.query.projects.findFirst({
			where: (projects, { and, eq }) => and(
				eq(projects.owner_user_id, adminUser.id),
				eq(projects.slug, "test-playground")
			)
		});

		if (!testProject) {
			testProject = await projectQueries.create(db, {
				public_id: publicId(createId("project")),
				name: "Test Playground",
				slug: "test-playground",
				description: "Auto-generated project for payment testing",
				owner_user_id: adminUser.id,
			});
		}

		// Create test app
		const testApp = await appQueries.create(db, {
			public_id: publicId(createId("app")),
			project_id: testProject.id,
			name: `Test App - ${provider}`,
			slug: `test-app-${provider}-${Date.now()}`,
			description: `Auto-generated app for ${provider} testing`,
			enabled_providers: JSON.stringify(["google"]),
			app_tokens: JSON.stringify({
				currentKey: {
					value: `test_${createId("app")}`,
					createdAt: new Date().toISOString(),
				},
			}),
			security_settings: JSON.stringify({
				sessionTtlDays: 30,
				maxSessions: 5,
				redirectUris: ["http://localhost:3000/callback"],
			}),
			plan_settings: JSON.stringify({
				allowPlanSelection: true,
				defaultPlanSlug: "pro",
			}),
			is_test: true,
		});

		log.info({ 
			testAppId: testApp.public_id, 
			projectId: testProject.public_id 
		}, "Created test app");

		// Find or use provided plan
		let selectedPlan;
		if (planId) {
			selectedPlan = await planQueries.findByAppAndSlug(db, testApp.id, planId);
		}
		
		if (!selectedPlan) {
			// Get first active plan for the app
			const activePlans = await planQueries.findActiveByAppId(db, testApp.id);
			selectedPlan = activePlans[0];
		}

		// If still no plan, create a default test plan
		if (!selectedPlan) {
			selectedPlan = await planQueries.create(db, {
				public_id: publicId(createId("plan")),
				app_id: testApp.id,
				name: "Pro Plan",
				slug: "pro",
				description: "Test Pro Plan",
				features: ["Test feature"],
				status: "active",
				display_order: 0,
			});
			
			log.info({ planId: selectedPlan.public_id }, "Created default test plan");
		}

		// Create or find a test payment provider config for this project + provider
		let providerConfig = await paymentProviderConfigQueries.findByProjectAndProvider(
			db,
			testProject.id,
			provider,
			"test",
		);

		if (!providerConfig) {
			providerConfig = await paymentProviderConfigQueries.create(db, {
				public_id: publicId(createId("paymentConfig")),
				project_id: testProject.id,
				provider,
				environment: "test",
				is_default: true,
				credentials: "test-playground-no-real-credentials",
				webhook_secret: "test-playground-no-real-webhook-secret",
			});

			log.info({ configId: providerConfig.public_id, provider }, "Created test provider config");
		}

		// Create a test price for the plan if none exists for this provider
		const existingPrices = await priceQueries.findActiveByPlanId(db, selectedPlan.id);
		let testPrice = existingPrices.find((p) => p.external_provider === provider);

		if (!testPrice) {
			testPrice = await priceQueries.create(db, {
				public_id: publicId(createId("price")),
				plan_id: selectedPlan.id,
				app_id: testApp.id,
				billing_type: "recurring",
				interval: "month",
				amount_cents: 2900,
				currency: "usd",
				duration_days: 30,
				external_provider: provider,
				external_price_id: `test_price_${provider}_${Date.now()}`,
				is_active: true,
			});

			log.info({ priceId: testPrice.public_id, provider }, "Created test price");
		}

		// Create checkout URL if mode is "live"
		let checkoutUrl: string | undefined;
		if (mode === "live") {
			try {
				// This would use the actual payment provider adapter
				// For now, we'll generate a placeholder URL
				checkoutUrl = `https://checkout.${provider}.com/test-session-${Date.now()}`;
				
				log.info({ checkoutUrl, provider }, "Generated checkout URL");
			} catch (error) {
				log.error({ 
					err: serializeError(error as Error),
					provider 
				}, "Failed to create checkout URL");
				// Continue without checkout URL
			}
		}

		// Create test session
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
		const testSession = await testSessionQueries.create(db, {
			public_id: publicId(createId("state")),
			admin_id: adminUser.id,
			provider,
			mode,
			status: "active",
			test_app_id: testApp.id,
			test_user_id: testUser.id,
			plan_id: selectedPlan.slug,
			checkout_url: checkoutUrl,
			expires_at: expiresAt,
		});

		log.info({ 
			sessionId: testSession.public_id,
			provider,
			mode,
			adminId: adminUser.public_id
		}, "Created test session");

		return c.json({
			sessionId: testSession.public_id,
			testData: {
				app: {
					id: testApp.public_id,
					name: testApp.name,
					publicId: testApp.public_id,
				},
				user: {
					id: testUser.public_id,
					email: testUser.primary_email,
					publicId: testUser.public_id,
				},
				plan: {
					id: selectedPlan.slug,
					name: selectedPlan.name,
					amount: testPrice.amount_cents,
					interval: testPrice.interval || "one_time",
				},
			},
			checkoutUrl,
			expiresAt: expiresAt.toISOString(),
		}, 201);

	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to initialize test session");
		return c.json({ error: "Failed to initialize test session" }, 500);
	}
});

/**
 * POST /v1/admin/test/simulate-webhook
 * Simulate a webhook event for testing
 * Rate limited: 10 requests per hour per admin
 */
router.post("/simulate-webhook", testRateLimit, async (c: Context) => {
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
		const testApp = session.test_app_id 
			? await appQueries.findById(db, session.test_app_id)
			: null;
			
		const testUser = session.test_user_id
			? await userQueries.findById(db, session.test_user_id)
			: null;

		if (!testApp || !testUser) {
			return c.json({ error: "Test app or user not found" }, 400);
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

		log.info({
			sessionId: session.public_id,
			provider: session.provider,
			eventType: normalizedEventType,
		}, "Simulating webhook event");

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
			customerEmail: testUser.primary_email || "test@proofa.internal",
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

			log.info({
				sessionId: session.public_id,
				eventType,
				status: paymentStatus,
			}, "Webhook event processed successfully");

			// Query the actual results from the database
			const license = await db.query.licenses.findFirst({
				where: (licenses, { and: andOp, eq: eqCol }) => andOp(
					eqCol(licenses.user_id, testUser.id),
					eqCol(licenses.app_id, testApp.id),
				),
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
					purchase: latestPurchase ? {
						id: latestPurchase.public_id,
						status: latestPurchase.status,
					} : null,
					license: license ? {
						id: license.public_id,
						status: license.status,
						validUntil: license.valid_until?.toISOString() ?? null,
					} : null,
				},
			});

		} catch (error) {
			log.error({ 
				err: serializeError(error as Error),
				sessionId: session.public_id 
			}, "Failed to process simulated webhook");
			
			return c.json({ 
				error: "Failed to process webhook event",
				details: (error as Error).message 
			}, 500);
		}

	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to simulate webhook");
		return c.json({ error: "Failed to simulate webhook" }, 500);
	}
});

/**
 * GET /v1/admin/test/status/:sessionId
 * Get test session status with transactions, licenses, and events
 */
router.get("/status/:sessionId", async (c: Context) => {
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
		const testApp = session.test_app_id 
			? await appQueries.findById(db, session.test_app_id)
			: null;
			
		const testUser = session.test_user_id
			? await userQueries.findById(db, session.test_user_id)
			: null;

		// Get transactions for test user/app
		let transactions: { public_id: string; status: string; amount_cents: number; currency: string; type: string; provider: string; created_at: Date }[] = [];
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
				where: (licenses, { and: andOp, eq: eqCol }) => andOp(
					eqCol(licenses.user_id, testUser.id),
					eqCol(licenses.app_id, testApp.id)
				),
				orderBy: (licenses, { desc: descOp }) => [descOp(licenses.created_at)],
			});
		}

		// Get webhook events related to this test app
		let webhookEvents: { public_id: string; event_type: string; status: string; provider: string; received_at: Date }[] = [];
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

		return c.json({
			sessionId: session.public_id,
			status: session.status,
			provider: session.provider,
			checkoutUrl: session.checkout_url,
			testData: {
				app: testApp ? {
					id: testApp.public_id,
					name: testApp.name,
					publicId: testApp.public_id,
				} : null,
				user: testUser ? {
					id: testUser.public_id,
					email: testUser.primary_email,
					publicId: testUser.public_id,
				} : null,
				plan: {
					id: session.plan_id,
					name: session.plan_id, // TODO: Get actual plan name
				},
			},
			transactions,
			license: license ? {
				id: license.public_id,
				status: license.status,
				validUntil: license.valid_until?.toISOString() ?? null,
			} : null,
			webhookEvents,
			expiresAt: session.expires_at.toISOString(),
		});

	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to get test session status");
		return c.json({ error: "Failed to get session status" }, 500);
	}
});

/**
 * DELETE /v1/admin/test/cleanup
 * Cleanup test data (manual trigger)
 */
router.delete("/cleanup", async (c: Context) => {
	try {
		const { sessionId, all } = c.req.query();

		const db = getDb();

		if (sessionId) {
			// Delete specific session
			const session = await testSessionQueries.findByPublicId(db, sessionId);
			if (!session) {
				return c.json({ error: "Session not found" }, 404);
			}

			await testSessionQueries.delete(db, session.id);

			return c.json({
				success: true,
				deleted: {
					sessions: 1,
				},
			});
		}

		if (all === "true") {
			// Cleanup all expired test data
			const result = await testSessionQueries.cleanupTestData(db, 24);
			const deletedSessions = await testSessionQueries.deleteExpired(db);

			log.info({
				...result,
				sessions: deletedSessions.length,
			}, "Cleaned up test data");

			return c.json({
				success: true,
				deleted: {
					...result,
					sessions: deletedSessions.length,
				},
			});
		}

		return c.json({ error: "Must provide sessionId or all=true" }, 400);

	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to cleanup test data");
		return c.json({ error: "Failed to cleanup test data" }, 500);
	}
});

/**
 * GET /v1/admin/test/providers
 * Get available provider test credentials
 */
router.get("/providers", async (c: Context) => {
	try {
		const providers = [
			{
				name: "stripe",
				status: "available",
				testMode: true,
				webhookUrl: `${env.API_BASE_URL || "https://api.proofa.com"}/v1/billing/webhooks/stripe`,
				credentials: {
					publicKey: `${env.STRIPE_PUBLISHABLE_KEY?.substring(0, 20)}****`,
					hasSecretKey: !!env.STRIPE_SECRET_KEY,
				},
			},
			{
				name: "lemonsqueezy",
				status: "available",
				testMode: true,
				webhookUrl: `${env.API_BASE_URL || "https://api.proofa.com"}/v1/billing/webhooks/lemonsqueezy`,
				credentials: {
					hasApiKey: !!env.LEMONSQUEEZY_API_KEY,
				},
			},
			{
				name: "dodo",
				status: "available",
				testMode: true,
				webhookUrl: `${env.API_BASE_URL || "https://api.proofa.com"}/v1/billing/webhooks/dodo`,
				credentials: {
					hasApiKey: !!env.DODO_API_KEY,
				},
			},
		];

		return c.json({ providers });

	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to get providers");
		return c.json({ error: "Failed to get providers" }, 500);
	}
});

export const testRouter = router;
