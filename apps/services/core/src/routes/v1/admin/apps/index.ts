import { Hono } from "hono";
import { credentialRoutes } from "./credentials.js";
import { recordRoutes } from "./record.js";
import { userRoutes } from "./users.js";

export const appsRouter = new Hono();

appsRouter.route("/", recordRoutes);
appsRouter.route("/", userRoutes);
appsRouter.route("/", credentialRoutes);
