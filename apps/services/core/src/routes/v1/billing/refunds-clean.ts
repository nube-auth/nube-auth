/**
 * Refund Routes
 *
 * API endpoints for refund management:
 * - POST /billing/refunds - Initiate a refund
 * - GET /billing/refunds/:id/status - Get refund status
 * - GET /billing/purchases/:purchaseId/refunds - List refunds for a purchase
 * - GET /billing/purchases/:purchaseId/can-refund - Check refund eligibility
 */

import { getDb, eq, and, payment_transactions, purchases, payment_provider_configs } from "@proofa/db";
import { createLogger, serializeError, id } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { createProviderAdapter } from "../../../billing/adapters/index.js";
import { decryptString } from "../../../utils/encryption.js";

const log = createLogger("refund-routes");

export const refundRoutes = new Hono();

const RefundRequestSchema = z.object({
	purchaseId: z.string(), // Purchase public_id
	reason: z.string().max(3000).optional(),
});

/**
 * POST /billing/refunds
 * Initiate a refund for a purchase.
 */
refundRoutes.post("/", async (c: Context) => {
	try {
		const body = await c.req.json();
		const validated = RefundRequestSchema.parse(body);

		const db = getDb();

		// Find the purchase
		const purchase = await db.query.purchases.findFirst({
			where: eq(purchases.public_id, validated.purchaseId),
		});

		if (!purchase) {
			return c.json({ error: "Purchase not found" }, 404);
		}

		if (purchase.status !== "completed") {
			return c.json({ error: "Only completed purchases can be refunded" }, 400);
		}

		// Find the original payment transaction
		const originalTx = await db.query.payment_transactions.findFirst({
			where: and(
				eq(payment_transactions.purchase_id, purchase.id),
				eq(payment_transactions.type, "purchase"),
				eq(payment_transactions.status, "succeeded"),
			),
		});

		if (!originalTx) {
			return c.json({ error: "No successful payment transaction found for this purchase" }, 400);
		}

		// Check for existing refund
		const existingRefund = await db.query.payment_transactions.findFirst({
			where: and(
				eq(payment_transactions.purchase_id, purchase.id),
				eq(payment_transactions.type, "refund"),
			),
		});

		if (existingRefund) {
			return c.json({ error: "This purchase has already been refunded" }, 400);
		}

		// Get provider config
		const providerConfig = await db.query.payment_provider_configs.findFirst({
			where: eq(payment_provider_configs.id, originalTx.provider_config_id),
		});

		if (!providerConfig) {
			return c.json({ error: "Provider configuration not found" }, 500);
		}

		// Decrypt credentials and create adapter
		const credentialsJson = decryptString(providerConfig.credentials);
		const decryptedCredentials = JSON.parse(credentialsJson);
		const adapter = createProviderAdapter(providerConfig.provider, decryptedCredentials);

		// Create refund via provider
		const refundResult = await adapter.createRefund({
			paymentId: originalTx.provider_transaction_id,
			...(validated.reason ? { reason: validated.reason } : {}),
		});

		// Record refund transaction
		const [refundTx] = await db
			.insert(payment_transactions)
			.values({
				public_id: id.request(),
				purchase_id: purchase.id,
				license_id: originalTx.license_id,
				provider_config_id: providerConfig.id,
				provider: providerConfig.provider,
				provider_transaction_id: refundResult.refundId,
				provider_customer_id: originalTx.provider_customer_id,
				type: "refund",
				status: refundResult.status,
				amount_cents: refundResult.amount || originalTx.amount_cents,
				currency: refundResult.currency || originalTx.currency,
				discount_applied_cents: 0,
				discount_applied: false,
				description: validated.reason || "Refund",
				metadata: { originalTransactionId: originalTx.public_id },
				transaction_date: new Date(),
			})
			.returning();

		// Update purchase status
		await db
			.update(purchases)
			.set({ status: "refunded" })
			.where(eq(purchases.id, purchase.id));

		log.info(
			{
				purchaseId: purchase.public_id,
				refundId: refundResult.refundId,
				amount: refundResult.amount,
			},
			"Refund initiated",
		);

		return c.json({
			success: true,
			refundId: refundTx?.public_id,
			providerRefundId: refundResult.refundId,
			status: refundResult.status,
			amount: refundResult.amount,
			currency: refundResult.currency,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Invalid request", details: error.issues }, 400);
		}

		log.error({ err: serializeError(error as Error) }, "Refund initiation failed");
		return c.json({ error: "Failed to initiate refund" }, 500);
	}
});

/**
 * GET /billing/refunds/:id/status
 * Get refund status.
 */
refundRoutes.get("/:id/status", async (c: Context) => {
	try {
		const refundPublicId = c.req.param("id");
		const db = getDb();

		const refundTx = await db.query.payment_transactions.findFirst({
			where: and(
				eq(payment_transactions.public_id, refundPublicId),
				eq(payment_transactions.type, "refund"),
			),
		});

		if (!refundTx) {
			return c.json({ error: "Refund not found" }, 404);
		}

		return c.json({
			refundId: refundTx.public_id,
			status: refundTx.status,
			amount: refundTx.amount_cents,
			currency: refundTx.currency,
			createdAt: refundTx.created_at,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to get refund status");
		return c.json({ error: "Failed to get refund status" }, 500);
	}
});

/**
 * GET /billing/refunds/purchase/:purchaseId
 * List refunds for a purchase.
 */
refundRoutes.get("/purchase/:purchaseId", async (c: Context) => {
	try {
		const purchasePublicId = c.req.param("purchaseId");
		const db = getDb();

		const purchase = await db.query.purchases.findFirst({
			where: eq(purchases.public_id, purchasePublicId),
			columns: { id: true },
		});

		if (!purchase) {
			return c.json({ refunds: [] }, 200);
		}

		const refunds = await db
			.select({
				refundId: payment_transactions.public_id,
				status: payment_transactions.status,
				amount: payment_transactions.amount_cents,
				currency: payment_transactions.currency,
				createdAt: payment_transactions.created_at,
			})
			.from(payment_transactions)
			.where(
				and(
					eq(payment_transactions.purchase_id, purchase.id),
					eq(payment_transactions.type, "refund"),
				),
			);

		return c.json({ refunds });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to list refunds");
		return c.json({ error: "Failed to list refunds" }, 500);
	}
});

/**
 * GET /billing/refunds/purchase/:purchaseId/can-refund
 * Check if a purchase is eligible for a refund.
 */
refundRoutes.get("/purchase/:purchaseId/can-refund", async (c: Context) => {
	try {
		const purchasePublicId = c.req.param("purchaseId");
		const db = getDb();

		const purchase = await db.query.purchases.findFirst({
			where: eq(purchases.public_id, purchasePublicId),
		});

		if (!purchase) {
			return c.json({ canRefund: false, reason: "Purchase not found" }, 200);
		}

		if (purchase.status !== "completed") {
			return c.json({ canRefund: false, reason: "Purchase is not in completed status" }, 200);
		}

		// Check for existing refund
		const existingRefund = await db.query.payment_transactions.findFirst({
			where: and(
				eq(payment_transactions.purchase_id, purchase.id),
				eq(payment_transactions.type, "refund"),
			),
		});

		if (existingRefund) {
			return c.json({ canRefund: false, reason: "Purchase has already been refunded" }, 200);
		}

		return c.json({ canRefund: true }, 200);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to check refund eligibility");
		return c.json({ error: "Failed to check refund eligibility" }, 500);
	}
});
