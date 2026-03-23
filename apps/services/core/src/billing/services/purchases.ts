/**
 * Purchases Service
 * 
 * Handles creation of purchase, transaction, subscription, and license records
 */

import type { Database } from "@nube-auth/db";
import { eq, priceQueries, purchaseQueries, sql, } from "@nube-auth/db";
import {
	apps,
	licenses,
	license_history,
	purchases,
	prices as pricesTable,
	subscriptions,
	users,
	plans,
	payment_transactions,
} from "@nube-auth/db/schema";
import { createLogger, serializeError, id } from "@nube-auth/shared";
import type { PaymentDetails } from "../adapters/types.js";

const log = createLogger("purchases-service");

interface CreatePurchaseParams {
	paymentDetails: PaymentDetails;
	providerConfigId: number;
	provider: string;
}

/**
 * Create all purchase-related records in database
 */
export async function createPurchaseRecords(
	db: Database,
	params: CreatePurchaseParams
): Promise<void> {
	try {
		const { paymentDetails, providerConfigId, provider } = params;

		// Extract app, user, and plan IDs from metadata
		const appPublicId = paymentDetails.metadata?.["appId"] as string | undefined;
		const userPublicId = paymentDetails.metadata?.["userId"] as string | undefined;
		const planPublicId = paymentDetails.metadata?.["planId"] as string | undefined;
		const pricePublicId = paymentDetails.metadata?.["priceId"] as string | undefined;
		const interval = paymentDetails.metadata?.["interval"] as string | undefined; // 'month' | 'year' | 'one_time'

		if (!appPublicId || !userPublicId || !planPublicId) {
			log.error(
				{ metadata: paymentDetails.metadata },
				"Missing required metadata (appId, userId, or planId)"
			);
			throw new Error("Missing required metadata");
		}

		// Get app internal ID
		const app = await db.query.apps.findFirst({
			where: eq(apps.public_id, appPublicId),
			columns: { id: true },
		});

		if (!app) {
			log.error({ appPublicId }, "App not found");
			throw new Error("App not found");
		}

		// Get user internal ID
		const user = await db.query.users.findFirst({
			where: eq(users.public_id, userPublicId),
			columns: { id: true },
		});

		if (!user) {
			log.error({ userPublicId }, "User not found");
			throw new Error("User not found");
		}

		// Get plan internal ID
		const plan = await db.query.plans.findFirst({
			where: eq(plans.public_id, planPublicId),
			columns: { id: true },
		});

		if (!plan) {
			log.error({ planPublicId }, "Plan not found");
			throw new Error("Plan not found");
		}

		// Find the price record — prefer the priceId stored in metadata (set at checkout time)
		// since there can be multiple prices per plan+provider (monthly/yearly).
		// Fall back to plan+provider lookup for backwards-compat with older webhook events.
		let price: { id: number; interval: string | null; amount_cents: number; currency: string; duration_days: number | null; billing_type: string | null } | undefined;
		if (pricePublicId) {
			price = await priceQueries.findByPublicId(db, pricePublicId) as typeof price;
		}
		if (!price) {
			price = await db.query.prices.findFirst({
				where: (p, { and, eq: eqCol }) =>
					and(
						eqCol(p.plan_id, plan.id),
						eqCol(p.external_provider, provider),
						eqCol(p.is_active, true),
					),
				columns: { id: true, interval: true, amount_cents: true, currency: true, duration_days: true, billing_type: true },
			});
		}

		if (!price) {
			throw new Error("Price not found for plan and provider");
		}

		// If a purchaseId was embedded in the checkout metadata, update that pending record.
		// Otherwise create a new one. This prevents duplicates when the pending record was
		// already created at checkout initiation time.
		const pendingPurchaseId = paymentDetails.metadata?.["purchaseId"] as string | undefined;
		const webhookStatus = paymentDetails.status === "succeeded" ? "completed" : paymentDetails.status === "failed" ? "failed" : "pending";
		const providerSessionId = paymentDetails.metadata?.["sessionId"] || paymentDetails.transactionId;

		let purchase: typeof purchases.$inferSelect;
		const existingPurchase = pendingPurchaseId
			? await purchaseQueries.findByPublicId(db, pendingPurchaseId)
			: undefined;

		if (existingPurchase) {
			// Update the pending record created at checkout time
			const [updatedPurchase] = await db
				.update(purchases)
				.set({
					status: webhookStatus,
					provider_session_id: providerSessionId || existingPurchase.provider_session_id,
					updated_at: new Date(),
				})
				.where(eq(purchases.id, existingPurchase.id))
				.returning();
			if (!updatedPurchase) throw new Error("Failed to update pending purchase record");
			purchase = updatedPurchase;
			log.info({ purchaseId: purchase.public_id, status: webhookStatus }, "Pending purchase record updated by webhook");
		} else {
			// No pre-existing pending record — create one now (backwards compat / webhook-only flow)
			const [newPurchase] = await db
				.insert(purchases)
				.values({
					public_id: pendingPurchaseId ?? id.request(),
					app_id: app.id,
					subject_type: "user",
					subject_id: user.id,
					price_id: price.id,
					provider_config_id: providerConfigId,
					provider_session_id: providerSessionId,
					status: webhookStatus,
				})
				.returning();
			if (!newPurchase) throw new Error("Failed to create purchase record");
			purchase = newPurchase;
			log.info({ purchaseId: purchase.public_id }, "Purchase record created by webhook");
		}

		// Calculate valid_until based on price duration
		const LIFETIME_DATE = new Date('2099-12-31T23:59:59.000Z');
		let validUntil: Date;
		if (price.duration_days) {
			validUntil = new Date(Date.now() + price.duration_days * 24 * 60 * 60 * 1000);
		} else if (price.billing_type === 'recurring' && price.interval) {
			// Recurring subscriptions without an explicit duration_days: derive from interval
			const daysToAdd = price.interval === 'year' ? 365 : 30;
			validUntil = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
		} else {
			// Lifetime / one_time with no duration_days — use fixed far-future date
			validUntil = LIFETIME_DATE;
		}

		// Upsert license (update if exists for this user+app, create if not)
		const existingLicense = await db.query.licenses.findFirst({
			where: sql`${licenses.user_id} = ${user.id} AND ${licenses.app_id} = ${app.id}`,
			columns: { id: true, public_id: true, plan_id: true, status: true, valid_until: true },
		});

		let license: typeof licenses.$inferSelect;
		let createdLicense = false;

		if (existingLicense) {
			// Update existing license
			const [updatedLicense] = await db
				.update(licenses)
				.set({
					plan_id: plan.id,
					status: "active",
					valid_until: validUntil,
					updated_at: new Date(),
				})
				.where(eq(licenses.id, existingLicense.id))
				.returning();

		if (!updatedLicense) {
			throw new Error("Failed to update license");
		}

		license = updatedLicense;

		log.info(
			{ licenseId: license.public_id, userId: userPublicId, appId: appPublicId },
			"License updated via purchase"
		);
		} else {
			// Create new license - handle race condition where another webhook creates it first
			try {
				const [newLicense] = await db
					.insert(licenses)
					.values({
						public_id: id.license(),
						user_id: user.id,
						app_id: app.id,
						plan_id: plan.id,
						status: "active",
						valid_until: validUntil,
					})
					.returning();

				if (!newLicense) {
					throw new Error("Failed to create license");
				}

				license = newLicense;

				log.info(
					{ licenseId: license.public_id, userId: userPublicId, appId: appPublicId },
					"License created"
				);

				createdLicense = true;
			} catch (error) {
				// Handle unique constraint violation (race condition with parallel webhooks)
				if ((error as any)?.code === "23505" && (error as any)?.constraint === "licenses_user_app_unique") {
					log.info(
						{ userId: userPublicId, appId: appPublicId },
						"License already exists (created by parallel webhook), fetching existing license"
					);

					// Fetch the license that was created by the other webhook
					const raceLicense = await db.query.licenses.findFirst({
						where: sql`${licenses.user_id} = ${user.id} AND ${licenses.app_id} = ${app.id}`,
					});

					if (!raceLicense) {
						throw new Error("License not found after race condition");
					}

					// Update it with the current plan/validity
					const [updatedRaceLicense] = await db
						.update(licenses)
						.set({
							plan_id: plan.id,
							status: "active",
							valid_until: validUntil,
							updated_at: new Date(),
						})
						.where(eq(licenses.id, raceLicense.id))
						.returning();

					if (!updatedRaceLicense) {
						throw new Error("Failed to update license after race condition");
					}

					license = updatedRaceLicense;

					log.info(
						{ licenseId: license.public_id, userId: userPublicId, appId: appPublicId },
						"License updated after race condition"
					);
				} else {
					// Re-throw if it's a different error
					throw error;
				}
			}
		}

		const [paymentTransaction] = await db
			.insert(payment_transactions)
			.values({
				public_id: id.request(),
				purchase_id: purchase.id,
				license_id: license.id,
				provider_config_id: providerConfigId,
				provider,
				provider_transaction_id: paymentDetails.transactionId,
				provider_customer_id: paymentDetails.customerId || null,
				type: paymentDetails.subscriptionId ? "renewal" : "purchase",
			// Normalize provider status values to the DB enum: 'success' | 'failed' | 'pending' | 'disputed'
			status: paymentDetails.status === "succeeded" ? "success" : paymentDetails.status === "failed" ? "failed" : "pending",
				amount_cents: paymentDetails.amount,
				currency: paymentDetails.currency,
				discount_applied_cents: 0,
				discount_applied: false,
				promotion_id: null,
				promotion_code_id: null,
				provider_discount_id: paymentDetails.metadata?.["discountId"] || null,
				description: `Purchase - ${interval || "one-time"}`,
				metadata: paymentDetails.metadata || {},
				transaction_date: new Date(),
			})
			.returning();

		if (!paymentTransaction) {
			throw new Error("Failed to create payment transaction record");
		}

		await db
			.update(purchases)
			.set({ payment_transaction_id: paymentTransaction.id })
			.where(eq(purchases.id, purchase.id));

		if (paymentDetails.subscriptionId) {
			const [subscription] = await db
				.insert(subscriptions)
				.values({
					public_id: id.request(),
					user_id: user.id,
					app_id: app.id,
					license_id: license.id,
					price_id: price.id,
					provider_config_id: providerConfigId,
					provider,
					provider_subscription_id: paymentDetails.subscriptionId,
					provider_customer_id: paymentDetails.customerId || null,
					status: "active",
					billing_interval: price.interval || "month",
					billing_period_start: new Date(),
					billing_period_end: null,
					next_billing_date: null,
					cancel_at_period_end: false,
					canceled_at: null,
					ended_at: null,
					amount_cents: price.amount_cents,
					currency: price.currency || "usd",
					metadata: paymentDetails.metadata || {},
					trial_start: null,
					trial_end: null,
				})
				.returning();

			if (subscription) {
				log.info({ subscriptionId: subscription.public_id }, "Subscription record created");
			}
		}

		if (createdLicense) {
			await db.insert(license_history).values({
				public_id: id.auditLog(),
				license_id: license.id,
				change_type: "created",
				reason: "purchase",
				old_value: null,
				new_value: {
					plan_id: plan.id,
					status: "active",
					valid_until: validUntil?.toISOString() || null,
				},
				changed_by_system: true,
				payment_transaction_id: paymentTransaction.id,
				notes: `License created via purchase - ${interval || "one-time"}`,
			});
		}
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to create purchase records");
		throw error;
	}
}
/**
 * Legacy export for backward compatibility
 */
export const PurchasesService = {
	createRecords: createPurchaseRecords,
};
