import { and, apps, getDb, inArray, isNull, licenses, plans, projectMemberQueries, userQueries } from "@nube-auth/db";
import { createLogger, serializeError } from "@nube-auth/shared";
import { Hono } from "hono";

const log = createLogger("admin-global-licenses");

/**
 * Global license listing routes (not app-scoped).
 * Mounted at: /v1/admin/licenses
 * Results are limited to projects the caller belongs to.
 */
export const globalLicensesRouter = new Hono();

// ---------------------------------------------------------------------------
// GET / — List licenses for apps in the caller's projects
// ---------------------------------------------------------------------------
globalLicensesRouter.get("/", async (c) => {
	try {
		const userPublicId = c.req.header("X-Nube-User-Id");
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const db = getDb();
		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const memberships = await projectMemberQueries.findByUserId(db, user.id);
		const projectIds = memberships.filter((member) => member.deleted_at == null).map((member) => member.project_id);
		if (projectIds.length === 0) return c.json({ licenses: [] });

		const memberApps = await db
			.select({ id: apps.id, public_id: apps.public_id })
			.from(apps)
			.where(and(inArray(apps.project_id, projectIds), isNull(apps.deleted_at)));
		if (memberApps.length === 0) return c.json({ licenses: [] });

		const appIds = memberApps.map((app) => app.id);
		const appPublicIds = new Map(memberApps.map((app) => [app.id, app.public_id]));
		const licenseRows = await db
			.select({
				public_id: licenses.public_id,
				app_id: licenses.app_id,
				plan_id: licenses.plan_id,
				status: licenses.status,
				valid_until: licenses.valid_until,
				created_at: licenses.created_at,
			})
			.from(licenses)
			.where(inArray(licenses.app_id, appIds));

		const planIds = [...new Set(licenseRows.map((license) => license.plan_id))];
		const planRows =
			planIds.length === 0
				? []
				: await db.select({ id: plans.id, name: plans.name }).from(plans).where(inArray(plans.id, planIds));
		const planNames = new Map(planRows.map((plan) => [plan.id, plan.name]));

		return c.json({
			licenses: licenseRows.map((license) => ({
				id: license.public_id,
				appId: appPublicIds.get(license.app_id) ?? null,
				plan: planNames.get(license.plan_id) ?? "unknown",
				status: license.status,
				validUntil: license.valid_until ? new Date(license.valid_until).toISOString() : null,
				createdAt: new Date(license.created_at).toISOString(),
			})),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to fetch global licenses");
		return c.json({ error: "Failed to fetch licenses" }, 500);
	}
});
