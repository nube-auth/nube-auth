/**
 * Webhook Event Processor
 *
 * Processes all webhook events and updates license states accordingly
 */

import { getDb, licenses, eq } from "@proofa/db";
import { createLogger, serializeError } from "@proofa/shared";
import type { PaymentDetails } from "../adapters/types.js";
import { licenseManager } from "./license-manager.js";
import { createPurchaseRecords } from "./purchases.js";

const log = createLogger("webhook-processor");

interface ProcessWebhookParams {
	paymentDetails: PaymentDetails;
	providerConfigId: number;
	provider: string;
	eventType: string;
}

/**
 * Process webhook events and update license states
 */
export async function processWebhookEvent(params: ProcessWebhookParams): Promise<void> {
	const { paymentDetails, providerConfigId, provider, eventType } = params;

	try {
		log.info(
			{
				eventType,
				provider,
				status: paymentDetails.status,
				transactionId: paymentDetails.transactionId,
			},
			"Processing webhook event"
		);

		// Handle different event types
		switch (paymentDetails.status) {
			case "succeeded":
				await handleSuccessfulPayment(paymentDetails, providerConfigId, provider);
				break;

			case "canceled":
				await handleSubscriptionCancellation(paymentDetails, provider);
				break;

			case "failed":
				await handleFailedPayment(paymentDetails, provider);
				break;

			case "refunded":
				await handleRefund(paymentDetails, provider);
				break;

			case "pending":
				log.info({ transactionId: paymentDetails.transactionId }, "Payment pending, no action taken");
				break;

			default:
				log.warn({ status: paymentDetails.status }, "Unknown payment status");
		}
	} catch (error) {
		log.error(
			{
				err: serializeError(error as Error),
				eventType,
				transactionId: paymentDetails.transactionId,
			},
			"Failed to process webhook event"
		);
		throw error;
	}
}

/**
 * Handle successful payment (initial purchase or renewal)
 */
async function handleSuccessfulPayment(
	paymentDetails: PaymentDetails,
	providerConfigId: number,
	provider: string
): Promise<void> {
	const db = getDb();

	try {
		// Create all purchase records (this handles both new licenses and renewals)
		await createPurchaseRecords(db, {
			paymentDetails,
			providerConfigId,
			provider,
		});

		log.info(
			{
				transactionId: paymentDetails.transactionId,
				customerEmail: paymentDetails.customerEmail,
			},
			"Successful payment processed"
		);
	} catch (error) {
		log.error(
			{
				err: serializeError(error as Error),
				transactionId: paymentDetails.transactionId,
			},
			"Failed to handle successful payment"
		);
		throw error;
	}
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancellation(paymentDetails: PaymentDetails, provider: string): Promise<void> {
	const db = getDb();

	try {
		// Find license by subscription ID
		const license = await findLicenseBySubscriptionId(paymentDetails.subscriptionId || "");

		if (!license) {
			log.warn(
				{
					subscriptionId: paymentDetails.subscriptionId,
					provider,
				},
				"License not found for subscription cancellation"
			);
			return;
		}

		// Cancel the license
		await licenseManager.cancelLicense(license.id, "Subscription canceled by customer", {
			subscriptionId: paymentDetails.subscriptionId,
			provider,
			canceledAt: new Date().toISOString(),
		});

		log.info(
			{
				licenseId: license.public_id,
				subscriptionId: paymentDetails.subscriptionId,
			},
			"License canceled due to subscription cancellation"
		);
	} catch (error) {
		log.error(
			{
				err: serializeError(error as Error),
				subscriptionId: paymentDetails.subscriptionId,
			},
			"Failed to handle subscription cancellation"
		);
		throw error;
	}
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(paymentDetails: PaymentDetails, provider: string): Promise<void> {
	const db = getDb();

	try {
		// Find license by subscription ID or customer email
		let license = await findLicenseBySubscriptionId(paymentDetails.subscriptionId || "");

		if (!license && paymentDetails.customerEmail) {
			// Fallback: try to find by email
			const appId = paymentDetails.metadata?.["appId"] as string | undefined;
			if (appId) {
				const app = await db.query.apps.findFirst({
					where: (apps, { eq }) => eq(apps.public_id, appId),
					columns: { id: true },
				});

				if (app) {
					license = await licenseManager.findLicenseByEmailAndApp(paymentDetails.customerEmail, app.id);
				}
			}
		}

		if (!license) {
			log.warn(
				{
					subscriptionId: paymentDetails.subscriptionId,
					customerEmail: paymentDetails.customerEmail,
					provider,
				},
				"License not found for failed payment"
			);
			return;
		}

		// Suspend the license (not cancel - give them a grace period)
		const gracePeriodDays = 7; // 7-day grace period
		const gracePeriodEnd = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);

		await licenseManager.suspendLicense(license.id, "Payment failed - grace period until cancellation", {
			subscriptionId: paymentDetails.subscriptionId,
			provider,
			failedAt: new Date().toISOString(),
			gracePeriodEnd: gracePeriodEnd.toISOString(),
			amount: paymentDetails.amount,
		});

		log.info(
			{
				licenseId: license.public_id,
				subscriptionId: paymentDetails.subscriptionId,
				gracePeriodEnd,
			},
			"License suspended due to failed payment"
		);

		// TODO: Send email notification to user about failed payment
	} catch (error) {
		log.error(
			{
				err: serializeError(error as Error),
				subscriptionId: paymentDetails.subscriptionId,
			},
			"Failed to handle failed payment"
		);
		throw error;
	}
}

/**
 * Handle refund
 */
async function handleRefund(paymentDetails: PaymentDetails, provider: string): Promise<void> {
	const db = getDb();

	try {
		// Find license by transaction ID or customer email
		let license = await findLicenseByTransactionId(paymentDetails.transactionId);

		if (!license && paymentDetails.customerEmail) {
			// Fallback: try to find by email
		const appId = paymentDetails.metadata?.["appId"];
			if (appId) {
				const app = await db.query.apps.findFirst({
					where: (apps, { eq }) => eq(apps.public_id, appId),
					columns: { id: true },
				});

				if (app) {
					license = await licenseManager.findLicenseByEmailAndApp(paymentDetails.customerEmail, app.id);
				}
			}
		}

		if (!license) {
			log.warn(
				{
					transactionId: paymentDetails.transactionId,
					customerEmail: paymentDetails.customerEmail,
					provider,
				},
				"License not found for refund"
			);
			return;
		}

		// Refund the license
		await licenseManager.refundLicense(license.id, "Payment refunded", {
			transactionId: paymentDetails.transactionId,
			provider,
			refundedAt: new Date().toISOString(),
			refundAmount: paymentDetails.amount,
		});

		log.info(
			{
				licenseId: license.public_id,
				transactionId: paymentDetails.transactionId,
				refundAmount: paymentDetails.amount,
			},
			"License refunded"
		);

		// TODO: Send email notification to user about refund
	} catch (error) {
		log.error(
			{
				err: serializeError(error as Error),
				transactionId: paymentDetails.transactionId,
			},
			"Failed to handle refund"
		);
		throw error;
	}
}

/**
 * Find license by subscription ID
 */
async function findLicenseBySubscriptionId(subscriptionId: string) {
	if (!subscriptionId) return null;

	const db = getDb();

	try {
		// Find subscription record first
		const subscription = await db.query.subscriptions.findFirst({
			where: (subscriptions, { eq }) => eq(subscriptions.provider_subscription_id, subscriptionId),
			columns: { purchase_id: true },
		});

		if (!subscription) {
			return null;
		}

		// Find purchase to get user and app IDs
		const purchase = await db.query.purchases.findFirst({
			where: (purchases, { eq }) => eq(purchases.id, subscription.purchase_id),
			columns: { app_id: true, subject_id: true },
		});

		if (!purchase) {
			return null;
		}

		// Find license (subject_id is user_id in Phase 1)
		const license = await db.query.licenses.findFirst({
			where: (licenses, { and, eq, isNull }) =>
				and(eq(licenses.user_id, purchase.subject_id), eq(licenses.app_id, purchase.app_id), isNull(licenses.deleted_at)),
		});

		return license || null;
	} catch (error) {
		log.error(
			{
				err: serializeError(error as Error),
				subscriptionId,
			},
			"Failed to find license by subscription ID"
		);
		return null;
	}
}

/**
 * Find license by transaction ID
 */
async function findLicenseByTransactionId(transactionId: string) {
	if (!transactionId) return null;

	const db = getDb();

	try {
		// Find payment transaction
		const paymentTransaction = await db.query.payment_transactions.findFirst({
			where: (payment_transactions, { eq }) => eq(payment_transactions.provider_transaction_id, transactionId),
			columns: { license_id: true },
		});

		if (!paymentTransaction?.license_id) {
			return null;
		}

		// Get license
		const license = await db.query.licenses.findFirst({
			where: (licenses, { eq }) => eq(licenses.id, paymentTransaction.license_id),
		});

		return license || null;
	} catch (error) {
		log.error(
			{
				err: serializeError(error as Error),
				transactionId,
			},
			"Failed to find license by transaction ID"
		);
		return null;
	}
}
