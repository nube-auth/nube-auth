/**
 * Payment Routes
 * Proxy to Core service for billing operations.
 * Webhook route is unauthenticated (providers send webhooks directly).
 * Checkout and other routes require authentication.
 */

import { Hono } from "hono";
import { pingpong } from "@nube-auth/auth";
import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { env } from "../config/env";
import { getAuth } from "../middleware/auth";

const log = createLogger("payment-routes");

export const paymentsRoutes = new Hono();

/**
 * POST /v1/payment/webhooks/:provider
 * Webhook endpoint — no auth required. Forward raw body + headers to core.
 */
paymentsRoutes.post("/webhooks/:provider", async (c: Context) => {
	try {
		const provider = c.req.param("provider");
		const rawBody = await c.req.text();
		const coreUrl = `${env.CORE_URL}/v1/billing/webhooks/${encodeURIComponent(provider)}`;

		// Forward all relevant headers for signature verification
		const forwardHeaders: Record<string, string> = {
			"Content-Type": c.req.header("content-type") || "application/json",
			"X-Nube-S2S-Token": env.S2S_SECRET,
		};

		// Forward provider-specific signature headers
		const signatureHeaders = [
			"webhook-id", "webhook-signature", "webhook-timestamp", // Dodo / Standard Webhooks
			"stripe-signature",
			"x-signature",
			"x-webhook-signature",
			"paddle-signature",
		];
		for (const header of signatureHeaders) {
			const value = c.req.header(header);
			if (value) {
				forwardHeaders[header] = value;
			}
		}

		const response = await pingpong(coreUrl, {
			method: "POST",
			headers: forwardHeaders,
			body: rawBody,
		});

		return c.json(response.data, response.status as ContentfulStatusCode);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Webhook proxy error");
		return c.json({ success: true, message: "Webhook received" }, 200);
	}
});

/**
 * POST /v1/payment/validate-promo
 * Public endpoint — no auth required. Used by native apps to validate a promo
 * code before opening the browser for the OAuth+checkout flow.
 */
paymentsRoutes.post("/validate-promo", async (c: Context) => {
	try {
		const body = await c.req.json();
		const coreUrl = `${env.CORE_URL}/v1/billing/validate-promo`;

		const response = await pingpong(coreUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Nube-S2S-Token": env.S2S_SECRET,
				// Forward user ID if provided (enables new-customer and already-redeemed checks)
				...(c.req.header("X-Nube-User-Id") && { "X-Nube-User-Id": c.req.header("X-Nube-User-Id")! }),
			},
			body,
		});

		return c.json(response.data, response.status as ContentfulStatusCode);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "validate-promo proxy error");
		return c.json({ error: "Service unavailable" }, 502);
	}
});

/**
 * Proxy all other payment routes to Core service with authentication.
 */
paymentsRoutes.all("/*", async (c: Context) => {
	try {
		const method = c.req.method;
		const path = c.req.path;

		// validate-promo is a public endpoint — no auth required.
		// Guard here as a safety net in case the dedicated POST route above doesn't match.
		if (path.endsWith("/validate-promo") && method === "POST") {
			const body = await c.req.json();
			const coreUrl = `${env.CORE_URL}/v1/billing/validate-promo`;
			const response = await pingpong(coreUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Nube-S2S-Token": env.S2S_SECRET,
					...(c.req.header("X-Nube-User-Id") && { "X-Nube-User-Id": c.req.header("X-Nube-User-Id")! }),
				},
				body,
			});
			return c.json(response.data, response.status as ContentfulStatusCode);
		}

		const auth = getAuth(c);

		// Map /v1/payment/* → /v1/billing/*
		const corePath = path.replace("/v1/payment", "/v1/billing");
		const coreUrl = `${env.CORE_URL}${corePath}`;

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"X-Nube-S2S-Token": env.S2S_SECRET,
			"X-Nube-User-Id": auth.userId,
			"X-Nube-Session-Id": auth.coreSessionId || "",
		};

		let body: unknown;
		if (["POST", "PUT", "PATCH"].includes(method)) {
			try {
				body = await c.req.json();
			} catch {
				// No body or invalid JSON
			}
		}

		// Checkout security: always stamp userId and customerEmail from the authenticated
		// session so callers cannot claim a different identity. appId is left to the
		// caller (needed for cases where the web dashboard triggers checkout on behalf
		// of a specific app).
		if (method === "POST" && path.endsWith("/checkout") && body && typeof body === "object" && !Array.isArray(body)) {
			const checkoutBody = body as Record<string, unknown>;
			checkoutBody.userId = auth.userId;
			checkoutBody.customerEmail = auth.email;
		}

		const url = new URL(coreUrl);
		const queryString = c.req.url.split("?")[1];
		if (queryString) {
			url.search = `?${queryString}`;
		}

		const response = await pingpong(url.toString(), {
			method,
			headers,
			...(body ? { body } : {}),
		});

		return c.json(response.data, response.status as ContentfulStatusCode);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Payment proxy error");
		return c.json({ error: "Payment service unavailable" }, 502);
	}
});
