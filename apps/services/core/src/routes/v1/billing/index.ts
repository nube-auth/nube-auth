/**
 * Billing Routes Index
 *
 * Combines all billing-related routes
 */

import { Hono } from "hono";
import { checkoutRoutes } from "./checkout.js";
import { webhookRoutes } from "./webhooks.js";

export const billingRoutes = new Hono();

// Mount sub-routes
billingRoutes.route("/checkout", checkoutRoutes);
billingRoutes.route("/webhooks", webhookRoutes);
