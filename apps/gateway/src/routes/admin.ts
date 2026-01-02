import {
	appQueries,
	getDb,
	identityQueries,
	invitationQueries,
	licenseQueries,
	paymentProviderQueries,
	planQueries,
	projectInvitationQueries,
	projectMemberQueries,
	projectQueries,
	sessionQueries,
	userQueries,
} from "@proofa/db";
import { createId, createLogger, encrypt, InviteAppUserRequestSchema, serializeError } from "@proofa/shared";
import { nanoid } from "nanoid";
import { INVITATION_EXPIRY_DAYS } from "../config/constants";
import {
	generateAppUserInvitationEmail,
	generateLicenseGrantedEmail,
	generateProjectTeamInvitationEmail,
	sendEmail,
} from "../services/email.js";
import { auditLogger } from "../utils/logger.js";

const log = createLogger("admin-routes");

import {
	AppDTOSchema,
	CreateAppRequestSchema,
	CreateProjectRequestSchema,
	ProjectDTOSchema,
	UpdateAppRequestSchema,
} from "@proofa/shared/types/schemas";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
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
		log.error({ err: serializeError(error as Error) }, "Get admin me error");
		return c.json({ error: "Failed to get profile" }, 500);
	}
});

/**
 * PATCH /v1/admin/me
 * Update admin profile
 */
adminRoutes.patch("/me", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const db = getDb();
		const body = await c.req.json();

		// Validate input
		if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
			return c.json({ error: "Name is required" }, 400);
		}

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Update user name
		await userQueries.update(db, user.id, {
			name: body.name.trim(),
		});

		// Return updated profile
		const updatedUser = await userQueries.findById(db, user.id);
		if (!updatedUser) {
			return c.json({ error: "User not found" }, 404);
		}
		return c.json({
			id: updatedUser.public_id,
			email: updatedUser.primary_email,
			name: updatedUser.name,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Update admin profile error");
		return c.json({ error: "Failed to update profile" }, 500);
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
		log.error({ err: serializeError(error as Error) }, "List projects error:");
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

		const now = new Date();

		const project = await projectQueries.create(db, {
			public_id: createId("project"),
			name: validatedData.name,
			slug: validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
			description: validatedData.description ?? null,
			owner_user_id: user.id,
			created_at: now,
			updated_at: now,
		});

		// Add user as project owner
		await projectMemberQueries.create(db, {
			public_id: createId("projectMember"),
			project_id: project.id,
			user_id: user.id,
			role: "owner",
			created_at: now,
		});

		// Audit log
		auditLogger.logCreate(
			"project",
			project.public_id,
			project.name,
			auth.userId,
			user.primary_email ?? undefined,
			c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
			{ slug: project.slug },
		);

		// Validate and return response
		const projectDTO = ProjectDTOSchema.parse({
			id: project.public_id,
			name: project.name,
			slug: project.slug,
			description: project.description,
			createdAt: project.created_at,
			updatedAt: project.updated_at,
		});

		return c.json(projectDTO, 201);
	} catch (error) {
		if (error instanceof z.ZodError) {
			log.warn({ errors: error.errors }, "Validation error in create project");
			return c.json({ error: "Invalid request data", details: error.errors }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Create project error");
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
		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

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
		log.error({ err: serializeError(error as Error) }, "Get project error:");
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
		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Update project
		const now = new Date();
		const updateData: Record<string, any> = {
			updated_at: now,
		};

		if (body["name"] !== undefined) {
			updateData["name"] = body["name"];
		}
		if (body["slug"] !== undefined) {
			updateData["slug"] = body["slug"];
		}
		if (body["description"] !== undefined) {
			updateData["description"] = body["description"];
		}

		const updatedProjects = await projectQueries.update(db, project.id, updateData);
		const updatedProject = updatedProjects[0];

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
		log.error({ err: serializeError(error as Error) }, "Update project error:");
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
		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

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
		log.error({ err: serializeError(error as Error) }, "Get project stats error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

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
		log.error({ err: serializeError(error as Error) }, "List apps error:");
		return c.json({ error: "Failed to list apps" }, 500);
	}
});

/**
 * GET /v1/admin/projects/:projectId/payment-providers
 * Get all payment providers configured for a project
 */
adminRoutes.get("/projects/:projectId/payment-providers", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");

		const db = getDb();

		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			return c.json({ error: "Access denied" }, 403);
		}

		const providers = await paymentProviderQueries.getProjectPaymentProviders(db, project.id);

		return c.json({
			providers: providers.map((p: any) => ({
				id: String(p.id),
				name: p.name,
				slug: p.slug,
				provider: p.provider,
				environment: p.environment,
				isActive: p.is_active,
				createdAt: p.created_at,
				updatedAt: p.updated_at,
			})),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get project payment providers error:");
		return c.json({ error: "Failed to get payment providers" }, 500);
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			return c.json({ error: "Access denied. Only owners and admins can create apps" }, 403);
		}

		const now = new Date();
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
			description: validatedData.description ?? null,
			allowed_hosts: validatedData.allowedHosts || [],
			redirect_uris: validatedData.redirectUris || [],
			session_ttl_days: validatedData.sessionTtlDays || 28,
			client_secret: clientSecret,
			service_token: serviceToken,
			account_lockout_minutes: 30,
			cache_ttl_minutes: 60,
			cors_origins: ["http://localhost:3001"],
			rate_limit: 100,
			created_at: now,
			updated_at: now,
		});

		// Step 2: If licensing is enabled, create default license plan
		if (validatedData.requiresLicensing && validatedData.defaultLicensePlan) {
			const planData = validatedData.defaultLicensePlan;
			const planSlug = planData.slug || planData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

			// Convert price and billing period to database format
			let monthlyPrice: number | null = null;
			let yearlyPrice: number | null = null;
			let oneTimePrice: number | null = null;
			let durationDays: number | null = null;

			// Convert price to cents
			const priceInCents = Math.round(planData.price * 100);

			if (planData.billing_period === "none") {
				// No billing - completely free plan
				monthlyPrice = null;
				yearlyPrice = null;
				oneTimePrice = null;
				durationDays = null;
			} else if (planData.billing_period === "monthly") {
				monthlyPrice = priceInCents;
				durationDays = null;
			} else if (planData.billing_period === "yearly") {
				yearlyPrice = priceInCents;
				durationDays = null;
			} else if (planData.billing_period === "lifetime") {
				oneTimePrice = priceInCents;
				durationDays = null;
			} else if (planData.billing_period === "custom") {
				oneTimePrice = priceInCents;
				durationDays = planData.trial_days || 30;
			}

			await planQueries.create(db, {
				public_id: createId("plan"),
				app_id: app.id,
				name: planData.name,
				slug: planSlug,
				description: planData.description || null,
				monthly_price: monthlyPrice,
				yearly_price: yearlyPrice,
				one_time_price: oneTimePrice,
				duration_days: durationDays,
				trial_enabled: (planData.trial_days || 0) > 0,
				trial_days: planData.trial_days || null,
				features: planData.features || null,
				status: "active",
				display_order: 0,
				created_at: now,
				updated_at: now,
			});

			// Note: apps table does not currently store a default plan reference.
		}

		// Validate and return response
		const appDTO = AppDTOSchema.parse({
			id: app.public_id,
			projectId: project.public_id,
			name: app.name,
			slug: app.slug,
			description: app.description,
			redirectUris: app.redirect_uris || [],
			allowedHosts: app.allowed_hosts || [],
			corsOrigins: app.cors_origins || [],
			clientSecret: maskApiKey(app.client_secret),
			serviceToken: maskApiKey(app.service_token),
			sessionTtlDays: app.session_ttl_days,
			accountLockoutMinutes: app.account_lockout_minutes,
			cacheTtlMinutes: app.cache_ttl_minutes,
			rateLimit: app.rate_limit,
			enabledProviders: (app.enabled_providers || ["google"]) as string[],
			createdAt: new Date(app.created_at),
			updatedAt: new Date(app.updated_at),
		});

		return c.json(appDTO, 201);
	} catch (error) {
		if (error instanceof z.ZodError) {
			log.warn({ errors: error.errors }, "Validation error");
			return c.json({ error: "Invalid request data", details: error.errors }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Create app error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

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
			redirectUris: app.redirect_uris || [],
			allowedHosts: app.allowed_hosts || [],
			corsOrigins: app.cors_origins || [],
			clientSecret: maskApiKey(app.client_secret),
			serviceToken: maskApiKey(app.service_token),
			sessionTtlDays: app.session_ttl_days,
			accountLockoutMinutes: app.account_lockout_minutes,
			cacheTtlMinutes: app.cache_ttl_minutes,
			selectedPaymentProviderId: app.selected_payment_provider_id,
			rateLimit: app.rate_limit,
			enabledProviders: (app.enabled_providers || ["google"]) as string[],
			createdAt: new Date(app.created_at),
			updatedAt: new Date(app.updated_at),
		});

		return c.json(appDTO);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get app error:");
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
		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

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
		log.error({ err: serializeError(error as Error) }, "Get app stats error:");
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
		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

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
		log.error({ err: serializeError(error as Error) }, "Get app users error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Verify app exists and belongs to project
		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Parse and validate request body
		const body = await c.req.json();
		const validatedData = InviteAppUserRequestSchema.parse(body);
		const { email, plan_id, grant_license, license_duration_days, custom_message } = validatedData;

		// Additional validation: plan_id required when granting license
		if (grant_license && !plan_id) {
			return c.json({ error: "Plan ID (plan_id) is required when granting license" }, 400);
		}

		// Calculate valid_until based on license_duration_days
		const now = new Date();
		let validUntil: Date | null = null;
		if (license_duration_days && typeof license_duration_days === "number") {
			// Calculate valid_until: now + (days * 24 * 60 * 60 * 1000)
			validUntil = new Date(Date.now() + license_duration_days * 24 * 60 * 60 * 1000);
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

				// Send email notification about license update
				if (plan_id) {
					const plan = await planQueries.findById(db, plan_id);
					const validUntilDate = validUntil ? validUntil.toLocaleDateString() : undefined;

					try {
						await sendEmail({
							to: email,
							subject: `Your ${app.name} license has been updated`,
							html: generateLicenseGrantedEmail({
								userName: existingUser.name || existingUser.primary_email || "there",
								appName: app.name,
								planName: plan?.name || "Unknown Plan",
								dashboardUrl: `https://auth.proofa.sh/login?app_id=${app.public_id}`,
								...(validUntilDate ? { validUntil: validUntilDate } : {}),
							}),
						});
					} catch (emailError) {
						log.error(
							{ err: serializeError(emailError as Error) },
							"Failed to send license update email:",
							emailError,
						);
						// Don't fail the request if email fails
					}
				}

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
			const existingInvitations = await invitationQueries.findPendingByEmailAndApp(
				db,
				email.toLowerCase(),
				app.id,
			);
			const existingInvitation = existingInvitations[0];

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
			const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

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

			// Send invitation email
			const plan = plan_id ? await planQueries.findById(db, plan_id) : null;
			const inviteLink = `https://auth.proofa.sh/login?app_id=${app.public_id}&invite_code=${invitation.public_id}`;

			try {
				await sendEmail({
					to: email,
					subject: `You've been invited to ${app.name}`,
					html: generateAppUserInvitationEmail({
						inviteeEmail: email,
						appName: app.name,
						inviterName: user.name || user.primary_email || "A team member",
						...(plan?.name ? { planName: plan.name } : {}),
						...(custom_message ? { customMessage: custom_message } : {}),
						inviteLink,
						expiresInDays: 7,
					}),
				});
			} catch (emailError) {
				log.error({ err: serializeError(emailError as Error) }, "Failed to send invitation email:", emailError);
				// Don't fail the request if email fails
			}

			return c.json({
				success: true,
				user_exists: true,
				has_logged_in: false,
				invitation_sent: true,
				action: "invitation_created",
				message:
					"User exists but hasn't used this app yet. Invitation sent. License will be activated when they first access the app.",
				invitation: {
					id: invitation.public_id,
					email: invitation.email,
					expires_at: invitation.expires_at,
				},
			});
		}

		// User doesn't exist - create invitation
		const invitationId = createId("invitation");
		const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
		const existingInvitations = await invitationQueries.findPendingByEmailAndApp(db, email.toLowerCase(), app.id);
		const existingInvitation = existingInvitations[0];

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

		// Send invitation email
		const plan = plan_id ? await planQueries.findById(db, plan_id) : null;
		const inviteLink = `https://auth.proofa.sh/signup?app_id=${app.public_id}&invite_code=${invitation.public_id}`;

		try {
			await sendEmail({
				to: email,
				subject: `You've been invited to ${app.name}`,
				html: generateAppUserInvitationEmail({
					inviteeEmail: email,
					appName: app.name,
					inviterName: user.name || user.primary_email || "A team member",
					...(plan?.name ? { planName: plan.name } : {}),
					...(custom_message ? { customMessage: custom_message } : {}),
					inviteLink,
					expiresInDays: 7,
				}),
			});
		} catch (emailError) {
			log.error({ err: serializeError(emailError as Error) }, "Failed to send invitation email:", emailError);
			// Don't fail the request if email fails
		}

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
		log.error({ err: serializeError(error as Error) }, "Invite user error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, adminUser.id);
		const member = members[0];
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
		log.error({ err: serializeError(error as Error) }, "Get user detail error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, adminUser.id);
		const member = members[0];
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
		log.error({ err: serializeError(error as Error) }, "Update user error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, adminUser.id);
		const member = members[0];
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
		log.error({ err: serializeError(error as Error) }, "Delete user error:");
		return c.json({ error: "Failed to remove user access" }, 500);
	}
});

/**
 * POST /v1/admin/projects/:projectId/apps/:appId/users/:userId/renew
 * Renew user's license by extending valid_until based on plan duration
 */
adminRoutes.post("/projects/:projectId/apps/:appId/users/:userId/renew", async (c: Context) => {
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, adminUser.id);
		const member = members[0];
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

		// Get user's license
		const license = await licenseQueries.findByUserAndApp(db, targetUser.id, app.id);
		if (!license) {
			return c.json({ error: "User does not have a license for this app" }, 404);
		}

		// Get plan to determine duration
		const plan = await planQueries.findById(db, license.plan_id);
		if (!plan) {
			return c.json({ error: "Plan not found" }, 404);
		}

		// Calculate new valid_until
		const now = new Date();
		let newValidUntil: Date | null = null;

		if (plan.duration_days) {
			// Start from current valid_until if it's in the future, otherwise start from now
			const startFrom = license.valid_until && license.valid_until > now ? license.valid_until : now;
			newValidUntil = new Date(startFrom.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
		}
		// If plan.duration_days is null, newValidUntil stays null (lifetime)

		// Update license
		await licenseQueries.update(db, license.id, {
			valid_until: newValidUntil,
			status: "active", // Reactivate if it was expired
		});

		// Fetch updated license
		const updatedLicense = await licenseQueries.findByUserAndApp(db, targetUser.id, app.id);

		return c.json({
			success: true,
			message: plan.duration_days
				? `License renewed for ${plan.duration_days} days`
				: "License renewed (lifetime access)",
			license: {
				id: updatedLicense?.public_id,
				plan: plan.name,
				status: updatedLicense?.status,
				validUntil: updatedLicense?.valid_until,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Renew license error:");
		return c.json({ error: "Failed to renew license" }, 500);
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

		if (!member || member.role !== "owner") {
			return c.json({ error: "Access denied" }, 403);
		}

		const app = await appQueries.findByPublicId(db, appId);

		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		const now = new Date();

		// Build update object with JSON serialization for array fields
		const updateData: Record<string, unknown> = { updated_at: now };

		if (validatedData["name"]) updateData["name"] = validatedData["name"];
		if (validatedData["slug"]) updateData["slug"] = validatedData["slug"];
		if (validatedData["description"] !== undefined) updateData["description"] = validatedData["description"];
		if (validatedData["allowedHosts"]) updateData["allowed_hosts"] = validatedData["allowedHosts"];
		if (validatedData["redirectUris"]) updateData["redirect_uris"] = validatedData["redirectUris"];
		if (validatedData["sessionTtlDays"]) updateData["session_ttl_days"] = validatedData["sessionTtlDays"];
		if (validatedData["corsOrigins"]) updateData["cors_origins"] = validatedData["corsOrigins"];
		if (validatedData["rateLimit"]) updateData["rate_limit"] = validatedData["rateLimit"];
		if (validatedData["accountLockoutMinutes"])
			updateData["account_lockout_minutes"] = validatedData["accountLockoutMinutes"];
		if (validatedData["cacheTtlMinutes"]) updateData["cache_ttl_minutes"] = validatedData["cacheTtlMinutes"];

		// Handle enabled providers
		if (validatedData["enabledProviders"] !== undefined) {
			updateData["enabled_providers"] = validatedData["enabledProviders"];
		}

		const updatedApps = await appQueries.update(db, app.id, updateData);
		const updatedApp = updatedApps;

		if (!updatedApp) {
			return c.json({ error: "Failed to update app" }, 500);
		}

		// Validate and return response
		const appDTO = AppDTOSchema.parse({
			id: updatedApp.public_id,
			projectId: project.public_id,
			name: updatedApp.name,
			slug: updatedApp.slug,
			description: updatedApp.description,
			redirectUris: updatedApp.redirect_uris || [],
			allowedHosts: updatedApp.allowed_hosts || [],
			corsOrigins: updatedApp.cors_origins || [],
			clientSecret: maskApiKey(updatedApp.client_secret),
			serviceToken: maskApiKey(updatedApp.service_token),
			sessionTtlDays: updatedApp.session_ttl_days,
			accountLockoutMinutes: updatedApp.account_lockout_minutes,
			cacheTtlMinutes: updatedApp.cache_ttl_minutes,
			rateLimit: updatedApp.rate_limit,
			enabledProviders: (updatedApp.enabled_providers || ["google"]) as string[],
			createdAt: new Date(updatedApp.created_at),
			updatedAt: new Date(updatedApp.updated_at),
		});

		return c.json(appDTO);
	} catch (error) {
		if (error instanceof z.ZodError) {
			log.warn({ errors: error.errors }, "Validation error");
			return c.json({ error: "Invalid request data", details: error.errors }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Update app error:");
		if (error instanceof Error) {
			log.error({ err: serializeError(error as Error) }, "Error details:", error.message, error.stack);
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
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
		log.error({ err: serializeError(error as Error) }, "Get API keys error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
		if (!member || member.role !== "owner") {
			return c.json({ error: "Access denied" }, 403);
		}

		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Generate new client secret
		const newClientSecret = `sk_${nanoid(48)}`;
		const now = new Date();

		await appQueries.update(db, app.id, {
			client_secret: newClientSecret,
			updated_at: now,
		});

		return c.json({
			clientSecret: newClientSecret,
			message: "Client secret regenerated successfully",
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Regenerate client secret error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
		if (!member || member.role !== "owner") {
			return c.json({ error: "Access denied" }, 403);
		}

		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Generate new service token
		const newServiceToken = `st_${nanoid(48)}`;
		const now = new Date();

		await appQueries.update(db, app.id, {
			service_token: newServiceToken,
			updated_at: now,
		});

		return c.json({
			serviceToken: newServiceToken,
			message: "Service token regenerated successfully",
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Regenerate service token error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		const allMembers = await projectMemberQueries.findByProjectId(db, project.id);

		return c.json({
			members: await Promise.all(
				allMembers.map(async (m) => {
					const memberUser = await userQueries.findById(db, m.user_id);
					return {
						id: m.public_id,
						userId: memberUser?.public_id,
						email: memberUser?.primary_email,
						name: memberUser?.name,
						role: m.role,
						createdAt: new Date(m.created_at),
					};
				}),
			),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "List project members error:");
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
		const requestingMembers = await projectMemberQueries.findByProjectAndUser(db, project.id, requestingUser.id);
		const requestingMember = requestingMembers[0];

		if (!requestingMember || (requestingMember.role !== "owner" && requestingMember.role !== "admin")) {
			return c.json({ error: "Access denied. Only owners and admins can invite members" }, 403);
		}

		// Smart invite logic: check if user exists
		const targetUser = await userQueries.findByEmail(db, email);
		const now = new Date();

		if (targetUser) {
			// User exists - check if already a member
			const existingMembers = await projectMemberQueries.findByProjectAndUser(db, project.id, targetUser.id);
			const existingMember = existingMembers[0];

			if (existingMember) {
				return c.json({ error: "User is already a member of this project" }, 400);
			}

			// Add user as project member immediately
			const newMember = await projectMemberQueries.create(db, {
				public_id: createId("projectMember"),
				project_id: project.id,
				user_id: targetUser.id,
				role: role,
				created_at: now,
			});

			const memberResponse = {
				type: "member",
				id: newMember.public_id,
				userId: targetUser.public_id,
				email: targetUser.primary_email,
				name: targetUser.name,
				role: newMember.role,
				createdAt: new Date(newMember.created_at),
			};

			log.info(
				{
					rawCreatedAt: newMember.created_at,
					createdAtType: typeof newMember.created_at,
					convertedCreatedAt: memberResponse.createdAt,
					convertedType: typeof memberResponse.createdAt,
					isDate: memberResponse.createdAt instanceof Date,
				},
				"Member response data before JSON",
			);

			return c.json(memberResponse);
		}

		// User doesn't exist - create invitation
		const existingInvitations = await projectInvitationQueries.findByProjectAndEmail(db, project.id, email);
		const existingInvitation = existingInvitations[0];
		if (existingInvitation && existingInvitation.status === "pending") {
			return c.json({ error: "An invitation for this email already exists" }, 400);
		}

		// Create invitation (expires in configured days)
		const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
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

		// Send invitation email
		try {
			await sendEmail({
				to: email,
				subject: `You've been invited to join ${project.name}`,
				html: generateProjectTeamInvitationEmail({
					inviteeEmail: email,
					projectName: project.name,
					inviterName: requestingUser.name || requestingUser.primary_email || "A team member",
					role: role,
					invitationCode: invitation.public_id,
					expiresInDays: 7,
				}),
			});
		} catch (emailError) {
			log.error(
				{ err: serializeError(emailError as Error) },
				"Failed to send team invitation email:",
				emailError,
			);
			// Don't fail the request if email fails
		}

		const invitationResponse = {
			type: "invitation",
			id: invitation.id,
			invitationId: invitation.public_id,
			email: invitation.email,
			role: invitation.role,
			status: invitation.status,
			createdAt: new Date(invitation.created_at),
			expiresAt: new Date(invitation.expires_at),
		};

		log.info(
			{
				rawCreatedAt: invitation.created_at,
				createdAtType: typeof invitation.created_at,
				rawExpiresAt: invitation.expires_at,
				expiresAtType: typeof invitation.expires_at,
				convertedCreatedAt: invitationResponse.createdAt,
				convertedExpiresAt: invitationResponse.expiresAt,
				createdAtIsDate: invitationResponse.createdAt instanceof Date,
				expiresAtIsDate: invitationResponse.expiresAt instanceof Date,
			},
			"Invitation response data before JSON",
		);

		return c.json(invitationResponse);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Invite project member error:");
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
		const memberId = c.req.param("memberId");
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
		const requestingMembers = await projectMemberQueries.findByProjectAndUser(db, project.id, requestingUser.id);
		const requestingMember = requestingMembers[0];

		if (!requestingMember || requestingMember.role !== "owner") {
			return c.json({ error: "Access denied. Only owners can change member roles" }, 403);
		}

		// Get the member to update
		const memberToUpdate = await projectMemberQueries.findByPublicId(db, memberId);

		if (!memberToUpdate || memberToUpdate.project_id !== project.id) {
			return c.json({ error: "Member not found" }, 404);
		}

		// Update the member's role
		const updatedMembers = await projectMemberQueries.updateByPublicId(db, memberId, { role });
		const updatedMember = updatedMembers[0];

		if (!updatedMember) {
			return c.json({ error: "Failed to update member role" }, 500);
		}

		const memberUser = await userQueries.findById(db, updatedMember.user_id);

		return c.json({
			id: updatedMember.public_id,
			userId: memberUser?.public_id,
			email: memberUser?.primary_email,
			name: memberUser?.name,
			role: updatedMember.role,
			createdAt: new Date(updatedMember.created_at),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Update member role error:");
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
		const memberId = c.req.param("memberId");

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
		const requestingMembers = await projectMemberQueries.findByProjectAndUser(db, project.id, requestingUser.id);
		const requestingMember = requestingMembers[0];
		if (!requestingMember || (requestingMember.role !== "owner" && requestingMember.role !== "admin")) {
			return c.json({ error: "Access denied. Only owners and admins can remove members" }, 403);
		}

		// Get the member to remove
		const memberToRemove = await projectMemberQueries.findByPublicId(db, memberId);

		if (!memberToRemove || memberToRemove.project_id !== project.id) {
			return c.json({ error: "Member not found" }, 404);
		}

		// Prevent removing the owner
		if (memberToRemove.role === "owner") {
			return c.json({ error: "Cannot remove the project owner" }, 400);
		}

		// Remove the member
		await projectMemberQueries.deleteByPublicId(db, memberId);

		return c.json({ success: true });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Remove member error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];

		if (!member) {
			return c.json({ error: "Access denied" }, 403);
		}

		const invitations = await projectInvitationQueries.findByProjectId(db, project.id);

		return c.json({
			invitations: invitations.map((inv) => ({
				id: inv.public_id,
				email: inv.email,
				role: inv.role,
				status: inv.status,
				createdAt: new Date(inv.created_at),
				expiresAt: new Date(inv.expires_at),
			})),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "List project invitations error:");
		return c.json({ error: "Failed to list project invitations" }, 500);
	}
});

/**
 * POST /v1/admin/invitations/:invitationCode/accept
 * Accept a project invitation (public endpoint, requires auth)
 */
adminRoutes.post("/invitations/:invitationCode/accept", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const invitationCode = c.req.param("invitationCode");

		log.info(
			{
				invitationCode,
				userId: auth.userId,
			},
			"Accept invitation request",
		);

		const db = getDb();

		// Get the invitation
		const invitation = await projectInvitationQueries.findByPublicId(db, invitationCode);

		log.info(
			{
				invitation: !!invitation,
				status: invitation?.status,
			},
			"Invitation lookup",
		);

		if (!invitation) {
			return c.json({ error: "Invitation not found" }, 404);
		}

		// Check if invitation is still valid
		if (invitation.status !== "pending") {
			return c.json({ error: `Invitation is ${invitation.status}` }, 400);
		}

		const now = new Date();
		if (invitation.expires_at < now) {
			await projectInvitationQueries.updateByPublicId(db, invitationCode, { status: "expired" });
			return c.json({ error: "Invitation has expired" }, 400);
		}

		// Get the user
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		log.info(
			{
				userEmail: user.primary_email,
				invitationEmail: invitation.email,
			},
			"Email comparison",
		);

		// Check if email matches
		if (user.primary_email?.toLowerCase() !== invitation.email.toLowerCase()) {
			return c.json({ error: "This invitation is for a different email address" }, 403);
		}

		// Get the project
		const project = await projectQueries.findById(db, invitation.project_id);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Check if user is already a member
		const existingMembers = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const existingMember = existingMembers[0];

		log.info(
			{
				existingMembers: existingMembers.length,
				existingMember: !!existingMember,
				userId: user.id,
				projectId: project.id,
			},
			"Checking existing member",
		);

		if (existingMember) {
			// Mark invitation as accepted anyway
			await projectInvitationQueries.updateByPublicId(db, invitationCode, { status: "accepted" });
			return c.json({
				success: true,
				message: "You are already a member of this project",
				project: {
					id: project.public_id,
					name: project.name,
				},
			});
		}

		// Add user as project member
		log.info(
			{
				userId: user.id,
				projectId: project.id,
				role: invitation.role,
			},
			"Creating new project member",
		);

		const newMember = await projectMemberQueries.create(db, {
			public_id: createId("projectMember"),
			project_id: project.id,
			user_id: user.id,
			role: invitation.role,
			created_at: now,
		});

		log.info(
			{
				newMemberId: newMember.public_id,
				memberRole: newMember.role,
			},
			"Member created successfully",
		);

		// Mark invitation as accepted
		await projectInvitationQueries.updateByPublicId(db, invitationCode, { status: "accepted" });

		log.info("Invitation marked as accepted");

		return c.json({
			success: true,
			message: "Invitation accepted successfully",
			project: {
				id: project.public_id,
				name: project.name,
			},
			member: {
				id: newMember.public_id,
				role: newMember.role,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Accept invitation error:");
		return c.json({ error: "Failed to accept invitation" }, 500);
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
		const invitationId = c.req.param("invitationId");

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
		const requestingMembers = await projectMemberQueries.findByProjectAndUser(db, project.id, requestingUser.id);
		const requestingMember = requestingMembers[0];
		if (!requestingMember || (requestingMember.role !== "owner" && requestingMember.role !== "admin")) {
			return c.json({ error: "Access denied. Only owners and admins can cancel invitations" }, 403);
		}

		// Get the invitation
		const invitation = await projectInvitationQueries.findByPublicId(db, invitationId);

		if (!invitation || invitation.project_id !== project.id) {
			return c.json({ error: "Invitation not found" }, 404);
		}

		// Update invitation status to cancelled
		await projectInvitationQueries.updateByPublicId(db, invitationId, { status: "cancelled" });

		return c.json({ success: true });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Cancel invitation error:");
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
		log.error({ err: serializeError(error as Error) }, "List licenses error:");
		return c.json({ error: "Failed to list licenses" }, 500);
	}
});

/**
 * DELETE /v1/admin/projects/:projectId
 * Delete a project (soft delete - marks as deleted)
 */
adminRoutes.delete("/projects/:projectId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");

		const db = getDb();

		// Verify project exists
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check if user is the owner
		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
		if (!member || member.role !== "owner") {
			return c.json({ error: "Access denied. Only the project owner can delete the project" }, 403);
		}

		// Soft delete: Mark project as deleted
		// This will:
		// 1. Set deleted_at timestamp
		// 2. Set is_active to false
		// 3. Update slug to avoid uniqueness conflicts
		await projectQueries.delete(db, project.id);

		// Mark all apps in this project as deleted
		const apps = await appQueries.findByProjectId(db, project.id);
		for (const app of apps) {
			await appQueries.delete(db, app.id);

			// Soft delete all active licenses for each app
			const licenses = await licenseQueries.findByAppId(db, app.id);
			for (const license of licenses) {
				if (license.status === "active") {
					await licenseQueries.delete(db, license.id);
				}
			}
		}

		// Soft delete all team members (except owner for audit trail)
		const allMembers = await projectMemberQueries.findByProjectId(db, project.id);
		for (const projectMember of allMembers) {
			if (projectMember.role !== "owner") {
				await projectMemberQueries.delete(db, projectMember.id);
			}
		}

		// Soft delete all pending invitations
		const invitations = await projectInvitationQueries.findByProjectId(db, project.id);
		for (const invitation of invitations) {
			if (invitation.status === "pending") {
				await projectInvitationQueries.delete(db, invitation.id);
			}
		}

		return c.json({
			success: true,
			message: "Project has been deleted successfully",
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete project error:");
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
		log.error({ err: serializeError(error as Error) }, "Create app error:");
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
		log.error({ err: serializeError(error as Error) }, "Get apps error:");
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
		log.error({ err: serializeError(error as Error) }, "Update app error:");
		return c.json({ error: "Failed to update app" }, 500);
	}
});

/**
 * DELETE /v1/admin/projects/:projectId/apps/:appId
 * Delete an app (soft delete - marks as deleted)
 */
adminRoutes.delete("/projects/:projectId/apps/:appId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const projectId = c.req.param("projectId");
		const appId = c.req.param("appId");

		const db = getDb();

		// Verify project exists
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get user by public ID
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check if user has permission (must be owner or admin)
		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			return c.json({ error: "Access denied. Only owners and admins can delete apps" }, 403);
		}

		// Verify app exists and belongs to project
		const app = await appQueries.findByPublicId(db, appId);
		if (!app || app.project_id !== project.id) {
			return c.json({ error: "App not found" }, 404);
		}

		// Soft delete: Mark app as deleted
		// This will:
		// 1. Set deleted_at timestamp
		// 2. Set is_active to false
		// 3. Update slug to avoid uniqueness conflicts
		await appQueries.delete(db, app.id);

		// Soft delete all active licenses for this app
		const licenses = await licenseQueries.findByAppId(db, app.id);
		for (const license of licenses) {
			if (license.status === "active") {
				await licenseQueries.delete(db, license.id);
			}
		}

		return c.json({
			success: true,
			message: "App has been deleted successfully",
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete app error:");
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
		log.error({ err: serializeError(error as Error) }, "Add member error:");
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
		log.error({ err: serializeError(error as Error) }, "Get members error:");
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
		log.error({ err: serializeError(error as Error) }, "Remove member error:");
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
		log.error({ err: serializeError(error as Error) }, "Get licenses error:");
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
		log.error({ err: serializeError(error as Error) }, "Update license error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
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
				durationDays: plan.duration_days,
				trialEnabled: plan.trial_enabled,
				trialDays: plan.trial_days,
				features: plan.features || [],
				status: plan.status,
				displayOrder: plan.display_order,
				createdAt: plan.created_at,
				updatedAt: plan.updated_at,
			})),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get plans error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
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
		const {
			name,
			slug,
			description,
			monthly_price,
			yearly_price,
			one_time_price,
			duration_days,
			trial_enabled,
			trial_days,
			features,
			display_order,
		} = body;

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
		const now = new Date();
		const plan = await planQueries.create(db, {
			public_id: createId("plan"),
			app_id: app.id,
			name,
			slug,
			description: description || null,
			monthly_price: monthly_price || null,
			yearly_price: yearly_price || null,
			one_time_price: one_time_price || null,
			duration_days: duration_days || null,
			trial_enabled: trial_enabled,
			trial_days: trial_days || null,
			features: features || null,
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
				durationDays: plan.duration_days,
				trialEnabled: plan.trial_enabled,
				trialDays: plan.trial_days,
				features: plan.features || [],
				status: plan.status,
				displayOrder: plan.display_order,
				createdAt: plan.created_at,
				updatedAt: plan.updated_at,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Create plan error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
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
		const {
			name,
			description,
			monthly_price,
			yearly_price,
			one_time_price,
			duration_days,
			trial_enabled,
			trial_days,
			features,
			status,
			display_order,
		} = body;

		// Build update object
		const updates: any = {};
		if (name !== undefined) updates.name = name;
		if (description !== undefined) updates.description = description;
		if (monthly_price !== undefined) updates.monthly_price = monthly_price;
		if (yearly_price !== undefined) updates.yearly_price = yearly_price;
		if (one_time_price !== undefined) updates.one_time_price = one_time_price;
		if (duration_days !== undefined) updates.duration_days = duration_days;
		if (trial_enabled !== undefined) updates.trial_enabled = trial_enabled;
		if (trial_days !== undefined) updates.trial_days = trial_days;
		if (features !== undefined) updates.features = features;
		if (status !== undefined) updates.status = status;
		if (display_order !== undefined) updates.display_order = display_order;

		// Update plan
		const updatedPlans = await planQueries.update(db, plan.id, updates);
		const updatedPlan = updatedPlans;

		if (!updatedPlan) {
			return c.json({ error: "Failed to update plan" }, 500);
		}

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
				durationDays: updatedPlan.duration_days,
				trialEnabled: updatedPlan.trial_enabled,
				trialDays: updatedPlan.trial_days,
				features: updatedPlan.features || [],
				status: updatedPlan.status,
				displayOrder: updatedPlan.display_order,
				createdAt: updatedPlan.created_at,
				updatedAt: updatedPlan.updated_at,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Update plan error:");
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

		const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const member = members[0];
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
			return c.json(
				{
					error: `Cannot delete plan. ${licenseCount} active license(s) are using this plan.`,
				},
				400,
			);
		}

		// Soft delete plan
		// This will:
		// 1. Set deleted_at timestamp
		// 2. Set is_active to false
		// 3. Update slug to avoid uniqueness conflicts
		await planQueries.delete(db, plan.id);

		return c.json({
			success: true,
			message: "Plan deleted successfully",
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete plan error:");
		return c.json({ error: "Failed to delete plan" }, 500);
	}
});

/**
 * POST /v1/admin/payment-providers
 * Create a new Payment provider
 */
adminRoutes.post("/payment-providers", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const body = await c.req.json();

		const { name, slug, entityType, entityId, projectId, provider, environment, credentials, webhookSecret } = body;

		if (!entityType || !provider || !environment || !credentials) {
			return c.json({ error: "Missing required fields" }, 400);
		}

		const db = getDb();
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		let resolvedEntityId: number | null = null;

		// Verify access and resolve entity ID based on type
		if (entityType === "project") {
			// Use projectId from body (public_id) to resolve the actual database ID
			const projectPublicId = projectId || entityId;
			if (!projectPublicId) {
				return c.json({ error: "Project ID is required" }, 400);
			}

			const project = await projectQueries.findByPublicId(db, projectPublicId);
			if (!project) {
				return c.json({ error: "Project not found" }, 404);
			}

			const members = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
			const member = members[0];
			if (!member || (member.role !== "owner" && member.role !== "admin")) {
				return c.json({ error: "Access denied" }, 403);
			}

			resolvedEntityId = project.id; // Use the database ID
		} else if (entityType === "app") {
			if (!entityId) {
				return c.json({ error: "App ID is required" }, 400);
			}

			const app = await appQueries.findByPublicId(db, entityId);
			if (!app) {
				return c.json({ error: "App not found" }, 404);
			}

			const members = await projectMemberQueries.findByProjectAndUser(db, app.project_id, user.id);
			const member = members[0];
			if (!member || (member.role !== "owner" && member.role !== "admin")) {
				return c.json({ error: "Access denied" }, 403);
			}

			resolvedEntityId = app.id; // Use the database ID
		}

		// Auto-generate slug from name if not provided
		const finalSlug =
			slug ||
			(name
				? name
						.toLowerCase()
						.replace(/\s+/g, "-")
						.replace(/[^a-z0-9-]/g, "")
				: undefined);

		// Create Payment provider
		const newProvider = await paymentProviderQueries.create(db, {
			public_id: createId("paymentProvider"),
			name: name || null,
			slug: finalSlug || null,
			entity_type: entityType,
			entity_id: resolvedEntityId,
			provider,
			environment,
			credentials: encrypt(JSON.stringify(credentials)),
			webhook_secret: webhookSecret ? encrypt(webhookSecret) : null,
			is_active: true,
			created_by_user_id: user.id,
			created_at: new Date(),
			updated_at: new Date(),
		});

		return c.json({
			provider: {
				id: newProvider.public_id,
				name: newProvider.name,
				slug: newProvider.slug,
				provider: newProvider.provider,
				environment: newProvider.environment,
				entityType: newProvider.entity_type,
				entityId: newProvider.entity_id,
				isActive: newProvider.is_active,
				createdAt: newProvider.created_at,
				updatedAt: newProvider.updated_at,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Create Payment provider error:");
		return c.json({ error: "Failed to create Payment provider" }, 500);
	}
});

/**
 * PATCH /v1/admin/payment-providers/:providerId
 * Update a Payment provider
 */
adminRoutes.patch("/payment-providers/:providerId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const providerId = Number.parseInt(c.req.param("providerId"), 10);
		const body = await c.req.json();

		const db = getDb();
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get provider
		const provider = await paymentProviderQueries.findById(db, providerId);
		if (!provider) {
			return c.json({ error: "Payment provider not found" }, 404);
		}

		// Verify access
		if (provider.entity_type === "project" && provider.entity_id) {
			const members = await projectMemberQueries.findByProjectAndUser(db, provider.entity_id, user.id);
			const member = members[0];
			if (!member || (member.role !== "owner" && member.role !== "admin")) {
				return c.json({ error: "Access denied" }, 403);
			}
		} else if (provider.entity_type === "app" && provider.entity_id) {
			const app = await appQueries.findById(db, provider.entity_id);
			if (!app) {
				return c.json({ error: "App not found" }, 404);
			}

			const members = await projectMemberQueries.findByProjectAndUser(db, app.project_id, user.id);
			const member = members[0];
			if (!member || (member.role !== "owner" && member.role !== "admin")) {
				return c.json({ error: "Access denied" }, 403);
			}
		}

		// Update provider
		const updateData: any = {
			updated_at: new Date(),
			updated_by_user_id: user.id,
		};
		if (body.name !== undefined) {
			updateData.name = body.name || null;
		}
		if (body.slug !== undefined) {
			updateData.slug =
				body.slug ||
				(body.name
					? body.name
							.toLowerCase()
							.replace(/\s+/g, "-")
							.replace(/[^a-z0-9-]/g, "")
					: null);
		}
		if (body.credentials) {
			updateData.credentials = encrypt(JSON.stringify(body.credentials));
		}
		if (body.webhookSecret) {
			updateData.webhook_secret = encrypt(body.webhookSecret);
		}
		if (body.isActive !== undefined) {
			updateData.is_active = body.isActive;
		}
		if (body.environment) {
			updateData.environment = body.environment;
		}

		await paymentProviderQueries.update(db, providerId, updateData);

		return c.json({ success: true });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Update Payment provider error:");
		return c.json({ error: "Failed to update Payment provider" }, 500);
	}
});

/**
 * DELETE /v1/admin/payment-providers/:providerId
 * Delete a Payment provider
 */
adminRoutes.delete("/payment-providers/:providerId", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const providerId = Number.parseInt(c.req.param("providerId"), 10);

		const db = getDb();
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get provider
		const provider = await paymentProviderQueries.findById(db, providerId);
		if (!provider) {
			return c.json({ error: "Payment provider not found" }, 404);
		}

		// Verify access
		if (provider.entity_type === "project" && provider.entity_id) {
			const members = await projectMemberQueries.findByProjectAndUser(db, provider.entity_id, user.id);
			const member = members[0];
			if (!member || (member.role !== "owner" && member.role !== "admin")) {
				return c.json({ error: "Access denied" }, 403);
			}
		} else if (provider.entity_type === "app" && provider.entity_id) {
			const app = await appQueries.findById(db, provider.entity_id);
			if (!app) {
				return c.json({ error: "App not found" }, 404);
			}

			const members = await projectMemberQueries.findByProjectAndUser(db, app.project_id, user.id);
			const member = members[0];
			if (!member || (member.role !== "owner" && member.role !== "admin")) {
				return c.json({ error: "Access denied" }, 403);
			}
		}

		// Delete provider
		await paymentProviderQueries.delete(db, providerId);

		return c.json({ success: true });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete Payment provider error:");
		return c.json({ error: "Failed to delete Payment provider" }, 500);
	}
});

/**
 * GET /v1/admin/apps/:appId/payment/available
 * Get all available Payment providers for an app
 */
adminRoutes.get("/apps/:appId/payment/available", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const appId = c.req.param("appId");
		const environment = c.req.query("environment") || "test";

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const members = await projectMemberQueries.findByProjectAndUser(db, app.project_id, user.id);
		const member = members[0];

		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Get available Payment providers
		const providers = await paymentProviderQueries.getAvailablePaymentProviders(
			db,
			app.id,
			environment as "test" | "production",
		);

		const formattedProviders = providers.map((p: any) => ({
			id: p.id,
			publicId: p.public_id,
			name: p.name,
			slug: p.slug,
			provider: p.provider,
			entityType: p.entity_type,
			entityId: p.entity_id,
			environment: p.environment,
			isActive: p.is_active,
			createdAt: p.created_at,
		}));

		return c.json({ providers: formattedProviders });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get available Payment providers error:");
		return c.json({ error: "Failed to get available Payment providers" }, 500);
	}
});

/**
 * GET /v1/admin/apps/:appId/payment/selected
 * Get selected Payment provider for an app
 */
adminRoutes.get("/apps/:appId/payment/selected", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const appId = c.req.param("appId");

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const members = await projectMemberQueries.findByProjectAndUser(db, app.project_id, user.id);
		const member = members[0];

		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Get selected Payment provider
		const provider = await paymentProviderQueries.getSelectedPaymentProvider(db, app.id);

		if (!provider) {
			return c.json({ provider: null });
		}

		return c.json({
			provider: {
				id: provider.id,
				provider: provider.provider,
				entityType: provider.entity_type,
				entityId: provider.entity_id,
				environment: provider.environment,
				isActive: provider.is_active,
				createdAt: provider.created_at,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get selected Payment provider error:");
		return c.json({ error: "Failed to get selected Payment provider" }, 500);
	}
});

/**
 * POST /v1/admin/apps/:appId/payment/select
 * Select a Payment provider for an app
 */
adminRoutes.post("/apps/:appId/payment/select", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const appId = c.req.param("appId");
		const body = await c.req.json();

		const { paymentProviderId } = body;

		if (!paymentProviderId) {
			return c.json({ error: "Missing paymentProviderId" }, 400);
		}

		const db = getDb();

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ error: "App not found" }, 404);
		}

		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		const members = await projectMemberQueries.findByProjectAndUser(db, app.project_id, user.id);
		const member = members[0];

		if (!member || (member.role !== "owner" && member.role !== "admin")) {
			return c.json({ error: "Access denied" }, 403);
		}

		// Select the provider
		await paymentProviderQueries.selectProviderForApp(db, app.id, paymentProviderId);

		return c.json({ success: true });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Select Payment provider error:");
		return c.json({ error: "Failed to select Payment provider" }, 500);
	}
});
