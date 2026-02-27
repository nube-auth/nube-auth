import type { User } from "@proofa/shared";
import { createLogger, serializeError } from "@proofa/shared";
import { env } from "../config/env";
import { pingpong } from "@proofa/auth";

const log = createLogger("core-client");

/**
 * Client for calling Proofa Core API
 * Used by Gateway to make S2S requests to Core
 */
export class CoreClient {
	private baseUrl: string;
	private s2sToken: string;

	constructor(baseUrl: string = env.CORE_URL || "http://localhost:3003", s2sToken?: string) {
		this.baseUrl = baseUrl;
		this.s2sToken = s2sToken || env.S2S_SECRET || "";
	}

	private async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
		const url = `${this.baseUrl}${path}`;
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"X-Proofa-S2S-Token": this.s2sToken,
		};

		try {
			const response = await pingpong(url, {
				method,
				headers,
				...(body ? { body } : {}),
			});

			if (!response.ok()) {
				throw new Error(`Core API error: ${response.status} ${response.statusText}`);
			}

			// v1.4.0+: response.data is auto-parsed JSON
			return response.data as T;
		} catch (error) {
			log.error({ method, path, err: serializeError(error as Error) }, "CoreClient request failed");
			throw error;
		}
	}

	/**
	 * Get user by session ID
	 */
	async getUserBySession(sessionId: string): Promise<User | null> {
		try {
			const result = await this.request<User | null>("POST", "/v1/auth/exchange", {
				sessionId,
			});
			return result;
		} catch {
			return null;
		}
	}

	/**
	 * Exchange Core session for Gateway app session
	 */
	async exchangeSession(sessionId: string): Promise<{ userId: string; email: string; name: string } | null> {
		try {
			return await this.request("POST", "/v1/auth/exchange", { sessionId });
		} catch {
			return null;
		}
	}
}

export const coreClient = new CoreClient();
