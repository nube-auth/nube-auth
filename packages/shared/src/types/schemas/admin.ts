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
	createdAt: z.coerce.date().optional(),
	updatedAt: z.coerce.date().optional(),
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
	sessionTtlDays: AppSessionTtlDaysSchema.default(28),
	enabledProviders: z.array(z.enum(["google", "github"])).optional().default(["google", "github"]),
	requiresLicensing: z.boolean().default(false),
	defaultLicensePlan: z.object({
		name: NameSchema,
		slug: SlugSchema.optional(),
		description: DescriptionSchema,
		price: z.number().min(0).max(999999.99),
		currency: z.string().length(3).regex(/^[A-Z]{3}$/, "Currency must be 3-letter ISO code").default("USD"),
		billing_period: z.enum(["none", "monthly", "yearly", "lifetime", "custom"]).default("none"),
		trial_days: TrialDaysSchema,
		features: z.record(z.any()).optional(),
	}).optional(),
});

export const UpdateAppRequestSchema = CreateAppRequestSchema.partial().extend({
	corsOrigins: z.array(z.string()).optional(),
	rateLimit: z.number().int().positive().optional(),
	accountLockoutMinutes: z.number().int().positive().optional(),
	cacheTtlMinutes: z.number().int().positive().optional(),
});

/**
 * User Invitation Schemas
 */

export const InviteAppUserRequestSchema = z.object({
	email: EmailSchema,
	plan_id: z.number().int().positive().optional(),
	grant_license: z.boolean().default(false),
	license_duration_days: z.number().int().min(1).max(3650).optional().nullable(),
	custom_message: z.string().max(1000).optional(),
});

export const InviteProjectMemberRequestSchema = z.object({
	email: EmailSchema,
	role: RoleSchema,
	custom_message: z.string().max(1000).optional(),
});

/**
 * License Management Schemas
 */

export const GrantLicenseRequestSchema = z.object({
	user_id: PublicIdSchema,
	plan_id: z.number().int().positive(),
	duration_days: z.number().int().min(1).max(3650).optional().nullable(),
	metadata: z.record(z.any()).optional(),
});

export const UpdateLicenseRequestSchema = z.object({
	status: z.enum(["active", "expired", "revoked"]).optional(),
	valid_until: z.number().int().positive().optional().nullable(),
	metadata: z.record(z.any()).optional(),
});

/**
 * Plan Management Schemas
 */

export const CreatePlanRequestSchema = z.object({
	name: NameSchema,
	slug: SlugSchema.optional(),
	description: DescriptionSchema,
	price: z.number().min(0).max(999999.99),
	currency: z.string().length(3).regex(/^[A-Z]{3}$/, "Currency must be 3-letter ISO code"),
	billing_period: z.enum(["monthly", "yearly", "lifetime", "custom"]),
	trial_days: TrialDaysSchema,
	features: z.record(z.any()).optional(),
	is_active: z.boolean().default(true),
});

export const UpdatePlanRequestSchema = CreatePlanRequestSchema.partial();

/**
 * Query Parameter Schemas
 */

export const ListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().max(255).optional(),
	status: z.enum(["active", "inactive", "all"]).optional(),
});

export const ProjectIdParamSchema = z.object({
	projectId: PublicIdSchema,
});

export const AppIdParamSchema = z.object({
	appId: PublicIdSchema,
});

export const UserIdParamSchema = z.object({
	userId: PublicIdSchema,
});

export const LicenseIdParamSchema = z.object({
	licenseId: PublicIdSchema,
});

export const PlanIdParamSchema = z.object({
	planId: PublicIdSchema,
});

export const AppDTOSchema = z.object({
	id: PublicIdSchema,
	projectId: PublicIdSchema,
	name: NameSchema,
	slug: SlugSchema,
	description: DescriptionSchema,
	redirectUris: z.array(z.string()),
	allowedHosts: z.array(z.string()),
	corsOrigins: z.array(z.string()),
	clientSecret: z.string(), // Masked in API response
	serviceToken: z.string(), // Masked in API response
	sessionTtlDays: z.number(),
	accountLockoutMinutes: z.number(),
	cacheTtlMinutes: z.number(),
	rateLimit: z.number(),
	enabledProviders: z.array(z.string()),
	selectedPaymentProviderId: z.number().nullable().optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const AppsListResponseSchema = z.object({
	apps: z.array(
		z.object({
			id: PublicIdSchema,
			name: NameSchema,
			slug: SlugSchema,
			description: DescriptionSchema,
			createdAt: z.coerce.date().optional(),
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
	createdAt: z.coerce.date(),
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
	validUntil: z.coerce.date().nullable().optional(),
	createdAt: z.coerce.date(),
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
