import { appQueries, licenseQueries, planQueries, priceQueries, type Database } from "@nube-auth/db";
import { createId, createLogger, serializeError, type PlanSettings } from "@nube-auth/shared";

const log = createLogger("license-utils");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Auto-provision a license for a user on their first login to an app.
 * Uses the app's defaultPlanId from plan_settings JSONB.
 * No-op if the user already has a license, or if the app has no default plan.
 */
export async function ensureLicenseForApp(
	db: Database,
	userId: number,
	appPublicId?: string,
): Promise<void> {
	if (!appPublicId) return;

	try {
		const app = await appQueries.findByPublicId(db, appPublicId);
		if (!app) return;

		const planSettings = app.plan_settings as unknown as PlanSettings;
		if (planSettings?.licensingRequired === false) return;

		const existing = await licenseQueries.findByUserAndApp(db, userId, app.id);
		if (existing) return;

		const existingAny = await licenseQueries.findAnyByUserAndApp(db, userId, app.id);

		if (!planSettings?.defaultPlanId) {
			log.warn({ appId: appPublicId }, "Auto-license skipped: defaultPlanId not set in plan_settings");
			return;
		}

		const plan = await planQueries.findById(db, planSettings.defaultPlanId);
		if (!plan || plan.app_id !== app.id || plan.status !== "active" || plan.deleted_at) {
			log.warn(
				{ appId: appPublicId, planId: planSettings.defaultPlanId },
				"Auto-license skipped: default plan invalid or inactive",
			);
			return;
		}

		const now = new Date();
		let validUntil: Date | null = null;

		const activePrices = await priceQueries.findActiveByPlanId(db, plan.id);
		const defaultPrice = activePrices[0] ?? null;

		if (defaultPrice?.trial_enabled && defaultPrice.trial_days) {
			validUntil = new Date(now.getTime() + defaultPrice.trial_days * ONE_DAY_MS);
		} else if (defaultPrice?.duration_days) {
			validUntil = new Date(now.getTime() + defaultPrice.duration_days * ONE_DAY_MS);
		}

		if (existingAny) {
			await licenseQueries.update(db, existingAny.id, {
				plan_id: plan.id,
				price_id: null,
				status: "active",
				valid_until: validUntil,
				source: "auto_free",
				max_activations: null,
				metadata: null,
				deleted_at: null,
				updated_at: now,
			});
		} else {
			await licenseQueries.create(db, {
				public_id: createId("license"),
				user_id: userId,
				app_id: app.id,
				plan_id: plan.id,
				status: "active",
				valid_until: validUntil,
				created_at: now,
				updated_at: now,
			});
		}

		log.info({ appId: appPublicId, userId, planId: plan.public_id }, "Auto-license created");
	} catch (licenseError) {
		log.error({ appId: appPublicId, err: serializeError(licenseError as Error) }, "Auto-license creation failed");
	}
}
