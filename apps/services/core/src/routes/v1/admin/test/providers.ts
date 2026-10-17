/**
 * Payment Testing Playground Routes
 * Admin-only endpoints for testing payment flows without manual setup
 */

import { serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { env } from "../../../../config/env.js";

import { log } from "./shared.js";

const providerRoutes = new Hono();

/**
 * GET /v1/admin/test/providers
 * Get available provider test credentials
 */
providerRoutes.get("/providers", async (c: Context) => {
	try {
		const providers = [
			{
				name: "stripe",
				status: "available",
				testMode: env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false,
				webhookUrl: `${env.API_BASE_URL || "http://localhost:3003"}/v1/payment/webhooks/stripe`,
				credentials: {
					publicKey: `${env.STRIPE_PUBLISHABLE_KEY?.substring(0, 20)}****`,
					hasSecretKey: !!env.STRIPE_SECRET_KEY,
				},
			},
			{
				name: "lemonsqueezy",
				status: "available",
				testMode: false,
				webhookUrl: `${env.API_BASE_URL || "http://localhost:3003"}/v1/payment/webhooks/lemonsqueezy`,
				credentials: {
					hasApiKey: !!env.LEMONSQUEEZY_API_KEY,
				},
			},
			{
				name: "dodo",
				status: "available",
				testMode: false,
				webhookUrl: `${env.API_BASE_URL || "http://localhost:3003"}/v1/payment/webhooks/dodo`,
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

export { providerRoutes };
