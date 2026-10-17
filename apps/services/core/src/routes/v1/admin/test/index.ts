/**
 * Payment Testing Playground Routes
 * Admin-only endpoints for testing payment flows without manual setup
 */
import { Hono } from "hono";
import { cleanupRoutes } from "./cleanup.js";
import { initializeRoutes } from "./initialize.js";
import { providerRoutes } from "./providers.js";
import { simulateRoutes } from "./simulate-webhook.js";
import { statusRoutes } from "./status.js";

export const testRouter = new Hono();

testRouter.route("/", initializeRoutes);
testRouter.route("/", simulateRoutes);
testRouter.route("/", statusRoutes);
testRouter.route("/", cleanupRoutes);
testRouter.route("/", providerRoutes);
