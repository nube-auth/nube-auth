/**
 * App Catalog Routes — /v1/app/:appId/...
 *
 * Authenticated by the app secret. The rows are read by Core.
 */

import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { coreClient } from "../lib/core-client";
import { appSecretMiddleware } from "../middleware/appSecret.js";

const log = createLogger("app-catalog-routes");
export const appCatalogRoutes = new Hono();

appCatalogRoutes.use("/:appId/*", appSecretMiddleware);

async function proxy(c: Context, path: string, failure: string) {
	try {
		const query = new URL(c.req.url).search;
		const result = await coreClient.edge<Record<string, unknown>>("GET", `${path}${query}`);
		if (result.status >= 500) return c.json({ error: failure }, 500);
		return c.json(result.data, result.status as ContentfulStatusCode);
	} catch (error) {
		log.error({ err: serializeError(error as Error), path }, failure);
		return c.json({ error: failure }, 500);
	}
}

appCatalogRoutes.get("/:appId/plans", (c) =>
	proxy(c, `/v1/edge/apps/${encodeURIComponent(c.req.param("appId"))}/plans`, "Failed to get plans"),
);

appCatalogRoutes.get("/:appId/plans/:planId/prices", (c) =>
	proxy(
		c,
		`/v1/edge/apps/${encodeURIComponent(c.req.param("appId"))}/plans/${encodeURIComponent(c.req.param("planId"))}/prices`,
		"Failed to get prices",
	),
);

appCatalogRoutes.get("/:appId/users", (c) =>
	proxy(c, `/v1/edge/apps/${encodeURIComponent(c.req.param("appId"))}/users`, "Failed to list users"),
);

appCatalogRoutes.get("/:appId/users/:userId/license", (c) =>
	proxy(
		c,
		`/v1/edge/apps/${encodeURIComponent(c.req.param("appId"))}/users/${encodeURIComponent(c.req.param("userId"))}/license`,
		"Failed to get user license",
	),
);

appCatalogRoutes.get("/:appId/users/:userId", (c) =>
	proxy(
		c,
		`/v1/edge/apps/${encodeURIComponent(c.req.param("appId"))}/users/${encodeURIComponent(c.req.param("userId"))}`,
		"Failed to get user",
	),
);
