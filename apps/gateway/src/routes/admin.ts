import { appQueries, getDb, identityQueries, invitationQueries, licenseQueries, planQueries, projectInvitationQueries, projectMemberQueries, projectQueries, userQueries, sessionQueries } from "@proofa/db";
import { createId } from "@proofa/shared";
import { nanoid } from "nanoid";
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
 * Helper function to mask sensitive keys
 * Shows only last 4 characters: sk_...abc1
 */
function maskApiKey(key: string): string {
	if (!key || key.length < 8) return "••••••••";
	const prefix = key.substring(0, 3); // sk_ or st_
	const suffix = key.substring(key.length - 4);
	return `${prefix}...${suffix}`;
}

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
 * List projects for current user with stats
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

		// Get stats for each project
		const projectsWithStats = await Promise.all(
			projects.map(async (p) => {
				// Get all apps for this project
				const apps = await appQueries.findByProjectId(db, p.id);
				const appIds = apps.map((app) => app.id);

				// Count total licenses and users across all apps
				let totalLicenses = 0;
				let activeLicenses = 0;
				const uniqueUserIds = new Set<number>();

				for (const appId of appIds) {
					const licenses = await licenseQueries.findByAppId(db, appId);
					totalLicenses += licenses.length;
					activeLicenses += licenses.filter((l) => l.status === "active").length;

					for (const license of licenses) {
						uniqueUserIds.add(license.user_id);
					}
				}

				// Calculate revenue (placeholder for now)
				const totalRevenue = 0; // TODO: Calculate from payment records

				return {
				id: p.public_id,
				name: p.name,
				slug: p.slug,
				createdAt: p.created_at,
					totalApps: apps.length,
					totalUsers: uniqueUserIds.size,
					totalLicenses,
					activeLicenses,
					totalRevenue,
				};
			}),
		);

		return c.json({
			projects: projectsWithStats,
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
			description: project.description || null,
			createdAt: project.created_at,
			updatedAt: project.updated_at,
		});
	} catch (error) {
		console.error("Get project error:", error);
		return c.json({ error: "Failed to get project" }, 500);
	}
});

/**
 * PATCH /v1/admin/projects/:projectId
 * Update project details
 */
adminRoutes.patch("/projects/:projectId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const body = await c.req.json();

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

		// Check user is member with owner or admin role
		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Update project
		const now = Math.floor(Date.now() / 1000);
		const updateData: Record<string, string | number> = {
			updated_at: now,
		};

		if (body.name !== undefined) {
			updateData.name = body.name;
		}
		if (body.slug !== undefined) {
			updateData.slug = body.slug;
		}
		if (body.description !== undefined) {
			updateData.description = body.description;
		}

		const updatedProject = await projectQueries.update(db, project.id, updateData);

		if (!updatedProject) {
			return c.json({ error: "Failed to update project" }, 500);
		}

		return c.json({
			id: updatedProject.public_id,
			name: updatedProject.name,
			slug: updatedProject.slug,
			description: updatedProject.description || null,
			createdAt: updatedProject.created_at,
			updatedAt: updatedProject.updated_at,
		});
	} catch (error) {
		console.error("Update project error:", error);
		return c.json({ error: "Failed to update project" }, 500);
	}
});

/**
 * GET /v1/admin/projects/:projectId/stats
 * Get aggregated stats for project
 */
adminRoutes.get("/projects/:projectId/stats", async (c: Context) => {
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

		// Get all apps for this project
		const apps = await appQueries.findByProjectId(db, project.id);
		const appIds = apps.map((app) => app.id);

		// Count total licenses across all apps
		let totalLicenses = 0;
		let activeLicenses = 0;
		const licenseCounts: Record<string, number> = {};

		for (const appId of appIds) {
			const licenses = await licenseQueries.findByAppId(db, appId);
			totalLicenses += licenses.length;
			activeLicenses += licenses.filter((l) => l.status === "active").length;

				// Count by plan
			for (const license of licenses) {
				const plan = await planQueries.findById(db, license.plan_id);
				const planName = plan?.name || `Unknown (ID: ${license.plan_id})`;
				licenseCounts[planName] = (licenseCounts[planName] || 0) + 1;
			}
		}

		// Count total users across all apps (unique users)
		const uniqueUserIds = new Set<number>();
		for (const appId of appIds) {
			const licenses = await licenseQueries.findByAppId(db, appId);
			for (const license of licenses) {
				uniqueUserIds.add(license.user_id);
			}
		}

		// Calculate revenue (placeholder for now - will be implemented with payment integration)
		const totalRevenue = 0; // TODO: Calculate from payment records

		return c.json({
			totalApps: apps.length,
			totalUsers: uniqueUserIds.size,
			totalLicenses,
			activeLicenses,
			licenseCounts,
			totalRevenue,
		});
	} catch (error) {
		console.error("Get project stats error:", error);
		return c.json({ error: "Failed to get project stats" }, 500);
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
		const appSlug = validatedData.slug || validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

		// Step 1: Create the app (without default_plan_id initially)
		// Generate secure API keys for developers
		const clientSecret = `sk_${nanoid(48)}`; // Secret key for server-to-server auth
		const serviceToken = `st_${nanoid(48)}`; // Service token for API calls

		const app = await appQueries.create(db, {
			public_id: createId("app"),
			project_id: project.id,
			name: validatedData.name,
			slug: appSlug,
			description: validatedData.description,
			allowed_hosts: JSON.stringify(validatedData.allowedHosts || []),
			redirect_uris: JSON.stringify(validatedData.redirectUris || []),
			required_providers: JSON.stringify(validatedData.requiredProviders || []),
			app_session_ttl_days: validatedData.appSessionTtlDays || 28,
			licensing_required: Number(validatedData.licensingRequired ?? false),
			default_plan_id: null, // Will be set below if licensing is enabled
			client_secret: clientSecret,
			service_token: serviceToken,
			account_lockout_minutes: 30,
			cache_ttl_minutes: 60,
			cors_allowed_origins: JSON.stringify(["http://localhost:3001"]),
			rate_limit_requests_per_minute: 100,
			created_at: now,
			updated_at: now,
		});

		// Step 2: If licensing is required, auto-create a "Free" plan and set it as default
		let defaultPlan = null;
		if (validatedData.licensingRequired) {
			defaultPlan = await planQueries.create(db, {
				public_id: createId("plan"),
				app_id: app.id,
				name: "Free",
				slug: `${appSlug}-free`,
				description: "Free plan with basic features",
				monthly_price: null,
				yearly_price: null,
				one_time_price: null,
				trial_enabled: 0,
				trial_days: null,
				features: JSON.stringify([]),
				status: "active",
				display_order: 0,
				created_at: now,
				updated_at: now,
			});

			// Update app with default_plan_id
			await appQueries.update(db, app.id, {
				default_plan_id: defaultPlan.id,
				updated_at: now,
			});
		}

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
			isActive: Boolean(app.is_active),
			licensingRequired: Boolean(app.licensing_required),
			defaultPlanId: defaultPlan ? defaultPlan.public_id : null,
			defaultPlan: defaultPlan ? {
				id: defaultPlan.public_id,
				name: defaultPlan.name,
				slug: defaultPlan.slug,
			} : null,
			clientSecret: maskApiKey(app.client_secret),
			serviceToken: maskApiKey(app.service_token),
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

		// Fetch default plan if set
		let defaultPlan = null;
		if (app.default_plan_id) {
			defaultPlan = await planQueries.findById(db, app.default_plan_id);
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
			defaultPlanId: defaultPlan ? defaultPlan.public_id : null,
			defaultPlan: defaultPlan ? {
				id: defaultPlan.public_id,
				name: defaultPlan.name,
				slug: defaultPlan.slug,
			} : null,
			clientSecret: maskApiKey(app.client_secret),
			serviceToken: maskApiKey(app.service_token),
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
 * GET /v1/admin/projects/:projectId/apps/:appId/stats
 * Get app-specific statistics
 */
adminRoutes.get("/projects/:projectId/apps/:appId/stats", async (c: Context) => {
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

		// Check user is member
		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		const app = await appQueries.findByPublicId(db, appId);

		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get all licenses for this app
		const licenses = await licenseQueries.findByAppId(db, app.id);
		const uniqueUserIds = new Set(licenses.map((l) => l.user_id));

		// Count active licenses
		const activeLicenses = licenses.filter((l) => l.status === "active").length;

		// Count by plan
		const licenseCounts: Record<string, number> = {};
		for (const license of licenses) {
			const plan = await planQueries.findById(db, license.plan_id);
			const planName = plan?.name || `Unknown (ID: ${license.plan_id})`;
			licenseCounts[planName] = (licenseCounts[planName] || 0) + 1;
		}

		// Count active sessions for users with licenses in this app
		let totalSessions = 0;
		for (const userId of uniqueUserIds) {
			const userSessions = await sessionQueries.findActiveByUserId(db, userId);
			totalSessions += userSessions.length;
		}

		// Calculate revenue (placeholder for now - will be implemented with payment integration)
		const totalRevenue = 0; // TODO: Calculate from payment records

		return c.json({
			totalUsers: uniqueUserIds.size,
			totalLicenses: licenses.length,
			activeLicenses,
			licenseCounts,
			totalSessions,
			totalRevenue,
		});
	} catch (error) {
		console.error("Get app stats error:", error);
		return c.json({ error: "Failed to get app stats" }, 500);
	}
});

/**
 * GET /v1/admin/projects/:projectId/apps/:appId/users
 * Get users for a specific app
 */
adminRoutes.get("/projects/:projectId/apps/:appId/users", async (c: Context) => {
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

		// Check user is member
		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		const app = await appQueries.findByPublicId(db, appId);

		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get all licenses for this app
		const licenses = await licenseQueries.findByAppId(db, app.id);

		// Get user details for each license
		const usersWithLicenses = await Promise.all(
			licenses.map(async (license) => {
				const licenseUser = await userQueries.findById(db, license.user_id);
				if (!licenseUser) return null;

				const plan = await planQueries.findById(db, license.plan_id);

				return {
					id: licenseUser.public_id,
					name: licenseUser.name || null,
					email: licenseUser.primary_email,
					avatarUrl: null, // TODO: Add avatar support
					primaryEmailVerified: Boolean(licenseUser.primary_email_verified),
					plan_id: license.plan_id,
					plan: plan?.name || "Unknown",
					status: license.status,
					createdAt: licenseUser.created_at,
					licenseValidUntil: license.valid_until,
				};
			}),
		);

		// Filter out null values
		const users = usersWithLicenses.filter((u) => u !== null);

		return c.json({
			users,
			total: users.length,
		});
	} catch (error) {
		console.error("Get app users error:", error);
		return c.json({ error: "Failed to get app users" }, 500);
	}
});

/**
 * POST /v1/admin/projects/:projectId/apps/:appId/users/invite
 * Smart invite flow: Check if user exists, grant license or send invitation
 */
adminRoutes.post("/projects/:projectId/apps/:appId/users/invite", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");

		const db = getDb();

		// Verify project exists and user has access
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Verify app exists and belongs to project
		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Parse request body
		const body = await c.req.json();
		const { email, plan_id, grant_license, license_duration_days, custom_message } = body;

		// Validate email
		if (!email || typeof email !== "string") {
			return c.json({ error: "Valid email is required" }, 400);
		}

		// Validate plan_id
		if (grant_license && (!plan_id || typeof plan_id !== "number")) {
			return c.json({ error: "Plan ID (plan_id) is required when granting license" }, 400);
		}

		// Validate license duration if provided
		if (license_duration_days !== null && license_duration_days !== undefined) {
			if (typeof license_duration_days !== "number" || license_duration_days < 1) {
				return c.json({ error: "License duration must be a positive number" }, 400);
			}
		}

		// Calculate valid_until based on license_duration_days
		const now = Math.floor(Date.now() / 1000);
		let validUntil: number | null = null;
		if (license_duration_days && typeof license_duration_days === "number") {
			// Calculate valid_until: now + (days * 24 * 60 * 60)
			validUntil = now + (license_duration_days * 24 * 60 * 60);
		}

		// SMART FLOW: Check if user exists
		const existingUser = await userQueries.findByEmail(db, email.toLowerCase());

		if (existingUser) {
			// User exists - check if they have a license for this app
			const existingLicense = await licenseQueries.findByUserAndApp(db, existingUser.id, app.id);

			if (existingLicense) {
				// Case 3: User has logged into the app (has license) - grant/update license directly
				if (grant_license && plan_id) {
					await licenseQueries.update(db, existingLicense.id, {
						plan_id,
						status: "active",
						valid_until: validUntil,
					});
				}

				// TODO: Send email notification about license update
				console.log(`License updated for existing user ${email}. TODO: Send email notification.`);

		return c.json({
					success: true,
					user_exists: true,
					has_logged_in: true,
					license_granted: true,
					action: "license_updated",
					message: "User already has access to this app. License has been updated.",
					user: {
						id: existingUser.public_id,
						email: existingUser.primary_email,
						name: existingUser.name,
					},
				});
			}

			// Case 2: User exists but hasn't logged into the app (no license) - create invitation
			// Check for existing pending invitation
			const existingInvitation = await invitationQueries.findPendingByEmailAndApp(db, email.toLowerCase(), app.id);

			if (existingInvitation) {
				return c.json({
					success: true,
					user_exists: true,
					has_logged_in: false,
					invitation_sent: true,
					action: "invitation_already_exists",
					message: "User exists but hasn't used this app yet. An invitation has already been sent.",
					invitation: {
						id: existingInvitation.public_id,
						email: existingInvitation.email,
						expires_at: existingInvitation.expires_at,
					},
				});
			}

			// Create new invitation for existing user who hasn't logged into the app
			const invitationId = createId("invitation");
			const expiresAt = now + 7 * 24 * 60 * 60; // 7 days

			const invitation = await invitationQueries.create(db, {
				public_id: invitationId,
				email: email.toLowerCase(),
				app_id: app.id,
				project_id: project.id,
				role: null,
				plan_id: grant_license && plan_id ? plan_id : 1, // Default to plan ID 1 if not specified
				license_duration_days: license_duration_days || null,
				custom_message: custom_message || null,
				expires_at: expiresAt,
				created_at: now,
				consumed_at: null,
				consumed_by_user_id: null,
			});

			// TODO: Send invitation email
			console.log(`Invitation created for existing user ${email} who hasn't logged into app ${app.name}. TODO: Send email.`);

			return c.json({
				success: true,
				user_exists: true,
				has_logged_in: false,
				invitation_sent: true,
				action: "invitation_created",
				message: "User exists but hasn't used this app yet. Invitation sent. License will be activated when they first access the app.",
				invitation: {
					id: invitation.public_id,
					email: invitation.email,
					expires_at: invitation.expires_at,
				},
			});
		}

		// User doesn't exist - create invitation
		const invitationId = createId("invitation");
		const expiresAt = now + 7 * 24 * 60 * 60; // 7 days

		// Check for existing pending invitation
		const existingInvitation = await invitationQueries.findPendingByEmailAndApp(db, email.toLowerCase(), app.id);

		if (existingInvitation) {
			return c.json({
				success: true,
				user_exists: false,
				invitation_sent: true,
				action: "invitation_already_exists",
				message: "An invitation has already been sent to this email.",
				invitation: {
					id: existingInvitation.public_id,
					email: existingInvitation.email,
					expires_at: existingInvitation.expires_at,
				},
			});
		}

		// Create new invitation
		const invitation = await invitationQueries.create(db, {
			public_id: invitationId,
			email: email.toLowerCase(),
			app_id: app.id,
			project_id: project.id,
			role: null, // Regular app user
			plan_id: grant_license && plan_id ? plan_id : 1, // Default to plan ID 1 if not specified
			license_duration_days: license_duration_days || null,
			custom_message: custom_message || null,
			expires_at: expiresAt,
			created_at: now,
			consumed_at: null,
			consumed_by_user_id: null,
		});

		// TODO: Send invitation email via Resend
		// For now, we'll just return the invitation details
		console.log(`Invitation created for ${email} to app ${app.name}. TODO: Send email.`);

		return c.json({
			success: true,
			user_exists: false,
			invitation_sent: true,
			action: "invitation_created",
			message: "Invitation has been sent. License will be activated when they sign up.",
			invitation: {
				id: invitation.public_id,
				email: invitation.email,
				expires_at: invitation.expires_at,
				invite_link: `https://auth.proofa.com/signup?app_id=${app.public_id}&invite_code=${invitation.public_id}`,
			},
		});
	} catch (error) {
		console.error("Invite user error:", error);
		return c.json({ error: "Failed to invite user" }, 500);
	}
});

/**
 * GET /v1/admin/projects/:projectId/apps/:appId/users/:userId
 * Get detailed information about a specific user
 */
adminRoutes.get("/projects/:projectId/apps/:appId/users/:userId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");
		const userId = c.req.param("userId");

		const db = getDb();

		// Verify project and access
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		const adminUser = await userQueries.findByPublicId(db, auth.userId);
		if (!adminUser) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, adminUser.id);
		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Verify app
		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get target user
		const targetUser = await userQueries.findByPublicId(db, userId);
		if (!targetUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get user's license for this app
		const license = await licenseQueries.findByUserAndApp(db, targetUser.id, app.id);
		if (!license) {
			return c.json({ error: "User does not have access to this app" }, 404);
		}

		// Get plan details
		const plan = await planQueries.findById(db, license.plan_id);

		// Get user's identities
		const identities = await identityQueries.findByUserId(db, targetUser.id);

		// Get user's recent sessions (last 10)
		const sessions = await sessionQueries.findByUserId(db, targetUser.id);
		const recentSessions = sessions.slice(0, 10);

		return c.json({
			user: {
				id: targetUser.public_id,
				name: targetUser.name,
				email: targetUser.primary_email,
				avatar_url: targetUser.avatar_url,
				primary_email_verified: Boolean(targetUser.primary_email_verified),
				created_at: targetUser.created_at,
				updated_at: targetUser.updated_at,
			},
			license: {
				id: license.public_id,
				plan_id: license.plan_id,
				plan: plan?.name || "Unknown",
				status: license.status,
				valid_until: license.valid_until,
				created_at: license.created_at,
				updated_at: license.updated_at,
			},
			identities: identities.map((identity) => ({
				provider: identity.provider,
				provider_user_id: identity.provider_user_id,
				email: identity.email,
				created_at: identity.created_at,
			})),
			sessions: recentSessions.map((session) => ({
				id: session.public_id,
				created_at: session.created_at,
				expires_at: session.expires_at,
				last_seen_at: session.last_seen_at,
			})),
		});
	} catch (error) {
		console.error("Get user detail error:", error);
		return c.json({ error: "Failed to get user details" }, 500);
	}
});

/**
 * PATCH /v1/admin/projects/:projectId/apps/:appId/users/:userId
 * Update user information or license
 */
adminRoutes.patch("/projects/:projectId/apps/:appId/users/:userId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");
		const userId = c.req.param("userId");

		const db = getDb();

		// Verify project and access
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		const adminUser = await userQueries.findByPublicId(db, auth.userId);
		if (!adminUser) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, adminUser.id);
		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Verify app
		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get target user
		const targetUser = await userQueries.findByPublicId(db, userId);
		if (!targetUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Parse request body
		const body = await c.req.json();
		const { name, plan_id, license_status } = body;

		// Update user if name is provided
		if (name !== undefined) {
			await userQueries.update(db, targetUser.id, { name });
		}

		// Update license if license fields are provided
		const license = await licenseQueries.findByUserAndApp(db, targetUser.id, app.id);
		if (!license) {
			return c.json({ error: "User does not have a license for this app" }, 404);
		}

		const licenseUpdates: any = {};
		if (plan_id !== undefined) licenseUpdates.plan_id = plan_id;
		if (license_status !== undefined) licenseUpdates.status = license_status;

		if (Object.keys(licenseUpdates).length > 0) {
			await licenseQueries.update(db, license.id, licenseUpdates);
		}

		// Fetch updated data
		const updatedUser = await userQueries.findById(db, targetUser.id);
		const updatedLicense = await licenseQueries.findByUserAndApp(db, targetUser.id, app.id);

		// Fetch plan details
		const plan = await planQueries.findById(db, updatedLicense!.plan_id);

		return c.json({
			success: true,
			user: {
				id: updatedUser!.public_id,
				name: updatedUser!.name,
				email: updatedUser!.primary_email,
			},
			license: {
				id: updatedLicense!.public_id,
				plan_id: updatedLicense!.plan_id,
				plan_name: plan?.name || "Unknown",
				status: updatedLicense!.status,
			},
		});
	} catch (error) {
		console.error("Update user error:", error);
		return c.json({ error: "Failed to update user" }, 500);
	}
});

/**
 * DELETE /v1/admin/projects/:projectId/apps/:appId/users/:userId
 * Remove user's access to the app (revoke license)
 */
adminRoutes.delete("/projects/:projectId/apps/:appId/users/:userId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");
		const userId = c.req.param("userId");

		const db = getDb();

		// Verify project and access
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		const adminUser = await userQueries.findByPublicId(db, auth.userId);
		if (!adminUser) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, adminUser.id);
		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Verify app
		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get target user
		const targetUser = await userQueries.findByPublicId(db, userId);
		if (!targetUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get and revoke license
		const license = await licenseQueries.findByUserAndApp(db, targetUser.id, app.id);
		if (!license) {
			return c.json({ error: "User does not have a license for this app" }, 404);
		}

		// Set license status to 'revoked' instead of actually deleting
		await licenseQueries.update(db, license.id, { status: "revoked" });

		return c.json({
			success: true,
			message: "User access has been revoked",
		});
	} catch (error) {
		console.error("Delete user error:", error);
		return c.json({ error: "Failed to remove user access" }, 500);
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
		if ("licensingRequired" in validatedData) updateData.licensing_required = Number(validatedData.licensingRequired ?? false);
		if (validatedData.appSessionTtlDays) updateData.app_session_ttl_days = validatedData.appSessionTtlDays;

		const updatedApp = await appQueries.update(db, app.id, updateData);

		// Fetch default plan if set
		let defaultPlan = null;
		if (updatedApp.default_plan_id) {
			defaultPlan = await planQueries.findById(db, updatedApp.default_plan_id);
		}

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
			isActive: Boolean(updatedApp.is_active),
			licensingRequired: Boolean(updatedApp.licensing_required),
			defaultPlanId: defaultPlan ? defaultPlan.public_id : null,
			defaultPlan: defaultPlan ? {
				id: defaultPlan.public_id,
				name: defaultPlan.name,
				slug: defaultPlan.slug,
			} : null,
			clientSecret: maskApiKey(updatedApp.client_secret),
			serviceToken: maskApiKey(updatedApp.service_token),
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
 * GET /v1/admin/projects/:projectId/apps/:appId/api-keys
 * Get app API keys (unmasked for copying)
 */
adminRoutes.get("/projects/:projectId/apps/:appId/api-keys", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

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

		return c.json({
			appId: app.public_id,
			clientSecret: app.client_secret,
			serviceToken: app.service_token,
		});
	} catch (error) {
		console.error("Get API keys error:", error);
		return c.json({ error: "Failed to get API keys" }, 500);
	}
});

/**
 * POST /v1/admin/projects/:projectId/apps/:appId/regenerate-secret
 * Regenerate client secret
 */
adminRoutes.post("/projects/:projectId/apps/:appId/regenerate-secret", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

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

		// Generate new client secret
		const newClientSecret = `sk_${nanoid(48)}`;
		const now = Math.floor(Date.now() / 1000);

		await appQueries.update(db, app.id, {
			client_secret: newClientSecret,
			updated_at: now,
		});

		return c.json({
			clientSecret: newClientSecret,
			message: "Client secret regenerated successfully",
		});
	} catch (error) {
		console.error("Regenerate client secret error:", error);
		return c.json({ error: "Failed to regenerate client secret" }, 500);
	}
});

/**
 * POST /v1/admin/projects/:projectId/apps/:appId/regenerate-token
 * Regenerate service token
 */
adminRoutes.post("/projects/:projectId/apps/:appId/regenerate-token", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

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

		// Generate new service token
		const newServiceToken = `st_${nanoid(48)}`;
		const now = Math.floor(Date.now() / 1000);

		await appQueries.update(db, app.id, {
			service_token: newServiceToken,
			updated_at: now,
		});

		return c.json({
			serviceToken: newServiceToken,
			message: "Service token regenerated successfully",
		});
	} catch (error) {
		console.error("Regenerate service token error:", error);
		return c.json({ error: "Failed to regenerate service token" }, 500);
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
 * POST /v1/admin/projects/:projectId/members
 * Invite a team member to the project
 */
adminRoutes.post("/projects/:projectId/members", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const body = await c.req.json();

		const { email, role = "admin" } = body;

		if (!email) {
			return c.json({ error: "Email is required" }, 400);
		}

		// Validate role
		const validRoles = ["owner", "admin", "member"];
		if (!validRoles.includes(role)) {
			return c.json({ error: "Invalid role. Must be owner, admin, or member" }, 400);
		}

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get requesting user
		const requestingUser = await userQueries.findByPublicId(db, auth.userId);
		if (!requestingUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check if requesting user has permission (must be owner or admin)
		const requestingMember = await projectMemberQueries.findByProjectAndUser(db, project.id, requestingUser.id);

		if (!requestingMember || (requestingMember.role !== "owner" && requestingMember.role !== "admin")) {
			return c.json({ error: "Access denied. Only owners and admins can invite members" }, 403);
		}

		// Smart invite logic: check if user exists
		const targetUser = await userQueries.findByEmail(db, email);
		const now = Math.floor(Date.now() / 1000);

		if (targetUser) {
			// User exists - check if already a member
			const existingMember = await projectMemberQueries.findByProjectAndUser(db, project.id, targetUser.id);

			if (existingMember) {
				return c.json({ error: "User is already a member of this project" }, 400);
			}

			// Add user as project member immediately
			const newMember = await projectMemberQueries.create(db, {
				project_id: project.id,
				user_id: targetUser.id,
				role: role,
				created_at: now,
			});

			return c.json({
				type: "member",
				id: newMember.id,
				userId: targetUser.public_id,
				email: targetUser.primary_email,
				name: targetUser.name,
				role: newMember.role,
				createdAt: newMember.created_at,
			});
		}

		// User doesn't exist - create invitation
		const existingInvitation = await projectInvitationQueries.findByProjectAndEmail(db, project.id, email);

		if (existingInvitation && existingInvitation.status === "pending") {
			return c.json({ error: "An invitation for this email already exists" }, 400);
		}

		// Create invitation (expires in 7 days)
		const expiresAt = now + 7 * 24 * 60 * 60;
		const invitation = await projectInvitationQueries.create(db, {
			public_id: createId("invitation"),
			project_id: project.id,
			email: email,
			role: role,
			invited_by_user_id: requestingUser.id,
			status: "pending",
			created_at: now,
			expires_at: expiresAt,
		});

		// TODO: Send invitation email here
		// For now, the invitation is created and will be checked when user signs up

		return c.json({
			type: "invitation",
			id: invitation.id,
			invitationId: invitation.public_id,
			email: invitation.email,
			role: invitation.role,
			status: invitation.status,
			createdAt: invitation.created_at,
			expiresAt: invitation.expires_at,
		});
	} catch (error) {
		console.error("Invite project member error:", error);
		return c.json({ error: "Failed to invite project member" }, 500);
	}
});

/**
 * PATCH /v1/admin/projects/:projectId/members/:memberId
 * Update a team member's role
 */
adminRoutes.patch("/projects/:projectId/members/:memberId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const memberId = Number.parseInt(c.req.param("memberId"), 10);
		const body = await c.req.json();

		const { role } = body;

		if (!role) {
			return c.json({ error: "Role is required" }, 400);
		}

		// Validate role
		const validRoles = ["owner", "admin", "member"];
		if (!validRoles.includes(role)) {
			return c.json({ error: "Invalid role. Must be owner, admin, or member" }, 400);
		}

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get requesting user
		const requestingUser = await userQueries.findByPublicId(db, auth.userId);
		if (!requestingUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check if requesting user has permission (must be owner)
		const requestingMember = await projectMemberQueries.findByProjectAndUser(db, project.id, requestingUser.id);

		if (!requestingMember || requestingMember.role !== "owner") {
			return c.json({ error: "Access denied. Only owners can change member roles" }, 403);
		}

		// Get the member to update
		const memberToUpdate = await projectMemberQueries.findById(db, memberId);

		if (!memberToUpdate || memberToUpdate.project_id !== project.id) {
			return c.json({ error: "Member not found" }, 404);
		}

		// Update the member's role
		const updatedMember = await projectMemberQueries.update(db, memberId, { role });

		if (!updatedMember) {
			return c.json({ error: "Failed to update member role" }, 500);
		}

		const memberUser = await userQueries.findById(db, updatedMember.user_id);

		return c.json({
			id: updatedMember.id,
			userId: memberUser?.public_id,
			email: memberUser?.primary_email,
			name: memberUser?.name,
			role: updatedMember.role,
			createdAt: updatedMember.created_at,
		});
	} catch (error) {
		console.error("Update member role error:", error);
		return c.json({ error: "Failed to update member role" }, 500);
	}
});

/**
 * DELETE /v1/admin/projects/:projectId/members/:memberId
 * Remove a team member from the project
 */
adminRoutes.delete("/projects/:projectId/members/:memberId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const memberId = Number.parseInt(c.req.param("memberId"), 10);

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get requesting user
		const requestingUser = await userQueries.findByPublicId(db, auth.userId);
		if (!requestingUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check if requesting user has permission (must be owner or admin)
		const requestingMember = await projectMemberQueries.findByProjectAndUser(db, project.id, requestingUser.id);

		if (!requestingMember || (requestingMember.role !== "owner" && requestingMember.role !== "admin")) {
			return c.json({ error: "Access denied. Only owners and admins can remove members" }, 403);
		}

		// Get the member to remove
		const memberToRemove = await projectMemberQueries.findById(db, memberId);

		if (!memberToRemove || memberToRemove.project_id !== project.id) {
			return c.json({ error: "Member not found" }, 404);
		}

		// Prevent removing the owner
		if (memberToRemove.role === "owner") {
			return c.json({ error: "Cannot remove the project owner" }, 400);
		}

		// Remove the member
		await projectMemberQueries.delete(db, memberId);

		return c.json({ success: true });
	} catch (error) {
		console.error("Remove member error:", error);
		return c.json({ error: "Failed to remove member" }, 500);
	}
});

/**
 * GET /v1/admin/projects/:projectId/invitations
 * List project invitations
 */
adminRoutes.get("/projects/:projectId/invitations", async (c: Context) => {
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

		const invitations = await projectInvitationQueries.findByProjectId(db, project.id);

		return c.json({
			invitations: invitations.map((inv) => ({
				id: inv.id,
				invitationId: inv.public_id,
				email: inv.email,
				role: inv.role,
				status: inv.status,
				createdAt: inv.created_at,
				expiresAt: inv.expires_at,
			})),
		});
	} catch (error) {
		console.error("List project invitations error:", error);
		return c.json({ error: "Failed to list project invitations" }, 500);
	}
});

/**
 * DELETE /v1/admin/projects/:projectId/invitations/:invitationId
 * Cancel a project invitation
 */
adminRoutes.delete("/projects/:projectId/invitations/:invitationId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const invitationIdParam = Number.parseInt(c.req.param("invitationId"), 10);

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);

		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get requesting user
		const requestingUser = await userQueries.findByPublicId(db, auth.userId);
		if (!requestingUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check if requesting user has permission (must be owner or admin)
		const requestingMember = await projectMemberQueries.findByProjectAndUser(db, project.id, requestingUser.id);

		if (!requestingMember || (requestingMember.role !== "owner" && requestingMember.role !== "admin")) {
			return c.json({ error: "Access denied. Only owners and admins can cancel invitations" }, 403);
		}

		// Get the invitation
		const invitation = await projectInvitationQueries.findById(db, invitationIdParam);

		if (!invitation || invitation.project_id !== project.id) {
			return c.json({ error: "Invitation not found" }, 404);
		}

		// Update invitation status to cancelled
		await projectInvitationQueries.update(db, invitationIdParam, { status: "cancelled" });

		return c.json({ success: true });
	} catch (error) {
		console.error("Cancel invitation error:", error);
		return c.json({ error: "Failed to cancel invitation" }, 500);
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

		// Fetch app and plan details for each license
		const licensesWithAppDetails = await Promise.all(
			licenses.map(async (l) => {
				const app = await appQueries.findById(db, l.app_id);
				const plan = await planQueries.findById(db, l.plan_id);
				return {
				id: l.public_id,
					appId: app?.public_id || null,
					appName: app?.name || "Unknown App",
					plan_id: l.plan_id,
					plan: plan?.name || "Unknown",
				status: l.status,
				validUntil: l.valid_until,
				createdAt: l.created_at,
				};
			}),
		);

		return c.json({
			licenses: licensesWithAppDetails,
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

// Plan Management Endpoints

/**
 * GET /v1/admin/projects/:projectId/apps/:appId/plans
 * Get all plans for an app
 */
adminRoutes.get("/projects/:projectId/apps/:appId/plans", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");

		const db = getDb();

		// Verify project access
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Verify app belongs to project
		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Get all plans for the app
		const plans = await planQueries.findByAppId(db, app.id);

		return c.json({
			plans: plans.map((plan) => ({
				id: plan.public_id, // Use public ID for API requests
				name: plan.name,
				slug: plan.slug,
				description: plan.description,
				monthlyPrice: plan.monthly_price,
				yearlyPrice: plan.yearly_price,
				oneTimePrice: plan.one_time_price,
				trialEnabled: plan.trial_enabled === 1,
				trialDays: plan.trial_days,
				features: plan.features ? JSON.parse(plan.features) : [],
				status: plan.status,
				displayOrder: plan.display_order,
				createdAt: plan.created_at,
				updatedAt: plan.updated_at,
			})),
		});
	} catch (error) {
		console.error("Get plans error:", error);
		return c.json({ error: "Failed to get plans" }, 500);
	}
});

/**
 * POST /v1/admin/projects/:projectId/apps/:appId/plans
 * Create a new plan for an app
 */
adminRoutes.post("/projects/:projectId/apps/:appId/plans", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");

		const db = getDb();

		// Verify project access
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Verify app belongs to project
		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Parse request body
		const body = await c.req.json();
		const { name, slug, description, monthly_price, yearly_price, one_time_price, trial_enabled, trial_days, features, display_order } = body;

		// Validate required fields
		if (!name || typeof name !== "string") {
			return c.json({ error: "Plan name is required" }, 400);
		}

		if (!slug || typeof slug !== "string") {
			return c.json({ error: "Plan slug is required" }, 400);
		}

		// Check if slug already exists for this app
		const existingPlan = await planQueries.findByAppAndSlug(db, app.id, slug);
		if (existingPlan) {
			return c.json({ error: "A plan with this slug already exists" }, 400);
		}

		// Create plan
		const now = Math.floor(Date.now() / 1000);
		const plan = await planQueries.create(db, {
			public_id: createId("plan"),
			app_id: app.id,
			name,
			slug,
			description: description || null,
			monthly_price: monthly_price || null,
			yearly_price: yearly_price || null,
			one_time_price: one_time_price || null,
			trial_enabled: trial_enabled ? 1 : 0,
			trial_days: trial_days || null,
			features: features ? JSON.stringify(features) : null,
			status: "active",
			display_order: display_order || 0,
			created_at: now,
			updated_at: now,
		});

		return c.json({
			success: true,
			plan: {
				id: plan.public_id,
				name: plan.name,
				slug: plan.slug,
				description: plan.description,
				monthlyPrice: plan.monthly_price,
				yearlyPrice: plan.yearly_price,
				oneTimePrice: plan.one_time_price,
				trialEnabled: plan.trial_enabled === 1,
				trialDays: plan.trial_days,
				features: plan.features ? JSON.parse(plan.features) : [],
				status: plan.status,
				displayOrder: plan.display_order,
				createdAt: plan.created_at,
				updatedAt: plan.updated_at,
			},
		});
	} catch (error) {
		console.error("Create plan error:", error);
		return c.json({ error: "Failed to create plan" }, 500);
	}
});

/**
 * PATCH /v1/admin/projects/:projectId/apps/:appId/plans/:planId
 * Update a plan
 */
adminRoutes.patch("/projects/:projectId/apps/:appId/plans/:planId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");
		const planId = c.req.param("planId");

		const db = getDb();

		// Verify project access
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Verify app belongs to project
		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Verify plan exists and belongs to app
		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) {
			return c.json({ error: "Plan not found" }, 404);
		}

		// Parse request body
		const body = await c.req.json();
		const { name, description, monthly_price, yearly_price, one_time_price, trial_enabled, trial_days, features, status, display_order } = body;

		// Build update object
		const updates: any = {};
		if (name !== undefined) updates.name = name;
		if (description !== undefined) updates.description = description;
		if (monthly_price !== undefined) updates.monthly_price = monthly_price;
		if (yearly_price !== undefined) updates.yearly_price = yearly_price;
		if (one_time_price !== undefined) updates.one_time_price = one_time_price;
		if (trial_enabled !== undefined) updates.trial_enabled = trial_enabled ? 1 : 0;
		if (trial_days !== undefined) updates.trial_days = trial_days;
		if (features !== undefined) updates.features = JSON.stringify(features);
		if (status !== undefined) updates.status = status;
		if (display_order !== undefined) updates.display_order = display_order;

		// Update plan
		const updatedPlan = await planQueries.update(db, plan.id, updates);

		return c.json({
			success: true,
			plan: {
				id: updatedPlan.public_id,
				name: updatedPlan.name,
				slug: updatedPlan.slug,
				description: updatedPlan.description,
				monthlyPrice: updatedPlan.monthly_price,
				yearlyPrice: updatedPlan.yearly_price,
				oneTimePrice: updatedPlan.one_time_price,
				trialEnabled: updatedPlan.trial_enabled === 1,
				trialDays: updatedPlan.trial_days,
				features: updatedPlan.features ? JSON.parse(updatedPlan.features) : [],
				status: updatedPlan.status,
				displayOrder: updatedPlan.display_order,
				createdAt: updatedPlan.created_at,
				updatedAt: updatedPlan.updated_at,
			},
		});
	} catch (error) {
		console.error("Update plan error:", error);
		return c.json({ error: "Failed to update plan" }, 500);
	}
});

/**
 * DELETE /v1/admin/projects/:projectId/apps/:appId/plans/:planId
 * Delete a plan (only if no active licenses use it)
 */
adminRoutes.delete("/projects/:projectId/apps/:appId/plans/:planId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");
		const planId = c.req.param("planId");

		const db = getDb();

		// Verify project access
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Verify app belongs to project
		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Verify plan exists and belongs to app
		const plan = await planQueries.findByPublicId(db, planId);
		if (!plan || plan.app_id !== app.id) {
			return c.json({ error: "Plan not found" }, 404);
		}

		// Check if any active licenses use this plan
		const licenseCount = await planQueries.countLicensesByPlan(db, plan.id);
		if (licenseCount > 0) {
			return c.json({
				error: `Cannot delete plan. ${licenseCount} active license(s) are using this plan.`,
			}, 400);
		}

		// Delete plan
		await planQueries.delete(db, plan.id);

		return c.json({
			success: true,
			message: "Plan deleted successfully",
		});
	} catch (error) {
		console.error("Delete plan error:", error);
		return c.json({ error: "Failed to delete plan" }, 500);
	}
});
