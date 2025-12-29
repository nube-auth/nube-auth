import { z } from "zod";
import { PublicIdSchema, EmailSchema, NameSchema, TimestampSchema } from "./common";

/**
 * User/Auth Schemas
 */

export const UserDTOSchema = z.object({
	id: PublicIdSchema,
	email: EmailSchema,
	name: NameSchema.nullable().optional(),
	avatarUrl: z.string().url().nullable().optional(),
	isAdmin: z.boolean(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const SessionDTOSchema = z.object({
	id: PublicIdSchema,
	userId: PublicIdSchema,
	createdAt: z.number(),
	lastSeenAt: z.number(),
	expiresAt: z.number(),
	revokedAt: z.number().nullable().optional(),
});

export const MeResponseSchema = z.object({
	id: PublicIdSchema,
	email: EmailSchema,
	name: z.string().nullable().optional(),
});

export const LoginRequestSchema = z.object({
	email: EmailSchema,
	password: z.string().min(8),
});

export const LoginResponseSchema = z.object({
	user: UserDTOSchema,
	session: SessionDTOSchema,
});

/**
 * Gateway Auth Schemas
 */

export const GatewayLoginRequestSchema = z.object({
	coreSessionId: z.string().min(1, "Core session ID is required"),
	audience: z.enum(["user", "admin"]).default("user"),
});

export const OAuthCallbackQuerySchema = z.object({
	code: z.string().min(1, "Authorization code is required"),
	state: z.string().min(1, "State parameter is required"),
});

export const OAuthInitiateQuerySchema = z.object({
	provider: z.enum(["google", "github"]),
	app_id: z.string().optional(),
	redirect_uri: z.string().url().optional(),
});

/**
 * Type Exports
 */

export type UserDTO = z.infer<typeof UserDTOSchema>;
export type SessionDTO = z.infer<typeof SessionDTOSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
