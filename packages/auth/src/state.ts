/**
 * OAuth State Management
 * Provides CSRF protection for OAuth flows by managing state tokens
 */

import { id, validateId } from "@proofa/shared";

/** Default state token expiration (10 minutes) */
const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000;

/** In-memory state store for development (use Redis in production) */
const stateStore = new Map<string, StateData>();

interface StateData {
	createdAt: number;
	provider: string;
	redirectUri: string;
	metadata?: Record<string, unknown> | undefined;
}

interface CreateStateOptions {
	provider: string;
	redirectUri: string;
	metadata?: Record<string, unknown> | undefined;
	ttlMs?: number;
}

interface ValidateStateResult {
	valid: boolean;
	error?: string;
	data?: StateData;
}

/**
 * Generate a new OAuth state token
 * In production, this should be stored in Redis with TTL
 */
export function createOAuthState(options: CreateStateOptions): string {
	const { provider, redirectUri, metadata, ttlMs = DEFAULT_STATE_TTL_MS } = options;

	const state = id.state();
	const data: StateData = {
		createdAt: Date.now(),
		provider,
		redirectUri,
		metadata,
	};

	stateStore.set(state, data);

	// Auto-cleanup after TTL
	setTimeout(() => {
		stateStore.delete(state);
	}, ttlMs);

	return state;
}

/**
 * Validate an OAuth state token
 * @param state The state token received from the OAuth callback
 * @param expectedProvider The OAuth provider that should match
 * @returns Validation result with data if valid
 */
export function validateOAuthState(state: string | undefined | null, expectedProvider: string): ValidateStateResult {
	if (!state) {
		return { valid: false, error: "Missing state parameter" };
	}

	// Validate format
	if (!validateId("state", state)) {
		return { valid: false, error: "Invalid state format" };
	}

	// Check if state exists
	const data = stateStore.get(state);
	if (!data) {
		return { valid: false, error: "State token not found or expired" };
	}

	// Verify provider matches
	if (data.provider !== expectedProvider) {
		// Delete to prevent reuse attempts
		stateStore.delete(state);
		return { valid: false, error: "Provider mismatch" };
	}

	// Check expiration (default 10 min)
	const age = Date.now() - data.createdAt;
	if (age > DEFAULT_STATE_TTL_MS) {
		stateStore.delete(state);
		return { valid: false, error: "State token expired" };
	}

	// Delete state to prevent reuse (one-time use)
	stateStore.delete(state);

	return { valid: true, data };
}

/**
 * Consume and validate OAuth state in one operation
 * Throws on invalid state for easy error handling
 */
export function consumeOAuthState(state: string | undefined | null, expectedProvider: string): StateData {
	const result = validateOAuthState(state, expectedProvider);

	if (!result.valid) {
		throw new Error(`OAuth state validation failed: ${result.error}`);
	}

	return result.data!;
}

/**
 * Clean up expired state tokens (call periodically)
 */
export function cleanupExpiredStates(): number {
	const now = Date.now();
	let cleaned = 0;

	for (const [key, data] of stateStore.entries()) {
		if (now - data.createdAt > DEFAULT_STATE_TTL_MS) {
			stateStore.delete(key);
			cleaned++;
		}
	}

	return cleaned;
}

/**
 * Get number of pending state tokens (for monitoring)
 */
export function getPendingStateCount(): number {
	return stateStore.size;
}
