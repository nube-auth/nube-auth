/**
 * License State Management Service
 *
 * Handles all license state transitions with automatic license_history tracking
 */

import { getDb, license_history, licenses, licenseQueries, eq } from "@proofa/db";
import { id, createLogger, serializeError } from "@proofa/shared";

const log = createLogger("license-manager");

export type LicenseStatus = "active" | "expired" | "canceled" | "suspended" | "refunded";
export type ChangeType =
	| "created"
	| "renewed"
	| "upgraded"
	| "downgraded"
	| "expired"
	| "canceled"
	| "suspended"
	| "refunded"
	| "reactivated";

interface LicenseStateTransition {
	licenseId: number;
	newStatus: LicenseStatus;
	changeType: ChangeType;
	validUntil?: Date | null;
	planId?: number;
	reason?: string;
	metadata?: Record<string, unknown>;
}

interface CreateLicenseParams {
	userId: number;
	appId: number;
	planId: number;
	validUntil?: Date | null;
	metadata?: Record<string, unknown>;
}

/**
 * License Manager - Handles all license state transitions
 */
export const licenseManager = {
	/**
	 * Create a new license with history tracking
	 */
	async createLicense(params: CreateLicenseParams) {
		const { userId, appId, planId, validUntil, metadata } = params;
		const db = getDb();

		try {
			// Create license using upsert (handles both new and renewal)
			const license = await licenseQueries.upsert(db, userId, appId, {
				public_id: id.license(),
				plan_id: planId,
				status: "active",
				valid_until: validUntil || null,
			});

			// Create history record
			await db.insert(license_history).values({
				public_id: id.auditLog(),
				license_id: license.id,
				change_type: "created",
				reason: "purchase",
				new_value: {
					status: "active",
					valid_until: validUntil?.toISOString() || null,
					plan_id: planId,
				},
				changed_by_system: true,
				created_at: new Date(),
			});

			log.info(
				{
					licenseId: license.public_id,
					userId,
					appId,
					planId,
				},
				"License created"
			);

			return license;
		} catch (error) {
			log.error(
				{
					err: serializeError(error as Error),
					userId,
					appId,
					planId,
				},
				"Failed to create license"
			);
			throw error;
		}
	},

	/**
	 * Renew an existing license
	 */
	async renewLicense(licenseId: number, validUntil: Date, metadata?: Record<string, unknown>) {
		const db = getDb();

		try {
			// Get existing license
			const [existingLicense] = await db.select().from(licenses).where(eq(licenses.id, licenseId));

			if (!existingLicense) {
				throw new Error(`License ${licenseId} not found`);
			}

			// Update license
			const [updatedLicense] = await db
				.update(licenses)
				.set({
					status: "active",
					valid_until: validUntil,
					updated_at: new Date(),
				})
				.where(eq(licenses.id, licenseId))
				.returning();

			// Create history record
			await db.insert(license_history).values({
				public_id: id.auditLog(),
				license_id: licenseId,
				change_type: "renewed",
				reason: "renewal",
				old_value: {
					status: existingLicense.status,
					valid_until: existingLicense.valid_until?.toISOString() || null,
				},
				new_value: {
					status: "active",
					valid_until: validUntil?.toISOString() || null,
				},
				changed_by_system: true,
				created_at: new Date(),
			});

			log.info(
				{
					licenseId: existingLicense.public_id,
					oldValidUntil: existingLicense.valid_until,
					newValidUntil: validUntil,
				},
				"License renewed"
			);

			return updatedLicense;
		} catch (error) {
			log.error(
				{
					err: serializeError(error as Error),
					licenseId,
				},
				"Failed to renew license"
			);
			throw error;
		}
	},

	/**
	 * Cancel a license (from subscription cancellation)
	 */
	async cancelLicense(licenseId: number, reason?: string, metadata?: Record<string, unknown>) {
		return licenseManager.transitionLicenseState({
			licenseId,
			newStatus: "canceled",
			changeType: "canceled",
			...(reason !== undefined && { reason }),
			...(metadata !== undefined && { metadata }),
		});
	},

	/**
	 * Suspend a license (from failed payment)
	 */
	async suspendLicense(licenseId: number, reason?: string, metadata?: Record<string, unknown>) {
		return licenseManager.transitionLicenseState({
			licenseId,
			newStatus: "suspended",
			changeType: "suspended",
			...(reason !== undefined && { reason }),
			...(metadata !== undefined && { metadata }),
		});
	},

	/**
	 * Refund a license
	 */
	async refundLicense(licenseId: number, reason?: string, metadata?: Record<string, unknown>) {
		return licenseManager.transitionLicenseState({
			licenseId,
			newStatus: "refunded",
			changeType: "refunded",
			...(reason !== undefined && { reason }),
			...(metadata !== undefined && { metadata }),
		});
	},

	/**
	 * Reactivate a suspended or canceled license
	 */
	async reactivateLicense(licenseId: number, validUntil?: Date, metadata?: Record<string, unknown>) {
		return licenseManager.transitionLicenseState({
			licenseId,
			newStatus: "active",
			changeType: "reactivated",
			...(validUntil !== undefined && { validUntil }),
			...(metadata !== undefined && { metadata }),
		});
	},

	/**
	 * Expire a license (when valid_until passes)
	 */
	async expireLicense(licenseId: number, metadata?: Record<string, unknown>) {
		return licenseManager.transitionLicenseState({
			licenseId,
			newStatus: "expired",
			changeType: "expired",
			...(metadata !== undefined && { metadata }),
		});
	},

	/**
	 * Upgrade license to a different plan
	 */
	async upgradeLicense(licenseId: number, newPlanId: number, validUntil?: Date, metadata?: Record<string, unknown>) {
		return licenseManager.transitionLicenseState({
			licenseId,
			newStatus: "active",
			changeType: "upgraded",
			planId: newPlanId,
			...(validUntil !== undefined && { validUntil }),
			...(metadata !== undefined && { metadata }),
		});
	},

	/**
	 * Downgrade license to a different plan
	 */
	async downgradeLicense(licenseId: number, newPlanId: number, validUntil?: Date, metadata?: Record<string, unknown>) {
		return licenseManager.transitionLicenseState({
			licenseId,
			newStatus: "active",
			changeType: "downgraded",
			planId: newPlanId,
			...(validUntil !== undefined && { validUntil }),
			...(metadata !== undefined && { metadata }),
		});
	},

	/**
	 * Core state transition function - handles all license state changes
	 */
	async transitionLicenseState(transition: LicenseStateTransition) {
		const { licenseId, newStatus, changeType, validUntil, planId, reason, metadata } = transition;
		const db = getDb();

		try {
			// Get existing license
			const [existingLicense] = await db.select().from(licenses).where(eq(licenses.id, licenseId));

			if (!existingLicense) {
				throw new Error(`License ${licenseId} not found`);
			}

			// Build update data
			const updateData: Partial<typeof licenses.$inferInsert> = {
				status: newStatus,
				updated_at: new Date(),
			};

			if (validUntil !== undefined) {
				updateData.valid_until = validUntil;
			}

			if (planId !== undefined) {
				updateData.plan_id = planId;
			}

			// Update license
			const [updatedLicense] = await db
				.update(licenses)
				.set(updateData)
				.where(eq(licenses.id, licenseId))
				.returning();

			// Create history record
			await db.insert(license_history).values({
				public_id: id.auditLog(),
				license_id: licenseId,
				change_type: changeType,
				reason: reason || changeType,
				old_value: {
					status: existingLicense.status,
					valid_until: existingLicense.valid_until?.toISOString() || null,
					plan_id: existingLicense.plan_id,
				},
				new_value: {
					status: newStatus,
					valid_until: validUntil !== undefined ? validUntil?.toISOString() || null : existingLicense.valid_until?.toISOString() || null,
					plan_id: planId || existingLicense.plan_id,
				},
				changed_by_system: true,
				created_at: new Date(),
			});

			log.info(
				{
					licenseId: existingLicense.public_id,
					changeType,
					oldStatus: existingLicense.status,
					newStatus,
					reason,
				},
				"License state transitioned"
			);

			return updatedLicense;
		} catch (error) {
			log.error(
				{
					err: serializeError(error as Error),
					licenseId,
					changeType,
					newStatus,
				},
				"Failed to transition license state"
			);
			throw error;
		}
	},

	/**
	 * Find license by user email and app
	 */
	async findLicenseByEmailAndApp(userEmail: string, appId: number) {
		const db = getDb();

		try {
			const result = await db.query.users.findFirst({
				where: (users, { eq }) => eq(users.primary_email, userEmail.toLowerCase()),
				columns: { id: true },
				with: {
					licenses: {
						where: (licenses: any, { eq, and, isNull }: any) =>
							and(eq(licenses.app_id, appId), isNull(licenses.deleted_at)),
						limit: 1,
					},
				},
			});

			return result?.licenses[0] || null;
		} catch (error) {
			log.error(
				{
					err: serializeError(error as Error),
					userEmail,
					appId,
				},
				"Failed to find license by email and app"
			);
			throw error;
		}
	},
};
