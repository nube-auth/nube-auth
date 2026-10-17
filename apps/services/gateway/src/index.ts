import { serve } from "@hono/node-server";
import { configureSessionSecret } from "@nube-auth/auth";
import { initCache, pingCache } from "@nube-auth/cache";
import { createLogger, resolveAllowedOrigin, serializeError } from "@nube-auth/shared";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./config/env";
import { getClientSecretHash } from "./lib/appClientSecret";
import { getAppSecuritySettings } from "./lib/appSecuritySettings";
import { presentedSecretMatches } from "./lib/secret-match";
import { allowedHostsMiddleware } from "./middleware/allowedHosts";
import { appResolverMiddleware } from "./middleware/appResolver";
import { authMiddleware } from "./middleware/auth";
import { csrfProtection } from "./middleware/csrf";
import { httpLogger } from "./middleware/logger";
import { rateLimitPresets } from "./middleware/rateLimit";
import { s2sAuthMiddleware } from "./middleware/s2s";
import { adminRoutes } from "./routes/admin";
import { appCatalogRoutes } from "./routes/appCatalog";
import { authRoutes } from "./routes/auth";
import { debugRoutes } from "./routes/debug";
import { licenseRoutes } from "./routes/license";
import { meRoutes } from "./routes/me";
import { paymentsRoutes } from "./routes/payments";
import { s2sRoutes } from "./routes/s2s";

// Initialize cache with the validated Redis URL from env.ts before any cache operations
initCache(env.REDIS_URL);

// Configure session secret before any auth operations
configureSessionSecret(env.SESSION_SECRET);

const log = createLogger("gateway");
const app = new Hono();

// Readiness state — gates the /health endpoint
const isReady = { core: false, redis: false };

// CORS configuration for cross-subdomain requests with credentials
// Build allowed origins dynamically from env vars so staging/production work without code changes
const allowedOrigins = [env.USER_DASHBOARD_URL, env.ADMIN_DASHBOARD_URL, env.FRONTEND_URL].filter(
	(origin): origin is string => Boolean(origin),
);

function getAllowedOriginOrNull(origin: string): string | null {
	let serviceHostname = "";
	try {
		serviceHostname = new URL(env.GATEWAY_PUBLIC_URL).hostname;
	} catch {
		serviceHostname = "";
	}
	return resolveAllowedOrigin({
		origin,
		serviceHostname,
		explicitOrigins: allowedOrigins,
		allowLocalhost: env.IS_DEVELOPMENT,
	});
}

// Security headers middleware
app.use(
	"*",
	secureHeaders({
		contentSecurityPolicy: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			imgSrc: ["'self'", "data:", "https:"],
			connectSrc: ["'self'", env.GATEWAY_PUBLIC_URL],
			fontSrc: ["'self'"],
			objectSrc: ["'none'"],
			mediaSrc: ["'self'"],
			frameSrc: ["'none'"],
		},
		strictTransportSecurity: "max-age=31536000; includeSubDomains",
		xFrameOptions: "DENY",
		xContentTypeOptions: "nosniff",
		referrerPolicy: "strict-origin-when-cross-origin",
		permissionsPolicy: {
			camera: ["none"],
			microphone: ["none"],
			geolocation: ["none"],
		},
	}),
);

const CORS_ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_ALLOW_HEADERS =
	"Content-Type, Authorization, X-Nube-Service-Token, X-Nube-CSRF-Token, X-Nube-S2S-Token, X-Nube-Project-Id";

function originMatchesPattern(origin: string, pattern: string): boolean {
	// Bare wildcard — allow any origin (we still echo the exact origin,
	// not "*", so credentials: "include" keeps working).
	if (pattern === "*") return true;
	if (pattern === origin) return true;
	if (pattern.startsWith("*.")) {
		const domain = pattern.slice(2);
		return origin.endsWith(`.${domain}`) || origin === `https://${domain}` || origin === `http://${domain}`;
	}
	return false;
}

// Resolve app ID from query param (?app=), X-App-ID header, or hostname.
// Must run before CORS so per-app origin lookups have appId in context.
app.use("*", appResolverMiddleware);

// Trusted-backend validation — checks X-Nube-App-Secret against the app's
// stored clientSecret (cached in Redis for 5 min). When valid, marks the
// request as trustedBackend in context, which exempts it from rate limiting.
// This enables a Cloudflare WAF bypass rule: requests carrying a valid secret
// skip Bot Management, allowing server-side calls from Vercel to go through.
app.use("*", async (c, next) => {
	const secretHeader = c.req.header("x-nube-app-secret");
	if (secretHeader) {
		const appId = (c as any).get("appId") as string | undefined;
		if (appId) {
			try {
				const stored = await getClientSecretHash(appId);
				if (stored.hash && stored.isActive && presentedSecretMatches(secretHeader, stored)) {
					(c as any).set("trustedBackend", true);
					log.debug({ appId }, "Trusted backend authenticated via app secret");
				}
			} catch (error) {
				// Non-fatal — request proceeds without trustedBackend privileges
				log.warn(
					{ err: error instanceof Error ? error.message : String(error), appId },
					"App secret validation error",
				);
			}
		}
	}
	return next();
});

// CORS — supports both hardcoded gateway origins and per-app origins stored in the DB.
// Per-app lookup requires the app_id to be resolved by appResolverMiddleware first
// (query param ?app=<id> or X-App-ID header). The NubeAuth client passes ?app= on
// /v1/auth/token so the OPTIONS preflight (which has no body) is also resolved correctly.
app.use("*", async (c, next) => {
	const origin = c.req.header("origin");

	// Same-origin requests have no Origin header — allow them through.
	if (!origin) return next();

	const setHeaders = (allowedOrigin: string) => {
		c.header("Access-Control-Allow-Origin", allowedOrigin);
		c.header("Access-Control-Allow-Credentials", "true");
		c.header("Access-Control-Allow-Methods", CORS_ALLOW_METHODS);
		c.header("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
		c.header("Access-Control-Expose-Headers", "Set-Cookie");
		c.header("Access-Control-Max-Age", "86400");
	};

	// Fast path: hardcoded + gateway-subdomain origins.
	const fastAllowed = getAllowedOriginOrNull(origin);
	if (fastAllowed) {
		setHeaders(fastAllowed);
		if (c.req.method === "OPTIONS") return c.body(null, 204);
		return next();
	}

	// Slow path: look up per-app CORS origins from cache (read-through to Core, 1 hour TTL).
	// appResolverMiddleware must have already run and set appId in context.
	const appId = (c as any).get("appId") as string | undefined;
	if (appId) {
		try {
			const settings = await getAppSecuritySettings(appId);
			const corsOrigins = settings?.corsOrigins ?? [];
			if (corsOrigins.some((p) => originMatchesPattern(origin, p))) {
				setHeaders(origin);
				if (c.req.method === "OPTIONS") return c.body(null, 204);
				return next();
			}
		} catch (error) {
			log.error({ err: error, appId }, "CORS: failed to look up app origins");
		}
	}

	// Origin not allowed — reject preflight silently, let POST through without
	// CORS headers so the browser blocks it on its end (standard behavior).
	if (c.req.method === "OPTIONS") return c.body(null, 204);
	return next();
});

// Allowed Hosts — server-side enforcement of per-app allowedHosts on auth/me routes.
// Complements CORS by validating the caller's hostname even for non-browser clients.
// Skipped when app has no allowedHosts configured (opt-in).
app.use("*", allowedHostsMiddleware);

// HTTP request logging
app.use("*", httpLogger(log));

// Auth middleware (applies to protected routes)
app.use("*", authMiddleware);

// CSRF Protection for admin routes (state-changing operations)
// This validates the CSRF token from cookie matches the header
app.use("/v1/admin/*", csrfProtection);

// Rate limiting
// Apply generous rate limiting to status check (read-only, frequently called)
app.use("/v1/auth/status", rateLimitPresets.public);

// Apply strict rate limiting to auth endpoints (after status to avoid override)
app.use("/v1/auth/*", rateLimitPresets.auth);

// Apply standard rate limiting to API endpoints
app.use("/v1/admin/*", rateLimitPresets.api);
app.use("/v1/me/*", rateLimitPresets.api);
app.use("/v1/payment/*", rateLimitPresets.api);
app.use("/v1/license/*", rateLimitPresets.api);
app.use("/v1/app/*", rateLimitPresets.api);

// Routes
app.route("/v1/auth", authRoutes);
app.route("/v1/me", meRoutes);
app.route("/v1/admin", adminRoutes);
app.route("/v1/app", appCatalogRoutes);
app.route("/v1/payment", paymentsRoutes);
app.route("/v1/license", licenseRoutes);
// S2S routes — protected by X-Nube-Service-Token header
app.use("/v1/s2s/*", s2sAuthMiddleware);
app.route("/v1/s2s", s2sRoutes);
// Debug routes only available in non-production environments
if (process.env["NODE_ENV"] === "development") {
	app.route("/v1/debug", debugRoutes);
}

async function coreReady(): Promise<boolean> {
	try {
		const response = await fetch(`${env.CORE_URL}/ready`, { signal: AbortSignal.timeout(2000) });
		return response.ok;
	} catch {
		return false;
	}
}

async function dependencySnapshot() {
	const [redisOk, coreOk] = await Promise.all([pingCache().catch(() => false), coreReady()]);
	if (redisOk) isReady.redis = true;
	if (coreOk) isReady.core = true;
	const ready = isReady.core && isReady.redis;
	return {
		ready,
		body: {
			service: "gateway",
			core: coreOk ? "ok" : "unreachable",
			redis: redisOk ? "ok" : "unreachable",
			timestamp: new Date().toISOString(),
		},
	};
}

app.get("/live", (c) => c.json({ service: "gateway", status: "live", timestamp: new Date().toISOString() }));
app.get("/ready", async (c) => {
	const snapshot = await dependencySnapshot();
	return c.json({ ...snapshot.body, status: snapshot.ready ? "ok" : "starting" }, snapshot.ready ? 200 : 503);
});
app.get("/health", async (c) => {
	const snapshot = await dependencySnapshot();
	return c.json({ ...snapshot.body, status: snapshot.ready ? "ok" : "starting" });
});

// 404
app.notFound((c) => {
	log.warn({ path: c.req.path, method: c.req.method }, "Route not found");
	return c.json({ error: "Not found" }, 404);
});

// Error handler with production sanitization
app.onError((err, c) => {
	const isProduction = env.NODE_ENV === "production";

	// Log the full error internally
	log.error(
		{
			err: serializeError(err),
			path: c.req.path,
			method: c.req.method,
		},
		"Unhandled error",
	);

	// Sanitize error message for production
	const errorMessage = isProduction ? "Internal server error" : err.message || "Internal server error";

	return c.json({ error: errorMessage }, 500);
});

// ── Start HTTP server immediately ─────────────────────────────────────────────
// Railway health checks fire on a 30s start-period timer. If we wait for
// Redis warmup before binding the port, the container exceeds the start-period
// and gets marked unhealthy. Start the server first, then warm up Redis
// asynchronously so health checks succeed early.
const port = env.GATEWAY_PORT;
log.info({ port }, "Gateway server starting");

serve({
	fetch: app.fetch,
	port,
});

log.info({ port, url: `http://localhost:${port}` }, "Gateway server running");

// ── Background initialization ─────────────────────────────────────────────────
// Warm up Redis connection — non-fatal, /health will report degraded until ready.
async function initialize(): Promise<void> {
	try {
		isReady.redis = await pingCache();
		if (isReady.redis) {
			log.info("Redis connection verified");
		} else {
			log.warn("Redis not reachable at startup — will retry on first request");
		}
	} catch (error) {
		log.warn({ err: serializeError(error as Error) }, "Redis ping failed at startup");
	}

	try {
		isReady.core = await coreReady();
		if (isReady.core) {
			log.info("Core readiness verified");
		} else {
			log.warn("Core is not ready at startup — will retry on health check");
		}
	} catch (error) {
		log.warn({ err: serializeError(error as Error) }, "Core readiness check failed at startup");
	}
}

void initialize();

export default app;
export { log };
