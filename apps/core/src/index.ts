import { serve } from "@hono/node-server";
import { createLogger, serializeError } from "@proofa/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error";
import { httpLogger, requestIdMiddleware } from "./middleware/logger";
import { adminRoutes } from "./routes/v1/admin";
import { authRoutes } from "./routes/v1/auth";
import { emailRoutes } from "./routes/v1/email";
import { licenseRoutes } from "./routes/v1/license";

const log = createLogger("core");
const app = new Hono();

// Global middleware - CORS with credentials support
app.use(
	"*",
	cors({
		origin: (origin: string | undefined) => {
			// Allow requests with no origin (e.g., same-origin, server-to-server)
			if (!origin) return "*";
			// Allow localhost for development
			if (origin.startsWith("http://localhost:")) return origin;
			// Allow proofa.sh domains
			if (origin.endsWith(".proofa.sh")) return origin;
			return null;
		},
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "X-Proofa-Service-Token"],
		exposeHeaders: ["Set-Cookie"],
	}),
);

app.use("*", httpLogger(log));
app.use("*", requestIdMiddleware);

// Routes
app.route("/v1/auth", authRoutes);
app.route("/v1/email", emailRoutes);
app.route("/v1/license", licenseRoutes);
app.route("/v1/admin", adminRoutes);

// Health check
app.get("/health", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling
app.onError((err, c) => {
	log.error({ err: serializeError(err), path: c.req.path }, "Unhandled error");
	return errorHandler(err, c);
});

// Start server
const port = env.CORE_PORT;
log.info({ port }, "Core server starting");

serve({
	fetch: app.fetch,
	port,
});

log.info({ port, url: `http://localhost:${port}` }, "Core server running");

export default app;
export { log };
