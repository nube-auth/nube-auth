import { serve } from "@hono/node-server";
import { createLogger, serializeError } from "@proofa/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler } from "./middleware/error";
import { httpLogger, requestIdMiddleware } from "./middleware/logger";
import { adminRoutes } from "./routes/v1/admin";
import { authRoutes } from "./routes/v1/auth";
import { emailRoutes } from "./routes/v1/email";
import { licenseRoutes } from "./routes/v1/license";

const log = createLogger("core");
const app = new Hono();

// Global middleware
app.use("*", cors());
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
const port = Number.parseInt(process.env.PORT || "3003", 10);
log.info({ port }, "Core server starting");

serve({
	fetch: app.fetch,
	port,
});

log.info({ port, url: `http://localhost:${port}` }, "Core server running");

export default app;
export { log };
