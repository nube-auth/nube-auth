/**
 * Payment Provider Admin Routes (Project-Level)
 * 
 * Manages payment provider configurations per project:
 * - List available and configured providers
 * - Create new provider configurations with encrypted credentials
 * - Update provider settings and webhook secrets
 * - Delete provider configurations
 * - Select default payment provider for project
 *
 * IMPORTANT: Payment providers are managed at PROJECT level, NOT app level.
 * Apps can then select which project-level provider they want to use.
 */

import { Hono } from "hono";
import { z } from "zod";
import { and, eq, getDb, paymentProviderConfigQueries, projectQueries, userQueries, } from "@proofa/db";
import { payment_provider_configs } from "@proofa/db";
import type { Context } from "hono";
import { createLogger, createId } from "@proofa/shared";
import { encryptCredentials, decryptCredentials } from "../../../utils";

const log = createLogger("admin-providers");
const providersRouter = new Hono();

function getUserIdHeader(c: Context): string | null {
	const header = c.req.header("X-User-Id") ?? c.req.header("x-user-id");
	return header || null;
}

// Available payment providers
const AVAILABLE_PROVIDERS = ["stripe", "lemonsqueezy", "dodo"] as const;
type PaymentProvider = (typeof AVAILABLE_PROVIDERS)[number];

const PAYMENT_ENVIRONMENTS = ["test", "production"] as const;
type PaymentEnvironment = (typeof PAYMENT_ENVIRONMENTS)[number];

/**
 * Validate user is project owner for authorization
 */
async function validateProjectAccess(_c: Context, projectId: string, userPublicId: string) {
	const db = getDb();

	// Find user by public ID to get internal ID
	const user = await userQueries.findByPublicId(db, userPublicId);
	if (!user) {
		return { valid: false, error: "User not found", status: 404 as const, project: null, user: null };
	}

	// Find project by public ID
	const project = await projectQueries.findByPublicId(db, projectId);
	if (!project) {
		return { valid: false, error: "Project not found", status: 404 as const, project: null, user: null };
	}

	// Check if user is owner
	const isOwner = project.owner_user_id === user.id;
	if (!isOwner) {
		return { valid: false, error: "Insufficient permissions", status: 403 as const, project: null, user: null };
	}

	return { valid: true, project, user, error: null, status: 200 as const };
}

/**
 * Get available payment provider types (no auth required - public info)
 * GET /providers/available
 */
providersRouter.get("/available", async (c: Context) => {
	return c.json({
		providers: AVAILABLE_PROVIDERS.map((provider) => ({
			id: provider,
			name: provider.charAt(0).toUpperCase() + provider.slice(1),
		})),
		environments: PAYMENT_ENVIRONMENTS,
	});
});

/**
 * List all payment provider configurations for a project
 * GET /providers/:projectId/configs
 */
providersRouter.get("/:projectId/configs", async (c: Context) => {
	const projectId = c.req.param("projectId");
	const userId = getUserIdHeader(c);

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const db = getDb();

		// Validate project access
		const accessCheck = await validateProjectAccess(c, projectId, userId);
		if (!accessCheck.valid) {
			return c.json({ error: accessCheck.error }, accessCheck.status);
		}

		// Get all provider configs for this project
		const configs = await paymentProviderConfigQueries.findByProjectId(db, accessCheck.project!.id);

		// Format response
		const providers = configs.map((config) => ({
			id: config.public_id,
			provider: config.provider,
			environment: config.environment,
			isActive: config.is_active,
			isDefault: config.is_default,
			hasWebhookSecret: !!config.webhook_secret,
			createdAt: config.created_at,
			updatedAt: config.updated_at,
			createdBy: config.created_by_user_id,
		}));

		return c.json({
			providers,
			projectId,
			total: providers.length,
		});
	} catch (error) {
		log.error({ error, projectId }, "Failed to list payment providers");
		return c.json({ error: "Failed to list payment providers" }, 500);
	}
});

/**
 * Get a specific payment provider configuration
 * GET /providers/:projectId/configs/:providerId
 */
providersRouter.get("/:projectId/configs/:providerId", async (c: Context) => {
	const projectId = c.req.param("projectId");
	const providerId = c.req.param("providerId");
	const userId = getUserIdHeader(c);

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const db = getDb();

		// Validate project access
		const accessCheck = await validateProjectAccess(c, projectId, userId);
		if (!accessCheck.valid) {
			return c.json({ error: accessCheck.error }, accessCheck.status);
		}

		// Get provider config by public ID
		const config = await paymentProviderConfigQueries.findByPublicId(db, providerId);
		if (!config || config.project_id !== accessCheck.project!.id) {
			return c.json({ error: "Provider configuration not found" }, 404);
		}

		return c.json({
			id: config.public_id,
			provider: config.provider,
			environment: config.environment,
			isActive: config.is_active,
			isDefault: config.is_default,
			hasWebhookSecret: !!config.webhook_secret,
			metadata: config.metadata,
			createdAt: config.created_at,
			updatedAt: config.updated_at,
			createdBy: config.created_by_user_id,
			updatedBy: config.updated_by_user_id,
		});
	} catch (error) {
		log.error({ error, projectId, providerId }, "Failed to get payment provider");
		return c.json({ error: "Failed to get payment provider" }, 500);
	}
});

/**
 * Get decrypted credentials for a provider (INTERNAL USE ONLY)
 * GET /providers/:projectId/configs/:providerId/credentials
 * 
 * SECURITY: This endpoint returns decrypted credentials and should only be called
 * by internal services (webhooks, payment processing). Consider adding IP allowlist
 * or service-to-service auth token in production.
 */
providersRouter.get("/:projectId/configs/:providerId/credentials", async (c: Context) => {
	const projectId = c.req.param("projectId");
	const providerId = c.req.param("providerId");
	const userId = getUserIdHeader(c);

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const db = getDb();

		// Validate project access
		const accessCheck = await validateProjectAccess(c, projectId, userId);
		if (!accessCheck.valid) {
			return c.json({ error: accessCheck.error }, accessCheck.status);
		}

		// Get provider config by public ID
		const config = await paymentProviderConfigQueries.findByPublicId(db, providerId);
		if (!config || config.project_id !== accessCheck.project!.id) {
			return c.json({ error: "Provider configuration not found" }, 404);
		}

		// Decrypt credentials
		let credentials: Record<string, string>;
		try {
			credentials = decryptCredentials(config.credentials);
		} catch (e) {
			log.error({ err: (e as Error).message, providerId }, "Decrypt credentials error");
			return c.json({ error: "Failed to decrypt credentials" }, 500);
		}

		return c.json({
			id: config.public_id,
			provider: config.provider,
			environment: config.environment,
			credentials,
			webhookSecret: config.webhook_secret,
		});
	} catch (_error) {
		// Never log error object that might contain credentials
		log.error({ projectId, providerId }, "Failed to get provider credentials");
		return c.json({ error: "Failed to get provider credentials" }, 500);
	}
});

/**
 * Create a new payment provider configuration
 * POST /providers/:projectId/configs
 */
providersRouter.post("/:projectId/configs", async (c: Context) => {
	const projectId = c.req.param("projectId");
	const userId = getUserIdHeader(c);

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	let provider: string | undefined; // For error logging

	try {
		const CreateSchema = z.object({
			provider: z.enum(["stripe", "lemonsqueezy", "dodo"]),
			environment: z.enum(["test", "production"]),
			credentials: z.record(z.string(), z.string()),
			webhookSecret: z.string().optional(),
			metadata: z.record(z.string(), z.any()).optional(),
		});
		const parse = CreateSchema.safeParse(await c.req.json());
		if (!parse.success) {
			return c.json({ error: "Invalid request", details: parse.error.flatten() }, 400);
		}
		const body = parse.data;
		provider = body.provider; // Capture for error logging

		// input validated by zod

		const db = getDb();

		// Validate project access
		const accessCheck = await validateProjectAccess(c, projectId, userId);
		if (!accessCheck.valid) {
			return c.json({ error: accessCheck.error }, accessCheck.status);
		}

		// Check if config already exists for this provider/environment combo
		const existing = await paymentProviderConfigQueries.findByProjectAndProvider(
			db,
			accessCheck.project!.id,
			body.provider as PaymentProvider,
			body.environment as PaymentEnvironment,
		);

		if (existing) {
			return c.json(
				{
					error: `Provider ${body.provider} in ${body.environment} environment already configured for this project`,
				},
				409,
			);
		}

		// Create new config (credentials encrypted at rest)
		let encryptedCredentials: string;
		try {
			encryptedCredentials = encryptCredentials(body.credentials);
		} catch (e) {
			log.error({ err: (e as Error).message }, "Encrypt credentials error");
			return c.json({ error: "Server encryption not configured" }, 500);
		}
		const newConfig = await paymentProviderConfigQueries.create(db, {
			public_id: createId("paymentConfig"),
			project_id: accessCheck.project!.id,
			provider: body.provider as PaymentProvider,
			environment: body.environment as PaymentEnvironment,
			credentials: encryptedCredentials,
			webhook_secret: body.webhookSecret,
			metadata: body.metadata,
			is_active: true,
			is_default: false, // Must explicitly select as default
			created_by_user_id: accessCheck.user!.id,
			updated_by_user_id: accessCheck.user!.id,
		});

		// TODO: Auto-create default routing rule for each app in the project
		// For now, routing rules must be created manually via /routing-rules API
		// Future: When app is created, auto-create catch-all routing rule

		return c.json(
			{
				id: newConfig.public_id,
				provider: newConfig.provider,
				environment: newConfig.environment,
				isActive: newConfig.is_active,
				isDefault: newConfig.is_default,
				createdAt: newConfig.created_at,
				updatedAt: newConfig.updated_at,
			},
			201,
		);
	} catch (_error) {
		// Never log request body or error details that might contain credentials
		log.error({ projectId, provider }, "Failed to create payment provider");
		return c.json({ error: "Failed to create payment provider" }, 500);
	}
});

/**
 * Update a payment provider configuration
 * PATCH /providers/:projectId/configs/:providerId
 */
providersRouter.patch("/:projectId/configs/:providerId", async (c: Context) => {
	const projectId = c.req.param("projectId");
	const providerId = c.req.param("providerId");
	const userId = getUserIdHeader(c);

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const UpdateSchema = z.object({
			credentials: z.record(z.string(), z.string()).optional(),
			webhookSecret: z.string().nullable().optional(),
			isActive: z.boolean().optional(),
			metadata: z.record(z.string(), z.any()).optional(),
		});
		const parse = UpdateSchema.safeParse(await c.req.json());
		if (!parse.success) {
			return c.json({ error: "Invalid request", details: parse.error.flatten() }, 400);
		}
		const body = parse.data;

		const db = getDb();

		// Validate project access
		const accessCheck = await validateProjectAccess(c, projectId, userId);
		if (!accessCheck.valid) {
			return c.json({ error: accessCheck.error }, accessCheck.status);
		}

		// Get provider config
		const config = await paymentProviderConfigQueries.findByPublicId(db, providerId);
		if (!config || config.project_id !== accessCheck.project!.id) {
			return c.json({ error: "Provider configuration not found" }, 404);
		}

		// Build update data
		const updateData: Partial<typeof payment_provider_configs.$inferInsert> = {
			updated_by_user_id: accessCheck.user!.id,
		};

		if (body.credentials) {
			try {
				updateData.credentials = encryptCredentials(body.credentials);
			} catch (e) {
				log.error({ err: (e as Error).message }, "Encrypt credentials error");
				return c.json({ error: "Server encryption not configured" }, 500);
			}
		}

		if (body.webhookSecret !== undefined) {
			updateData.webhook_secret = body.webhookSecret ?? null;
		}

		if (body.isActive !== undefined) {
			updateData.is_active = body.isActive;
		}

		if (body.metadata !== undefined) {
			updateData.metadata = body.metadata;
		}

		// Update config
		const results = await paymentProviderConfigQueries.update(db, config.id, updateData);
		const updated = results[0];

		if (!updated) {
			return c.json({ error: "Failed to update provider configuration" }, 500);
		}

		return c.json({
			id: updated.public_id,
			provider: updated.provider,
			environment: updated.environment,
			isActive: updated.is_active,
			isDefault: updated.is_default,
			hasWebhookSecret: !!updated.webhook_secret,
			metadata: updated.metadata,
			updatedAt: updated.updated_at,
		});
	} catch (_error) {
		// Never log request body or error details that might contain credentials
		log.error({ projectId, providerId }, "Failed to update payment provider");
		return c.json({ error: "Failed to update payment provider" }, 500);
	}
});

/**
 * Delete a payment provider configuration
 * DELETE /providers/:projectId/configs/:providerId
 */
providersRouter.delete("/:projectId/configs/:providerId", async (c: Context) => {
	const projectId = c.req.param("projectId");
	const providerId = c.req.param("providerId");
	const userId = getUserIdHeader(c);

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const db = getDb();

		// Validate project access
		const accessCheck = await validateProjectAccess(c, projectId, userId);
		if (!accessCheck.valid) {
			return c.json({ error: accessCheck.error }, accessCheck.status);
		}

		// Get provider config
		const config = await paymentProviderConfigQueries.findByPublicId(db, providerId);
		if (!config || config.project_id !== accessCheck.project!.id) {
			return c.json({ error: "Provider configuration not found" }, 404);
		}

		// If this is the default provider, unset it
		if (config.is_default) {
			// Find another active provider to make default, or just remove the default status
			const otherConfigs = await db
				.select()
				.from(payment_provider_configs)
				.where(
					and(
						eq(payment_provider_configs.project_id, accessCheck.project!.id),
						eq(payment_provider_configs.is_active, true),
					),
				)
				.limit(2);

			const other = otherConfigs.find((c) => c.id !== config.id);
			if (other) {
				await paymentProviderConfigQueries.setAsDefault(db, accessCheck.project!.id, other.id);
			}
		}

		// Delete config
		await paymentProviderConfigQueries.delete(db, config.id);

		return c.json({ success: true });
	} catch (error) {
		log.error({ error, projectId, providerId }, "Failed to delete payment provider");
		return c.json({ error: "Failed to delete payment provider" }, 500);
	}
});

/**
 * Set a payment provider as default for the project
 * POST /providers/:projectId/configs/:providerId/select
 */
providersRouter.post("/:projectId/configs/:providerId/select", async (c: Context) => {
	const projectId = c.req.param("projectId");
	const providerId = c.req.param("providerId");
	const userId = getUserIdHeader(c);

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const db = getDb();

		// Validate project access
		const accessCheck = await validateProjectAccess(c, projectId, userId);
		if (!accessCheck.valid) {
			return c.json({ error: accessCheck.error }, accessCheck.status);
		}

		// Get provider config
		const config = await paymentProviderConfigQueries.findByPublicId(db, providerId);
		if (!config || config.project_id !== accessCheck.project!.id) {
			return c.json({ error: "Provider configuration not found" }, 404);
		}

		if (!config.is_active) {
			return c.json({ error: "Cannot select inactive provider as default" }, 400);
		}

		// Set as default
		const updated = await paymentProviderConfigQueries.setAsDefault(db, accessCheck.project!.id, config.id);

		return c.json({
			id: updated.public_id,
			provider: updated.provider,
			environment: updated.environment,
			isActive: updated.is_active,
			isDefault: updated.is_default,
			updatedAt: updated.updated_at,
		});
	} catch (error) {
		log.error({ error, projectId, providerId }, "Failed to set default payment provider");
		return c.json({ error: "Failed to set default payment provider" }, 500);
	}
});

export { providersRouter };
