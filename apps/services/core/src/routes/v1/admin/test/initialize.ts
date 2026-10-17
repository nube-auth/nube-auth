/**
 * Payment Testing Playground Routes
 * Admin-only endpoints for testing payment flows without manual setup
 */

import {
	appQueries,
	eq,
	getDb,
	paymentProviderConfigQueries,
	planQueries,
	priceQueries,
	prices,
	projectMemberQueries,
	projectQueries,
	protectSecret,
	readSealedSecret,
	sealSecret,
	testSessionQueries,
	userQueries,
} from "@nube-auth/db";
import { createId, publicId, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { createProviderAdapter } from "../../../../billing/adapters/factory.js";
import { env } from "../../../../config/env.js";
import { decryptProviderCredentials } from "../../../../utils/encryption.js";

import { assertProjectAdmin, log, testRateLimit, validateTestModeCredentials } from "./shared.js";

const initializeRoutes = new Hono();

/**
 * POST /v1/admin/test/initialize
 * Initialize a test environment with app, user, and session
 * Rate limited: 10 requests per hour per admin
 */
initializeRoutes.post("/initialize", testRateLimit, async (c: Context) => {
	try {
		const body = await c.req.json();
		const {
			provider,
			mode = "simulate",
			projectId,
			appId,
			userId,
			planId,
		} = body as {
			provider?: "stripe" | "lemonsqueezy" | "dodo";
			mode?: "simulate" | "live";
			projectId?: string;
			appId?: string;
			userId?: string;
			planId?: string;
		};

		// Validate provider
		if (!provider || !["stripe", "lemonsqueezy", "dodo"].includes(provider)) {
			return c.json({ error: "Invalid provider. Must be stripe, lemonsqueezy, or dodo" }, 400);
		}

		if (!projectId) {
			return c.json({ error: "projectId is required" }, 400);
		}

		// Get admin user ID from header
		const adminPublicId = c.req.header("X-Nube-User-Id");
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
		const hasAdminRole = memberships.some(
			(m) => m.deleted_at == null && (m.role === "owner" || m.role === "admin"),
		);
		if (!hasAdminRole) {
			return c.json({ error: "Unauthorized - not a project admin" }, 403);
		}

		// SECURITY: Validate test mode credentials
		const isTestMode = await validateTestModeCredentials(provider, mode);
		if (!isTestMode) {
			log.error({ provider }, "Production credentials not allowed in test playground");
			return c.json(
				{
					error: "Production credentials not allowed in test playground. Please configure test/sandbox credentials.",
				},
				403,
			);
		}

		// Look up the selected project
		const testProject = await projectQueries.findByPublicId(db, projectId);
		if (!testProject) {
			return c.json({ error: "Project not found" }, 404);
		}
		if (!(await assertProjectAdmin(db, adminPublicId, testProject.id))) {
			return c.json({ error: "Forbidden" }, 403);
		}

		// Use existing app or create a test app
		let testApp;
		if (appId && appId !== null) {
			testApp = await appQueries.findByPublicId(db, appId);
			if (!testApp || testApp.project_id !== testProject.id) {
				return c.json({ error: "App not found or does not belong to the selected project" }, 404);
			}
			log.info({ appId: testApp.public_id }, "Using existing app for test");
		} else {
			const protectedClient = protectSecret(`test_${createId("app")}`);
			testApp = await appQueries.create(db, {
				public_id: publicId(createId("app")),
				project_id: testProject.id,
				name: `Test App - ${provider}`,
				slug: `test-app-${provider}-${Date.now()}`,
				description: `Auto-generated app for ${provider} testing`,
				enabled_providers: ["google"],
				client_secret_hash: protectedClient.hash,
				client_secret_enc: protectedClient.enc,
				redirect_uris: ["http://localhost:3000/callback"],
				session_ttl_days: 30,
				licensing_required: false,
				is_test: true,
			});
			log.info({ testAppId: testApp.public_id, projectId: testProject.public_id }, "Created test app");
		}

		// Use existing user or create a test user
		let testUser;
		if (userId && userId !== null) {
			testUser = await userQueries.findByPublicId(db, userId);
			if (!testUser) {
				return c.json({ error: "User not found" }, 404);
			}
			log.info({ userId: testUser.public_id }, "Using existing user for test");
		} else {
			const testUserEmail = `test+${provider}+${Date.now()}@nube-auth.internal`;
			testUser = await userQueries.create(db, {
				public_id: publicId(createId("user")),
				primary_email: testUserEmail,
				primary_email_verified: true,
				name: `Test User (${provider})`,
				is_test: true,
			});
			log.info({ testUserId: testUser.public_id, email: testUserEmail }, "Created test user");
		}

		// Use existing plan or create a test plan
		let selectedPlan;
		if (planId && planId !== null) {
			selectedPlan = await planQueries.findByPublicId(db, planId);
			if (!selectedPlan) {
				// Also try by slug on this app
				selectedPlan = await planQueries.findByAppAndSlug(db, testApp.id, planId);
			}
			if (!selectedPlan) {
				return c.json({ error: "Plan not found" }, 404);
			}
			log.info({ planId: selectedPlan.public_id }, "Using existing plan for test");
		} else {
			// Create a new test plan (not reuse existing)
			selectedPlan = await planQueries.create(db, {
				public_id: publicId(createId("plan")),
				app_id: testApp.id,
				name: `Test Plan (${provider})`,
				slug: `test-plan-${provider}-${Date.now()}`,
				description: `Auto-generated plan for ${provider} testing`,
				features: ["Test feature"],
				status: "active",
				display_order: 0,
			});
			log.info({ planId: selectedPlan.public_id }, "Created test plan");
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
				credentials: sealSecret(JSON.stringify({ apiKey: "test-playground-no-real-credentials" })),
				webhook_secret_enc: sealSecret("test-playground-no-real-webhook-secret"),
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

		// Create checkout URL if mode is "live" using real provider adapter
		let checkoutUrl: string | undefined;
		if (mode === "live") {
			try {
				log.info(
					{ provider, projectId: testProject.public_id, planId: selectedPlan.public_id },
					"Starting live mode checkout creation",
				);

				// Need a real provider config with encrypted credentials
				const liveConfigs = await paymentProviderConfigQueries.findByProjectAndProvider(
					db,
					testProject.id,
					provider,
					"test",
				);

				const configToUse = liveConfigs ?? providerConfig;

				log.info(
					{
						hasConfig: !!configToUse,
						isPlaceholder: configToUse?.credentials === "test-playground-no-real-credentials",
						configId: configToUse?.public_id,
					},
					"Provider config lookup result",
				);

				if (!configToUse || configToUse.credentials === "test-playground-no-real-credentials") {
					return c.json(
						{
							error: "Live mode requires a configured payment provider with real test credentials. Add provider credentials in Project → Payment Providers first.",
						},
						400,
					);
				}

				log.info({ provider }, "Decrypting credentials");
				const decryptedCredentials = decryptProviderCredentials(configToUse);

				// Add environment field for Dodo adapter (convert "test"/"production" to "test_mode"/"live_mode")
				if (provider === "dodo" && configToUse.environment) {
					decryptedCredentials["environment"] =
						configToUse.environment === "production" ? "live_mode" : "test_mode";
					decryptedCredentials["webhookSecret"] = readSealedSecret(configToUse.webhook_secret_enc) || "";
					log.info(
						{ environment: decryptedCredentials["environment"] },
						"Added environment to Dodo credentials",
					);
				}

				log.info({ provider, hasApiKey: !!decryptedCredentials["apiKey"] }, "Creating provider adapter");
				const adapter = createProviderAdapter(provider, decryptedCredentials);

				// If the price has a fake/test external_price_id, create a real product on the provider
				if (!testPrice.external_price_id || testPrice.external_price_id.startsWith("test_price_")) {
					log.info(
						{
							provider,
							planName: selectedPlan.name,
							priceId: testPrice.public_id,
							currentExternalId: testPrice.external_price_id,
						},
						"Creating real product on provider for live mode",
					);

					const product = await adapter.createProduct({
						name: selectedPlan.name,
						description: selectedPlan.description ?? `Test plan: ${selectedPlan.name}`,
					});

					log.info({ productId: product.productId, provider }, "Product created, now creating price");

					const providerPrice = await adapter.createPrice({
						productId: product.productId,
						amountCents: testPrice.amount_cents,
						currency: testPrice.currency,
						interval:
							testPrice.billing_type === "one_time"
								? "one_time"
								: ((testPrice.interval as "month" | "year") ?? "month"),
					});

					log.info({ priceId: providerPrice.priceId, provider }, "Price created, updating DB");

					// Update the price record with the real external ID
					await db
						.update(prices)
						.set({
							external_price_id: providerPrice.priceId,
							updated_at: new Date(),
						})
						.where(eq(prices.id, testPrice.id));

					testPrice = { ...testPrice, external_price_id: providerPrice.priceId };
					log.info(
						{ productId: product.productId, priceId: providerPrice.priceId, provider },
						"Created real product and price on provider",
					);
				} else {
					log.info(
						{ externalPriceId: testPrice.external_price_id, provider },
						"Using existing external price ID",
					);
				}

				log.info({ provider, productId: testPrice.external_price_id }, "Creating checkout session");
				const baseUrl = env.ADMIN_DASHBOARD_URL || "http://localhost:5174";
				const checkoutSession = await adapter.createCheckout({
					// Don't pass customerId - let provider create/find customer by email
					// (Nube Auth user IDs don't exist in provider's system yet)
					customerId: "",
					customerEmail: testUser.primary_email || "test@nube-auth.internal",
					productId: testPrice.external_price_id || "",
					successUrl: `${baseUrl}/playground/payments?status=success`,
					cancelUrl: `${baseUrl}/playground/payments?status=cancel`,
					metadata: {
						userId: testUser.public_id,
						appId: testApp.public_id,
						planId: selectedPlan.public_id,
						testSession: "true",
					},
					mode: testPrice.billing_type === "recurring" ? "subscription" : "payment",
				});

				checkoutUrl = checkoutSession.checkoutUrl;
				log.info(
					{ checkoutUrl, provider, sessionId: checkoutSession.sessionId },
					"Created real checkout session",
				);
			} catch (error) {
				const serializedError = serializeError(error as Error);
				log.error(
					{
						err: serializedError,
						provider,
						projectId: testProject.public_id,
						planId: selectedPlan.public_id,
					},
					"Failed to create checkout session",
				);

				return c.json(
					{
						error: `Failed to create checkout session with ${provider}. Check that your test credentials are configured correctly.`,
						details: env.IS_DEVELOPMENT ? serializedError : undefined,
					},
					500,
				);
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
			plan_id: selectedPlan.public_id,
			checkout_url: checkoutUrl,
			expires_at: expiresAt,
		});

		log.info(
			{
				sessionId: testSession.public_id,
				provider,
				mode,
				adminId: adminUser.public_id,
			},
			"Created test session",
		);

		return c.json(
			{
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
			},
			201,
		);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to initialize test session");
		return c.json({ error: "Failed to initialize test session" }, 500);
	}
});

export { initializeRoutes };
