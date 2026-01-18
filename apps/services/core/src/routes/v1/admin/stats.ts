import {
	appQueries,
	getDb,
	licenseQueries,
	planQueries,
	projectQueries,
} from "@proofa/db";
import { createLogger, idPatterns, serializeError } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";

const log = createLogger("admin-stats-routes");

export const statsRouter = new Hono();

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

		// Get apps in project
		const apps = await appQueries.findByProjectId(db, project.id);

		// Get all licenses for apps in this project
		const appIds = apps.map((a) => a.id);
		let totalLicenses = 0;
		let activeLicenses = 0;
		const uniqueUsers = new Set<number>();
		const licenseCounts: Record<string, number> = {};

		for (const appId of appIds) {
			const appLicenses = await licenseQueries.findByAppId(db, appId);
			totalLicenses += appLicenses.length;

			for (const license of appLicenses) {
				if (license.status === "active") {
					activeLicenses++;
				}

				uniqueUsers.add(license.user_id);

				// Count by plan
				const plan = await planQueries.findById(db, license.plan_id);
				if (plan) {
					licenseCounts[plan.slug] = (licenseCounts[plan.slug] || 0) + 1;
				}
			}
		}

		return c.json({
			projectId,
			totalApps: apps.length,
			totalUsers: uniqueUsers.size,
			totalLicenses,
			activeLicenses,
			licenseCounts,
			totalRevenue: 0, // Stub for now
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

		// Get all licenses for this app
		const licenses = await licenseQueries.findByAppId(db, app.id);
		const activeLicenses = licenses.filter((l) => l.status === "active");
		const uniqueUsers = new Set(licenses.map((l) => l.user_id));
		const licenseCounts: Record<string, number> = {};

		for (const license of licenses) {
			const plan = await planQueries.findById(db, license.plan_id);
			if (plan) {
				licenseCounts[plan.slug] = (licenseCounts[plan.slug] || 0) + 1;
			}
		}

		return c.json({
			appId,
			totalLicenses: licenses.length,
			activeLicenses: activeLicenses.length,
			totalUsers: uniqueUsers.size,
			licenseCounts,
			totalRevenue: 0, // Stub for now
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get app stats error");
		return c.json({ error: "Failed to get app stats" }, 500);
	}
});
