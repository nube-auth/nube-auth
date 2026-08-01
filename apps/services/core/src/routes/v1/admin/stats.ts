import {
	appQueries,
	appUserQueries,
	getDb,
	licenseQueries,
	paymentTransactionQueries,
	planQueries,
	projectQueries,
	sessionQueries,
	userQueries,
} from "@nube-auth/db";
import { createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";

const log = createLogger("admin-stats-routes");

export const statsRouter = new Hono();

/**
 * GET /stats
 * Get aggregated stats for all projects accessible by the current user
 */
statsRouter.get("/stats", async (c: Context) => {
	try {
		const userId = c.req.header("X-Nube-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get all projects the user has access to
		const ownedProjects = await projectQueries.findByOwnerId(db, user.id);
		const memberProjects = await projectQueries.findByUserId(db, user.id);

		const seenIds = new Set<number>();
		const allProjects = [];
		for (const p of [...ownedProjects, ...memberProjects]) {
			if (!seenIds.has(p.id)) {
				seenIds.add(p.id);
				allProjects.push(p);
			}
		}

	const stats: Record<string, {
		totalApps: number;
		totalUsers: number;
		totalLicenses: number;
		activeLicenses: number;
		totalRevenue: number;
		revenueByCurrency: Record<string, number>;
	}> = {};

	for (const project of allProjects) {
		const allApps = await appQueries.findByProjectId(db, project.id);
		// Exclude test apps (created by payment testing playground)
		const productionApps = allApps.filter((a) => !a.is_test);

		let totalLicenses = 0;
		let activeLicenses = 0;

		for (const app of productionApps) {
			const appLicenses = await licenseQueries.findByAppId(db, app.id);
			// Exclude test licenses created during payment testing
			const productionLicenses = appLicenses.filter((l) => !l.is_test);
			totalLicenses += productionLicenses.length;
			for (const license of productionLicenses) {
				// Both "active" and "trialing" represent users with live access
				if (license.status === "active" || license.status === "trialing") activeLicenses++;
			}
		}

		const totalUsers = await appUserQueries.countByProjectId(db, project.id);
		const revenueByCurrency = await paymentTransactionQueries.getRevenueByProjectIdGroupedByCurrency(db, project.id);

		// totalRevenue is USD cents converted to dollars for the summary card
		const totalRevenue = (revenueByCurrency["usd"] ?? 0) / 100;

		stats[project.public_id] = {
			totalApps: productionApps.length,
			totalUsers,
			totalLicenses,
			activeLicenses,
			totalRevenue,
			// Each value is in dollars for the respective currency
			revenueByCurrency: Object.fromEntries(
				Object.entries(revenueByCurrency).map(([currency, cents]) => [currency, cents / 100]),
			),
		};
	}

	return c.json({ stats });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get batch project stats error");
		return c.json({ error: "Failed to get project stats" }, 500);
	}
});

/**
 * GET /:projectId/stats
 * Get project statistics
 */
statsRouter.get("/:projectId/stats", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

	// Get apps in project — exclude test apps from the payment testing playground
	const allApps = await appQueries.findByProjectId(db, project.id);
	const apps = allApps.filter((a) => !a.is_test);

	// Fetch all licenses per app up-front (single pass) — used both for plan ID
	// collection and for the per-app aggregation loop below, avoiding a double-fetch.
	const licenseEntries = await Promise.all(
		apps.map(async (a) => [
			a.id,
			(await licenseQueries.findByAppId(db, a.id)).filter((l) => !l.is_test),
		] as [number, Awaited<ReturnType<typeof licenseQueries.findByAppId>>]),
	);
	const licensesByApp = new Map(licenseEntries);

	// Gather unique plan IDs from the already-fetched licenses
	const planIds = [...new Set(
		[...licensesByApp.values()].flat().map((l) => l.plan_id),
	)];
	const planMap = new Map(
		(await Promise.all(planIds.map((id) => planQueries.findByInternalId_(db, id))))
			.filter(Boolean)
			.map((p) => [p!.id, p!]),
	);

	let totalLicenses = 0;
	let activeLicenses = 0;
	const licenseCounts: Record<string, number> = {};

	for (const app of apps) {
		const appLicenses = licensesByApp.get(app.id) ?? [];
		totalLicenses += appLicenses.length;

		for (const license of appLicenses) {
			// Both "active" and "trialing" represent users with live access
			if (license.status === "active" || license.status === "trialing") {
				activeLicenses++;
			}

			// Count by plan slug using pre-fetched plan map (no extra DB query per license)
			const plan = planMap.get(license.plan_id);
			if (plan) {
				licenseCounts[plan.slug] = (licenseCounts[plan.slug] || 0) + 1;
			}
		}
	}

	const totalUsers = await appUserQueries.countByProjectId(db, project.id);
	const revenueByCurrency = await paymentTransactionQueries.getRevenueByProjectIdGroupedByCurrency(db, project.id);

	// totalRevenue is USD amount in dollars for the summary card
	const totalRevenue = (revenueByCurrency["usd"] ?? 0) / 100;

	return c.json({
		projectId,
		totalApps: apps.length,
		totalUsers,
		totalLicenses,
		activeLicenses,
		licenseCounts,
		totalRevenue,
		// Per-currency revenue in dollars (not cents)
		revenueByCurrency: Object.fromEntries(
			Object.entries(revenueByCurrency).map(([currency, cents]) => [currency, cents / 100]),
		),
	});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get project stats error");
		return c.json({ error: "Failed to get project stats" }, 500);
	}
});

/**
 * GET /:projectId/apps/:appId/stats
 * Get app statistics
 */
statsRouter.get("/:projectId/apps/:appId/stats", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");

		if (!appId || !idPatterns.app.test(appId)) {
			return c.json({ error: "Invalid appId" }, 400);
		}

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Verify app belongs to project if projectId provided
		if (projectId) {
			const project = await projectQueries.findByPublicId(db, projectId);
			if (!project || app.project_id !== project.id) {
				return c.json({ error: "App not found in this project" }, 404);
			}
		}

	// Exclude test licenses created by the payment testing playground
	const allLicenses = await licenseQueries.findByAppId(db, app.id);
	const licenses = allLicenses.filter((l) => !l.is_test);

	// Both "active" and "trialing" represent users with live access
	const activeLicenses = licenses.filter(
		(l) => l.status === "active" || l.status === "trialing",
	);

	// Count unique authenticated users from the persistent app_users table.
	// This table is upserted on every login and never deleted, so it accurately
	// reflects all users who have authenticated with this app.
	const totalUsers = await appUserQueries.countByAppId(db, app.id);

	// Count active (non-expired, non-revoked) sessions for this app
	const totalSessions = await sessionQueries.countByAppId(db, app.id);

	// Pre-fetch all referenced plans in one pass to avoid N+1 per license
	const planIds = [...new Set(licenses.map((l) => l.plan_id))];
	const planMap = new Map(
		(await Promise.all(planIds.map((id) => planQueries.findByInternalId_(db, id))))
			.filter(Boolean)
			.map((p) => [p!.id, p!]),
	);

	const licenseCounts: Record<string, number> = {};
	for (const license of licenses) {
		const plan = planMap.get(license.plan_id);
		if (plan) {
			licenseCounts[plan.slug] = (licenseCounts[plan.slug] || 0) + 1;
		}
	}

	const revenueByCurrency = await paymentTransactionQueries.getRevenueByAppIdGroupedByCurrency(db, app.id);

	// totalRevenue is USD amount in dollars for the summary card
	const totalRevenue = (revenueByCurrency["usd"] ?? 0) / 100;

	return c.json({
		appId,
		totalLicenses: licenses.length,
		activeLicenses: activeLicenses.length,
		totalUsers,
		totalSessions,
		licenseCounts,
		totalRevenue,
		// Per-currency revenue in dollars (not cents)
		revenueByCurrency: Object.fromEntries(
			Object.entries(revenueByCurrency).map(([currency, cents]) => [currency, cents / 100]),
		),
	});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get app stats error");
		return c.json({ error: "Failed to get app stats" }, 500);
	}
});
