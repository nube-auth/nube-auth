import pingpong from "@pingpong-js/fetch";
import type {
	ApiError,
	AuthStatus,
	CheckoutSession,
	CreateCheckoutOptions,
	License,
	NubeAuthClientConfig,
	OAuthStartOptions,
	PkceOAuthStart,
	Plan,
	Price,
	ProvisionUserOptions,
	ProvisionUserResult,
	Session,
	SubscriptionStatus,
	TokenExchangeResult,
	UpdateProfileData,
	User,
	ValidatePromoOptions,
	ValidatePromoResult,
} from "./types";

export class NubeAuthClient {
	private baseUrl: string;
	private s2sToken?: string | undefined;
	private appId?: string | undefined;
	private sessionToken?: string | undefined;
	private appSecret?: string | undefined;
	private onSessionExpired?: (() => void) | undefined;
	private httpClient = pingpong;

	constructor(config: NubeAuthClientConfig) {
		this.baseUrl = config.gatewayUrl.replace(/\/$/, "");
		this.s2sToken = config.s2sToken;
		this.appId = config.appId;
		this.sessionToken = config.sessionToken;
		this.appSecret = config.appSecret;
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

		// App secret — server-to-gateway calls from trusted app backends.
		// Enables Cloudflare Bot Management bypass via matching WAF rule.
		if (this.appSecret) {
			headers["X-Nube-App-Secret"] = this.appSecret;
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
		buildOAuthUrl: async (options: OAuthStartOptions): Promise<PkceOAuthStart> => {
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
			const randomArray = new Uint8Array(32);
			crypto.getRandomValues(randomArray);
			const codeVerifier = btoa(String.fromCharCode(...randomArray))
				.replace(/\+/g, "-")
				.replace(/\//g, "_")
				.replace(/=/g, "");
			const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
			const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
				.replace(/\+/g, "-")
				.replace(/\//g, "_")
				.replace(/=/g, "");

			const url = new URL(`${this.baseUrl}/v1/auth/start`);
			url.searchParams.set("audience", "app");
			url.searchParams.set("app_id", appId);
			url.searchParams.set("return_to", options.returnTo);
			url.searchParams.set("code_challenge", codeChallenge);
			url.searchParams.set("code_challenge_method", "S256");
			if (options.deviceId) url.searchParams.set("device_id", options.deviceId);
			if (options.priceId) {
				url.searchParams.set("price_id", options.priceId);
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
			const resolvedAppId = typeof options === "string" ? options : (options?.appId ?? this.appId);
			const codeVerifier = typeof options === "object" ? options?.codeVerifier : undefined;

			if (!resolvedAppId) {
				throw new NubeAuthError(
					"appId is required — pass it in options or NubeAuthClientConfig.",
					"APP_ID_REQUIRED",
					400,
				);
			}
			// Include app_id as a query param so the gateway's appResolverMiddleware
			// can identify the app on the OPTIONS preflight (which has no body),
			// enabling per-app CORS origin lookup from the database.
			return this.request<TokenExchangeResult>(`/v1/auth/token?app=${encodeURIComponent(resolvedAppId)}`, {
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
	// App Catalog — plan + pricing data (server-to-server, uses appSecret)
	// ---------------------------------------------------------------------------

	/**
	 * Read-only catalog of plans and prices for this app.
	 * Requires `appId` and `appSecret` in the client config.
	 * Intended for use from a backend service (control plane, webhook server, etc.).
	 * Never use `appSecret` in browser code.
	 *
	 * @example
	 * const client = new NubeAuthClient({
	 *   gatewayUrl: process.env.NUBE_GATEWAY_URL,
	 *   appId: process.env.NUBE_APP_ID,
	 *   appSecret: process.env.NUBE_APP_SECRET,
	 * });
	 * const { plans } = await client.appCatalog.getPlans();
	 */
	public appCatalog = {
		/**
		 * List all active plans for this app, ordered by display_order.
		 * Returns plan names, slugs, feature bullets, and display order.
		 * Does NOT return pricing — use `getPrices(planId)` for that.
		 */
		getPlans: async (): Promise<{ plans: Plan[] }> => {
			const appId = this.requireAppId();
			if (!this.appSecret) {
				throw new NubeAuthError(
					"appSecret is required for appCatalog calls. Pass appSecret in NubeAuthClientConfig.",
					"APP_SECRET_REQUIRED",
					400,
				);
			}
			const url = `${this.baseUrl}/v1/app/${appId}/plans`;
			const response = await this.httpClient.send({
				url,
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.appSecret}`,
				},
				credentials: "omit" as any,
			});
			if (!response.ok()) {
				throw new NubeAuthError(
					`Failed to fetch plans: HTTP ${response.status}`,
					"CATALOG_ERROR",
					response.status,
				);
			}
			return response.json() as { plans: Plan[] };
		},

		/**
		 * List all active prices for a plan, identified by the plan's public_id.
		 * Returns billing type, interval, amount in cents, currency, and trial info.
		 * Provider-internal fields (external_price_id, etc.) are NOT returned.
		 */
		getPrices: async (planId: string): Promise<{ planId: string; prices: Price[] }> => {
			const appId = this.requireAppId();
			if (!this.appSecret) {
				throw new NubeAuthError(
					"appSecret is required for appCatalog calls. Pass appSecret in NubeAuthClientConfig.",
					"APP_SECRET_REQUIRED",
					400,
				);
			}
			const url = `${this.baseUrl}/v1/app/${appId}/plans/${planId}/prices`;
			const response = await this.httpClient.send({
				url,
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.appSecret}`,
				},
				credentials: "omit" as any,
			});
			if (!response.ok()) {
				throw new NubeAuthError(
					`Failed to fetch prices: HTTP ${response.status}`,
					"CATALOG_ERROR",
					response.status,
				);
			}
			return response.json() as { planId: string; prices: Price[] };
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
		cancel: async (reason?: string): Promise<void> => {
			return this.request<void>("/v1/me/subscription/cancel", {
				method: "POST",
				...(reason ? { body: JSON.stringify({ reason }) } : {}),
			});
		},
		resume: async (): Promise<void> => {
			return this.request<void>("/v1/me/subscription/resume", { method: "POST" });
		},
	};

	// ---------------------------------------------------------------------------
	// Payment — checkout session creation and promo code validation
	// ---------------------------------------------------------------------------

	/**
	 * Payment operations: create a hosted checkout session and validate promo codes.
	 *
	 * `createCheckout` should be called from your **backend** (e.g. a Next.js
	 * Server Action or an Express route) — it needs a user session and returns a
	 * provider-hosted payment URL you redirect the user to.
	 *
	 * `validatePromoCode` is safe to call from the browser to give instant
	 * discount feedback before the user hits "Pay".
	 *
	 * @example — server-side (Next.js Server Action)
	 * ```ts
	 * const client = new NubeAuthClient({
	 *   gatewayUrl: process.env.NUBE_GATEWAY_URL!,
	 *   appId: process.env.NUBE_APP_ID!,
	 *   sessionToken: await getSessionToken(),   // from cookies / auth session
	 * });
	 *
	 * const session = await client.payment.createCheckout({
	 *   priceId: "PRICE0abc123",
	 *   userId: "USER0def456",
	 *   customerEmail: user.email,
	 *   successUrl: "https://myapp.com/billing/success",
	 *   cancelUrl: "https://myapp.com/billing",
	 * });
	 *
	 * redirect(session.checkoutUrl);
	 * ```
	 */
	public payment = {
		/**
		 * Create a hosted payment checkout session for a specific price.
		 *
		 * The `priceId` already encodes the plan, billing interval, provider, and
		 * currency — no additional routing parameters are needed.
		 *
		 * On success, redirect the user to `session.checkoutUrl` to complete payment.
		 * After payment the provider redirects to `successUrl`.
		 *
		 * @throws `NubeAuthError` for invalid priceId, missing provider config,
		 *         authentication failures, or downstream provider errors.
		 */
		createCheckout: async (options: CreateCheckoutOptions): Promise<CheckoutSession> => {
			const appId = options.appId ?? this.appId;
			if (!appId) {
				throw new NubeAuthError(
					"appId is required for payment.createCheckout. Pass it in CreateCheckoutOptions or NubeAuthClientConfig.",
					"APP_ID_REQUIRED",
					400,
				);
			}
			return this.request<CheckoutSession>("/v1/payment/checkout", {
				method: "POST",
				body: JSON.stringify({
					appId,
					userId: options.userId,
					priceId: options.priceId,
					customerEmail: options.customerEmail,
					successUrl: options.successUrl,
					cancelUrl: options.cancelUrl,
					...(options.customerId !== undefined && { customerId: options.customerId }),
					...(options.quantity !== undefined && { quantity: options.quantity }),
					...(options.promoCode !== undefined && { promoCode: options.promoCode }),
					...(options.metadata !== undefined && { metadata: options.metadata }),
				}),
			});
		},

		/**
		 * Validate a promo code before initiating checkout.
		 *
		 * Safe to call from the browser — no authentication required. Returns the
		 * discount amount and adjusted total so you can display a preview to the user.
		 *
		 * @example
		 * ```ts
		 * const result = await client.payment.validatePromoCode({
		 *   code: promoInput,
		 *   priceId: selectedPrice.priceId,
		 * });
		 *
		 * if (result.valid) {
		 *   showDiscount(result.discountCents, result.adjustedTotal);
		 * } else {
		 *   showError(`Promo code invalid: ${result.reason}`);
		 * }
		 * ```
		 */
		validatePromoCode: async (options: ValidatePromoOptions): Promise<ValidatePromoResult> => {
			const appId = options.appId ?? this.appId;
			if (!appId) {
				throw new NubeAuthError(
					"appId is required for payment.validatePromoCode. Pass it in ValidatePromoOptions or NubeAuthClientConfig.",
					"APP_ID_REQUIRED",
					400,
				);
			}
			return this.request<ValidatePromoResult>("/v1/payment/validate-promo", {
				method: "POST",
				body: JSON.stringify({
					code: options.code,
					priceId: options.priceId,
					appId,
				}),
			});
		},
	};

	// ---------------------------------------------------------------------------
	// Users — S2S provisioning (requires s2sToken in config)
	// ---------------------------------------------------------------------------

	public users = {
		/**
		 * Idempotently provision a NubeAuth user from an external identity provider.
		 * If a user with the given email already exists, returns their existing userId.
		 * If not, creates a new user and returns the new userId.
		 *
		 * Requires `s2sToken` to be set in the client config.
		 *
		 * @example
		 * const client = new NubeAuthClient({ gatewayUrl, s2sToken });
		 * const { data } = await client.users.provision({ email, name, avatarUrl });
		 * // data.userId === "USER0..."
		 */
		provision: async (options: ProvisionUserOptions): Promise<{ ok: true; data: ProvisionUserResult }> => {
			return this.request<{ ok: true; data: ProvisionUserResult }>("/v1/s2s/users/provision", {
				method: "POST",
				body: JSON.stringify({
					email: options.email,
					...(options.name !== undefined && { name: options.name }),
					...(options.avatarUrl !== undefined && { avatarUrl: options.avatarUrl }),
				}),
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
