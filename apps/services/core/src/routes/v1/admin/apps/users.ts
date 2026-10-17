import {
	activationQueries,
	appQueries,
	appUserQueries,
	auditLogQueries,
	getDb,
	licenseQueries,
	planQueries,
	projectMemberQueries,
	projectQueries,
	sessionQueries,
	subscriptionQueries,
	userQueries,
} from "@nube-auth/db";
import { createId, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { requiredParam } from "../../../../utils/route-param.js";

import { log } from "./shared.js";

const userRoutes = new Hono();

/**
 * GET /:projectId/apps/:appId/users
 * List users of an app (via licenses)
 */
userRoutes.get("/:projectId/apps/:appId/users", async (c: Context) => {
	try {
		const projectId = requiredParam(c, "projectId");
		const appId = requiredParam(c, "appId");

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

		// Get all users who have ever authenticated with this app (persistent, not session-based)
		const appUserRows = await appUserQueries.findByAppId(db, app.id);

		// Build a license map keyed by user_id for O(1) lookup
		const appLicenses = await licenseQueries.findByAppId(db, app.id);
		const licenseByUserId = new Map(appLicenses.map((l) => [l.user_id, l]));

		// Build plan map to avoid repeated DB calls
		const planIds = [...new Set(appLicenses.map((l) => l.plan_id))];
		const planMap = new Map<number, { name: string; slug: string }>();
		for (const planId of planIds) {
			const plan = await planQueries.findByInternalId_(db, planId);
			if (plan) planMap.set(planId, { name: plan.name, slug: plan.slug });
		}

		const usersList = await Promise.all(
			appUserRows.map(async (row) => {
				const user = await userQueries.findByInternalId_(db, row.user_id);
				if (!user) return null;

				const license = licenseByUserId.get(user.id);
				const plan = license ? planMap.get(license.plan_id) : undefined;

				return {
					id: user.public_id,
					name: user.name || null,
					email: user.primary_email,
					avatarUrl: user.avatar_url || null,
					primaryEmailVerified: user.primary_email_verified,
					plan: plan?.slug ?? null,
					status: license?.status ?? "no_license",
					createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
					lastSeenAt: Math.floor(new Date(row.last_seen_at).getTime() / 1000),
					licenseValidUntil: license?.valid_until
						? Math.floor(new Date(license.valid_until).getTime() / 1000)
						: null,
				};
			}),
		);

		const validUsers = usersList.filter((u) => u !== null);

		return c.json({
			users: validUsers,
			total: validUsers.length,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get app users error");
		return c.json({ error: "Failed to get app users" }, 500);
	}
});

/**
 * POST /:projectId/apps/:appId/users/:userId
 * Remove a user from an app (app-scoped cleanup only; keeps global account)
 */
userRoutes.post("/:projectId/apps/:appId/users/:userId", async (c: Context) => {
	try {
		const projectId = requiredParam(c, "projectId");
		const appId = requiredParam(c, "appId");
		const targetUserId = requiredParam(c, "userId");

		if (!appId || !idPatterns.app.test(appId)) {
			return c.json({ error: "Invalid appId" }, 400);
		}

		if (!targetUserId || !idPatterns.user.test(targetUserId)) {
			return c.json({ error: "Invalid userId" }, 400);
		}

		const requesterUserId = c.req.header("X-Nube-User-Id");
		if (!requesterUserId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project || app.project_id !== project.id) {
			return c.json({ error: "App not found in this project" }, 404);
		}

		const requester = await userQueries.findByPublicId(db, requesterUserId);
		if (!requester) {
			return c.json({ error: "User not found" }, 404);
		}

		const targetUser = await userQueries.findByPublicId(db, targetUserId);
		if (!targetUser) {
			return c.json({ error: "Target user not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, requester.id);
		const userMember = member?.[0];
		if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
			return c.json({ error: "Forbidden" }, 403);
		}

		const result = await db.transaction(async (txn: any) => {
			const revokedSessions = await sessionQueries.revokeByUserAndApp(txn, targetUser.id, app.id);
			const endedSubscriptions = await subscriptionQueries.endByUserAndApp(txn, targetUser.id, app.id);

			const license = await licenseQueries.findByUserAndApp(txn, targetUser.id, app.id);
			let deactivatedActivations = 0;
			let licenseRemoved = false;
			if (license) {
				deactivatedActivations = await activationQueries.deactivateByLicenseId(txn, license.id);
				await licenseQueries.delete(txn, license.id);
				licenseRemoved = true;
			}

			const removedAppMembership = await appUserQueries.deleteByAppAndUser(txn, app.id, targetUser.id);

			return {
				revokedSessions,
				endedSubscriptions,
				deactivatedActivations,
				licenseRemoved,
				removedAppMembership: removedAppMembership > 0,
			};
		});

		try {
			await auditLogQueries.create(db, {
				public_id: createId("auditLog"),
				user_id: requester.id,
				project_id: project.id,
				app_id: app.id,
				action: "app.user.removed",
				entity_type: "app_user",
				entity_id: targetUser.public_id,
				changes: {
					targetUserId: targetUser.public_id,
					revokedSessions: result.revokedSessions,
					endedSubscriptions: result.endedSubscriptions,
					deactivatedActivations: result.deactivatedActivations,
					licenseRemoved: result.licenseRemoved,
					removedAppMembership: result.removedAppMembership,
				},
				ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
			});
		} catch (auditError) {
			log.error({ err: serializeError(auditError as Error) }, "Failed to create audit log");
		}

		return c.json({
			message: "User removed from app successfully",
			userId: targetUser.public_id,
			appId: app.public_id,
			projectId: project.public_id,
			cleanup: result,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Remove app user error");
		return c.json({ error: "Failed to remove user from app" }, 500);
	}
});

export { userRoutes };
