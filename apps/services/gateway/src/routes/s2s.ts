/**
 * S2S Routes — service-to-service operations for trusted backend callers.
 * All routes under /v1/s2s/* require a valid X-Nube-Service-Token header.
 */

import { createLogger, serializeError } from "@nube-auth/shared";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { coreClient } from "../lib/core-client";

const log = createLogger("s2s-routes");

export const s2sRoutes = new Hono<{ Variables: { s2sApp: { publicId: string } } }>();

s2sRoutes.post("/users/provision", async (c) => {
	try {
		const body = await c.req.json<{
			email: string;
			name?: string;
			avatarUrl?: string;
		}>();

		if (!body.email || typeof body.email !== "string") {
			return c.json({ ok: false, error: "email is required" }, 400);
		}

		const s2sApp = c.get("s2sApp") as { publicId: string };
		const result = await coreClient.edge<{ userId: string; error?: string }>(
			"POST",
			`/v1/edge/apps/${encodeURIComponent(s2sApp.publicId)}/users/provision`,
			{
				email: body.email,
				...(body.name !== undefined ? { name: body.name } : {}),
				...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
			},
		);
		if (result.status !== 200 && result.status !== 201) {
			return c.json(
				{ ok: false, error: result.data.error ?? "Failed to provision user" },
				result.status as ContentfulStatusCode,
			);
		}
		return c.json({ ok: true, data: { userId: result.data.userId } }, result.status as ContentfulStatusCode);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Provision user error");
		return c.json({ ok: false, error: "Failed to provision user" }, 500);
	}
});
