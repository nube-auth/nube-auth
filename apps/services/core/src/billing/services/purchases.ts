/**
 * Purchases Service
 *
 * Handles all purchase-related operations:
 * - Creating purchases from plan selections
 * - Tracking checkout sessions
 * - Completing purchases after payment
 * - Expiring abandoned purchases
 * - Updating purchase status
 */

import { createLogger, createId } from "@proofa/shared";
import { getDb, eq, and } from "@proofa/db";
import {
	purchases,
	payment_transactions,
	promotion_codes,
	promotion_redemptions,
	plan_provider_prices,
	type purchase,
} from "@proofa/db/schema";

const log = createLogger("purchases-service");

/**
 * Purchase creation input
 */
export interface CreatePurchaseInput {
	appId: number;
	subjectType: "user" | "project" | "organization";
	subjectId: number;
	planProvidePriceId: number;
	providerConfigId: number;
	promotionCodeId?: number;
	providerSessionId: string;
}

/**
 * Purchase completion input
 */
export interface CompletePurchaseInput {
	purchaseId: number;
	paymentTransactionId?: number;
	providerSessionId?: string;
}

/**
 * Purchase status type
 */
export type PurchaseStatus = "pending" | "completed" | "expired" | "abandoned" | "failed";

/**
 * Purchase with related data
 */
export interface PurchaseWithRelations {
	id: number;
	publicId: string;
	appId: number;
	subjectType: string;
	subjectId: number;
	planProvidePriceId: number;
	providerConfigId: number;
	promotionCodeId?: number;
	providerSessionId: string;
	status: PurchaseStatus;
	paymentTransactionId?: number;
	createdAt: Date;
	updatedAt: Date;
	discount?: {
		codeId: number;
		code: string;
		discountCents: number;
	};
	paymentTransaction?: {
		id: number;
		amount: number;
		status: string;
	};
}

/**
 * Purchases service for managing purchase lifecycle
 */
export class PurchasesService {
	/**
	 * Create a new purchase
	 */
	static async createPurchase(input: CreatePurchaseInput): Promise<PurchaseWithRelations> {
		const db = getDb();

		try {
			// Validate plan_provider_price exists
			const planPrice = await db
				.select()
				.from(plan_provider_prices)
				.where(eq(plan_provider_prices.id, input.planProvidePriceId))
				.then((rows) => rows[0]);

			if (!planPrice) {
				throw new Error(`Plan provider price not found: ${input.planProvidePriceId}`);
			}

			// Validate provider config exists
			const providerConfig = await db
				.select()
				.from((await import("@proofa/db/schema")).payment_provider_configs)
				.where(eq((await import("@proofa/db/schema")).payment_provider_configs.id, input.providerConfigId))
				.then((rows) => rows[0]);

			if (!providerConfig) {
				throw new Error(`Payment provider config not found: ${input.providerConfigId}`);
			}

			// Validate promotion code if provided
			if (input.promotionCodeId) {
				const promoCode = await db
					.select()
					.from(promotion_codes)
					.where(
						and(
							eq(promotion_codes.id, input.promotionCodeId),
							eq(promotion_codes.app_id, input.appId),
						),
					)
					.then((rows) => rows[0]);

				if (!promoCode) {
					throw new Error(`Promotion code not found: ${input.promotionCodeId}`);
				}

				if (!promoCode.is_active) {
					throw new Error("Promotion code is not active");
				}

				if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
					throw new Error("Promotion code has reached maximum uses");
				}
			}

			// Create purchase
			const newPurchase = await db
				.insert(purchases)
				.values({
					public_id: createId("purchase"),
					app_id: input.appId,
					subject_type: input.subjectType,
					subject_id: input.subjectId,
					plan_provider_price_id: input.planProvidePriceId,
					provider_config_id: input.providerConfigId,
					promotion_code_id: input.promotionCodeId || null,
					provider_session_id: input.providerSessionId,
					status: "pending",
					created_at: new Date(),
					updated_at: new Date(),
				})
				.returning();

			const purchase = newPurchase[0];

			log.info(
				{
					purchaseId: purchase.id,
					appId: input.appId,
					subject: `${input.subjectType}:${input.subjectId}`,
				},
				"Purchase created",
			);

			return this.formatPurchase(purchase);
		} catch (error) {
			log.error({ err: error as Error, input }, "Failed to create purchase");
			throw error;
		}
	}

	/**
	 * Get purchase by ID
	 */
	static async getPurchase(purchaseId: number): Promise<PurchaseWithRelations | null> {
		const db = getDb();

		try {
			const purchase = await db
				.select()
				.from(purchases)
				.where(eq(purchases.id, purchaseId))
				.then((rows) => rows[0]);

			if (!purchase) {
				return null;
			}

			return this.formatPurchase(purchase);
		} catch (error) {
			log.error({ err: error as Error, purchaseId }, "Failed to get purchase");
			throw error;
		}
	}

	/**
	 * Get purchase by provider session ID
	 */
	static async getPurchaseByProviderSession(
		providerSessionId: string,
	): Promise<PurchaseWithRelations | null> {
		const db = getDb();

		try {
			const purchase = await db
				.select()
				.from(purchases)
				.where(eq(purchases.provider_session_id, providerSessionId))
				.then((rows) => rows[0]);

			if (!purchase) {
				return null;
			}

			return this.formatPurchase(purchase);
		} catch (error) {
			log.error({ err: error as Error, providerSessionId }, "Failed to get purchase by session");
			throw error;
		}
	}

	/**
	 * Get purchases for a subject
	 */
	static async getPurchasesForSubject(
		appId: number,
		subjectType: string,
		subjectId: number,
		limit = 50,
		offset = 0,
	): Promise<PurchaseWithRelations[]> {
		const db = getDb();

		try {
			const results = await db
				.select()
				.from(purchases)
				.where(
					and(
						eq(purchases.app_id, appId),
						eq(purchases.subject_type, subjectType),
						eq(purchases.subject_id, subjectId),
					),
				)
				.limit(limit)
				.offset(offset);

			return results.map((p) => this.formatPurchase(p));
		} catch (error) {
			log.error({ err: error as Error, appId, subjectType, subjectId }, "Failed to get subject purchases");
			throw error;
		}
	}

	/**
	 * Complete a purchase with payment transaction
	 */
	static async completePurchase(
		purchaseId: number,
		paymentTransactionId?: number,
	): Promise<PurchaseWithRelations> {
		const db = getDb();

		try {
			const purchase = await db
				.select()
				.from(purchases)
				.where(eq(purchases.id, purchaseId))
				.then((rows) => rows[0]);

			if (!purchase) {
				throw new Error(`Purchase not found: ${purchaseId}`);
			}

			// Update purchase status
			const updated = await db
				.update(purchases)
				.set({
					status: "completed",
					payment_transaction_id: paymentTransactionId || null,
					updated_at: new Date(),
				})
				.where(eq(purchases.id, purchaseId))
				.returning();

			// Increment promotion code usage if applied
			if (purchase.promotion_code_id) {
				await db
					.update(promotion_codes)
					.set({
						current_uses: (promotion_codes.current_uses ?? 0) + 1,
						updated_at: new Date(),
					})
					.where(eq(promotion_codes.id, purchase.promotion_code_id));
			}

			log.info(
				{
					purchaseId,
					transactionId: paymentTransactionId,
				},
				"Purchase completed",
			);

			return this.formatPurchase(updated[0]);
		} catch (error) {
			log.error({ err: error as Error, purchaseId }, "Failed to complete purchase");
			throw error;
		}
	}

	/**
	 * Expire a purchase (e.g., checkout session expired)
	 */
	static async expirePurchase(purchaseId: number): Promise<PurchaseWithRelations> {
		const db = getDb();

		try {
			const updated = await db
				.update(purchases)
				.set({
					status: "expired",
					updated_at: new Date(),
				})
				.where(eq(purchases.id, purchaseId))
				.returning();

			log.info({ purchaseId }, "Purchase expired");

			return this.formatPurchase(updated[0]);
		} catch (error) {
			log.error({ err: error as Error, purchaseId }, "Failed to expire purchase");
			throw error;
		}
	}

	/**
	 * Mark purchase as failed
	 */
	static async failPurchase(purchaseId: number, reason?: string): Promise<PurchaseWithRelations> {
		const db = getDb();

		try {
			const updated = await db
				.update(purchases)
				.set({
					status: "failed",
					updated_at: new Date(),
				})
				.where(eq(purchases.id, purchaseId))
				.returning();

			log.info({ purchaseId, reason }, "Purchase failed");

			return this.formatPurchase(updated[0]);
		} catch (error) {
			log.error({ err: error as Error, purchaseId }, "Failed to mark purchase as failed");
			throw error;
		}
	}

	/**
	 * Mark old pending purchases as abandoned
	 * Useful for cleanup - call periodically for purchases older than 24h
	 */
	static async abandonPendingPurchases(hoursOld = 24): Promise<number> {
		const db = getDb();

		try {
			const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000);

			const result = await db
				.update(purchases)
				.set({
					status: "abandoned",
					updated_at: new Date(),
				})
				.where(and(eq(purchases.status, "pending"), eq(purchases.created_at, cutoffDate)));

			const updatedCount = Array.isArray(result) ? result.length : 0;

			if (updatedCount > 0) {
				log.info({ hoursOld, count: updatedCount }, "Purchases marked as abandoned");
			}

			return updatedCount;
		} catch (error) {
			log.error({ err: error as Error }, "Failed to abandon pending purchases");
			throw error;
		}
	}

	/**
	 * Get purchase analytics
	 */
	static async getPurchaseAnalytics(appId: number): Promise<{
		totalPurchases: number;
		completedPurchases: number;
		pendingPurchases: number;
		failedPurchases: number;
		totalRevenueCents: number;
	}> {
		const db = getDb();

		try {
			const appPurchases = await db
				.select()
				.from(purchases)
				.where(eq(purchases.app_id, appId));

			const completed = appPurchases.filter((p) => p.status === "completed");
			const pending = appPurchases.filter((p) => p.status === "pending");
			const failed = appPurchases.filter((p) => p.status === "failed");

			// Get total revenue from completed purchases
			let totalRevenueCents = 0;
			for (const purchase of completed) {
				if (purchase.payment_transaction_id) {
					const transaction = await db
						.select()
						.from(payment_transactions)
						.where(eq(payment_transactions.id, purchase.payment_transaction_id))
						.then((rows) => rows[0]);

					if (transaction) {
						totalRevenueCents += transaction.amount || 0;
					}
				}
			}

			return {
				totalPurchases: appPurchases.length,
				completedPurchases: completed.length,
				pendingPurchases: pending.length,
				failedPurchases: failed.length,
				totalRevenueCents,
			};
		} catch (error) {
			log.error({ err: error as Error, appId }, "Failed to get purchase analytics");
			throw error;
		}
	}

	/**
	 * Format purchase record with relations
	 */
	private static formatPurchase(purchase: typeof purchase.$inferSelect): PurchaseWithRelations {
		return {
			id: purchase.id,
			publicId: purchase.public_id,
			appId: purchase.app_id,
			subjectType: purchase.subject_type,
			subjectId: purchase.subject_id,
			planProvidePriceId: purchase.plan_provider_price_id,
			providerConfigId: purchase.provider_config_id,
			promotionCodeId: purchase.promotion_code_id || undefined,
			providerSessionId: purchase.provider_session_id,
			status: purchase.status as PurchaseStatus,
			paymentTransactionId: purchase.payment_transaction_id || undefined,
			createdAt: purchase.created_at,
			updatedAt: purchase.updated_at,
		};
	}
}
