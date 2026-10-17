import { Hono } from "hono";
import { loginRoutes } from "./auth/login";
import { oauthRoutes } from "./auth/oauth";
import { sessionRoutes } from "./auth/sessions";

export const authRoutes = new Hono();

authRoutes.route("/", oauthRoutes);
authRoutes.route("/", loginRoutes);
authRoutes.route("/", sessionRoutes);
