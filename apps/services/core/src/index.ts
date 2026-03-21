import { serve } from "@hono/node-server";
import { runMigrations } from "@nube-auth/db";
import { initCache, pingCache } from "@nube-auth/cache";
import { createLogger, serializeError } from "@nube-auth/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error";
import { httpLogger, requestIdMiddleware } from "./middleware/logger";
import { s2sMiddleware } from "./middleware/s2s";
import { adminRoutes } from "./routes/v1/admin";
import { authRoutes } from "./routes/v1/auth";
import { billingRoutes } from "./routes/v1/billing";
import { emailRoutes } from "./routes/v1/email";
import { licenseRoutes } from "./routes/v1/license";
import { subscriptionRoutes } from "./routes/v1/subscription";

// Initialize cache with the validated Redis URL from env.ts before any cache operations
initCache(env.REDIS_URL);

const log = createLogger("core");
const app = new Hono();

// Readiness state — gates the /health endpoint
const isReady = { db: false, redis: false };

// Global middleware - CORS with credentials support
app.use(
	"*",
	cors({
		origin: (origin: string | undefined) => {
			// Allow requests with no origin (e.g., same-origin, server-to-server)
			if (!origin) return "*";
			// Allow localhost for development
			if (origin.startsWith("http://localhost:")) return origin;
			// Allow nubeauth.com domains
			if (origin.endsWith(".nubeauth.com")) return origin;
			return null;
		},
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "X-Nube-Service-Token", "X-Nube-S2S-Token", "X-Nube-User-Id", "X-Nube-Session-Id", "X-Nube-Project-Id"],
		exposeHeaders: ["Set-Cookie"],
	}),
);

app.use("*", httpLogger(log));
app.use("*", requestIdMiddleware);

// S2S authentication — protect all service-to-service routes
app.use("/v1/auth/*", s2sMiddleware);
app.use("/v1/billing/*", s2sMiddleware);
app.use("/v1/email/*", s2sMiddleware);
app.use("/v1/license/*", s2sMiddleware);
app.use("/v1/subscription/*", s2sMiddleware);
app.use("/v1/admin/*", s2sMiddleware);

// Routes
app.route("/v1/auth", authRoutes);
app.route("/v1/billing", billingRoutes);
app.route("/v1/email", emailRoutes);
app.route("/v1/license", licenseRoutes);
app.route("/v1/subscription", subscriptionRoutes);
app.route("/v1/admin", adminRoutes);

// Health check — returns 503 until DB migrations and Redis are ready
app.get("/health", async (c) => {
	const redisOk = await pingCache();
	if (redisOk) isReady.redis = true;
	const ready = isReady.db && isReady.redis;
	return c.json(
		{
			service: "core",
			status: ready ? "ok" : "starting",
			db: isReady.db ? "ok" : "not_ready",
			redis: redisOk ? "ok" : "unreachable",
			timestamp: new Date().toISOString(),
		},
		ready ? 200 : 503,
	);
});

// Error handling
app.onError((err, c) => {
	log.error({ err: serializeError(err), path: c.req.path }, "Unhandled error");
	return errorHandler(err, c);
});

// Run DB migrations before starting
try {
	await runMigrations();
	isReady.db = true;
} catch (err) {
	log.error({ err: serializeError(err as Error) }, "Database migration failed — exiting");
	process.exit(1);
}

// Warm up Redis connection — non-fatal, /health will report degraded if unreachable
try {
	isReady.redis = await pingCache();
	if (isReady.redis) {
		log.info("Redis connection verified");
	} else {
		log.warn("Redis not reachable at startup — will retry on first request");
	}
} catch (err) {
	log.warn({ err: serializeError(err as Error) }, "Redis ping failed at startup");
}

// Start server
const port = env.CORE_PORT;
log.info({ port }, "Core server starting");

const server = serve({
	fetch: app.fetch,
	port,
});

log.info({ port, url: `http://localhost:${port}` }, "Core server running");

// Graceful shutdown
process.on("SIGINT", async () => {
	log.info("Shutting down gracefully...");
	server.close(() => {
		log.info("Server shutdown complete");
		process.exit(0);
	});
});

process.on("SIGTERM", async () => {
	log.info("Shutting down gracefully...");
	server.close(() => {
		log.info("Server shutdown complete");
		process.exit(0);
	});
});

export default app;
export { log };
