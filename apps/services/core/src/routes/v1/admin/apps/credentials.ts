import { randomBytes } from "node:crypto";
import { cache, readCacheKeys } from "@nube-auth/cache";
import {
	appQueries,
	auditLogQueries,
	getDb,
	projectMemberQueries,
	projectQueries,
	protectSecret,
	revealStoredSecret,
	userQueries,
} from "@nube-auth/db";
import { createId, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { requiredParam } from "../../../../utils/route-param.js";

import { log } from "./shared.js";

const credentialRoutes = new Hono();

/**
 * GET /:projectId/apps/:appId/api-keys
 * Reveal the actual (unmasked) clientSecret and serviceToken for an app.
 * Only accessible to project owners and admins.
 */
credentialRoutes.get("/:projectId/apps/:appId/api-keys", async (c: Context) => {
	try {
		const projectId = requiredParam(c, "projectId");
		const appId = requiredParam(c, "appId");

		if (!appId || !idPatterns.app.test(appId)) {
			return c.json({ error: "Invalid appId" }, 400);
		}

		const userId = c.req.header("X-Nube-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Verify app belongs to project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project || app.project_id !== project.id) {
			return c.json({ error: "App not found in this project" }, 404);
		}

		// Check authorization — owner or admin only
		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}
		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const userMember = member?.[0];
		if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
			return c.json({ error: "Forbidden" }, 403);
		}

		return c.json({
			clientSecret: revealStoredSecret({ clientSecretEnc: app.client_secret_enc }, "clientSecretEnc"),
			serviceToken: revealStoredSecret(
				app.service_token_enc ? { serviceTokenEnc: app.service_token_enc } : null,
				"serviceTokenEnc",
			),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get api-keys error");
		return c.json({ error: "Failed to get API keys" }, 500);
	}
});

/**
 * POST /:projectId/apps/:appId/regenerate-secret
 * Rotate the clientSecret. Returns the new secret (shown once).
 */
credentialRoutes.post("/:projectId/apps/:appId/regenerate-secret", async (c: Context) => {
	try {
		const projectId = requiredParam(c, "projectId");
		const appId = requiredParam(c, "appId");

		if (!appId || !idPatterns.app.test(appId)) {
			return c.json({ error: "Invalid appId" }, 400);
		}

		const userId = c.req.header("X-Nube-User-Id");
		if (!userId) {
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

		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}
		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const userMember = member?.[0];
		if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
			return c.json({ error: "Forbidden" }, 403);
		}

		const clientSecret = randomBytes(32).toString("hex");
		const protectedClientSecret = protectSecret(clientSecret);
		await appQueries.updateAppTokens(db, app.id, {
			clientSecretHash: protectedClientSecret.hash,
			clientSecretEnc: protectedClientSecret.enc,
		});
		await cache.delete(readCacheKeys.clientSecret(app.public_id)).catch((error: unknown) => {
			log.error(
				{ err: serializeError(error as Error), appId: app.public_id },
				"Failed to drop cached app secret",
			);
		});

		try {
			await auditLogQueries.create(db, {
				public_id: createId("auditLog"),
				user_id: user.id,
				project_id: project.id,
				app_id: app.id,
				action: "app.secret.regenerated",
				entity_type: "app",
				entity_id: app.public_id,
				changes: {},
				ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
			});
		} catch (auditError) {
			log.error({ err: serializeError(auditError as Error) }, "Failed to create audit log");
		}

		return c.json({ clientSecret });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Regenerate secret error");
		return c.json({ error: "Failed to regenerate client secret" }, 500);
	}
});

/**
 * POST /:projectId/apps/:appId/regenerate-token
 * Rotate (or generate for the first time) the serviceToken.
 * This token is used by trusted backend services as X-Nube-Service-Token.
 * Returns the new token (shown once).
 */
credentialRoutes.post("/:projectId/apps/:appId/regenerate-token", async (c: Context) => {
	try {
		const projectId = requiredParam(c, "projectId");
		const appId = requiredParam(c, "appId");

		if (!appId || !idPatterns.app.test(appId)) {
			return c.json({ error: "Invalid appId" }, 400);
		}

		const userId = c.req.header("X-Nube-User-Id");
		if (!userId) {
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

		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}
		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const userMember = member?.[0];
		if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
			return c.json({ error: "Forbidden" }, 403);
		}

		const serviceToken = randomBytes(32).toString("hex");
		const protectedServiceToken = protectSecret(serviceToken);
		await appQueries.updateAppTokens(db, app.id, {
			serviceTokenHash: protectedServiceToken.hash,
			serviceTokenEnc: protectedServiceToken.enc,
		});

		try {
			await auditLogQueries.create(db, {
				public_id: createId("auditLog"),
				user_id: user.id,
				project_id: project.id,
				app_id: app.id,
				action: "app.token.regenerated",
				entity_type: "app",
				entity_id: app.public_id,
				changes: {},
				ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
			});
		} catch (auditError) {
			log.error({ err: serializeError(auditError as Error) }, "Failed to create audit log");
		}

		return c.json({ serviceToken });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Regenerate token error");
		return c.json({ error: "Failed to regenerate service token" }, 500);
	}
});

export { credentialRoutes };
