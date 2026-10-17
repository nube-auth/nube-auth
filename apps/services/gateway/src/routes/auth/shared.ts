import { appQueries, getDb, projectMemberQueries, projectQueries, userQueries } from "@nube-auth/db";
import { createLogger, type SessionEntitlements } from "@nube-auth/shared";
import type { Context } from "hono";
import { env } from "../../config/env";

export const log = createLogger("auth-routes");

/**
 * Safely extract string values from cookie attributes
 * Handles cases where attributes might be typed as string | string[]
 */
export function safeAttrString(value: unknown): string {
	if (typeof value === "string") return value;
	if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") return value[0];
	return String(value);
}

export function safeAttrBoolean(value: unknown): boolean {
	return value === true || value === "true";
}

export function safeAttrNumber(value: unknown): number | undefined {
	if (typeof value === "number") return value;
	if (typeof value === "string") return parseInt(value, 10);
	if (Array.isArray(value) && value.length > 0) return safeAttrNumber(value[0]);
	return undefined;
}

export function safeParseUrl(value: string | undefined): URL | null {
	if (!value) return null;
	try {
		return new URL(value);
	} catch {
		return null;
	}
}

export function inferAudience(c: Context): "user" | "admin" {
	const audience = c.req.query("audience");
	if (audience === "admin") return "admin";
	if (audience === "user") return "user";

	const originOrReferer = c.req.header("origin") || c.req.header("referer") || "";
	const requestHost = safeParseUrl(originOrReferer)?.host || "";

	const adminHost = safeParseUrl(env.ADMIN_DASHBOARD_URL)?.host || "";
	const userHost = safeParseUrl(env.USER_DASHBOARD_URL)?.host || "";

	if (adminHost && requestHost === adminHost) return "admin";
	if (userHost && requestHost === userHost) return "user";

	// Fallback heuristics for hosted environments
	if (
		requestHost.startsWith("manage.") ||
		requestHost.startsWith("s-manage.") ||
		requestHost.includes("manage.nubeauth.") ||
		requestHost.includes("manage.nube-auth.") ||
		requestHost.includes("admin.nube-auth.")
	) {
		return "admin";
	}
	return "user";
}

/**
 * Build session entitlements for a user based on audience type.
 * Admin: project memberships with roles and app resources.
 * User: basic identity entitlement.
 */
export async function buildEntitlements(
	userPublicId: string,
	audience: "user" | "admin",
): Promise<SessionEntitlements> {
	if (audience === "user") {
		return { identity: { role: "user" } };
	}

	// Admin: build entitlements from project memberships
	const db = getDb();
	const user = await userQueries.findByPublicId(db, userPublicId);
	if (!user) {
		return {};
	}

	const memberships = await projectMemberQueries.findByUserId(db, user.id);
	const entitlements: SessionEntitlements = {};

	for (const membership of memberships) {
		// Get project public_id
		const project = await projectQueries.findByInternalId_(db, membership.project_id);
		if (!project) continue;

		// Get apps for this project
		const projectApps = await appQueries.findByProjectId(db, membership.project_id);
		const appPublicIds = projectApps.map((a) => a.public_id);

		entitlements[project.public_id] = {
			role: membership.role,
			resources: appPublicIds,
		};
	}

	return entitlements;
}
