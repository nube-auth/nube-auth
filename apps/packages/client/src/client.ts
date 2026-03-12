import pingpong from "@pingpong-js/fetch";
import type { ApiError, AuthStatus, License, NubeAuthClientConfig, Session, Subscription, UpdateProfileData, User } from "./types";

export class NubeAuthClient {
	private baseUrl: string;
	private s2sToken?: string | undefined;
	private appId?: string | undefined;
	private httpClient = pingpong;

	constructor(config: NubeAuthClientConfig) {
		this.baseUrl = config.gatewayUrl.replace(/\/$/, "");
		this.s2sToken = config.s2sToken;
		this.appId = config.appId;
	}

	private requireAppId(): string {
		if (!this.appId) {
			throw new NubeAuthError(
				"appId is required for this operation. Pass appId in NubeAuthClientConfig.",
				"APP_ID_REQUIRED",
				400,
			);
		}
		return this.appId;
	}

	private async request<T>(path: string, options?: RequestInit): Promise<T> {
		const url = `${this.baseUrl}${path}`;

		// Build headers with optional S2S token for backend usage
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...(options?.headers as Record<string, string>),
		};

		// Add S2S token if provided (backend authentication)
		if (this.s2sToken) {
			headers["X-Nube-Service-Token"] = this.s2sToken;
		}

		const response = await this.httpClient.send({
			url,
			method: (options?.method || "GET") as any,
			headers,
			body: options?.body as string,
			credentials: "include" as any,
		});

		if (!response.ok()) {
			let error: ApiError;
			try {
				error = response.json();
			} catch {
				error = {
					ok: false,
					error: {
						code: "UNKNOWN_ERROR",
						message: `HTTP ${response.status}: ${response.statusText}`,
					},
				};
			}
			throw new NubeAuthError(error.error.message, error.error.code, response.status);
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

	// License (requires appId)
	public license = {
		getDetails: async (): Promise<License> => {
			const appId = this.requireAppId();
			return this.request<License>(`/v1/license/${appId}`);
		},

		isActive: async (): Promise<boolean> => {
			const appId = this.requireAppId();
			try {
				const license = await this.request<License>(`/v1/license/${appId}`);
				return license.status === "active";
			} catch {
				return false;
			}
		},
	};

	// Subscription (requires appId)
	public subscription = {
		getDetails: async (): Promise<Subscription> => {
			const appId = this.requireAppId();
			return this.request<Subscription>(`/v1/subscription/${appId}`);
		},

		cancel: async (reason?: string): Promise<void> => {
			const appId = this.requireAppId();
			await this.request(`/v1/subscription/${appId}/cancel`, {
				method: "POST",
				body: JSON.stringify(reason !== undefined ? { reason } : {}),
			});
		},

		resume: async (): Promise<void> => {
			const appId = this.requireAppId();
			await this.request(`/v1/subscription/${appId}/resume`, {
				method: "POST",
			});
		},
	};
}

export class NubeAuthError extends Error {
	constructor(
		message: string,
		public code: string,
		public status: number,
	) {
		super(message);
		this.name = "NubeAuthError";
	}
}
