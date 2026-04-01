import { appQueries, appUserQueries, auditLogQueries, getDb, licenseQueries, planQueries, projectMemberQueries, projectQueries, userQueries } from "@nube-auth/db";
import { createId, createLogger, CreateAppRequestSchema, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { generateAppSlug, generatePlanSlug } from "../../../utils/slug.js";

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
				...(app.description != null ? { description: app.description } : {}),
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

		// selected_payment_provider_id removed - use /v1/admin/routing-rules/:appId
		return c.json({
			error: "This endpoint is deprecated. Use /v1/admin/routing-rules/:appId instead",
			migration: {
				oldEndpoint: "/v1/admin/apps/:appId/provider-selection",
				newEndpoint: "/v1/admin/routing-rules/:appId",
			},
		}, 410);
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
		return c.json(
			{
				error: "This endpoint is deprecated. Use POST /v1/admin/routing-rules/:appId to create routing rules.",
				deprecated: true,
				newEndpoint: "/v1/admin/routing-rules/:appId",
				help: "Create a routing rule with empty conditions {} for catch-all behavior (equivalent to selected provider).",
			},
			410,
		); // 410 Gone
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Deprecated endpoint called");
		return c.json({ error: "Endpoint deprecated" }, 410);
	}
});

/**
 * POST /:projectId/apps
 * Create a new app
 */
appsRouter.post("/:projectId/apps", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const rawBody = await c.req.json();
		const parsed = CreateAppRequestSchema.safeParse(rawBody);

		if (!parsed.success) {
			return c.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, 400);
		}

		const body = parsed.data;

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		const userId = c.req.header("X-Nube-User-Id");
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

		// Determine app slug:
		//  - If caller provided one, sanitize it and validate uniqueness within the project
		//  - Otherwise, auto-generate from name with random postfix on collision
		let appSlug: string;
		if (body.slug) {
			appSlug = body.slug;
			const existing = await appQueries.findByProjectAndSlug(db, project.id, appSlug);
			if (existing) {
				return c.json({ error: "An app with this slug already exists in this project. Please choose a different one." }, 409);
			}
		} else {
			appSlug = await generateAppSlug(
				(slug) => appQueries.findByProjectAndSlug(db, project.id, slug).then(Boolean),
				body.name,
			);
		}

		// Create app
		const clientSecret = randomBytes(32).toString("hex");
		const newApp = await appQueries.create(db, {
			public_id: createId("app"),
			project_id: project.id,
			name: body.name,
			slug: appSlug,
			description: body.description || null,
			enabled_providers: body.enabledProviders,
			app_tokens: {
				clientSecret,
			},
			security_settings: {
				redirectUris: (body.redirectUris || []).map((u: string) => { try { return new URL(u).href; } catch { return u; } }),
				allowedHosts: body.allowedHosts || [],
				sessionTtlDays: body.sessionTtlDays ?? 28,
			},
			plan_settings: {
				licensingRequired: body.requiresLicensing,
				defaultPlan: body.requiresLicensing ? "free" : null,
			},
			is_active: true,
		});

		// If licensing is enabled and a default plan is provided, create it
		let defaultPlan = null;
		if (body.requiresLicensing && body.defaultLicensePlan) {
			const planSlug = body.defaultLicensePlan.slug
				? body.defaultLicensePlan.slug
				: await generatePlanSlug(
						(slug) => planQueries.findByAppAndSlug(db, newApp.id, slug).then(Boolean),
						appSlug,
						body.defaultLicensePlan.name,
					);
			defaultPlan = await planQueries.create(db, {
				public_id: createId("plan"),
				app_id: newApp.id,
				name: body.defaultLicensePlan.name,
				slug: planSlug,
				description: body.defaultLicensePlan.description || null,
				features: body.defaultLicensePlan.features || {},
				status: "active",
				display_order: 0,
				is_active: true,
			});
		}

		// Extract JSONB fields
		const securitySettings = newApp.security_settings as any;
		const appTokens = newApp.app_tokens as any;

		// Audit log: app created
		try {
			await auditLogQueries.create(db, {
				public_id: createId("auditLog"),
				user_id: user.id,
				project_id: project.id,
				app_id: newApp.id,
				action: "app.created",
				entity_type: "app",
				entity_id: newApp.public_id,
				changes: { name: body.name, slug: appSlug, description: body.description, requiresLicensing: body.requiresLicensing },
				ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
			});
		} catch (auditError) {
			log.error({ err: serializeError(auditError as Error) }, "Failed to create audit log");
		}

		const planSettings = newApp.plan_settings as any;
		return c.json(
			{
				id: newApp.public_id,
				projectId: project.public_id,
				name: newApp.name,
				slug: newApp.slug,
				description: newApp.description,
				redirectUris: securitySettings?.redirectUris || [],
				allowedHosts: securitySettings?.allowedHosts || [],
				corsOrigins: securitySettings?.corsOrigins || [],
				clientSecret: appTokens?.clientSecret || "***",
				serviceToken: appTokens?.serviceToken || "***",
				sessionTtlDays: securitySettings?.sessionTtlDays || 28,
				accountLockoutMinutes: securitySettings?.accountLockoutMinutes || 30,
				cacheTtlMinutes: securitySettings?.cacheTtlMinutes || 60,
				rateLimit: securitySettings?.rateLimit || 100,
				enabledProviders: newApp.enabled_providers || [],
				requiresLicensing: planSettings?.licensingRequired ?? false,
				...(defaultPlan ? {
					defaultPlan: {
						id: defaultPlan.public_id,
						name: defaultPlan.name,
						slug: defaultPlan.slug,
						description: defaultPlan.description,
					},
				} : {}),
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

		// Get project for response
		const project = await projectQueries.findById(db, app.project_id);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Extract JSONB fields
		const securitySettings = app.security_settings as any;
		const appTokens = app.app_tokens as any;

		return c.json({
			id: app.public_id,
			projectId: project.public_id,
			name: app.name,
			slug: app.slug,
			description: app.description,
			redirectUris: securitySettings?.redirectUris || [],
			allowedHosts: securitySettings?.allowedHosts || [],
			corsOrigins: securitySettings?.corsOrigins || [],
			clientSecret: appTokens?.clientSecret || "***",
			serviceToken: appTokens?.serviceToken || "***",
			sessionTtlDays: securitySettings?.sessionTtlDays || 28,
			accountLockoutMinutes: securitySettings?.accountLockoutMinutes || 30,
			cacheTtlMinutes: securitySettings?.cacheTtlMinutes || 60,
			rateLimit: securitySettings?.rateLimit || 100,
			enabledProviders: app.enabled_providers || [],
			// selectedPaymentProviderId removed - use /v1/admin/routing-rules/:appId
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
		const {
			name,
			slug,
			description,
			enabledProviders,
			redirectUris,
			allowedHosts,
			corsOrigins,
			sessionTtlDays,
			accountLockoutMinutes,
			cacheTtlMinutes,
			rateLimit,
		} = (await c.req.json()) as {
			name?: string;
			slug?: string;
			description?: string;
			enabledProviders?: string[];
			redirectUris?: string[];
			allowedHosts?: string[];
			corsOrigins?: string[];
			sessionTtlDays?: number;
			accountLockoutMinutes?: number;
			cacheTtlMinutes?: number;
			rateLimit?: number;
		};

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

		// Update app basic fields
		const updateData: Record<string, any> = {};
		if (name !== undefined) updateData["name"] = name;
		if (slug !== undefined) updateData["slug"] = slug;
		if (description !== undefined) updateData["description"] = description;
		if (enabledProviders !== undefined) updateData["enabled_providers"] = enabledProviders;

		const results = await appQueries.update(db, app.id, updateData);
		let updated = results;

		if (!updated) {
			return c.json({ error: "App not found" }, 404);
		}

		// Update security_settings fields atomically if any were provided
		const normalizeUri = (uri: string) => { try { return new URL(uri).href; } catch { return uri; } };
		const securityUpdates: Record<string, any> = {};
		if (redirectUris !== undefined) securityUpdates["redirectUris"] = redirectUris.map(normalizeUri);
		if (allowedHosts !== undefined) securityUpdates["allowedHosts"] = allowedHosts;
		if (corsOrigins !== undefined) securityUpdates["corsOrigins"] = corsOrigins;
		if (sessionTtlDays !== undefined) securityUpdates["sessionTtlDays"] = sessionTtlDays;
		if (accountLockoutMinutes !== undefined) securityUpdates["accountLockoutMinutes"] = accountLockoutMinutes;
		if (cacheTtlMinutes !== undefined) securityUpdates["cacheTtlMinutes"] = cacheTtlMinutes;
		if (rateLimit !== undefined) securityUpdates["rateLimit"] = rateLimit;

		if (Object.keys(securityUpdates).length > 0) {
			updated = await appQueries.updateSecuritySettings(db, app.id, securityUpdates);
		}

		// Get project for response
		const projectForResponse = await projectQueries.findById(db, updated.project_id);
		if (!projectForResponse) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Extract JSONB fields
		const securitySettings = updated.security_settings as any;
		const appTokens = updated.app_tokens as any;

		return c.json({
			id: updated.public_id,
			projectId: projectForResponse.public_id,
			name: updated.name,
			slug: updated.slug,
			description: updated.description,
			redirectUris: securitySettings?.redirectUris || [],
			allowedHosts: securitySettings?.allowedHosts || [],
			corsOrigins: securitySettings?.corsOrigins || [],
			clientSecret: appTokens?.clientSecret || "***",
			serviceToken: appTokens?.serviceToken || "***",
			sessionTtlDays: securitySettings?.sessionTtlDays || 28,
			accountLockoutMinutes: securitySettings?.accountLockoutMinutes || 30,
			cacheTtlMinutes: securitySettings?.cacheTtlMinutes || 60,
			rateLimit: securitySettings?.rateLimit || 100,
			enabledProviders: updated.enabled_providers || [],
			// selectedPaymentProviderId removed - use /v1/admin/routing-rules/:appId
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

		const userId = c.req.header("X-Nube-User-Id");
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

/**
 * GET /:projectId/apps/:appId/users
 * List users of an app (via licenses)
 */
appsRouter.get("/:projectId/apps/:appId/users", async (c: Context) => {
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

		// Get all users who have ever authenticated with this app (persistent, not session-based)
		const appUserRows = await appUserQueries.findByAppId(db, app.id);

		// Build a license map keyed by user_id for O(1) lookup
		const appLicenses = await licenseQueries.findByAppId(db, app.id);
		const licenseByUserId = new Map(appLicenses.map((l) => [l.user_id, l]));

		// Build plan map to avoid repeated DB calls
		const planIds = [...new Set(appLicenses.map((l) => l.plan_id))];
		const planMap = new Map<number, { name: string; slug: string }>();
		for (const planId of planIds) {
			const plan = await planQueries.findById(db, planId);
			if (plan) planMap.set(planId, { name: plan.name, slug: plan.slug });
		}

		const usersList = await Promise.all(
			appUserRows.map(async (row) => {
				const user = await userQueries.findById(db, row.user_id);
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
					licenseValidUntil: license?.valid_until ? Math.floor(new Date(license.valid_until).getTime() / 1000) : null,
				};
			})
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
