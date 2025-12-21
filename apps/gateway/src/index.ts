import { serve } from "@hono/node-server";
import { createLogger, serializeError } from "@proofa/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth";
import { httpLogger } from "./middleware/logger";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";

const log = createLogger("gateway");
const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", httpLogger(log));

// Auth middleware (applies to protected routes)
app.use("*", authMiddleware);

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

// Error handler
app.onError((err, c) => {
	log.error({ err: serializeError(err), path: c.req.path }, "Unhandled error");
	return c.json({ error: "Internal server error" }, 500);
});

// Start server
const port = Number.parseInt(process.env.GATEWAY_PORT || "3004", 10);
log.info({ port }, "Gateway server starting");

serve({
	fetch: app.fetch,
	port,
});

log.info({ port, url: `http://localhost:${port}` }, "Gateway server running");

export default app;
export { log };
