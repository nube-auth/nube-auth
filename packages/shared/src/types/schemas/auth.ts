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
 * Type Exports
 */

export type UserDTO = z.infer<typeof UserDTOSchema>;
export type SessionDTO = z.infer<typeof SessionDTOSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
