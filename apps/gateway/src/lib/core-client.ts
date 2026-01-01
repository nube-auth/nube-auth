import type { User } from "@proofa/shared";

/**
 * Client for calling Proofa Core API
 * Used by Gateway to make S2S requests to Core
 */
export class CoreClient {
	private baseUrl: string;
	private s2sToken: string;

	constructor(baseUrl: string = process.env["CORE_URL"] || "http://localhost:3003", s2sToken?: string) {
		this.baseUrl = baseUrl;
		this.s2sToken = s2sToken || process.env["CORE_S2S_TOKEN"] || "";
	}

	private async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
		const url = `${this.baseUrl}${path}`;
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"X-S2S-Token": this.s2sToken,
		};

		try {
			const response = await fetch(url, {
				method,
				headers,
				...(body ? { body: JSON.stringify(body) } : {}),
			});

			if (!response.ok) {
				throw new Error(`Core API error: ${response.status} ${response.statusText}`);
			}

			return (await response.json()) as T;
		} catch (error) {
			console.error(`CoreClient request failed: ${method} ${path}`, error);
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
