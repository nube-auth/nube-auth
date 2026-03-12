/**
 * OAuth State Management
 * Provides CSRF protection for OAuth flows by managing state tokens.
 *
 * Supports pluggable backends:
 * - In-memory Map (default, suitable for single-instance or development)
 * - Custom store (e.g., Redis) via configureStateStore()
 */

import { id, validateId } from "@nube-auth/shared";

/** Default state token expiration (10 minutes) */
const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000;

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
 * Pluggable state store interface.
 * Implement this to back OAuth state with Redis or another store.
 */
export interface StateStore {
	get(key: string): Promise<StateData | null>;
	set(key: string, value: StateData, ttlMs: number): Promise<void>;
	delete(key: string): Promise<void>;
}

// --- In-memory default store ---
class InMemoryStateStore implements StateStore {
	private store = new Map<string, StateData>();
	private timers = new Map<string, ReturnType<typeof setTimeout>>();

	async get(key: string): Promise<StateData | null> {
		return this.store.get(key) ?? null;
	}

	async set(key: string, value: StateData, ttlMs: number): Promise<void> {
		this.store.set(key, value);
		// Auto-cleanup after TTL
		const timer = setTimeout(() => {
			this.store.delete(key);
			this.timers.delete(key);
		}, ttlMs);
		this.timers.set(key, timer);
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
		const timer = this.timers.get(key);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(key);
		}
	}
}

let stateStore: StateStore = new InMemoryStateStore();

/**
 * Configure a custom state store (e.g., Redis).
 * Call this at application startup before any OAuth flows.
 */
export function configureStateStore(store: StateStore): void {
	stateStore = store;
}

/**
 * Generate a new OAuth state token
 */
export async function createOAuthState(options: CreateStateOptions): Promise<string> {
	const { provider, redirectUri, metadata, ttlMs = DEFAULT_STATE_TTL_MS } = options;

	const state = id.state();
	const data: StateData = {
		createdAt: Date.now(),
		provider,
		redirectUri,
		metadata,
	};

	await stateStore.set(state, data, ttlMs);

	return state;
}

/**
 * Validate an OAuth state token
 */
export async function validateOAuthState(state: string | undefined | null, expectedProvider: string): Promise<ValidateStateResult> {
	if (!state) {
		return { valid: false, error: "Missing state parameter" };
	}

	if (!validateId("state", state)) {
		return { valid: false, error: "Invalid state format" };
	}

	const data = await stateStore.get(state);
	if (!data) {
		return { valid: false, error: "State token not found or expired" };
	}

	if (data.provider !== expectedProvider) {
		await stateStore.delete(state);
		return { valid: false, error: "Provider mismatch" };
	}

	const age = Date.now() - data.createdAt;
	if (age > DEFAULT_STATE_TTL_MS) {
		await stateStore.delete(state);
		return { valid: false, error: "State token expired" };
	}

	// Delete state to prevent reuse (one-time use)
	await stateStore.delete(state);

	return { valid: true, data };
}

/**
 * Consume and validate OAuth state in one operation.
 * Throws on invalid state for easy error handling.
 */
export async function consumeOAuthState(state: string | undefined | null, expectedProvider: string): Promise<StateData> {
	const result = await validateOAuthState(state, expectedProvider);

	if (!result.valid) {
		throw new Error(`OAuth state validation failed: ${result.error}`);
	}

	return result.data!;
}
