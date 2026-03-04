import {
	appQueries,
	getDb,
	inArray,
	paymentProviderConfigQueries,
	paymentTransactionQueries,
	purchaseQueries,
	sql,
	subscriptions,
	userQueries,
	webhook_logs,
	webhookLogQueries,
} from "@proofa/db";
import { createId, createLogger, serializeError } from "@proofa/shared";
import { Hono } from "hono";
import { z } from "zod";
import { enqueueWebhookProcessing } from "../../../billing/queue.js";

const log = createLogger("admin-billing-routes");

/**
 * Admin billing routes.
 * Mounted at: /v1/admin/billing
 */
export const billingRouter = new Hono();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPurchase(purchase: any, extras?: { app?: any; user?: any; providerConfig?: any }) {
	return {
		id: purchase.public_id,
		app_id: extras?.app?.public_id ?? null,
		user_id: extras?.user?.public_id ?? null,
		provider: extras?.providerConfig?.provider ?? null,
		provider_purchase_id: purchase.provider_session_id,
		amount: 0, // Amount lives on payment_transactions, not purchases
		currency: "usd",
		status: purchase.status,
		created_at: new Date(purchase.created_at).toISOString(),
		updated_at: new Date(purchase.updated_at).toISOString(),
		app: extras?.app
			? { id: extras.app.public_id, name: extras.app.name }
			: undefined,
		user: extras?.user
			? { id: extras.user.public_id, email: extras.user.primary_email }
			: undefined,
	};
}

function formatTransaction(tx: any, extras?: { purchase?: any }) {
	return {
		id: tx.public_id,
		purchase_id: extras?.purchase?.public_id ?? null,
		type: tx.type,
		status: tx.status,
		amount: tx.amount_cents,
		currency: tx.currency,
		provider: tx.provider,
		created_at: new Date(tx.created_at).toISOString(),
		updated_at: tx.transaction_date ? new Date(tx.transaction_date).toISOString() : null,
		purchase: extras?.purchase
			? { id: extras.purchase.public_id, status: extras.purchase.status }
			: undefined,
	};
}

function formatWebhookLog(wh: any) {
	return {
		id: wh.public_id,
		provider: wh.provider,
		event_type: wh.event_type,
		event_id: wh.event_id,
		status: wh.status,
		ip_address: wh.ip_address,
		processing_duration_ms: wh.processing_duration_ms,
		error_message: wh.error_message ?? undefined,
		retry_count: wh.retry_count,
		received_at: new Date(wh.received_at).toISOString(),
		processing_completed_at: wh.processing_completed_at
			? new Date(wh.processing_completed_at).toISOString()
			: undefined,
	};
}

function formatWebhookDetail(wh: any) {
	return {
		...formatWebhookLog(wh),
		request_body: wh.request_body,
		request_headers: wh.request_headers,
		signature: wh.signature,
		error_stack: wh.error_stack ?? undefined,
		processing_started_at: wh.processing_started_at
			? new Date(wh.processing_started_at).toISOString()
			: undefined,
		last_retry_at: wh.last_retry_at
			? new Date(wh.last_retry_at).toISOString()
			: undefined,
	};
}

function formatRefund(tx: any, extras?: { purchase?: any; purchaseApp?: any }) {
	return {
		id: tx.public_id,
		provider: tx.provider,
		purchase_id: extras?.purchase?.public_id ?? null,
		amount: tx.amount_cents,
		currency: tx.currency,
		status: tx.status,
		reason: tx.description ?? tx.notes ?? "",
		created_at: new Date(tx.created_at).toISOString(),
		completed_at: tx.resolved_at ? new Date(tx.resolved_at).toISOString() : undefined,
		provider_refund_id: tx.provider_transaction_id,
		error_message: tx.dispute_reason ?? undefined,
		purchase: extras?.purchase
			? formatPurchase(extras.purchase, { app: extras.purchaseApp })
			: undefined,
	};
}

function parsePagination(query: Record<string, string>) {
	const limit = Math.min(Math.max(Number(query['limit']) || 20, 1), 100);
	const offset = Math.max(Number(query['offset']) || 0, 0);
	return { limit, offset };
}

function parseDateFilters(query: Record<string, string>) {
	const startDate = query['start_date'] ? new Date(query['start_date']) : undefined;
	const endDate = query['end_date'] ? new Date(query['end_date']) : undefined;
	return { startDate, endDate };
}

// ---------------------------------------------------------------------------
// GET /stats
// ---------------------------------------------------------------------------
billingRouter.get("/stats", async (c) => {
	try {
		const db = getDb();
		const query = c.req.query();
		const { startDate, endDate } = parseDateFilters(query);
		const provider = query['provider'] || undefined;

		const dateFilters = { startDate, endDate, provider };

		const [
			byType,
			byProvider,
			byCurrency,
			last30Days,
			activeSubsResult,
			webhookCounts,
		] = await Promise.all([
			paymentTransactionQueries.revenueByType(db, dateFilters),
			paymentTransactionQueries.revenueByProvider(db, { startDate, endDate }),
			paymentTransactionQueries.revenueByCurrency(db, dateFilters),
			paymentTransactionQueries.countRecent(db, 30),
			db.select({ count: sql<number>`count(*)` })
				.from(subscriptions)
				.where(inArray(subscriptions.status, ["active", "trialing", "past_due"])),
			webhookLogQueries.countByStatus(db),
		]);

		// Compute totals from grouped results
		const revenueTotal = byType.reduce((sum, r) => sum + (r.type !== "refund" && r.type !== "chargeback" ? Number(r.total) : 0), 0);
		const refundTotal = byType.find((r) => r.type === "refund")?.total ?? 0;
		const txTotal = byType.reduce((sum, r) => sum + Number(r.count), 0);

		const byTypeMap: Record<string, number> = {};
		for (const r of byType) byTypeMap[r.type] = Number(r.total);

		const byProviderMap: Record<string, number> = {};
		for (const r of byProvider) byProviderMap[r.provider] = Number(r.total);

		const byCurrencyMap: Record<string, number> = {};
		for (const r of byCurrency) byCurrencyMap[r.currency] = Number(r.total);

		const webhookMap: Record<string, number> = {};
		for (const w of webhookCounts) webhookMap[w.status] = Number(w.count);

		return c.json({
			data: {
				revenue: {
					total: revenueTotal,
					by_type: byTypeMap,
					by_provider: byProviderMap,
					by_currency: byCurrencyMap,
				},
				refunds: {
					total: Number(refundTotal),
					percentage: txTotal > 0
						? Math.round((Number(refundTotal) / revenueTotal) * 10000) / 100
						: 0,
				},
				subscriptions: {
					active: Number(activeSubsResult[0]?.count ?? 0),
				},
				transactions: {
					total: txTotal,
					last_30_days: Number(last30Days),
				},
				webhooks: {
					success: webhookMap['completed'] ?? 0,
					failed: (webhookMap['failed'] ?? 0) + (webhookMap['signature_failed'] ?? 0),
					processing: webhookMap['processing'] ?? 0,
				},
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch billing stats");
		return c.json({ error: "Failed to fetch billing stats" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /purchases
// ---------------------------------------------------------------------------
billingRouter.get("/purchases", async (c) => {
	try {
		const db = getDb();
		const query = c.req.query();
		const { limit, offset } = parsePagination(query);
		const { startDate, endDate } = parseDateFilters(query);

		// Resolve provider filter → providerConfigId if needed
		let providerConfigId: number | undefined;
		if (query['provider']) {
			// Filter by provider name isn't a direct column on purchases — skip for now
			// Purchases link to provider_config_id; a full filter would require a join
		}

		// Resolve app_id filter
		let appId: number | undefined;
		if (query['app_id']) {
			const app = await appQueries.findByPublicId(db, query['app_id']);
			if (app) appId = app.id;
		}

		const { items, total } = await purchaseQueries.findAll(db, {
			appId,
			status: query['status'] || undefined,
			providerConfigId,
			startDate,
			endDate,
			limit,
			offset,
		});

		// Enrich with app + user info
		const data = await Promise.all(
			items.map(async (p) => {
				const [app, user, providerConfig] = await Promise.all([
					appQueries.findById(db, p.app_id),
					userQueries.findById(db, p.subject_id),
					paymentProviderConfigQueries.findById(db, p.provider_config_id),
				]);
				return formatPurchase(p, { app, user, providerConfig });
			}),
		);

		return c.json({
			data,
			pagination: { total: Number(total), limit, offset, hasMore: offset + limit < Number(total) },
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch purchases");
		return c.json({ error: "Failed to fetch purchases" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /purchases/:purchaseId
// ---------------------------------------------------------------------------
billingRouter.get("/purchases/:purchaseId", async (c) => {
	try {
		const db = getDb();
		const purchaseId = c.req.param("purchaseId");

		const purchase = await purchaseQueries.findByPublicId(db, purchaseId);
		if (!purchase) {
			return c.json({ error: "Purchase not found" }, 404);
		}

		const [app, user, providerConfig] = await Promise.all([
			appQueries.findById(db, purchase.app_id),
			userQueries.findById(db, purchase.subject_id),
			paymentProviderConfigQueries.findById(db, purchase.provider_config_id),
		]);

		return c.json({ data: formatPurchase(purchase, { app, user, providerConfig }) });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch purchase detail");
		return c.json({ error: "Failed to fetch purchase" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /transactions
// ---------------------------------------------------------------------------
billingRouter.get("/transactions", async (c) => {
	try {
		const db = getDb();
		const query = c.req.query();
		const { limit, offset } = parsePagination(query);
		const { startDate, endDate } = parseDateFilters(query);

		const { items, total } = await paymentTransactionQueries.findAll(db, {
			type: query['type'] || undefined,
			status: query['status'] || undefined,
			provider: query['provider'] || undefined,
			startDate,
			endDate,
			limit,
			offset,
		});

		// Enrich with purchase info
		const data = await Promise.all(
			items.map(async (tx) => {
				const purchase = await purchaseQueries.findById(db, tx.purchase_id);
				return formatTransaction(tx, { purchase });
			}),
		);

		return c.json({
			data,
			pagination: { total: Number(total), limit, offset, hasMore: offset + limit < Number(total) },
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch transactions");
		return c.json({ error: "Failed to fetch transactions" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /webhooks
// ---------------------------------------------------------------------------
billingRouter.get("/webhooks", async (c) => {
	try {
		const db = getDb();
		const query = c.req.query();
		const { limit, offset } = parsePagination(query);
		const { startDate, endDate } = parseDateFilters(query);

		const { items, total } = await webhookLogQueries.findAll(db, {
			provider: query['provider'] || undefined,
			status: query['status'] || undefined,
			eventType: query['event_type'] || undefined,
			startDate,
			endDate,
			limit,
			offset,
		});

		return c.json({
			webhooks: items.map(formatWebhookLog),
			pagination: { total: Number(total), limit, offset, hasMore: offset + limit < Number(total) },
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch webhook logs");
		return c.json({ error: "Failed to fetch webhook logs" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /webhooks/:webhookId
// ---------------------------------------------------------------------------
billingRouter.get("/webhooks/:webhookId", async (c) => {
	try {
		const db = getDb();
		const webhookId = c.req.param("webhookId");

		const webhook = await webhookLogQueries.findByPublicId(db, webhookId);
		if (!webhook) {
			return c.json({ error: "Webhook log not found" }, 404);
		}

		return c.json(formatWebhookDetail(webhook));
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch webhook detail");
		return c.json({ error: "Failed to fetch webhook log" }, 500);
	}
});

// ---------------------------------------------------------------------------
// POST /webhooks/:webhookId/retry
// ---------------------------------------------------------------------------
billingRouter.post("/webhooks/:webhookId/retry", async (c) => {
	try {
		const db = getDb();
		const webhookId = c.req.param("webhookId");

		const webhook = await webhookLogQueries.findByPublicId(db, webhookId);
		if (!webhook) {
			return c.json({ error: "Webhook log not found" }, 404);
		}

		if (!["failed", "signature_failed", "skipped"].includes(webhook.status)) {
			return c.json(
				{ error: `Webhook retry allowed only for failed/signature_failed/skipped. Current status: ${webhook.status}` },
				400,
			);
		}

		if (!webhook.signature) {
			return c.json({ error: "Cannot retry webhook: missing stored signature" }, 400);
		}

		const rawBody =
			typeof webhook.request_body === "string"
				? webhook.request_body
				: typeof (webhook.request_body as Record<string, unknown> | null)?.["rawBody"] === "string"
					? String((webhook.request_body as Record<string, unknown>)["rawBody"])
					: JSON.stringify(webhook.request_body ?? {});

		await db
			.update(webhook_logs)
			.set({
				status: "not_started",
				processing_started_at: null,
				processing_completed_at: null,
				processing_duration_ms: null,
				error_message: null,
				error_stack: null,
				retry_count: sql`${webhook_logs.retry_count} + 1`,
				last_retry_at: new Date(),
				notes: "Manual retry requested from admin dashboard",
				updated_at: new Date(),
			})
			.where(sql`${webhook_logs.id} = ${webhook.id}`);

		await enqueueWebhookProcessing(
			webhook.provider,
			rawBody,
			webhook.signature,
			webhook.ip_address || "unknown",
			webhook.id,
		);

		return c.json({
			success: true,
			webhookId: webhook.public_id,
			status: "queued",
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to retry webhook");
		return c.json({ error: "Failed to retry webhook" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /refunds
// ---------------------------------------------------------------------------
billingRouter.get("/refunds", async (c) => {
	try {
		const db = getDb();
		const query = c.req.query();
		const { limit, offset } = parsePagination(query);
		const { startDate, endDate } = parseDateFilters(query);

		const { items, total } = await paymentTransactionQueries.findAll(db, {
			type: "refund",
			status: query['status'] || undefined,
			provider: query['provider'] || undefined,
			startDate,
			endDate,
			limit,
			offset,
		});

		// Enrich with purchase info
		const refunds = await Promise.all(
			items.map(async (tx) => {
				const purchase = await purchaseQueries.findById(db, tx.purchase_id);
				const purchaseApp = purchase
					? await appQueries.findById(db, purchase.app_id)
					: undefined;
				return formatRefund(tx, { purchase, purchaseApp });
			}),
		);

		return c.json({
			refunds,
			pagination: { total: Number(total), limit, offset, hasMore: offset + limit < Number(total) },
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch refunds");
		return c.json({ error: "Failed to fetch refunds" }, 500);
	}
});

// ---------------------------------------------------------------------------
// POST /refunds
// ---------------------------------------------------------------------------
const CreateRefundSchema = z.object({
	purchase_id: z.string().min(1),
	amount: z.number().int().positive(),
	reason: z.string().min(1).max(1000),
});

billingRouter.post("/refunds", async (c) => {
	try {
		const db = getDb();
		const body = await c.req.json();
		const parsed = CreateRefundSchema.safeParse(body);

		if (!parsed.success) {
			return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
		}

		const { purchase_id, amount, reason } = parsed.data;

		// Look up purchase
		const purchase = await purchaseQueries.findByPublicId(db, purchase_id);
		if (!purchase) {
			return c.json({ error: "Purchase not found" }, 404);
		}

		if (purchase.status !== "completed") {
			return c.json({ error: "Can only refund completed purchases" }, 400);
		}

		// Get provider config for provider name
		const providerConfig = await paymentProviderConfigQueries.findById(
			db,
			purchase.provider_config_id,
		);
		if (!providerConfig) {
			return c.json({ error: "Provider configuration not found" }, 500);
		}

		// Find original transaction for this purchase
		const purchaseTxs = await paymentTransactionQueries.findByPurchaseId(db, purchase.id);
		const originalTx = purchaseTxs.find((t) => t.type === "purchase" && t.status === "success");

		// Create refund transaction record
		const refundTx = await paymentTransactionQueries.create(db, {
			public_id: createId("paymentTransaction"),
			purchase_id: purchase.id,
			license_id: originalTx?.license_id ?? 0,
			provider_config_id: purchase.provider_config_id,
			provider: providerConfig.provider,
			provider_transaction_id: `refund_${createId("paymentTransaction")}`,
			type: "refund",
			status: "pending",
			amount_cents: amount,
			currency: originalTx?.currency ?? "usd",
			description: reason,
			transaction_date: new Date(),
		});

		return c.json({ refund: formatRefund(refundTx, { purchase }) }, 201);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Invalid request", details: error.issues }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Failed to create refund");
		return c.json({ error: "Failed to create refund" }, 500);
	}
});
