/**
 * Payment Provider Admin Routes
 * 
 * Phase 2 Implementation Pending
 * - Configure Stripe/Paddle/LemonSqueezy credentials per app
 * - Manage webhook secrets
 * - Select primary payment provider
 */

import type { Context } from "hono";
import { createLogger } from "@proofa/shared";

const log = createLogger("admin-providers");

/**
 * Get available payment providers for an app
 */
export async function getAvailablePaymentProviders(c: Context) {
	const appId = c.req.param("appId");
	log.debug({ appId }, "Get available payment providers (Phase 2 pending)");
	return c.json({ providers: [] }, 200);
}

/**
 * Get selected payment provider for an app
 */
export async function getSelectedPaymentProvider(c: Context) {
	const appId = c.req.param("appId");
	log.debug({ appId }, "Get selected payment provider (Phase 2 pending)");
	return c.json({ provider: null }, 200);
}

/**
 * Create a new payment provider configuration
 */
export async function createPaymentProvider(c: Context) {
	log.debug("Create payment provider (Phase 2 pending)");
	return c.json({
		success: false,
		error: "Payment provider configuration pending Phase 2 implementation",
	}, 501);
}

/**
 * Update payment provider configuration
 */
export async function updatePaymentProvider(c: Context) {
	const providerId = c.req.param("providerId");
	log.debug({ providerId }, "Update payment provider (Phase 2 pending)");
	return c.json({
		success: false,
		error: "Payment provider updates pending Phase 2 implementation",
	}, 501);
}

/**
 * Delete a payment provider configuration
 */
export async function deletePaymentProvider(c: Context) {
	const providerId = c.req.param("providerId");
	log.debug({ providerId }, "Delete payment provider (Phase 2 pending)");
	return c.json({ success: true }, 200);
}

/**
 * Select primary payment provider for an app
 */
export async function selectPaymentProvider(c: Context) {
	const appId = c.req.param("appId");
	log.debug({ appId }, "Select payment provider (Phase 2 pending)");
	return c.json({
		success: false,
		error: "Provider selection pending Phase 2 implementation",
	}, 501);
}
