import { appQueries, getDb, projectMemberQueries, projectQueries, userQueries, paymentProviderConfigQueries } from "@proofa/db";
import { createId, createLogger, idPatterns, serializeError } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";

const log = createLogger("admin-apps-routes");

export const appsRouter = new Hono();

/**
 * GET /:projectId/apps
 * List apps in a project
 */
appsRouter.get("/:projectId/apps", async (c: Context) => {
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

		const appsList = await appQueries.findByProjectId(db, project.id);

		return c.json({
			apps: appsList.map((app) => ({
				id: app.public_id,
				name: app.name,
				slug: app.slug,
				description: app.description,
				enabledProviders: app.enabled_providers || [],
				createdAt: new Date(app.created_at).toISOString(),
				updatedAt: new Date(app.updated_at).toISOString(),
			})),
			total: appsList.length,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get apps error");
		return c.json({ error: "Failed to get apps" }, 500);
	}
});

/**
 * GET /:projectId/apps/:appId/provider-selection
 * Get the selected payment provider config for an app (if any)
 */
appsRouter.get("/:projectId/apps/:appId/provider-selection", async (c: Context) => {
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

		// Verify app belongs to project
		if (projectId) {
			const project = await projectQueries.findByPublicId(db, projectId);
			if (!project || app.project_id !== project.id) {
				return c.json({ error: "App not found in this project" }, 404);
			}
		}

		if (!app.selected_payment_provider_id) {
			return c.json({ selected: null });
		}

		const config = await paymentProviderConfigQueries.findById(db, app.selected_payment_provider_id);
		if (!config) {
			// Config might have been deleted; clear the reference for consistency
			await appQueries.update(db, app.id, { selected_payment_provider_id: null });
			return c.json({ selected: null });
		}

		return c.json({
			selected: {
				id: config.public_id,
				provider: config.provider,
				environment: config.environment,
				isActive: config.is_active,
				isDefault: config.is_default,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get app provider selection error");
		return c.json({ error: "Failed to get app provider selection" }, 500);
	}
});

/**
 * PATCH /:projectId/apps/:appId/provider-selection
 * Set or clear the selected payment provider config for an app
 * Body: { paymentConfigId?: string | null }
 */
appsRouter.patch("/:projectId/apps/:appId/provider-selection", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");
		const { paymentConfigId } = (await c.req.json()) as { paymentConfigId?: string | null };

		if (!appId || !idPatterns.app.test(appId)) {
			return c.json({ error: "Invalid appId" }, 400);
		}

		const userId = c.req.header("X-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		// Verify app belongs to project if projectId provided
		let project = null as Awaited<ReturnType<typeof projectQueries.findByPublicId>> | null;
		if (projectId) {
			project = await projectQueries.findByPublicId(db, projectId);
			if (!project || app.project_id !== project.id) {
				return c.json({ error: "App not found in this project" }, 404);
			}
		} else {
			project = await projectQueries.findById(db, app.project_id);
		}

		// Check authorization
		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}
		if (project) {
			const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
			const userMember = member?.[0];
			if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
				return c.json({ error: "Forbidden" }, 403);
			}
		}

		// Clear selection
		if (!paymentConfigId) {
			const updated = await appQueries.update(db, app.id, { selected_payment_provider_id: null });
			return c.json({
				id: updated.public_id,
				selected: null,
			});
		}

		// Set selection: validate config belongs to same project
		const configByPublic = await paymentProviderConfigQueries.findByPublicId(db, paymentConfigId);
		if (!configByPublic) {
			return c.json({ error: "Payment provider config not found" }, 404);
		}
		if (configByPublic.project_id !== app.project_id) {
			return c.json({ error: "Provider config does not belong to the app's project" }, 400);
		}

		const updated = await appQueries.update(db, app.id, {
			selected_payment_provider_id: configByPublic.id,
		});

		return c.json({
			id: updated.public_id,
			selected: {
				id: configByPublic.public_id,
				provider: configByPublic.provider,
				environment: configByPublic.environment,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Set app provider selection error");
		return c.json({ error: "Failed to set app provider selection" }, 500);
	}
});

/**
 * POST /:projectId/apps
 * Create a new app
 */
appsRouter.post("/:projectId/apps", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const { name, slug, description } = (await c.req.json()) as {
			name?: string;
			slug?: string;
			description?: string;
		};

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		if (!name || !slug) {
			return c.json({ error: "Missing required fields: name, slug" }, 400);
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

		// Get user
		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check authorization
		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const userMember = member?.[0];
		if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
			return c.json({ error: "Forbidden" }, 403);
		}

		// Create app
		const clientSecret = require("crypto").randomBytes(32).toString("hex");
		const newApp = await appQueries.create(db, {
			public_id: createId("app"),
			project_id: project.id,
			name,
			slug,
			description: description || null,
			enabled_providers: ["google"],
			app_tokens: {
				clientSecret,
			},
			security_settings: {
				redirectUris: [],
				allowedHosts: [],
				sessionTtlDays: 28,
			},
			plan_settings: {
				licensingRequired: false,
				defaultPlan: "free",
			},
			is_active: true,
		});

		return c.json(
			{
				id: newApp.public_id,
				name: newApp.name,
				slug: newApp.slug,
				description: newApp.description,
				enabledProviders: newApp.enabled_providers || [],
				createdAt: new Date(newApp.created_at).toISOString(),
				updatedAt: new Date(newApp.updated_at).toISOString(),
			},
			201
		);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Create app error");
		return c.json({ error: "Failed to create app" }, 500);
	}
});

/**
 * GET /:projectId/apps/:appId
 * Get app details
 */
appsRouter.get("/:projectId/apps/:appId", async (c: Context) => {
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

		// Verify app belongs to project
		if (projectId) {
			const project = await projectQueries.findByPublicId(db, projectId);
			if (!project || app.project_id !== project.id) {
				return c.json({ error: "App not found in this project" }, 404);
			}
		}

		return c.json({
			id: app.public_id,
			name: app.name,
			slug: app.slug,
			description: app.description,
			enabledProviders: app.enabled_providers || [],
			createdAt: new Date(app.created_at).toISOString(),
			updatedAt: new Date(app.updated_at).toISOString(),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get app error");
		return c.json({ error: "Failed to get app" }, 500);
	}
});

/**
 * PATCH /:projectId/apps/:appId
 * Update app
 */
appsRouter.patch("/:projectId/apps/:appId", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");
		const { name, slug, description, enabledProviders } = (await c.req.json()) as {
			name?: string;
			slug?: string;
			description?: string;
			enabledProviders?: string[];
		};

		if (!appId || !idPatterns.app.test(appId)) {
			return c.json({ error: "Invalid appId" }, 400);
		}

		const userId = c.req.header("X-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
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

		// Get user
		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check authorization
		const project = await projectQueries.findById(db, app.project_id);
		if (project) {
			const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
			const userMember = member?.[0];
			if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
				return c.json({ error: "Forbidden" }, 403);
			}
		}

		// Update app
		const updateData: Record<string, any> = {};
		if (name !== undefined) updateData["name"] = name;
		if (slug !== undefined) updateData["slug"] = slug;
		if (description !== undefined) updateData["description"] = description;
		if (enabledProviders !== undefined) updateData["enabled_providers"] = enabledProviders;

		const results = await appQueries.update(db, app.id, updateData);
		const updated = results;

		if (!updated) {
			return c.json({ error: "App not found" }, 404);
		}

		return c.json({
			id: updated.public_id,
			name: updated.name,
			slug: updated.slug,
			description: updated.description,
			enabledProviders: updated.enabled_providers || [],
			createdAt: new Date(updated.created_at).toISOString(),
			updatedAt: new Date(updated.updated_at).toISOString(),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Update app error");
		return c.json({ error: "Failed to update app" }, 500);
	}
});

/**
 * DELETE /:projectId/apps/:appId
 * Soft delete an app
 */
appsRouter.delete("/:projectId/apps/:appId", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");

		if (!appId || !idPatterns.app.test(appId)) {
			return c.json({ error: "Invalid appId" }, 400);
		}

		const userId = c.req.header("X-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
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

		// Get user
		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check authorization
		const project = await projectQueries.findById(db, app.project_id);
		if (project) {
			const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
			const userMember = member?.[0];
			if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
				return c.json({ error: "Forbidden" }, 403);
			}
		}

		// Delete app
		const deleted = await appQueries.delete(db, app.id);

		if (!deleted) {
			return c.json({ error: "Failed to delete app" }, 500);
		}

		return c.json({
			message: "App deleted successfully",
			id: deleted.public_id,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete app error");
		return c.json({ error: "Failed to delete app" }, 500);
	}
});
