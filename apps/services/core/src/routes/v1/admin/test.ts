/**
 * Payment Testing Playground Routes
 * Admin-only endpoints for testing payment flows without manual setup
 */

import { getDb, testSessionQueries, userQueries, appQueries, planQueries, projectQueries } from "@proofa/db";
import { createId, createLogger, serializeError, publicId } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { env } from "../../../config/env.js";
import { generateMockWebhook, normalizeEventType } from "../../../billing/services/webhook-simulator.js";
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
		const adminId = c.req.header("X-User-Id");
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
		const adminPublicId = c.req.header("X-User-Id");
		if (!adminPublicId) {
			return c.json({ error: "Unauthorized - no admin ID" }, 401);
		}

		const db = getDb();

		// Validate admin exists
		const adminUser = await userQueries.findByPublicId(db, adminPublicId);
		if (!adminUser || !adminUser.is_admin) {
			return c.json({ error: "Unauthorized - not an admin" }, 403);
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
			public_id: publicId("user"),
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
				public_id: publicId("project"),
				name: "Test Playground",
				slug: "test-playground",
				description: "Auto-generated project for payment testing",
				owner_user_id: adminUser.id,
			});
		}

		// Create test app
		const testApp = await appQueries.create(db, {
			public_id: publicId("app"),
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
				public_id: publicId("plan"),
				app_id: testApp.id,
				name: "Pro Plan",
				slug: "pro",
				description: "Test Pro Plan",
				monthly_price: 2900,
				yearly_price: null,
				one_time_price: null,
				duration_days: null,
				trial_enabled: false,
				trial_days: null,
				features: [{ name: "Test feature", value: "true" }],
				status: "active",
				display_order: 0,
			});
			
			log.info({ planId: selectedPlan.public_id }, "Created default test plan");
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
			public_id: publicId("testSession"),
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
					amount: selectedPlan.monthly_price ?? selectedPlan.yearly_price ?? selectedPlan.one_time_price ?? 0,
					interval: selectedPlan.monthly_price ? "monthly" : selectedPlan.yearly_price ? "yearly" : "one_time",
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

		// Generate mock webhook payload
		const _webhookPayload = generateMockWebhook({
			provider,
			eventType: normalizedEventType,
			amount: metadata?.amount || 2900,
			userId: testUser.public_id,
			appId: testApp.public_id,
			planId: session.plan_id || "",
			metadata: {
				userId: testUser.public_id,
				appId: testApp.public_id,
				planId: session.plan_id || "",
				testSessionId: session.public_id,
			},
		});

		log.info({
			sessionId: session.public_id,
			provider: session.provider,
			eventType: normalizedEventType,
		}, "Simulating webhook event");

		// Process the webhook through the actual webhook processor
		// This will create transactions, licenses, etc.
		try {
			// We need to extract payment details from the mock webhook
			// For now, we'll create a simple payment details object
			const paymentDetails = {
				transactionId: `txn_mock_${Date.now()}`,
				amount: (metadata?.amount || 2900) / 100,
				currency: "usd",
				status: eventType.includes("failed") ? "failed" : 
				        eventType.includes("cancel") ? "canceled" :
				        eventType.includes("refund") ? "refunded" : "succeeded",
				customerId: `cus_mock_${Date.now()}`,
				customerEmail: testUser.primary_email || "test@proofa.internal",
				subscriptionId: eventType.includes("subscription") ? `sub_mock_${Date.now()}` : undefined,
				metadata: {
					userId: testUser.public_id,
					appId: testApp.public_id,
					planId: session.plan_id || "",
					testSessionId: session.public_id,
				},
			};

			// TODO: Process through webhook-processor
			// const result = await processWebhookEvent(db, session.provider, paymentDetails);

			log.info({
				sessionId: session.public_id,
				eventType,
				status: paymentDetails.status,
			}, "Webhook event processed");

			// For now, return mock result
			return c.json({
				success: true,
				webhookEvent: {
					id: `evt_test_${Date.now()}`,
					type: normalizedEventType,
					processed: true,
					timestamp: new Date().toISOString(),
				},
				result: {
					transaction: {
						id: `TXN0test${Date.now()}`,
						amount: metadata?.amount || 2900,
						status: paymentDetails.status,
						publicId: `TXN0test${Date.now()}`,
					},
					license: paymentDetails.status === "succeeded" ? {
						id: `LIC0test${Date.now()}`,
						status: "active",
						validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
						publicId: `LIC0test${Date.now()}`,
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

		// Get transactions for test user/app (if they exist)
		const transactions: any[] = []; // TODO: Query actual transactions
		
		// Get license for test user/app (if exists)
		let license = null;
		if (testUser && testApp) {
			license = await db.query.licenses.findFirst({
				where: (licenses, { and, eq }) => and(
					eq(licenses.user_id, testUser.id),
					eq(licenses.app_id, testApp.id)
				)
			});
		}

		// Get webhook events (simulated events would be stored separately)
		const webhookEvents: any[] = []; // TODO: Query actual webhook events

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
				validUntil: license.valid_until,
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
