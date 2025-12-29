import type { Context } from "hono";
import { z } from "zod";
import {
	oauthProviderQueries,
	paymentProviderQueries,
	getDb,
} from "@proofa/db";
import {
	encryptOAuthCredentials,
	encryptPaymentCredentials,
	decryptOAuthCredentials,
	decryptPaymentCredentials,
	maskOAuthCredentials,
	maskPaymentCredentials,
	type OAuthCredentials,
	type PaymentCredentials,
} from "@proofa/shared";

// Validation schemas
const createOAuthProviderSchema = z.object({
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

const updateOAuthProviderSchema = z.object({
	credentials: z.object({
		client_id: z.string().min(1),
		client_secret: z.string().min(1),
		redirect_uri: z.string().optional(),
	}).optional(),
	isActive: z.boolean().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

const selectOAuthProviderSchema = z.object({
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
 * Get available OAuth providers for an app
 */
export async function getAvailableOAuthProviders(c: Context) {
	const db = getDb();
	const appId = parseInt(c.req.param("appId"));

	const providers = await oauthProviderQueries.getAvailableOAuthProviders(db, appId);

	// Mask credentials for security
	const masked = providers.map((p) => ({
		id: p.id,
		publicId: p.public_id,
		entityType: p.entity_type,
		entityId: p.entity_id,
		provider: p.provider,
		isActive: p.is_active,
		credentials: maskOAuthCredentials(decryptOAuthCredentials(p.credentials)),
		metadata: p.metadata,
		createdAt: p.created_at,
		updatedAt: p.updated_at,
	}));

	return c.json({ providers: masked });
}

/**
 * Get selected OAuth providers for an app
 */
export async function getSelectedOAuthProviders(c: Context) {
	const db = getDb();
	const appId = parseInt(c.req.param("appId"));

	const selections = await oauthProviderQueries.getOAuthProviders(db, appId);

	// Mask credentials for security
	const masked = selections.map((s) => ({
		selectionId: s.selection_id,
		isEnabled: s.is_enabled,
		displayOrder: s.display_order,
		customButtonText: s.custom_button_text,
		provider: {
			id: s.provider_id,
			provider: s.provider,
			entityType: s.entity_type,
			entityId: s.entity_id,
			credentials: maskOAuthCredentials(decryptOAuthCredentials(s.credentials)),
			metadata: s.metadata,
		},
	}));

	return c.json({ providers: masked });
}

/**
 * Create OAuth provider
 */
export async function createOAuthProvider(c: Context) {
	const body = await c.req.json();
	const result = createOAuthProviderSchema.safeParse(body);
	
	if (!result.success) {
		return c.json({ error: "Invalid request data", details: result.error.issues }, 400);
	}

	const db = getDb();
	const data = result.data;
	const userId = c.get("userId");

	// Encrypt credentials
	const encryptedCredentials = encryptOAuthCredentials(data.credentials as OAuthCredentials);

	let provider;
	if (data.entityType === "platform") {
		provider = await oauthProviderQueries.createPlatformProvider(db, {
			provider: data.provider,
			credentials: encryptedCredentials,
			created_by_user_id: userId,
		});
	} else if (data.entityType === "project") {
		if (!data.entityId) {
			return c.json({ error: "Entity ID required for project providers" }, 400);
		}
		provider = await oauthProviderQueries.createProjectProvider(db, {
			project_id: data.entityId,
			provider: data.provider,
			credentials: encryptedCredentials,
			created_by_user_id: userId,
		});
	} else {
		if (!data.entityId) {
			return c.json({ error: "Entity ID required for app providers" }, 400);
		}
		provider = await oauthProviderQueries.createAppProvider(db, {
			app_id: data.entityId,
			provider: data.provider,
			credentials: encryptedCredentials,
			created_by_user_id: userId,
		});
	}

	return c.json({ provider }, 201);
}

/**
 * Update OAuth provider
 */
export async function updateOAuthProvider(c: Context) {
	const body = await c.req.json();
	const result = updateOAuthProviderSchema.safeParse(body);
	
	if (!result.success) {
		return c.json({ error: "Invalid request data", details: result.error.issues }, 400);
	}

	const db = getDb();
	const providerId = parseInt(c.req.param("providerId"));
	const data = result.data;
	const userId = c.get("userId");

	// Update credentials if provided
	if (data.credentials) {
		const encryptedCredentials = encryptOAuthCredentials(data.credentials as OAuthCredentials);
		await oauthProviderQueries.updateProviderCredentials(
			db,
			providerId,
			encryptedCredentials,
			userId,
		);
	}

	return c.json({ success: true });
}

/**
 * Delete OAuth provider (soft delete)
 */
export async function deleteOAuthProvider(c: Context) {
	const db = getDb();
	const providerId = parseInt(c.req.param("providerId"));

	await oauthProviderQueries.deleteProvider(db, providerId);

	return c.json({ success: true });
}

/**
 * Select OAuth provider for app
 */
export async function selectOAuthProvider(c: Context) {
	const body = await c.req.json();
	const result = selectOAuthProviderSchema.safeParse(body);
	
	if (!result.success) {
		return c.json({ error: "Invalid request data", details: result.error.issues }, 400);
	}

	const db = getDb();
	const appId = parseInt(c.req.param("appId"));
	const data = result.data;

	const selection = await oauthProviderQueries.selectProviderForApp(db, {
		app_id: appId,
		oauth_provider_id: data.oauthProviderId,
		display_order: data.displayOrder,
		custom_button_text: data.customButtonText,
	});

	return c.json({ selection }, 201);
}

/**
 * Deselect OAuth provider for app
 */
export async function deselectOAuthProvider(c: Context) {
	const db = getDb();
	const appId = parseInt(c.req.param("appId"));
	const providerId = parseInt(c.req.param("providerId"));

	await oauthProviderQueries.deselectProviderForApp(db, appId, providerId);

	return c.json({ success: true });
}

/**
 * Get available payment providers for an app
 */
export async function getAvailablePaymentProviders(c: Context) {
	const db = getDb();
	const appId = parseInt(c.req.param("appId"));
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
	const appId = parseInt(c.req.param("appId"));

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
	const providerId = parseInt(c.req.param("providerId"));
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
	const providerId = parseInt(c.req.param("providerId"));

	await paymentProviderQueries.deleteProvider(db, providerId);

	return c.json({ success: true });
}

/**
 * Select payment provider for app
 */
export async function selectPaymentProvider(c: Context) {
	const db = getDb();
	const appId = parseInt(c.req.param("appId"));
	const { paymentProviderId } = await c.req.json();

	if (!paymentProviderId) {
		return c.json({ error: "Payment provider ID required" }, 400);
	}

	await paymentProviderQueries.selectProviderForApp(db, appId, paymentProviderId);

	return c.json({ success: true });
}
