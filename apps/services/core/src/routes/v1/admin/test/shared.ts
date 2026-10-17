/**
 * Payment Testing Playground Routes
 * Admin-only endpoints for testing payment flows without manual setup
 */

import { type getDb, projectMemberQueries, userQueries } from "@nube-auth/db";
import { createLogger } from "@nube-auth/shared";
import type { Context } from "hono";
import { env } from "../../../../config/env.js";
import { rateLimitMiddleware } from "../../../../middleware/rateLimit.js";

export const log = createLogger("admin-test-routes");
// Apply rate limiting to test endpoints: 10 requests per hour per admin
// Uses admin ID from X-User-Id header as identifier
export const testRateLimit = rateLimitMiddleware({
	maxRequests: 10,
	windowSeconds: 3600, // 1 hour
	keyPrefix: "rate-limit:admin-test",
	identifier: async (c: Context) => {
		// Use admin ID from header as identifier
		const adminId = c.req.header("X-Nube-User-Id");
		return adminId || "anonymous";
	},
});

/**
 * Validate test mode credentials
 * CRITICAL: Only allow sandbox/test credentials in playground
 */
export async function validateTestModeCredentials(provider: string, mode: string): Promise<boolean> {
	// In simulate mode, no real credentials are needed — we mock the payment flow
	if (mode === "simulate") {
		return true;
	}

	// Live test mode: verify provider has test/sandbox credentials configured
	if (provider === "stripe") {
		const apiKey = env.STRIPE_SECRET_KEY;
		return apiKey?.startsWith("sk_test_") || false;
	}

	// Lemon Squeezy and Dodo do not expose a reliable test-key prefix.
	// Playground calls in those providers are limited to simulate mode.
	return false;
}

export async function assertProjectAdmin(
	db: ReturnType<typeof getDb>,
	userPublicId: string,
	projectInternalId: number,
) {
	const user = await userQueries.findByPublicId(db, userPublicId);
	if (!user) return false;
	const memberships = await projectMemberQueries.findByProjectAndUser(db, projectInternalId, user.id);
	const member = memberships.find((row) => row.deleted_at == null);
	return member?.role === "owner" || member?.role === "admin";
}
