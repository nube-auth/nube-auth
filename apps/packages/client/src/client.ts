import { createHash, randomBytes } from "node:crypto";
import pingpong from "@pingpong-js/fetch";
import type {
	ApiError,
	AuthStatus,
	License,
	NubeAuthClientConfig,
	OAuthStartOptions,
	PkceOAuthStart,
	Session,
	SubscriptionStatus,
	TokenExchangeResult,
	UpdateProfileData,
	User,
} from "./types";

export class NubeAuthClient {
	private baseUrl: string;
	private s2sToken?: string | undefined;
	private appId?: string | undefined;
	private sessionToken?: string | undefined;
	private onSessionExpired?: (() => void) | undefined;
	private httpClient = pingpong;

	constructor(config: NubeAuthClientConfig) {
		this.baseUrl = config.gatewayUrl.replace(/\/$/, "");
		this.s2sToken = config.s2sToken;
		this.appId = config.appId;
		this.sessionToken = config.sessionToken;
		this.onSessionExpired = config.onSessionExpired;
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

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...(options?.headers as Record<string, string>),
		};

		// Bearer token — app / CLI / browser extension clients (audience=app sessions)
		if (this.sessionToken) {
			headers["Authorization"] = `Bearer ${this.sessionToken}`;
		}

		// S2S token — internal backend-to-backend calls
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
			// Notify the caller that auth has expired before throwing,
			// so they can trigger re-authentication without wrapping every call.
			if (response.status === 401 && this.onSessionExpired) {
				this.onSessionExpired();
			}
			throw new NubeAuthError(error.error.message, error.error.code, response.status);
		}

		return response.json();
	}

	// ---------------------------------------------------------------------------
	// Authentication (shared)
	// ---------------------------------------------------------------------------

	public auth = {
		checkStatus: async (): Promise<AuthStatus> => {
			return this.request<AuthStatus>("/v1/auth/status");
		},

		logout: async (): Promise<void> => {
			await this.request("/v1/auth/logout", { method: "POST" });
		},
	};

	// ---------------------------------------------------------------------------
	// App OAuth flow (audience=app) — native app / CLI / browser extension
	// ---------------------------------------------------------------------------

	public app = {
		/**
		 * Build the OAuth start URL for the app flow, with PKCE.
		 * Open the returned `url` in a browser (system default or embedded WebView).
		 * After OAuth completes the provider redirects to `returnTo?code=<one-time-code>`.
		 *
		 * Store `codeVerifier` securely and pass it to `exchangeCode()` — it proves
		 * that the party starting the flow is the same one completing it (PKCE S256).
		 *
		 * @example
		 * const { url, codeVerifier } = client.app.buildOAuthUrl({
		 *   returnTo: "myapp://auth",
		 *   deviceId: hardwareUuid,   // optional
		 * });
		 * await secureStorage.set("pkce_verifier", codeVerifier);
		 * openBrowserWindow(url);
		 */
		buildOAuthUrl: (options: OAuthStartOptions): PkceOAuthStart => {
			const appId = options.appId ?? this.appId;
			if (!appId) {
				throw new NubeAuthError(
					"appId is required — pass it in OAuthStartOptions or NubeAuthClientConfig.",
					"APP_ID_REQUIRED",
					400,
				);
			}

			// RFC 7636 PKCE: code_verifier is a high-entropy random string;
			// code_challenge = BASE64URL(SHA256(code_verifier))
			const codeVerifier = randomBytes(32).toString("base64url");
			const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

			const url = new URL(`${this.baseUrl}/v1/auth/start`);
			url.searchParams.set("audience", "app");
			url.searchParams.set("app_id", appId);
			url.searchParams.set("return_to", options.returnTo);
			url.searchParams.set("code_challenge", codeChallenge);
			url.searchParams.set("code_challenge_method", "S256");
			if (options.deviceId) url.searchParams.set("device_id", options.deviceId);
			if (options.planId) {
				url.searchParams.set("plan_id", options.planId);
				url.searchParams.set("interval", options.billingInterval ?? "month");
			}

			return { url: url.toString(), codeVerifier };
		},

		/**
		 * Exchange a one-time code (received in `returnTo?code=<...>`) for a
		 * long-lived session token.
		 *
		 * Pass the `codeVerifier` returned by `buildOAuthUrl()` to complete PKCE
		 * verification. Without it the gateway will reject the exchange.
		 *
		 * The code is single-use and expires in 60 seconds — call this immediately.
		 * Persist the returned `sessionToken` in secure storage
		 * (Keychain on macOS, credential manager on Windows/Linux,
		 * chrome.storage.session for browser extensions).
		 *
		 * Then create a new client with `sessionToken` set:
		 * @example
		 * const result = await bootstrapClient.app.exchangeCode(code, {
		 *   codeVerifier: storedVerifier,
		 * });
		 * const authedClient = new NubeAuthClient({
		 *   gatewayUrl: GATEWAY_URL,
		 *   appId: "app_abc123",
		 *   sessionToken: result.sessionToken,
		 * });
		 */
		exchangeCode: async (
			code: string,
			options?: { appId?: string; codeVerifier?: string } | string,
		): Promise<TokenExchangeResult> => {
			// Accept legacy positional string for backward compat: exchangeCode(code, appId)
			const resolvedAppId =
				typeof options === "string" ? options : (options?.appId ?? this.appId);
			const codeVerifier =
				typeof options === "object" ? options?.codeVerifier : undefined;

			if (!resolvedAppId) {
				throw new NubeAuthError(
					"appId is required — pass it in options or NubeAuthClientConfig.",
					"APP_ID_REQUIRED",
					400,
				);
			}
			return this.request<TokenExchangeResult>("/v1/auth/token", {
				method: "POST",
				body: JSON.stringify({
					code,
					app_id: resolvedAppId,
					...(codeVerifier ? { code_verifier: codeVerifier } : {}),
				}),
			});
		},
	};

	// ---------------------------------------------------------------------------
	// Current user (me)
	// ---------------------------------------------------------------------------

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

	// ---------------------------------------------------------------------------
	// Sessions
	// ---------------------------------------------------------------------------

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

	// ---------------------------------------------------------------------------
	// License (requires appId in config)
	// ---------------------------------------------------------------------------

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

	// ---------------------------------------------------------------------------
	// Subscription (requires authenticated session — cookie or Bearer)
	// ---------------------------------------------------------------------------

	public subscription = {
		/**
		 * Returns the subscription status for the current user.
		 * Works with both cookie sessions (web) and Bearer token sessions (app/CLI).
		 * Returns `hasActivePlan: false` when no active subscription exists —
		 * never throws a 404.
		 */
		getDetails: async (): Promise<SubscriptionStatus> => {
			return this.request<SubscriptionStatus>("/v1/me/subscription");
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
