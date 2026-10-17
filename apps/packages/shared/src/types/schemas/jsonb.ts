import { z } from "zod";

/**
 * Zod Schemas for JSONB fields in the apps table
 * These provide runtime validation for the structured JSON data
 */

/**
 * App Tokens Schema
 * Validates the app_tokens JSONB field
 */
export const AppTokensSchema = z.object({
	clientSecretHash: z.string().min(1),
	clientSecretEnc: z.string().min(1),
	serviceTokenHash: z.string().min(1).nullable().optional(),
	serviceTokenEnc: z.string().min(1).nullable().optional(),
});

/**
 * Security settings stored as columns on apps.
 */
export const SecuritySettingsSchema = z.object({
	redirectUris: z.array(z.string().url()).default([]),
	allowedHosts: z.array(z.string()).default([]),
	corsOrigins: z.array(z.string()).default([]),
	sessionTtlDays: z.number().int().min(1).max(365).default(28),
});

/**
 * Plan settings stored as columns on apps.
 */
export const PlanSettingsSchema = z.object({
	licensingRequired: z.boolean().default(true),
	defaultPlanId: z.number().int().positive().nullable().default(null),
});

/**
 * Partial schemas for updates (all fields optional)
 */
export const AppTokensUpdateSchema = AppTokensSchema.partial();
export const SecuritySettingsUpdateSchema = SecuritySettingsSchema.partial();
export const PlanSettingsUpdateSchema = PlanSettingsSchema.partial();

/**
 * Type exports
 */
export type AppTokens = z.infer<typeof AppTokensSchema>;
export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>;
export type PlanSettings = z.infer<typeof PlanSettingsSchema>;
