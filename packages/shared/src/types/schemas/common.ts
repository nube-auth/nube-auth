import { z } from "zod";

/**
 * Common schemas used across admin APIs
 */

export const ErrorResponseSchema = z.object({
	error: z.string(),
});

export const PaginationSchema = z.object({
	page: z.number().int().positive().default(1),
	limit: z.number().int().positive().max(100).default(20),
});

export const TimestampSchema = z.object({
	created_at: z.number(),
	updated_at: z.number(),
});

/**
 * Common field validators
 */
export const PublicIdSchema = z.string().regex(/^[A-Za-z0-9]+$/, "Invalid public ID format");
export const NameSchema = z.string().min(1, "Name is required").max(255);
export const SlugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens");
export const DescriptionSchema = z.string().max(500).optional();
export const EmailSchema = z.string().email();
export const RoleSchema = z.enum(["owner", "admin", "member"]);

/**
 * Array field validators
 */
export const RedirectUrisSchema = z.array(z.string().url()).min(1, "At least one redirect URI required");
export const AllowedHostsSchema = z.array(z.string()).default([]);
export const ProvidersSchema = z.array(z.string()).default([]);
export const CorsOriginsSchema = z.array(z.string()).default([]);

/**
 * App configuration validators
 */
export const AppSessionTtlDaysSchema = z.number().int().min(1).max(365).default(28);
export const AccountLockoutMinutesSchema = z.number().int().min(1).max(1440).default(30);
export const CacheTtlMinutesSchema = z.number().int().min(1).max(1440).default(60);
export const RateLimitSchema = z.number().int().min(1).max(10000).default(100);
export const TrialDaysSchema = z.number().int().min(0).max(365).nullable().optional();
export const LicensePlanSchema = z.enum(["free", "trial"]).default("free");

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
