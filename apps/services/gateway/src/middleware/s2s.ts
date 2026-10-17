import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { coreClient } from "../lib/core-client";

/**
 * Service-to-service authentication middleware.
 * Asks Core to resolve X-Nube-Service-Token to an app. The token is not logged.
 */
export const s2sAuthMiddleware = createMiddleware(async (c: Context, next: Next): Promise<Response | undefined> => {
	const token = c.req.header("X-Nube-Service-Token");
	if (!token) return c.json({ error: "Unauthorized" }, 401);

	const result = await coreClient.edge<{ appId: string }>("POST", "/v1/edge/service-token/resolve", { token });
	if (result.status !== 200 || !result.data.appId) return c.json({ error: "Unauthorized" }, 401);

	c.set("s2sApp", { publicId: result.data.appId });
	await next();
	return;
});
