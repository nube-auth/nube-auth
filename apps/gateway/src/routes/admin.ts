import { appQueries, getDb, licenseQueries, projectMemberQueries, projectQueries, userQueries } from "@proofa/db";
import { createId } from "@proofa/shared";
import {
	ProjectDTOSchema,
	ProjectsListResponseSchema,
	CreateProjectRequestSchema,
	CreateAppRequestSchema,
	UpdateAppRequestSchema,
	AppDTOSchema,
	AppsListResponseSchema,
	ProjectMembersListResponseSchema,
	LicensesListResponseSchema,
} from "@proofa/shared/types/schemas";
import { z } from "zod";
import type { Context } from "hono";
import { Hono } from "hono";
import { getAuth } from "../middleware/auth";

export const adminRoutes = new Hono();

/**
 * GET /v1/admin/me
 * Check admin-dashboard session (separate cookie)
 */
adminRoutes.get("/me", async (c: Context) => {
	try {
		const auth = getAuth(c);
		return c.json({
			id: auth.userId,
			email: auth.email,
			name: auth.name,
		});
	} catch (error) {
		console.error("Get admin me error:", error);
		return c.json({ error: "Failed to get profile" }, 500);
	}
});

/**
 * GET /v1/admin/projects
 * List projects for current user
 */
adminRoutes.get("/projects", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const db = getDb();

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get projects where user is member
		const projects = await projectQueries.findByUserId(db, user.id);

		return c.json({
			projects: projects.map((p) => ({
				id: p.public_id,
				name: p.name,
				slug: p.slug,
				createdAt: p.created_at,
			})),
		});
	} catch (error) {
		console.error("List projects error:", error);
		return c.json({ error: "Failed to list projects" }, 500);
	}
});

/**
 * POST /v1/admin/projects
 * Create new project
 */
adminRoutes.post("/projects", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const body = await c.req.json();

		// Validate request
		const validatedData = CreateProjectRequestSchema.parse(body);

		const db = getDb();

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const now = Math.floor(Date.now() / 1000);

		const project = await projectQueries.create(db, {
			public_id: createId("project"),
			name: validatedData.name,
			slug: validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
			owner_user_id: user.id,
			created_at: now,
			updated_at: now,
		});

		// Add user as project owner
		await projectMemberQueries.create(db, {
			project_id: project.id,
			user_id: user.id,
			role: "owner",
			created_at: now,
		});

		// Validate and return response
		const projectDTO = ProjectDTOSchema.parse({
			id: project.public_id,
			name: project.name,
			slug: project.slug,
			createdAt: project.created_at,
			updatedAt: project.updated_at,
		});

		return c.json(projectDTO, 201);
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error("Validation error:", error.errors);
			return c.json({ error: "Invalid request data", details: error.errors }, 400);
		}
		console.error("Create project error:", error);
		return c.json({ error: "Failed to create project" }, 500);
	}
});

/**
 * GET /v1/admin/projects/:projectId
 * Get project details
 */
adminRoutes.get("/projects/:projectId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check user is member
		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		return c.json({
			id: project.public_id,
			name: project.name,
			slug: project.slug,
		});
	} catch (error) {
		console.error("Get project error:", error);
		return c.json({ error: "Failed to get project" }, 500);
	}
});

/**
 * GET /v1/admin/projects/:projectId/apps
 * List apps for project
 */
adminRoutes.get("/projects/:projectId/apps", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		const apps = await appQueries.findByProjectId(db, project.id);

		return c.json({
			apps: apps.map((a) => ({
				id: a.public_id,
				name: a.name,
				slug: a.slug,
				createdAt: a.created_at,
			})),
		});
	} catch (error) {
		console.error("List apps error:", error);
		return c.json({ error: "Failed to list apps" }, 500);
	}
});

/**
 * POST /v1/admin/projects/:projectId/apps
 * Create new app
 */
adminRoutes.post("/projects/:projectId/apps", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const body = await c.req.json();

		// Validate request
		const validatedData = CreateAppRequestSchema.parse(body);

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

		if (!member || member.role !== "owner") {
			return c.json({ error: "Access denied" }, 403);
		}

		const now = Math.floor(Date.now() / 1000);

		const app = await appQueries.create(db, {
			public_id: createId("app"),
			project_id: project.id,
			name: validatedData.name,
			slug: validatedData.slug || validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
			description: validatedData.description,
			allowed_hosts: JSON.stringify(validatedData.allowedHosts || []),
			redirect_uris: JSON.stringify(validatedData.redirectUris || []),
			required_providers: JSON.stringify(validatedData.requiredProviders || []),
			app_session_ttl_days: validatedData.appSessionTtlDays || 28,
			licensing_required: Number(validatedData.licensingRequired ?? true),
			default_license_plan: validatedData.defaultLicensePlan || "free",
			trial_days: validatedData.trialDays,
			account_lockout_minutes: 30,
			cache_ttl_minutes: 60,
			cors_allowed_origins: JSON.stringify(["http://localhost:3001"]),
			rate_limit_requests_per_minute: 100,
			created_at: now,
			updated_at: now,
		});

		// Validate and return response
		const appDTO = AppDTOSchema.parse({
			id: app.public_id,
			projectId: project.public_id,
			name: app.name,
			slug: app.slug,
			description: app.description,
			redirectUris: app.redirect_uris ? JSON.parse(app.redirect_uris) : [],
			allowedHosts: app.allowed_hosts ? JSON.parse(app.allowed_hosts) : [],
			requiredProviders: app.required_providers ? JSON.parse(app.required_providers) : [],
			isActive: app.is_active,
			licensingRequired: app.licensing_required,
			defaultLicensePlan: app.default_license_plan,
			trialDays: app.trial_days,
			appSessionTtlDays: app.app_session_ttl_days,
			accountLockoutMinutes: app.account_lockout_minutes,
			cacheTtlMinutes: app.cache_ttl_minutes,
			corsAllowedOrigins: app.cors_allowed_origins ? JSON.parse(app.cors_allowed_origins) : [],
			rateLimitRequestsPerMinute: app.rate_limit_requests_per_minute,
			createdAt: app.created_at,
			updatedAt: app.updated_at,
		});

		return c.json(appDTO, 201);
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error("Validation error:", error.errors);
			return c.json({ error: "Invalid request data", details: error.errors }, 400);
		}
		console.error("Create app error:", error);
		return c.json({ error: "Failed to create app" }, 500);
	}
});

/**
 * GET /v1/admin/projects/:projectId/apps/:appId
 * Get single app details
 */
adminRoutes.get("/projects/:projectId/apps/:appId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		const app = await appQueries.findByPublicId(db, appId);

		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Validate and return response with camelCase
		const appDTO = AppDTOSchema.parse({
			id: app.public_id,
			projectId: project.public_id,
			name: app.name,
			slug: app.slug,
			description: app.description,
			redirectUris: app.redirect_uris ? JSON.parse(app.redirect_uris) : [],
			allowedHosts: app.allowed_hosts ? JSON.parse(app.allowed_hosts) : [],
			requiredProviders: app.required_providers ? JSON.parse(app.required_providers) : [],
			isActive: Boolean(app.is_active),
			licensingRequired: Boolean(app.licensing_required),
			defaultLicensePlan: app.default_license_plan,
			trialDays: app.trial_days,
			appSessionTtlDays: app.app_session_ttl_days,
			accountLockoutMinutes: app.account_lockout_minutes,
			cacheTtlMinutes: app.cache_ttl_minutes,
			corsAllowedOrigins: app.cors_allowed_origins ? JSON.parse(app.cors_allowed_origins) : [],
			rateLimitRequestsPerMinute: app.rate_limit_requests_per_minute,
			createdAt: app.created_at,
			updatedAt: app.updated_at,
		});

		return c.json(appDTO);
	} catch (error) {
		console.error("Get app error:", error);
		return c.json({ error: "Failed to get app" }, 500);
	}
});

/**
 * PATCH /v1/admin/projects/:projectId/apps/:appId
 * Update app configuration
 */
adminRoutes.patch("/projects/:projectId/apps/:appId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");
		const updates = (await c.req.json()) as Record<string, unknown>;

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

		if (!member || member.role !== "owner") {
			return c.json({ error: "Access denied" }, 403);
		}

		const app = await appQueries.findByPublicId(db, appId);

		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		const now = Math.floor(Date.now() / 1000);

		// Build update object with JSON serialization for array fields
		const updateData: Record<string, unknown> = { updated_at: now };

		if (updates.name) updateData.name = updates.name;
		if (updates.slug) updateData.slug = updates.slug;
		if (updates.description) updateData.description = updates.description;
		if (updates.allowed_hosts) updateData.allowed_hosts = JSON.stringify(updates.allowed_hosts);
		if (updates.redirect_uris) updateData.redirect_uris = JSON.stringify(updates.redirect_uris);
		if (updates.required_providers) updateData.required_providers = JSON.stringify(updates.required_providers);
		if ("is_active" in updates) updateData.is_active = updates.is_active ? true : false;
		if ("licensing_required" in updates) updateData.licensing_required = updates.licensing_required ? true : false;
		if (updates.default_license_plan) updateData.default_license_plan = updates.default_license_plan;
		if (updates.trial_days) updateData.trial_days = updates.trial_days;
		if (updates.app_session_ttl_days) updateData.app_session_ttl_days = updates.app_session_ttl_days;
		if (updates.account_lockout_minutes) updateData.account_lockout_minutes = updates.account_lockout_minutes;
		if (updates.cache_ttl_minutes) updateData.cache_ttl_minutes = updates.cache_ttl_minutes;
		if (updates.cors_allowed_origins) updateData.cors_allowed_origins = JSON.stringify(updates.cors_allowed_origins);
		if (updates.rate_limit_requests_per_minute) updateData.rate_limit_requests_per_minute = updates.rate_limit_requests_per_minute;

		const updatedApp = await appQueries.update(db, app.id, updateData);

		return c.json({
			id: updatedApp.public_id,
			project_id: project.public_id,
			name: updatedApp.name,
			slug: updatedApp.slug,
			description: updatedApp.description,
			allowed_hosts: updatedApp.allowed_hosts ? JSON.parse(updatedApp.allowed_hosts) : [],
			redirect_uris: updatedApp.redirect_uris ? JSON.parse(updatedApp.redirect_uris) : [],
			required_providers: updatedApp.required_providers ? JSON.parse(updatedApp.required_providers) : [],
			is_active: updatedApp.is_active,
			licensing_required: updatedApp.licensing_required,
			default_license_plan: updatedApp.default_license_plan,
			trial_days: updatedApp.trial_days,
			app_session_ttl_days: updatedApp.app_session_ttl_days,
			account_lockout_minutes: updatedApp.account_lockout_minutes,
			cache_ttl_minutes: updatedApp.cache_ttl_minutes,
			cors_allowed_origins: updatedApp.cors_allowed_origins ? JSON.parse(updatedApp.cors_allowed_origins) : [],
			rate_limit_requests_per_minute: updatedApp.rate_limit_requests_per_minute,
			created_at: updatedApp.created_at,
			updated_at: updatedApp.updated_at,
		});
	} catch (error) {
		console.error("Update app error:", error);
		if (error instanceof Error) {
			console.error("Error details:", error.message, error.stack);
		}
		return c.json({ error: "Failed to update app" }, 500);
	}
});

/**
 * PATCH /v1/admin/projects/:projectId/apps/:appId
 * Update app configuration
 */
adminRoutes.patch("/projects/:projectId/apps/:appId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");
		const body = await c.req.json();

		// Validate request (partial update)
		const validatedData = UpdateAppRequestSchema.parse(body);

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

		if (!member || member.role !== "owner") {
			return c.json({ error: "Access denied" }, 403);
		}

		const app = await appQueries.findByPublicId(db, appId);

		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		const now = Math.floor(Date.now() / 1000);

		// Build update object with JSON serialization for array fields
		const updateData: Record<string, unknown> = { updated_at: now };

		if (validatedData.name) updateData.name = validatedData.name;
		if (validatedData.slug) updateData.slug = validatedData.slug;
		if (validatedData.description !== undefined) updateData.description = validatedData.description;
		if (validatedData.allowedHosts) updateData.allowed_hosts = JSON.stringify(validatedData.allowedHosts);
		if (validatedData.redirectUris) updateData.redirect_uris = JSON.stringify(validatedData.redirectUris);
		if (validatedData.requiredProviders) updateData.required_providers = JSON.stringify(validatedData.requiredProviders);
		if ("licensingRequired" in validatedData) updateData.licensing_required = validatedData.licensingRequired ? true : false;
		if (validatedData.defaultLicensePlan) updateData.default_license_plan = validatedData.defaultLicensePlan;
		if (validatedData.trialDays !== undefined) updateData.trial_days = validatedData.trialDays;
		if (validatedData.appSessionTtlDays) updateData.app_session_ttl_days = validatedData.appSessionTtlDays;

		const updatedApp = await appQueries.update(db, app.id, updateData);

		// Validate and return response
		const appDTO = AppDTOSchema.parse({
			id: updatedApp.public_id,
			projectId: project.public_id,
			name: updatedApp.name,
			slug: updatedApp.slug,
			description: updatedApp.description,
			redirectUris: updatedApp.redirect_uris ? JSON.parse(updatedApp.redirect_uris) : [],
			allowedHosts: updatedApp.allowed_hosts ? JSON.parse(updatedApp.allowed_hosts) : [],
			requiredProviders: updatedApp.required_providers ? JSON.parse(updatedApp.required_providers) : [],
			isActive: updatedApp.is_active,
			licensingRequired: updatedApp.licensing_required,
			defaultLicensePlan: updatedApp.default_license_plan,
			trialDays: updatedApp.trial_days,
			appSessionTtlDays: updatedApp.app_session_ttl_days,
			accountLockoutMinutes: updatedApp.account_lockout_minutes,
			cacheTtlMinutes: updatedApp.cache_ttl_minutes,
			corsAllowedOrigins: updatedApp.cors_allowed_origins ? JSON.parse(updatedApp.cors_allowed_origins) : [],
			rateLimitRequestsPerMinute: updatedApp.rate_limit_requests_per_minute,
			createdAt: updatedApp.created_at,
			updatedAt: updatedApp.updated_at,
		});

		return c.json(appDTO);
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error("Validation error:", error.errors);
			return c.json({ error: "Invalid request data", details: error.errors }, 400);
		}
		console.error("Update app error:", error);
		if (error instanceof Error) {
			console.error("Error details:", error.message, error.stack);
		}
		return c.json({ error: "Failed to update app" }, 500);
	}
});

/**
 * GET /v1/admin/projects/:projectId/members
 * List project members
 */
adminRoutes.get("/projects/:projectId/members", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		const members = await projectMemberQueries.findByProjectId(db, project.id);

		return c.json({
			members: await Promise.all(
				members.map(async (m) => {
					const memberUser = await userQueries.findById(db, m.user_id);
					return {
						id: m.id,
						userId: memberUser?.public_id,
						email: memberUser?.primary_email,
						name: memberUser?.name,
						role: m.role,
						createdAt: m.created_at,
					};
				}),
			),
		});
	} catch (error) {
		console.error("List project members error:", error);
		return c.json({ error: "Failed to list project members" }, 500);
	}
});

/**
 * GET /v1/admin/licenses
 * List user licenses
 */
adminRoutes.get("/licenses", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const db = getDb();

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get licenses for user
		const licenses = await licenseQueries.findByUserId(db, user.id);

		return c.json({
			licenses: licenses.map((l) => ({
				id: l.public_id,
				appId: l.app_id,
				plan: l.plan,
				status: l.status,
				validUntil: l.valid_until,
				createdAt: l.created_at,
			})),
		});
	} catch (error) {
		console.error("List licenses error:", error);
		return c.json({ error: "Failed to list licenses" }, 500);
	}
});

/**
 * DELETE /admin/projects/:project_id
 * Delete a project
 */
adminRoutes.delete("/projects/:project_id", async (c: Context) => {
	try {
		const projectId = c.req.param("project_id");

		// TODO: implement project deletion
		return c.json({ message: "Project deleted", projectId });
	} catch (error) {
		console.error("Delete project error:", error);
		return c.json({ error: "Failed to delete project" }, 500);
	}
});

// Apps endpoints

/**
 * POST /admin/apps
 * Create a new app
 */
adminRoutes.post("/apps", async (c: Context) => {
	try {
		const body = await c.req.json();

		// TODO: implement app creation
		return c.json({ message: "App created", data: body }, 201);
	} catch (error) {
		console.error("Create app error:", error);
		return c.json({ error: "Failed to create app" }, 500);
	}
});

/**
 * GET /admin/apps
 * List apps
 */
adminRoutes.get("/apps", async (c: Context) => {
	try {
		// TODO: implement apps listing
		return c.json({ message: "Apps list", apps: [] });
	} catch (error) {
		console.error("Get apps error:", error);
		return c.json({ error: "Failed to get apps" }, 500);
	}
});

/**
 * PATCH /admin/apps/:app_id
 * Update an app
 */
adminRoutes.patch("/apps/:app_id", async (c: Context) => {
	try {
		const appId = c.req.param("app_id");
		const body = await c.req.json();

		// TODO: implement app update
		return c.json({ message: "App updated", appId, data: body });
	} catch (error) {
		console.error("Update app error:", error);
		return c.json({ error: "Failed to update app" }, 500);
	}
});

/**
 * DELETE /admin/apps/:app_id
 * Delete an app
 */
adminRoutes.delete("/apps/:app_id", async (c: Context) => {
	try {
		const appId = c.req.param("app_id");

		// TODO: implement app deletion
		return c.json({ message: "App deleted", appId });
	} catch (error) {
		console.error("Delete app error:", error);
		return c.json({ error: "Failed to delete app" }, 500);
	}
});

// Members endpoints

/**
 * POST /admin/members
 * Add a team member
 */
adminRoutes.post("/members", async (c: Context) => {
	try {
		const body = await c.req.json();

		// TODO: implement member addition
		return c.json({ message: "Member added", data: body }, 201);
	} catch (error) {
		console.error("Add member error:", error);
		return c.json({ error: "Failed to add member" }, 500);
	}
});

/**
 * GET /admin/members
 * List team members
 */
adminRoutes.get("/members", async (c: Context) => {
	try {
		// TODO: implement members listing
		return c.json({ message: "Members list", members: [] });
	} catch (error) {
		console.error("Get members error:", error);
		return c.json({ error: "Failed to get members" }, 500);
	}
});

/**
 * DELETE /admin/members/:member_id
 * Remove a team member
 */
adminRoutes.delete("/members/:member_id", async (c: Context) => {
	try {
		const memberId = c.req.param("member_id");

		// TODO: implement member removal
		return c.json({ message: "Member removed", memberId });
	} catch (error) {
		console.error("Remove member error:", error);
		return c.json({ error: "Failed to remove member" }, 500);
	}
});

// Licenses endpoints

/**
 * GET /admin/licenses
 * List licenses
 */
adminRoutes.get("/licenses", async (c: Context) => {
	try {
		// TODO: implement licenses listing from Core cache
		return c.json({ message: "Licenses list", licenses: [] });
	} catch (error) {
		console.error("Get licenses error:", error);
		return c.json({ error: "Failed to get licenses" }, 500);
	}
});

/**
 * PATCH /admin/licenses/:license_id
 * Update a license
 */
adminRoutes.patch("/licenses/:license_id", async (c: Context) => {
	try {
		const licenseId = c.req.param("license_id");
		const body = await c.req.json();

		// TODO: implement license update
		return c.json({ message: "License updated", licenseId, data: body });
	} catch (error) {
		console.error("Update license error:", error);
		return c.json({ error: "Failed to update license" }, 500);
	}
});
