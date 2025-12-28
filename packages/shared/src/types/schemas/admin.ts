import { z } from "zod";
import {
	NameSchema,
	SlugSchema,
	DescriptionSchema,
	PublicIdSchema,
	EmailSchema,
	RoleSchema,
	RedirectUrisSchema,
	AllowedHostsSchema,
	ProvidersSchema,
	CorsOriginsSchema,
	AppSessionTtlDaysSchema,
	AccountLockoutMinutesSchema,
	CacheTtlMinutesSchema,
	RateLimitSchema,
	TrialDaysSchema,
	LicensePlanSchema,
	TimestampSchema,
} from "./common";

/**
 * Project Schemas
 */

export const CreateProjectRequestSchema = z.object({
	name: NameSchema,
	description: DescriptionSchema.optional(),
});

export const ProjectDTOSchema = z.object({
	id: PublicIdSchema,
	name: NameSchema,
	slug: SlugSchema,
	description: z.string().optional(),
	createdAt: z.number().optional(),
	updatedAt: z.number().optional(),
	totalApps: z.number().optional(),
	totalUsers: z.number().optional(),
	totalLicenses: z.number().optional(),
	activeLicenses: z.number().optional(),
	totalRevenue: z.number().optional(),
});

export const ProjectsListResponseSchema = z.object({
	projects: z.array(ProjectDTOSchema),
});

/**
 * App Schemas (all camelCase)
 */

export const CreateAppRequestSchema = z.object({
	name: NameSchema,
	slug: SlugSchema.optional(),
	description: DescriptionSchema,
	redirectUris: RedirectUrisSchema,
	allowedHosts: AllowedHostsSchema,
	requiredProviders: ProvidersSchema,
	appSessionTtlDays: AppSessionTtlDaysSchema,
	licensingRequired: z.boolean().default(false),
});

export const UpdateAppRequestSchema = CreateAppRequestSchema.partial().extend({
	emailFromName: z.string().optional(),
	emailFromAddress: z.string().email().optional(),
	emailReplyTo: z.string().email().optional(),
});

export const AppDTOSchema = z.object({
	id: PublicIdSchema,
	projectId: PublicIdSchema,
	name: NameSchema,
	slug: SlugSchema,
	description: DescriptionSchema,
	redirectUris: z.array(z.string()),
	allowedHosts: z.array(z.string()),
	requiredProviders: z.array(z.string()),
	isActive: z.boolean(),
	licensingRequired: z.boolean(),
	defaultPlanId: PublicIdSchema.nullable().optional(),
	defaultPlan: z.object({
		id: PublicIdSchema,
		name: z.string(),
		slug: z.string(),
	}).nullable().optional(),
	clientSecret: z.string(), // Masked in API response
	serviceToken: z.string(), // Masked in API response
	appSessionTtlDays: z.number(),
	accountLockoutMinutes: z.number(),
	cacheTtlMinutes: z.number(),
	corsAllowedOrigins: z.array(z.string()),
	rateLimitRequestsPerMinute: z.number(),
	emailFromName: z.string().optional(),
	emailFromAddress: z.string().optional(),
	emailReplyTo: z.string().optional(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const AppsListResponseSchema = z.object({
	apps: z.array(
		z.object({
			id: PublicIdSchema,
			name: NameSchema,
			slug: SlugSchema,
			description: DescriptionSchema,
			createdAt: z.number().optional(),
		}),
	),
});

/**
 * Project Member Schemas
 */

export const ProjectMemberDTOSchema = z.object({
	id: PublicIdSchema, // Now only accepts public_id strings (like MEM0xxx)
	userId: PublicIdSchema,
	email: EmailSchema.optional(),
	name: z.string().optional(),
	role: RoleSchema,
	createdAt: z.number(),
});

export const ProjectMembersListResponseSchema = z.object({
	members: z.array(ProjectMemberDTOSchema),
});

/**
 * License Schemas
 */

export const LicenseDTOSchema = z.object({
	id: PublicIdSchema,
	appId: PublicIdSchema,
	plan: z.string(),
	status: z.enum(["active", "expired", "canceled", "suspended"]),
	validUntil: z.number().nullable().optional(),
	createdAt: z.number(),
});

export const LicensesListResponseSchema = z.object({
	licenses: z.array(LicenseDTOSchema),
});

/**
 * Type Exports
 */

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type ProjectDTO = z.infer<typeof ProjectDTOSchema>;
export type ProjectsListResponse = z.infer<typeof ProjectsListResponseSchema>;

export type CreateAppRequest = z.infer<typeof CreateAppRequestSchema>;
export type UpdateAppRequest = z.infer<typeof UpdateAppRequestSchema>;
export type AppDTO = z.infer<typeof AppDTOSchema>;
export type AppsListResponse = z.infer<typeof AppsListResponseSchema>;

export type ProjectMemberDTO = z.infer<typeof ProjectMemberDTOSchema>;
export type ProjectMembersListResponse = z.infer<typeof ProjectMembersListResponseSchema>;

export type LicenseDTO = z.infer<typeof LicenseDTOSchema>;
export type LicensesListResponse = z.infer<typeof LicensesListResponseSchema>;
