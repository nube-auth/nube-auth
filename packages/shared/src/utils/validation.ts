import { z } from "zod";
import type { Context } from "hono";
import { ErrorResponses } from "./errors";

/**
 * Common Zod schemas for reuse across the application
 */

/** Email validation schema */
export const emailSchema = z.string().email("Invalid email format").min(3).max(255);

/** Public ID schema (matches our ID format) */
export const publicIdSchema = z.string().regex(/^[A-Z]{3}0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9,15}$/, "Invalid ID format");

/** URL schema */
export const urlSchema = z.string().url("Invalid URL format");

/** Slug schema (URL-safe string) */
export const slugSchema = z
	.string()
	.min(1)
	.max(100)
	.regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens");

/** Positive integer schema */
export const positiveIntSchema = z.number().int().positive();

/** Non-negative integer schema */
export const nonNegativeIntSchema = z.number().int().min(0);

/** Boolean schema (accepts various inputs) */
export const booleanSchema = z.union([z.boolean(), z.string().transform((val) => val === "true" || val === "1")]);

/** Pagination query schema */
export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

/** Date range schema */
export const dateRangeSchema = z.object({
	from: z.coerce.number().int().positive().optional(),
	to: z.coerce.number().int().positive().optional(),
});

/**
 * Validate request body with Zod schema
 * Returns validated data or throws validation error
 */
export async function validateBody<T extends z.ZodType>(
	c: Context,
	schema: T,
): Promise<z.infer<T>> {
	try {
		const body = await c.req.json();
		return schema.parse(body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			}));
			throw new Error(JSON.stringify({ validation: issues }));
		}
		throw error;
	}
}

/**
 * Validate query parameters with Zod schema
 * Returns validated data or throws validation error
 */
export function validateQuery<T extends z.ZodType>(
	c: Context,
	schema: T,
): z.infer<T> {
	try {
		const query = c.req.query();
		return schema.parse(query);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			}));
			throw new Error(JSON.stringify({ validation: issues }));
		}
		throw error;
	}
}

/**
 * Validate path parameters with Zod schema
 * Returns validated data or throws validation error
 */
export function validateParams<T extends z.ZodType>(
	c: Context,
	schema: T,
): z.infer<T> {
	try {
		const params = c.req.param();
		return schema.parse(params);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			}));
			throw new Error(JSON.stringify({ validation: issues }));
		}
		throw error;
	}
}

/**
 * Create a validation middleware for Hono routes
 */
export function validateRequest<T extends z.ZodType>(schema: {
	body?: T;
	query?: T;
	params?: T;
}) {
	return async (c: Context, next: () => Promise<void>) => {
		try {
			if (schema.body) {
				const body = await c.req.json();
				c.set("validatedBody", schema.body.parse(body));
			}
			if (schema.query) {
				const query = c.req.query();
				c.set("validatedQuery", schema.query.parse(query));
			}
			if (schema.params) {
				const params = c.req.param();
				c.set("validatedParams", schema.params.parse(params));
			}
			await next();
		} catch (error) {
			if (error instanceof z.ZodError) {
				const issues = error.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				}));
				return c.json(
					ErrorResponses.ValidationError("Validation failed", { issues }),
					400,
				);
			}
			throw error;
		}
	};
}

/**
 * Format Zod validation errors for API response
 */
export function formatValidationErrors(error: z.ZodError): Record<string, unknown> {
	return {
		issues: error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
			code: issue.code,
		})),
	};
}
