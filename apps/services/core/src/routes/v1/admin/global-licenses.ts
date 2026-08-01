import { appQueries, getDb, licenseQueries, planQueries } from "@nube-auth/db";
import { createLogger, serializeError } from "@nube-auth/shared";
import { Hono } from "hono";

const log = createLogger("admin-global-licenses");

/**
 * Global license listing routes (not app-scoped).
 * Mounted at: /v1/admin/licenses
 */
export const globalLicensesRouter = new Hono();

function formatLicenseDTO(license: any, extras?: { app?: any; plan?: any }) {
	return {
		id: license.public_id,
		appId: extras?.app?.public_id ?? null,
		plan: extras?.plan?.name ?? "unknown",
		status: license.status,
		validUntil: license.valid_until
			? new Date(license.valid_until).toISOString()
			: null,
		createdAt: new Date(license.created_at).toISOString(),
	};
}

// ---------------------------------------------------------------------------
// GET / — List all licenses across all apps
// ---------------------------------------------------------------------------
globalLicensesRouter.get("/", async (c) => {
	try {
		const db = getDb();

		// Get all apps, then all licenses across them
		const apps = await db.query.apps.findMany();
		const allLicenses = [];

		for (const app of apps) {
			const appLicenses = await licenseQueries.findByAppId(db, app.id);
			for (const lic of appLicenses) {
				const plan = lic.plan_id ? await planQueries.findByInternalId_(db, lic.plan_id) : undefined;
				allLicenses.push(formatLicenseDTO(lic, { app, plan }));
			}
		}

		return c.json({ licenses: allLicenses });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch global licenses");
		return c.json({ error: "Failed to fetch licenses" }, 500);
	}
});
