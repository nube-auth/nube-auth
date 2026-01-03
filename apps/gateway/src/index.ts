import { serve } from "@hono/node-server";
import { createLogger, serializeError } from "@proofa/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env";
import { secureHeaders } from "hono/secure-headers";
import { authMiddleware } from "./middleware/auth";
import { csrfProtection } from "./middleware/csrf";
import { httpLogger } from "./middleware/logger";
import { rateLimitPresets } from "./middleware/rateLimit";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";

const log = createLogger("gateway");
const app = new Hono();

// CORS configuration for cross-subdomain requests with credentials
const allowedOrigins = [
	"http://localhost:5173",
	"http://localhost:5174",
	"https://user.proofa.sh",
	"https://manage.proofa.sh",
	"https://proofa.sh",
];

// Security headers middleware
app.use(
	"*",
	secureHeaders({
		contentSecurityPolicy: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			imgSrc: ["'self'", "data:", "https:"],
			connectSrc: ["'self'", "https://api.proofa.sh"],
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

// CORS configuration
app.use(
	"*",
	cors({
		origin: (origin) => {
			// Allow requests with no origin (e.g., same-origin, curl)
			if (!origin) return "*";
			// Check if origin is in allowed list
			if (allowedOrigins.includes(origin)) return origin;
			// Allow any *.proofa.sh subdomain
			if (origin.endsWith(".proofa.sh")) return origin;
			return null;
		},
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "X-Proofa-Service-Token", "X-CSRF-Token"],
		exposeHeaders: ["Set-Cookie"],
	}),
);

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

// Routes
app.route("/v1/auth", authRoutes);
app.route("/v1/me", meRoutes);
app.route("/v1/admin", adminRoutes);

// Health check
app.get("/health", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() });
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

// Start server
const port = env.GATEWAY_PORT;
log.info({ port }, "Gateway server starting");

serve({
	fetch: app.fetch,
	port,
});

log.info({ port, url: `http://localhost:${port}` }, "Gateway server running");

export default app;
export { log };
