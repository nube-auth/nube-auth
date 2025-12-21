/**
 * Authentication-related types
 */

export interface User {
	id: string;
	email: string;
	provider: string;
	providerId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Session {
	id: string;
	userId: string;
	token: string;
	expiresAt: Date;
	createdAt: Date;
}

export interface JWTPayload {
	userId: string;
	sessionId: string;
	iat: number;
	exp: number;
}

export interface OAuthState {
	state: string;
	provider: string;
	redirectUrl?: string;
	expiresAt: Date;
}

export interface EmailVerification {
	id: string;
	email: string;
	code: string;
	attempts: number;
	expiresAt: Date;
	createdAt: Date;
}

export interface License {
	id: string;
	userId: string;
	type: string;
	status: "active" | "expired" | "suspended";
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}
