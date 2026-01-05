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
	clientSecret: z.string().min(1),
	serviceToken: z.string().min(1),
});

/**
 * Security Settings Schema
 * Validates the security_settings JSONB field
 */
export const SecuritySettingsSchema = z.object({
	redirectUris: z.array(z.string().url()).default([]),
	allowedHosts: z.array(z.string()).default([]),
	corsOrigins: z.array(z.string()).default([]),
	sessionTtlDays: z.number().int().min(1).max(365).default(28),
	accountLockoutMinutes: z.number().int().min(1).max(1440).default(30),
	cacheTtlMinutes: z.number().int().min(1).max(1440).default(60),
	rateLimit: z.number().int().min(1).max(10000).default(100),
});

/**
 * Trial Config Schema
 * Nested schema for trial configuration within plan_settings
 */
export const TrialConfigSchema = z.object({
	enabled: z.boolean().default(false),
	planId: z.number().int().positive().nullable().default(null),
	days: z.number().int().min(1).max(365).nullable().default(null),
	oncePerUser: z.boolean().default(true),
	fallbackPlanId: z.number().int().positive().nullable().default(null),
});

/**
 * Plan Settings Schema
 * Validates the plan_settings JSONB field
 */
export const PlanSettingsSchema = z.object({
	licensingRequired: z.boolean().default(true),
	defaultPlanId: z.number().int().positive().nullable().default(null),
	trial: TrialConfigSchema.default({
		enabled: false,
		planId: null,
		days: null,
		oncePerUser: true,
		fallbackPlanId: null,
	}),
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
export type TrialConfig = z.infer<typeof TrialConfigSchema>;
export type PlanSettings = z.infer<typeof PlanSettingsSchema>;
