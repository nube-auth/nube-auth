import { appQueries, getDb, licenseQueries, planQueries, projectQueries, userQueries } from "@proofa/db";
import { createLogger, idPatterns, serializeError } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";

const log = createLogger("admin-license-management-routes");

export const licenseManagementRouter = new Hono();

/**
 * GET /:projectId/licenses
 * List all licenses for a project
 */
licenseManagementRouter.get("/:projectId/licenses", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const { status, appId } = c.req.query() as { status?: string; appId?: string };

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		const db = getDb();

		// Get project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get all apps in project
		const apps = await appQueries.findByProjectId(db, project.id);
		let appIds = apps.map((a) => a.id);

		// Filter by specific app if provided
		if (appId) {
			if (!idPatterns.app.test(appId)) {
				return c.json({ error: "Invalid appId" }, 400);
			}
			const app = apps.find((a) => a.public_id === appId);
			if (!app) {
				return c.json({ error: "App not found in this project" }, 404);
			}
			appIds = [app.id];
		}

		// Collect all licenses
		const allLicenses: any[] = [];
		for (const appId of appIds) {
			const licenses = await licenseQueries.findByAppId(db, appId);
			for (const license of licenses) {
				// Filter by status if provided
				if (status && license.status !== status) {
					continue;
				}

				const app = apps.find((a) => a.id === appId);
				const user = await userQueries.findById(db, license.user_id);
				const plan = await planQueries.findById(db, license.plan_id);

				allLicenses.push({
					id: license.public_id,
					appId: app?.public_id,
					appName: app?.name,
					userId: user?.public_id,
					userEmail: user?.primary_email,
					userName: user?.name,
					planId: plan?.public_id,
					planName: plan?.name,
					planSlug: plan?.slug,
					status: license.status,
					validUntil: license.valid_until ? new Date(license.valid_until).toISOString() : null,
					createdAt: new Date(license.created_at).toISOString(),
					updatedAt: new Date(license.updated_at).toISOString(),
				});
			}
		}

		return c.json({
			licenses: allLicenses,
			total: allLicenses.length,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "List licenses error");
		return c.json({ error: "Failed to list licenses" }, 500);
	}
});

/**
 * GET /:projectId/licenses/summary
 * Get license summary/statistics for a project
 */
licenseManagementRouter.get("/:projectId/licenses/summary", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		const db = getDb();

		// Get project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get all apps in project
		const apps = await appQueries.findByProjectId(db, project.id);

		// Collect statistics
		let totalLicenses = 0;
		let activeLicenses = 0;
		let expiredLicenses = 0;
		let revokedLicenses = 0;
		const uniqueUsers = new Set<number>();
		const licenseCounts: Record<string, number> = {};
		const statusCounts = { active: 0, expired: 0, revoked: 0 };

		const now = new Date();

		for (const app of apps) {
			const licenses = await licenseQueries.findByAppId(db, app.id);

			for (const license of licenses) {
				totalLicenses++;
				uniqueUsers.add(license.user_id);

				// Count by status
				if (license.status === "active") {
					if (license.valid_until && new Date(license.valid_until) < now) {
						expiredLicenses++;
						statusCounts.expired++;
					} else {
						activeLicenses++;
						statusCounts.active++;
					}
				} else if (license.status === "revoked") {
					revokedLicenses++;
					statusCounts.revoked++;
				}

				// Count by plan
				const plan = await planQueries.findById(db, license.plan_id);
				if (plan) {
					licenseCounts[plan.slug] = (licenseCounts[plan.slug] || 0) + 1;
				}
			}
		}

		return c.json({
			projectId,
			totalLicenses,
			activeLicenses,
			expiredLicenses,
			revokedLicenses,
			uniqueUsers: uniqueUsers.size,
			statusCounts,
			licenseCounts,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get license summary error");
		return c.json({ error: "Failed to get license summary" }, 500);
	}
});

/**
 * PATCH /:projectId/licenses/:licenseId
 * Update license status or plan
 */
licenseManagementRouter.patch("/:projectId/licenses/:licenseId", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const licenseId = c.req.param("licenseId");
		const { status, planSlug, validUntil } = (await c.req.json()) as {
			status?: string;
			planSlug?: string;
			validUntil?: number;
		};

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		if (!licenseId || !idPatterns.license.test(licenseId)) {
			return c.json({ error: "Invalid licenseId" }, 400);
		}

		if (!status && !planSlug && validUntil === undefined) {
			return c.json({ error: "Must provide at least one field to update: status, planSlug, or validUntil" }, 400);
		}

		const userId = c.req.header("X-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		// Get project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get requesting user and check authorization
		const requestingUser = await userQueries.findByPublicId(db, userId);
		if (!requestingUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get all apps in project and search for the license
		const apps = await appQueries.findByProjectId(db, project.id);
		let targetLicense: any = null;

		for (const app of apps) {
			const appLicenses = await licenseQueries.findByAppId(db, app.id);
			const found = appLicenses.find((l) => l.public_id === licenseId);
			if (found) {
				targetLicense = found;
				break;
			}
		}

		if (!targetLicense) {
			return c.json({ error: "License not found" }, 404);
		}

		// Check authorization: must be owner or admin of project
		const projectMembersModule = await import("@proofa/db").then((m) => m.projectMemberQueries);
		const memberCheck = await projectMembersModule.findByProjectAndUser(db, project.id, requestingUser.id);
		const member = memberCheck?.[0];
		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			return c.json({ error: "Forbidden" }, 403);
		}

		// Build update data
		const updateData: Record<string, any> = {};

		if (status) {
			if (!["active", "expired", "revoked"].includes(status)) {
				return c.json({ error: 'Invalid status. Must be "active", "expired", or "revoked"' }, 400);
			}
			updateData["status"] = status;
		}

		if (planSlug) {
			const app = await appQueries.findById(db, targetLicense.app_id);
			const newPlan = await planQueries.findByAppAndSlug(db, app!.id, planSlug);
			if (!newPlan) {
				return c.json({ error: `Plan "${planSlug}" not found for this app` }, 404);
			}
			updateData["plan_id"] = newPlan.id;
		}

		if (validUntil !== undefined) {
			updateData["valid_until"] = validUntil > 0 ? new Date(validUntil) : null;
		}

		// Update license
		const updateResults = await licenseQueries.update(db, targetLicense.id, updateData);
		const updated = updateResults[0];

		if (!updated) {
			return c.json({ error: "Failed to update license" }, 500);
		}

		return c.json({
			id: updated.public_id,
			status: updated.status,
			validUntil: updated.valid_until ? new Date(updated.valid_until).toISOString() : null,
			updatedAt: new Date(updated.updated_at).toISOString(),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Update license error");
		return c.json({ error: "Failed to update license" }, 500);
	}
});

/**
 * DELETE /:projectId/licenses/:licenseId
 * Revoke a license
 */
licenseManagementRouter.delete("/:projectId/licenses/:licenseId", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const licenseId = c.req.param("licenseId");

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		if (!licenseId || !idPatterns.license.test(licenseId)) {
			return c.json({ error: "Invalid licenseId" }, 400);
		}

		const userId = c.req.header("X-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		// Get project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get requesting user and check authorization
		const requestingUser = await userQueries.findByPublicId(db, userId);
		if (!requestingUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get all apps in project and search for the license
		const apps = await appQueries.findByProjectId(db, project.id);
		let targetLicense: any = null;

		for (const app of apps) {
			const appLicenses = await licenseQueries.findByAppId(db, app.id);
			const found = appLicenses.find((l) => l.public_id === licenseId);
			if (found) {
				targetLicense = found;
				break;
			}
		}

		if (!targetLicense) {
			return c.json({ error: "License not found" }, 404);
		}

		// Check authorization: must be owner or admin of project
		const projectMembersModule = await import("@proofa/db").then((m) => m.projectMemberQueries);
		const memberCheck = await projectMembersModule.findByProjectAndUser(db, project.id, requestingUser.id);
		const member = memberCheck?.[0];
		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			return c.json({ error: "Forbidden" }, 403);
		}

		// Revoke license (soft delete by setting status to revoked)
		const revokeResults = await licenseQueries.update(db, targetLicense.id, { status: "revoked" });
		const _revoked = revokeResults[0];

		return c.json({
			message: "License revoked successfully",
			id: licenseId,
			status: "revoked",
			revokedAt: new Date().toISOString(),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Revoke license error");
		return c.json({ error: "Failed to revoke license" }, 500);
	}
});
