import { Hono } from 'hono';
import type { Context } from 'hono';
import { getAuth } from '../middleware/auth';
import { getDb, userQueries, projectQueries, appQueries, licenseQueries, projectMemberQueries } from '@proofa/db';
import { createId } from '@proofa/shared';

export const adminRoutes = new Hono();

/**
 * GET /v1/admin/projects
 * List projects for current user
 */
adminRoutes.get('/projects', async (c: Context) => {
  try {
    const auth = getAuth(c);
    const db = getDb();

    // Get user by public ID
    const user = await userQueries.findByPublicId(db, auth.userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get projects where user is member
    const projects = await projectQueries.findByUserId(db, user.id);

    return c.json({
      projects: projects.map((p) => ({
        id: p.public_id,
        name: p.name,
        description: p.description,
        createdAt: p.created_at,
      })),
    });
  } catch (error) {
    console.error('List projects error:', error);
    return c.json({ error: 'Failed to list projects' }, 500);
  }
});

/**
 * POST /v1/admin/projects
 * Create new project
 */
adminRoutes.post('/projects', async (c: Context) => {
  try {
    const auth = getAuth(c);
    const { name, description } = await c.req.json() as { name?: string; description?: string };

    if (!name) {
      return c.json({ error: 'Project name required' }, 400);
    }

    const db = getDb();

    // Get user by public ID
    const user = await userQueries.findByPublicId(db, auth.userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);

    const project = await projectQueries.create(db, {
      public_id: createId('project'),
      name,
      description: description || null,
      owner_user_id: user.id,
      created_at: now,
      updated_at: now,
    });

    // Add user as project owner
    await projectMemberQueries.create(db, {
      project_id: project.id,
      user_id: user.id,
      role: 'owner',
      created_at: now,
    });

    return c.json({
      id: project.public_id,
      name: project.name,
      description: project.description,
    }, 201);
  } catch (error) {
    console.error('Create project error:', error);
    return c.json({ error: 'Failed to create project' }, 500);
  }
});

/**
 * GET /v1/admin/projects/:projectId
 * Get project details
 */
adminRoutes.get('/projects/:projectId', async (c: Context) => {
  try {
    const auth = getAuth(c);
    const projectId = c.req.param('projectId');

    const db = getDb();

    const project = await projectQueries.findByPublicId(db, projectId);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Get user by public ID
    const user = await userQueries.findByPublicId(db, auth.userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check user is member
    const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

    if (!member) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json({
      id: project.public_id,
      name: project.name,
      description: project.description,
    });
  } catch (error) {
    console.error('Get project error:', error);
    return c.json({ error: 'Failed to get project' }, 500);
  }
});

/**
 * GET /v1/admin/projects/:projectId/apps
 * List apps for project
 */
adminRoutes.get('/projects/:projectId/apps', async (c: Context) => {
  try {
    const auth = getAuth(c);
    const projectId = c.req.param('projectId');

    const db = getDb();

    const project = await projectQueries.findByPublicId(db, projectId);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Get user by public ID
    const user = await userQueries.findByPublicId(db, auth.userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

    if (!member) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const apps = await appQueries.findByProjectId(db, project.id);

    return c.json({
      apps: apps.map((a) => ({
        id: a.public_id,
        name: a.name,
        description: a.description,
        createdAt: a.created_at,
      })),
    });
  } catch (error) {
    console.error('List apps error:', error);
    return c.json({ error: 'Failed to list apps' }, 500);
  }
});

/**
 * POST /v1/admin/projects/:projectId/apps
 * Create new app
 */
adminRoutes.post('/projects/:projectId/apps', async (c: Context) => {
  try {
    const auth = getAuth(c);
    const projectId = c.req.param('projectId');
    const { name, description } = await c.req.json() as { name?: string; description?: string };

    if (!name) {
      return c.json({ error: 'App name required' }, 400);
    }

    const db = getDb();

    const project = await projectQueries.findByPublicId(db, projectId);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Get user by public ID
    const user = await userQueries.findByPublicId(db, auth.userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const member = await projectMemberQueries.findByProjectAndUser(db, project.id, user.id);

    if (!member || member.role !== 'owner') {
      return c.json({ error: 'Access denied' }, 403);
    }

    const now = Math.floor(Date.now() / 1000);

    const app = await appQueries.create(db, {
      public_id: createId('app'),
      project_id: project.id,
      name,
      description: description || null,
      app_session_ttl_days: 28,
      account_lockout_minutes: 30,
      cache_ttl_minutes: 60,
      cors_allowed_origins: JSON.stringify(['http://localhost:3001']),
      rate_limit_requests_per_minute: 100,
      created_at: now,
      updated_at: now,
    });

    return c.json({
      id: app.public_id,
      name: app.name,
      description: app.description,
    }, 201);
  } catch (error) {
    console.error('Create app error:', error);
    return c.json({ error: 'Failed to create app' }, 500);
  }
});

/**
 * GET /v1/admin/licenses
 * List user licenses
 */
adminRoutes.get('/licenses', async (c: Context) => {
  try {
    const auth = getAuth(c);
    const db = getDb();

    // Get user by public ID
    const user = await userQueries.findByPublicId(db, auth.userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get licenses for user
    const licenses = await licenseQueries.findByUserId(db, user.id);

    return c.json({
      licenses: licenses.map((l) => ({
        id: l.public_id,
        appId: l.app_id,
        expiresAt: l.expires_at,
        seats: l.seats,
        createdAt: l.created_at,
      })),
    });
  } catch (error) {
    console.error('List licenses error:', error);
    return c.json({ error: 'Failed to list licenses' }, 500);
  }
});

/**
 * DELETE /admin/projects/:project_id
 * Delete a project
 */
adminRoutes.delete('/projects/:project_id', async (c: Context) => {
  try {
    const projectId = c.req.param('project_id');

    // TODO: implement project deletion
    return c.json({ message: 'Project deleted', projectId });
  } catch (error) {
    console.error('Delete project error:', error);
    return c.json({ error: 'Failed to delete project' }, 500);
  }
});

// Apps endpoints

/**
 * POST /admin/apps
 * Create a new app
 */
adminRoutes.post('/apps', async (c: Context) => {
  try {
    const body = await c.req.json();

    // TODO: implement app creation
    return c.json({ message: 'App created', data: body }, 201);
  } catch (error) {
    console.error('Create app error:', error);
    return c.json({ error: 'Failed to create app' }, 500);
  }
});

/**
 * GET /admin/apps
 * List apps
 */
adminRoutes.get('/apps', async (c: Context) => {
  try {
    // TODO: implement apps listing
    return c.json({ message: 'Apps list', apps: [] });
  } catch (error) {
    console.error('Get apps error:', error);
    return c.json({ error: 'Failed to get apps' }, 500);
  }
});

/**
 * PATCH /admin/apps/:app_id
 * Update an app
 */
adminRoutes.patch('/apps/:app_id', async (c: Context) => {
  try {
    const appId = c.req.param('app_id');
    const body = await c.req.json();

    // TODO: implement app update
    return c.json({ message: 'App updated', appId, data: body });
  } catch (error) {
    console.error('Update app error:', error);
    return c.json({ error: 'Failed to update app' }, 500);
  }
});

/**
 * DELETE /admin/apps/:app_id
 * Delete an app
 */
adminRoutes.delete('/apps/:app_id', async (c: Context) => {
  try {
    const appId = c.req.param('app_id');

    // TODO: implement app deletion
    return c.json({ message: 'App deleted', appId });
  } catch (error) {
    console.error('Delete app error:', error);
    return c.json({ error: 'Failed to delete app' }, 500);
  }
});

// Members endpoints

/**
 * POST /admin/members
 * Add a team member
 */
adminRoutes.post('/members', async (c: Context) => {
  try {
    const body = await c.req.json();

    // TODO: implement member addition
    return c.json({ message: 'Member added', data: body }, 201);
  } catch (error) {
    console.error('Add member error:', error);
    return c.json({ error: 'Failed to add member' }, 500);
  }
});

/**
 * GET /admin/members
 * List team members
 */
adminRoutes.get('/members', async (c: Context) => {
  try {
    // TODO: implement members listing
    return c.json({ message: 'Members list', members: [] });
  } catch (error) {
    console.error('Get members error:', error);
    return c.json({ error: 'Failed to get members' }, 500);
  }
});

/**
 * DELETE /admin/members/:member_id
 * Remove a team member
 */
adminRoutes.delete('/members/:member_id', async (c: Context) => {
  try {
    const memberId = c.req.param('member_id');

    // TODO: implement member removal
    return c.json({ message: 'Member removed', memberId });
  } catch (error) {
    console.error('Remove member error:', error);
    return c.json({ error: 'Failed to remove member' }, 500);
  }
});

// Licenses endpoints

/**
 * GET /admin/licenses
 * List licenses
 */
adminRoutes.get('/licenses', async (c: Context) => {
  try {
    // TODO: implement licenses listing from Core cache
    return c.json({ message: 'Licenses list', licenses: [] });
  } catch (error) {
    console.error('Get licenses error:', error);
    return c.json({ error: 'Failed to get licenses' }, 500);
  }
});

/**
 * PATCH /admin/licenses/:license_id
 * Update a license
 */
adminRoutes.patch('/licenses/:license_id', async (c: Context) => {
  try {
    const licenseId = c.req.param('license_id');
    const body = await c.req.json();

    // TODO: implement license update
    return c.json({ message: 'License updated', licenseId, data: body });
  } catch (error) {
    console.error('Update license error:', error);
    return c.json({ error: 'Failed to update license' }, 500);
  }
});
