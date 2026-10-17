import { Hono } from "hono";
import { codeRoutes } from "./codes.js";
import { providerRefRoutes } from "./provider-refs.js";
import { recordRoutes } from "./record.js";
import { redemptionRoutes } from "./redemptions.js";

export const promotionsRouter = new Hono();

promotionsRouter.route("/", recordRoutes);
promotionsRouter.route("/", codeRoutes);
promotionsRouter.route("/", providerRefRoutes);
promotionsRouter.route("/", redemptionRoutes);
