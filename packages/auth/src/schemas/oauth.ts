import { z } from 'zod';

/**
 * Google OAuth token response schema
 */
export const GoogleTokenResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string().optional(),
	expires_in: z.number().optional(),
	token_type: z.string().optional(),
	scope: z.string().optional(),
	id_token: z.string().optional(),
});

export type GoogleTokenResponse = z.infer<typeof GoogleTokenResponseSchema>;

/**
 * Google user info response schema
 */
export const GoogleUserInfoSchema = z.object({
	sub: z.string(),
	email: z.email(),
	email_verified: z.boolean().optional(),
	name: z.string().optional(),
	given_name: z.string().optional(),
	family_name: z.string().optional(),
	picture: z.url().optional(),
	locale: z.string().optional(),
});

export type GoogleUserInfo = z.infer<typeof GoogleUserInfoSchema>;

/**
 * GitHub OAuth token response schema
 */
export const GitHubTokenResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string().optional(),
	expires_in: z.number().optional(),
	token_type: z.string().optional(),
	scope: z.string().optional(),
	error: z.string().optional(),
	error_description: z.string().optional(),
});

export type GitHubTokenResponse = z.infer<typeof GitHubTokenResponseSchema>;

/**
 * GitHub user response schema
 */
export const GitHubUserSchema = z.object({
	id: z.number(),
	login: z.string(),
	name: z.string().nullable(),
	email: z.email().nullable(),
	avatar_url: z.url().optional(),
	html_url: z.url().optional(),
	type: z.string().optional(),
});

export type GitHubUser = z.infer<typeof GitHubUserSchema>;

/**
 * GitHub email response schema
 */
export const GitHubEmailSchema = z.object({
	email: z.email(),
	primary: z.boolean(),
	verified: z.boolean(),
	visibility: z.string().nullable().optional(),
});

export const GitHubEmailsSchema = z.array(GitHubEmailSchema);

export type GitHubEmail = z.infer<typeof GitHubEmailSchema>;

/**
 * Generic OAuth error response
 */
export const OAuthErrorSchema = z.object({
	error: z.string(),
	error_description: z.string().optional(),
});

export type OAuthError = z.infer<typeof OAuthErrorSchema>;
