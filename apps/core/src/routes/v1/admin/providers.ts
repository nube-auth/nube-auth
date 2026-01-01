import { getDb, paymentProviderQueries } from "@proofa/db";
import {
	decryptPaymentCredentials,
	encryptPaymentCredentials,
	maskPaymentCredentials,
	type PaymentCredentials,
} from "@proofa/shared";
import type { Context } from "hono";
import { z } from "zod";

// Validation schemas
const _createOAuthProviderSchema = z.object({
	entityType: z.enum(["platform", "project", "app"]),
	entityId: z.number().nullable(),
	provider: z.string().min(1),
	credentials: z.object({
		client_id: z.string().min(1),
		client_secret: z.string().min(1),
		redirect_uri: z.string().optional(),
	}),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

const _updateOAuthProviderSchema = z.object({
	credentials: z
		.object({
			client_id: z.string().min(1),
			client_secret: z.string().min(1),
			redirect_uri: z.string().optional(),
		})
		.optional(),
	isActive: z.boolean().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

const _selectOAuthProviderSchema = z.object({
	oauthProviderId: z.number(),
	displayOrder: z.number().optional(),
	customButtonText: z.string().optional(),
});

const createPaymentProviderSchema = z.object({
	entityType: z.enum(["platform", "project", "app"]),
	entityId: z.number().nullable(),
	provider: z.string().min(1),
	environment: z.enum(["test", "production"]),
	credentials: z.record(z.string(), z.string()),
	webhookSecret: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

const updatePaymentProviderSchema = z.object({
	credentials: z.record(z.string(), z.string()).optional(),
	webhookSecret: z.string().optional(),
	isActive: z.boolean().optional(),
	environment: z.enum(["test", "production"]).optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Get available payment providers for an app
 */
export async function getAvailablePaymentProviders(c: Context) {
	const db = getDb();
	const appId = parseInt(c.req.param("appId"), 10);
	const environment = (c.req.query("environment") as "test" | "production") || "test";

	const providers = await paymentProviderQueries.getAvailablePaymentProviders(db, appId, environment);

	// Mask credentials for security
	const masked = providers.map((p) => ({
		id: p.id,
		publicId: p.public_id,
		entityType: p.entity_type,
		entityId: p.entity_id,
		provider: p.provider,
		environment: p.environment,
		isActive: p.is_active,
		credentials: maskPaymentCredentials(decryptPaymentCredentials(p.credentials)),
		webhookSecret: p.webhook_secret ? "••••••••" : null,
		metadata: p.metadata,
		createdAt: p.created_at,
		updatedAt: p.updated_at,
	}));

	return c.json({ providers: masked });
}

/**
 * Get selected payment provider for an app
 */
export async function getSelectedPaymentProvider(c: Context) {
	const db = getDb();
	const appId = parseInt(c.req.param("appId"), 10);

	const provider = await paymentProviderQueries.getPaymentProvider(db, appId);

	if (!provider) {
		return c.json({ provider: null });
	}

	// Mask credentials for security
	const masked = {
		id: provider.id,
		publicId: provider.public_id,
		entityType: provider.entity_type,
		entityId: provider.entity_id,
		provider: provider.provider,
		environment: provider.environment,
		isActive: provider.is_active,
		credentials: maskPaymentCredentials(decryptPaymentCredentials(provider.credentials)),
		webhookSecret: provider.webhook_secret ? "••••••••" : null,
		metadata: provider.metadata,
		createdAt: provider.created_at,
		updatedAt: provider.updated_at,
	};

	return c.json({ provider: masked });
}

/**
 * Create payment provider
 */
export async function createPaymentProvider(c: Context) {
	const body = await c.req.json();
	const result = createPaymentProviderSchema.safeParse(body);

	if (!result.success) {
		return c.json({ error: "Invalid request data", details: result.error.issues }, 400);
	}

	const db = getDb();
	const data = result.data;
	const userId = c.get("userId");

	// Encrypt credentials
	const encryptedCredentials = encryptPaymentCredentials(data.credentials as PaymentCredentials);

	let provider;
	if (data.entityType === "platform") {
		provider = await paymentProviderQueries.createPlatformProvider(db, {
			provider: data.provider,
			environment: data.environment,
			credentials: encryptedCredentials,
			webhook_secret: data.webhookSecret,
			created_by_user_id: userId,
		});
	} else if (data.entityType === "project") {
		if (!data.entityId) {
			return c.json({ error: "Entity ID required for project providers" }, 400);
		}
		provider = await paymentProviderQueries.createProjectProvider(db, {
			project_id: data.entityId,
			provider: data.provider,
			environment: data.environment,
			credentials: encryptedCredentials,
			webhook_secret: data.webhookSecret,
			created_by_user_id: userId,
		});
	} else {
		if (!data.entityId) {
			return c.json({ error: "Entity ID required for app providers" }, 400);
		}
		provider = await paymentProviderQueries.createAppProvider(db, {
			app_id: data.entityId,
			provider: data.provider,
			environment: data.environment,
			credentials: encryptedCredentials,
			webhook_secret: data.webhookSecret,
			created_by_user_id: userId,
		});
	}

	return c.json({ provider }, 201);
}

/**
 * Update payment provider
 */
export async function updatePaymentProvider(c: Context) {
	const body = await c.req.json();
	const result = updatePaymentProviderSchema.safeParse(body);

	if (!result.success) {
		return c.json({ error: "Invalid request data", details: result.error.issues }, 400);
	}

	const db = getDb();
	const providerId = parseInt(c.req.param("providerId"), 10);
	const data = result.data;
	const userId = c.get("userId");

	// Update credentials if provided
	if (data.credentials) {
		const encryptedCredentials = encryptPaymentCredentials(data.credentials as PaymentCredentials);
		await paymentProviderQueries.updateProviderCredentials(
			db,
			providerId,
			encryptedCredentials,
			data.webhookSecret,
			userId,
		);
	}

	return c.json({ success: true });
}

/**
 * Delete payment provider (soft delete)
 */
export async function deletePaymentProvider(c: Context) {
	const db = getDb();
	const providerId = parseInt(c.req.param("providerId"), 10);

	await paymentProviderQueries.deleteProvider(db, providerId);

	return c.json({ success: true });
}

/**
 * Select payment provider for app
 */
export async function selectPaymentProvider(c: Context) {
	const db = getDb();
	const appId = parseInt(c.req.param("appId"), 10);
	const { paymentProviderId } = await c.req.json();

	if (!paymentProviderId) {
		return c.json({ error: "Payment provider ID required" }, 400);
	}

	await paymentProviderQueries.selectProviderForApp(db, appId, paymentProviderId);

	return c.json({ success: true });
}
