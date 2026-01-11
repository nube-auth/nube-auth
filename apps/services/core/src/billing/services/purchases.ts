/**
 * Purchases Service
 * 
 * Handles creation of purchase, transaction, subscription, and license records
 */

import type { Database } from "@proofa/db";
import { eq, sql, and } from "@proofa/db";
import {
	apps,
	licenses,
	license_history,
	purchases,
	subscriptions,
	users,
	plans,
	payment_transactions,
	plan_provider_prices,
} from "@proofa/db/schema";
import { createLogger, serializeError, id } from "@proofa/shared";
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
			columns: { id: true, duration_days: true },
		});

		if (!plan) {
			log.error({ planPublicId }, "Plan not found");
			throw new Error("Plan not found");
		}

		const planPrice = await db.query.plan_provider_prices.findFirst({
			where: (plan_provider_prices, { and, eq }) =>
				and(eq(plan_provider_prices.plan_id, plan.id), eq(plan_provider_prices.provider_config_id, providerConfigId)),
			columns: { id: true, interval: true, amount_cents: true, currency: true },
		});

		if (!planPrice) {
			throw new Error("Plan price not found for provider");
		}

		// Create purchase record
		const [purchase] = await db
			.insert(purchases)
			.values({
				public_id: id.request(),
				app_id: app.id,
				subject_type: "user",
				subject_id: user.id,
				plan_provider_price_id: planPrice.id,
				provider_config_id: providerConfigId,
				provider_session_id: paymentDetails.metadata?.["sessionId"] || paymentDetails.transactionId,
				status: paymentDetails.status === "succeeded" ? "completed" : paymentDetails.status === "failed" ? "failed" : "pending",
			})
			.returning();

		if (!purchase) {
			throw new Error("Failed to create purchase record");
		}

		log.info({ purchaseId: purchase.public_id }, "Purchase record created");

		// Calculate valid_until based on plan duration
		let validUntil: Date | null = null;
		if (plan.duration_days) {
			validUntil = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000);
		}
		// If duration_days is null, valid_until stays null (lifetime license)

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
			// Create new license
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
				status: paymentDetails.status,
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
					purchase_id: purchase.id,
					license_id: license.id,
					provider_config_id: providerConfigId,
					provider,
					provider_subscription_id: paymentDetails.subscriptionId,
					provider_customer_id: paymentDetails.customerId || null,
					plan_provider_price_id: planPrice.id,
					status: "active",
					billing_interval: planPrice.interval || "monthly",
					billing_period_start: new Date(),
					billing_period_end: null,
					next_billing_date: null,
					cancel_at_period_end: false,
					canceled_at: null,
					ended_at: null,
					amount_cents: planPrice.amount_cents,
					currency: planPrice.currency || "usd",
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
