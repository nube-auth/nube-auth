import { auditLogQueries, getDb, projectMemberQueries, projectQueries, userQueries } from "@nube-auth/db";
import { createId, createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";

const log = createLogger("admin-projects-routes");

export const projectsRouter = new Hono();

/**
 * GET /
 * List current user's projects (owned or member)
 */
projectsRouter.get("/", async (c: Context) => {
	try {
		const userId = c.req.header("X-Nube-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		// Get user
		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get projects owned by user
		const ownedProjects = await projectQueries.findByOwnerId(db, user.id);

		// Get projects where user is a member
		const memberProjects = await projectQueries.findByUserId(db, user.id);

		// Combine and deduplicate
		const allProjectIds = new Set<number>();
		const allProjects = [];

		for (const project of [...ownedProjects, ...memberProjects]) {
			if (!allProjectIds.has(project.id)) {
				allProjectIds.add(project.id);
				allProjects.push(project);
			}
		}

		return c.json({
			projects: allProjects.map((p) => ({
				id: p.public_id,
				name: p.name,
				slug: p.slug,
				description: p.description || undefined,
				icon: p.icon,
				createdAt: new Date(p.created_at).toISOString(),
				updatedAt: new Date(p.updated_at).toISOString(),
			})),
			total: allProjects.length,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get projects error");
		return c.json({ error: "Failed to get projects" }, 500);
	}
});

/**
 * GET /users/:userId/projects
 * List projects for a user (owner or member)
 */
projectsRouter.get("/users/:userId/projects", async (c: Context) => {
	try {
		const userId = c.req.param("userId");

		if (!userId || !idPatterns.user.test(userId)) {
			return c.json({ error: "Invalid userId" }, 400);
		}

		const db = getDb();

		// Get user
		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get projects owned by user
		const ownedProjects = await projectQueries.findByOwnerId(db, user.id);

		// Get projects where user is a member
		const memberProjects = await projectQueries.findByUserId(db, user.id);

		// Combine and deduplicate
		const allProjectIds = new Set<number>();
		const allProjects = [];

		for (const project of [...ownedProjects, ...memberProjects]) {
			if (!allProjectIds.has(project.id)) {
				allProjectIds.add(project.id);
				allProjects.push(project);
			}
		}

		return c.json({
			projects: allProjects.map((p) => ({
				id: p.public_id,
				name: p.name,
				slug: p.slug,
				description: p.description || undefined,
				icon: p.icon,
				createdAt: new Date(p.created_at).toISOString(),
				updatedAt: new Date(p.updated_at).toISOString(),
			})),
			total: allProjects.length,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get projects error");
		return c.json({ error: "Failed to get projects" }, 500);
	}
});

/**
 * POST /v1/admin/projects
 * Create a new project
 */
projectsRouter.post("/", async (c: Context) => {
	try {
		const { name, slug, description, icon } = (await c.req.json()) as {
			name?: string;
			slug?: string;
			description?: string;
			icon?: string;
		};

		// Validate required fields
		if (!name || !slug) {
			return c.json({ error: "Missing required fields: name, slug" }, 400);
		}

		// Get current user from context
		const userId = c.req.header("X-Nube-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		// Get user
		const user = await userQueries.findByPublicId(db, userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Create project in transaction
		const project = await db.transaction(async (txn: any) => {
			// Create project
			const newProject = await projectQueries.create(txn, {
				public_id: createId("project"),
				name,
				slug,
				description: description || null,
				icon: icon || "folder",
				owner_user_id: user.id,
				is_active: true,
			});

			// Add owner as a project member
			await projectMemberQueries.create(txn as any, {
				public_id: createId("projectMember"),
				project_id: newProject.id,
				user_id: user.id,
				role: "owner",
			});

			return newProject;
		});

		// Audit log: project created
		try {
			await auditLogQueries.create(db, {
				public_id: createId("auditLog"),
				user_id: user.id,
				project_id: project.id,
				action: "project.created",
				entity_type: "project",
				entity_id: project.public_id,
				changes: { name, slug, description },
				ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
			});
		} catch (auditError) {
			log.error({ err: serializeError(auditError as Error) }, "Failed to create audit log");
		}

		return c.json(
			{
				id: project.public_id,
				name: project.name,
				slug: project.slug,
				description: project.description || undefined,
				icon: project.icon,
				createdAt: new Date(project.created_at).toISOString(),
				updatedAt: new Date(project.updated_at).toISOString(),
			},
			201
		);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Create project error");
		return c.json({ error: "Failed to create project" }, 500);
	}
});

/**
 * GET /v1/admin/projects/:projectId
 * Get project details
 */
projectsRouter.get("/:projectId", async (c: Context) => {
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

		return c.json({
			id: project.public_id,
			name: project.name,
			slug: project.slug,
			description: project.description || undefined,
			icon: project.icon,
			createdAt: new Date(project.created_at).toISOString(),
			updatedAt: new Date(project.updated_at).toISOString(),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get project error");
		return c.json({ error: "Failed to get project" }, 500);
	}
});

/**
 * PATCH /v1/admin/projects/:projectId
 * Update project
 */
projectsRouter.patch("/:projectId", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const { name, slug, description, icon } = (await c.req.json()) as {
			name?: string;
			slug?: string;
			description?: string;
			icon?: string;
		};

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

		// Check authorization: user must be owner or admin
		const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);
		const userMember = member?.[0];
		if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
			return c.json({ error: "Forbidden" }, 403);
		}

		// Update project
		const updateData: Record<string, any> = {};
		if (name !== undefined) updateData["name"] = name;
		if (slug !== undefined) updateData["slug"] = slug;
		if (description !== undefined) updateData["description"] = description;
		if (icon !== undefined) updateData["icon"] = icon;

		const results = await projectQueries.update(db, project.id, updateData);
		const updated = results[0];

		if (!updated) {
			return c.json({ error: "Project not found" }, 404);
		}

		return c.json({
			id: updated.public_id,
			name: updated.name,
			slug: updated.slug,
			description: updated.description || undefined,
			icon: updated.icon,
			createdAt: new Date(updated.created_at).toISOString(),
			updatedAt: new Date(updated.updated_at).toISOString(),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Update project error");
		return c.json({ error: "Failed to update project" }, 500);
	}
});

/**
 * DELETE /v1/admin/projects/:projectId
 * Soft delete a project
 */
projectsRouter.delete("/:projectId", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");

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

		// Check authorization: only owner can delete
		if (project.owner_user_id !== user.id) {
			return c.json({ error: "Forbidden - only owner can delete project" }, 403);
		}

		// Delete project
		const deleted = await projectQueries.delete(db, project.id);

		if (!deleted) {
			return c.json({ error: "Failed to delete project" }, 500);
		}

		return c.json({
			message: "Project deleted successfully",
			id: deleted.public_id,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete project error");
		return c.json({ error: "Failed to delete project" }, 500);
	}
});
