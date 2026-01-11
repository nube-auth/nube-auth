/**
 * Admin Routes
 * Proxy to Core service with S2S authentication
 */

import { getDb, userQueries } from "@proofa/db";
import { createLogger, serializeError } from "@proofa/shared";
import { pingpong } from "@proofa/auth";
import type { Context } from "hono";
import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { env } from "../config/env";
import { getAuth } from "../middleware/auth";

const log = createLogger("admin-routes");

export const adminRoutes = new Hono();

/**
 * GET /v1/admin/me
 * Get current admin profile
 */
adminRoutes.get("/me", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const db = getDb();

		// Fetch user from database to get full profile
		const user = await userQueries.findByPublicId(db, auth.userId);
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		return c.json({
			id: auth.userId,
			email: auth.email,
			name: auth.name,
			createdAt: user.created_at ? new Date(user.created_at).toISOString() : null,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get admin profile error");
		return c.json({ error: "Failed to get profile" }, 500);
	}
});

// Proxy all other admin routes to Core service
adminRoutes.all("/*", async (c: Context) => {
	try {
		const auth = getAuth(c);
		const method = c.req.method;
		const path = c.req.path; // Already has /v1/admin prefix
		
		log.debug({ method, path, userId: auth.userId }, "Proxying to Core service");
		
		// Get request body if present
		let body: any = undefined;
		if (["POST", "PUT", "PATCH"].includes(method)) {
			try {
				body = await c.req.json();
			} catch (e) {
				// No body or invalid JSON
				log.debug("No body in request");
			}
		}

		// Make request to Core service - remove /v1/admin prefix and let core handle /v1/admin routes
		const corePath = path; // Keep the full path as Core expects /v1/admin/...
		const coreUrl = `${env.CORE_URL}${corePath}`;
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"X-S2S-Token": env.S2S_SECRET,
			"X-User-Id": auth.userId, // Send public user ID
			"X-Session-Id": auth.coreSessionId || "",
		};



		// Pass through x-project-id header if present (needed for authorization checks)
		const projectId = c.req.header("x-project-id");
		if (projectId) {
			headers["X-Project-Id"] = projectId;
		}

		// Add query parameters if present
		const url = new URL(coreUrl);
		const queryString = c.req.url.split("?")[1];
		if (queryString) {
			url.search = `?${queryString}`;
		}

		log.debug({ url: url.toString(), headers }, "Making request to Core");

		const response = await pingpong(url.toString(), {
			method,
			headers,
			...(body ? { body } : {}),
		});

		log.debug({ status: response.status }, "Response from Core");
		return c.newResponse(JSON.stringify(response.data), response.status as StatusCode, {
			"content-type": "application/json",
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error), stack: (error as Error).stack }, "Admin proxy error");
		return c.json({ error: "Internal server error" }, 500);
	}
});
