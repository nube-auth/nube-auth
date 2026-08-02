/**
 * JSONB Column Schemas
 *
 * Co-located schemas for JSONB columns.
 * These are the canonical definitions used for validation.
 * Every JSONB column gets:
 * - Base schema (what the data looks like)
 * - Patch schema (for updates - all fields optional)
 * - Used by query helpers for validation
 */

import { z } from "zod";

/**
 * ============================================================================
 * SECURITY SETTINGS
 * ============================================================================
 *
 * apps.security_settings JSONB column
 * Stores OAuth configuration, redirect URIs, session settings, etc.
 */

// Individual field schemas for reusability
export const RedirectUriSchema = z.string().url().pipe(z.string().max(500));
export const OAuthEnabledSchema = z.boolean();
export const ClientIdSchema = z.string().min(1).max(500);
export const ClientSecretSchema = z.string().min(1).max(1000);
export const SessionTtlSchema = z.number().min(1).max(86400).describe("Session TTL in seconds, max 1 day");
export const MaxSessionsSchema = z.number().min(1).max(100).describe("Max concurrent sessions per user");
export const MfaRequiredSchema = z.boolean();

// OAuth Provider Configuration
export const OAuthProviderSchema = z.object({
	enabled: OAuthEnabledSchema,
	clientId: ClientIdSchema.optional(),
	clientSecret: ClientSecretSchema.optional(),
});

// Full security settings
export const SecuritySettingsSchema = z.object({
	redirectUris: z.array(RedirectUriSchema).default([]).describe("Allowed OAuth redirect URIs"),
	sessionTtlDays: SessionTtlSchema.default(3600),
	maxSessions: MaxSessionsSchema.default(10),
	mfaRequired: MfaRequiredSchema.default(false),
	oauth: z
		.object({
			github: OAuthProviderSchema.optional(),
			google: OAuthProviderSchema.optional(),
			microsoft: OAuthProviderSchema.optional(),
		})
		.default({}),
	allowedOrigins: z.array(z.string().url()).default([]).describe("CORS allowed origins"),
});

// Patch schema for updates (all fields optional)
export const SecuritySettingsPatchSchema = SecuritySettingsSchema.partial().strict();

export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>;
export type SecuritySettingsPatch = z.infer<typeof SecuritySettingsPatchSchema>;

/**
 * ============================================================================
 * APP TOKENS
 * ============================================================================
 *
 * apps.app_tokens JSONB column
 * Stores API keys, service tokens, and related metadata
 */

export const ApiKeyValueSchema = z.string().regex(/^sk_/, "API keys must start with 'sk_'").min(10).max(500);
export const ApiKeyRotatedAtSchema = z.string().datetime();

export const ApiKeySchema = z.object({
	value: ApiKeyValueSchema,
	rotatedAt: ApiKeyRotatedAtSchema,
	expiresAt: ApiKeyRotatedAtSchema.optional(),
});

export const AppTokensSchema = z.object({
	currentKey: ApiKeySchema.optional(),
	previousKey: ApiKeySchema.optional().describe("Previous key for graceful rotation"),
	serviceToken: z.string().min(1).max(1000).optional(),
	webhookSecret: z.string().min(1).max(500).optional(),
	/**
	 * App client secret — 64 hex chars (randomBytes(32)) generated at app creation.
	 * Used for server-to-server authentication from app backends (GET /v1/app/:appId/plans etc.).
	 * Never expose in browser code or client-side bundles.
	 */
	clientSecret: z.string().min(1).max(128).optional(),
});

export const AppTokensPatchSchema = AppTokensSchema.partial().strict();

export type AppTokens = z.infer<typeof AppTokensSchema>;
export type AppTokensPatch = z.infer<typeof AppTokensPatchSchema>;

/**
 * ============================================================================
 * PLAN SETTINGS
 * ============================================================================
 *
 * apps.plan_settings JSONB column
 * Stores feature flags, rate limits, quota settings
 */

export const RateLimitSchema = z.object({
	requestsPerSecond: z.number().min(1).max(10000),
	burstsAllowed: z.number().min(1).max(1000),
	windowSizeMs: z.number().min(100).max(60000).optional(),
});

export const QuotaSchema = z.object({
	maxApiCalls: z.number().min(0),
	maxUsers: z.number().min(0),
	maxProjects: z.number().min(0),
});

export const FeatureFlagsSchema = z.object({
	advancedAnalytics: z.boolean().default(false),
	customDomain: z.boolean().default(false),
	sso: z.boolean().default(false),
	webhooks: z.boolean().default(false),
	apiAccess: z.boolean().default(true),
});

export const PlanSettingsSchema = z.object({
	planName: z.string().min(1).max(100).optional(),
	rateLimit: RateLimitSchema.optional(),
	quotas: QuotaSchema.optional(),
	featureFlags: FeatureFlagsSchema.default(() => ({
		advancedAnalytics: false,
		customDomain: false,
		sso: false,
		webhooks: false,
		apiAccess: true,
	})),
	billingCycleEndsAt: z.string().datetime().optional(),
});

export const PlanSettingsPatchSchema = PlanSettingsSchema.partial().strict();

export type PlanSettings = z.infer<typeof PlanSettingsSchema>;
export type PlanSettingsPatch = z.infer<typeof PlanSettingsPatchSchema>;

/**
 * ============================================================================
 * PAYMENT PROVIDER METADATA
 * ============================================================================
 *
 * payment_providers.metadata JSONB column
 * Stores webhook configuration, retry policies, rate limits
 */

export const RetryPolicySchema = z.object({
	maxRetries: z.number().min(0).max(10),
	backoffMultiplier: z.number().min(1).max(10),
	initialDelayMs: z.number().min(100).max(60000),
	maxDelayMs: z.number().min(1000).max(300000).optional(),
});

export const WebhookConfigSchema = z.object({
	webhookUrl: z.string().url().pipe(z.string().max(2048)),
	webhookVersion: z.string().optional(),
	retryPolicy: RetryPolicySchema.optional(),
	headers: z.record(z.string(), z.string()).optional(),
});

export const PaymentProviderMetadataSchema = z.object({
	webhook: WebhookConfigSchema.optional(),
	rateLimit: RateLimitSchema.optional(),
	supportedCurrencies: z.array(z.string().length(3)).optional(),
	lastVerifiedAt: z.string().datetime().optional(),
	certificationLevel: z.enum(["unverified", "verified", "certified"]).optional(),
});

export const PaymentProviderMetadataPatchSchema = PaymentProviderMetadataSchema.partial().strict();

export type PaymentProviderMetadata = z.infer<typeof PaymentProviderMetadataSchema>;
export type PaymentProviderMetadataPatch = z.infer<typeof PaymentProviderMetadataPatchSchema>;

/**
 * ============================================================================
 * VALIDATION UTILITIES
 * ============================================================================
 */

/**
 * Validate a JSONB patch against a schema
 * Used internally by query helpers
 */
export function validateJsonbPatch<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
	return schema.parse(data);
}

/**
 * Validate that a JSONB document matches a schema
 * Use after reading from database to ensure consistency
 */
export function validateJsonbDocument<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
	// Use non-partial schema for full documents
	return schema.parse(data);
}

/**
 * Extract only validated fields from a larger object
 * Useful for accepting request bodies and validating patches
 */
export function extractValidPatch<T extends z.ZodTypeAny>(schema: T, data: unknown): Partial<z.infer<T>> {
	// Patch schema already has partial + strict
	return schema.parse(data);
}

/**
 * ============================================================================
 * EXPORT ALL SCHEMAS
 * ============================================================================
 */

export const JSONB_SCHEMAS = {
	securitySettings: {
		full: SecuritySettingsSchema,
		patch: SecuritySettingsPatchSchema,
	},
	appTokens: {
		full: AppTokensSchema,
		patch: AppTokensPatchSchema,
	},
	planSettings: {
		full: PlanSettingsSchema,
		patch: PlanSettingsPatchSchema,
	},
	paymentProviderMetadata: {
		full: PaymentProviderMetadataSchema,
		patch: PaymentProviderMetadataPatchSchema,
	},
} as const;
