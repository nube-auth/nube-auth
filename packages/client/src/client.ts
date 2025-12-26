import { HttpClient } from "pingpong-fetch";
import type {
	ApiError,
	AuthStatus,
	ProofaClientConfig,
	Session,
	UpdateProfileData,
	User,
} from "./types";

export class ProofaClient {
	private baseUrl: string;
	private httpClient: HttpClient;
	private s2sToken?: string;

	constructor(config: ProofaClientConfig) {
		this.baseUrl = config.gatewayUrl.replace(/\/$/, "");
		this.httpClient = new HttpClient();
		this.s2sToken = config.s2sToken;
	}

	private async request<T>(
		path: string,
		options?: RequestInit,
	): Promise<T> {
		const url = `${this.baseUrl}${path}`;
		
		// Build headers with optional S2S token for backend usage
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...options?.headers as any,
		};
		
		// Add S2S token if provided (backend authentication)
		if (this.s2sToken) {
			headers["X-Proofa-Service-Token"] = this.s2sToken;
		}
		
		const response = await this.httpClient.send({
			url,
			method: (options?.method as any) || "GET",
			headers: headers as any,
			body: (options?.body as any) || undefined,
		});

		if (!response.ok) {
			let error: ApiError;
			try {
				error = await response.json();
			} catch {
				error = {
					ok: false,
					error: {
						code: "UNKNOWN_ERROR",
						message: `HTTP ${response.status}: ${response.statusText}`,
					},
				};
			}
			throw new ProofaError(error.error.message, error.error.code, response.status);
		}

		return response.json();
	}

	// Authentication
	public auth = {
		checkStatus: async (): Promise<AuthStatus> => {
			return this.request<AuthStatus>("/v1/auth/status");
		},

		logout: async (): Promise<void> => {
			await this.request("/v1/auth/logout", { method: "POST" });
		},
	};

	// Current user (me)
	public me = {
		get: async (): Promise<User> => {
			return this.request<User>("/v1/me");
		},

		update: async (data: UpdateProfileData): Promise<User> => {
			return this.request<User>("/v1/me", {
				method: "PATCH",
				body: JSON.stringify(data),
			});
		},
	};

	// Sessions
	public sessions = {
		list: async (): Promise<{ sessions: Session[] }> => {
			return this.request<{ sessions: Session[] }>("/v1/me/sessions");
		},

		delete: async (sessionId: string): Promise<void> => {
			await this.request(`/v1/me/sessions/${sessionId}`, {
				method: "DELETE",
			});
		},

		deleteAll: async (): Promise<void> => {
			await this.request("/v1/me/sessions", { method: "DELETE" });
		},
	};
}

export class ProofaError extends Error {
	constructor(
		message: string,
		public code: string,
		public status: number,
	) {
		super(message);
		this.name = "ProofaError";
	}
}
