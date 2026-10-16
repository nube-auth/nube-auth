import { appQueries, getDb, projectMemberQueries, projectQueries, sessionQueries, userQueries } from "@nube-auth/db";
import { createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context, Next } from "hono";

const log = createLogger("admin-access");
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface AdminResourceIds {
	projectPublicId: string | null;
	appPublicId: string | null;
	routingAppInternalId: number | null;
}

function patternBody(pattern: RegExp): string {
	return pattern.source.replace(/^\^/, "").replace(/\$$/, "");
}

/** Pull project, app, and numeric routing-rule ids out of an admin path. */
export function adminResourceFromPath(path: string): AdminResourceIds {
	const projectMatch = path.match(new RegExp(`/projects/(${patternBody(idPatterns.project)})(?:/|$)`));
	const appMatch = path.match(new RegExp(`/apps/(${patternBody(idPatterns.app)})(?:/|$)`));
	const routingMatch = path.match(/\/routing-rules\/(\d+)(?:\/|$)/);
	const routingId = routingMatch?.[1] ? Number(routingMatch[1]) : null;

	return {
		projectPublicId: projectMatch?.[1] ?? null,
		appPublicId: appMatch?.[1] ?? null,
		routingAppInternalId: routingId != null && Number.isInteger(routingId) && routingId > 0 ? routingId : null,
	};
}

function roleAllows(role: string | null, method: string): boolean {
	if (!role) return false;
	if (!WRITE_METHODS.has(method)) return true;
	return role === "owner" || role === "admin";
}

/**
 * Bind every admin call to the forwarded session, then deny access to a
 * project or app the caller does not belong to.
 */
export async function enforceAdminAccess(c: Context, next: Next) {
	const userPublicId = c.req.header("X-Nube-User-Id");
	const sessionPublicId = c.req.header("X-Nube-Session-Id");
	if (!userPublicId || !sessionPublicId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const db = getDb();
		const user = await userQueries.findByPublicId(db, userPublicId);
		const session = await sessionQueries.findByPublicId(db, sessionPublicId);
		const sessionLive =
			session != null &&
			user != null &&
			session.user_id === user.id &&
			session.revoked_at == null &&
			session.expires_at.getTime() > Date.now();
		if (!sessionLive || !user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const resource = adminResourceFromPath(c.req.path);
		let projectInternalId: number | null = null;

		if (resource.appPublicId) {
			const app = await appQueries.findByPublicId(db, resource.appPublicId);
			if (!app) return c.json({ error: "Not found" }, 404);
			projectInternalId = app.project_id;
		} else if (resource.routingAppInternalId != null) {
			const app = await appQueries.findByInternalId_(db, resource.routingAppInternalId);
			if (!app) return c.json({ error: "Not found" }, 404);
			projectInternalId = app.project_id;
		} else if (resource.projectPublicId) {
			const project = await projectQueries.findByPublicId(db, resource.projectPublicId);
			if (!project) return c.json({ error: "Not found" }, 404);
			projectInternalId = project.id;
		}

		if (resource.projectPublicId && projectInternalId != null && resource.appPublicId) {
			const project = await projectQueries.findByPublicId(db, resource.projectPublicId);
			if (!project || project.id !== projectInternalId) {
				return c.json({ error: "Not found" }, 404);
			}
		}

		if (projectInternalId != null) {
			const memberships = await projectMemberQueries.findByProjectAndUser(db, projectInternalId, user.id);
			const member = memberships.find((row) => row.deleted_at == null);
			if (!roleAllows(member?.role ?? null, c.req.method)) {
				return c.json({ error: "Forbidden" }, 403);
			}
		}

		c.set("adminUserId", user.public_id);
		return next();
	} catch (error) {
		log.error({ err: serializeError(error as Error), path: c.req.path }, "Admin access check failed");
		return c.json({ error: "Unauthorized" }, 401);
	}
}
