/**
 * S2S Routes — service-to-service operations for trusted backend callers.
 * All routes under /v1/s2s/* require a valid X-Nube-Service-Token header
 * (enforced by the s2sAuthMiddleware mounted in index.ts).
 */

import { getDb, userQueries, appUserQueries } from "@nube-auth/db";
import { createId, createLogger, serializeError } from "@nube-auth/shared";
import { Hono } from "hono";

const log = createLogger("s2s-routes");

export const s2sRoutes = new Hono();

/**
 * POST /v1/s2s/users/provision
 *
 * Idempotently provision a NubeAuth user from an external identity provider.
 * If a user with the given email already exists, returns their existing userId.
 * If not, creates a new user and returns the new userId.
 *
 * Body: { email: string, name?: string, avatarUrl?: string }
 * Response: { ok: true, data: { userId: string } }
 */
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

		const db = getDb();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const s2sApp = (c as any).get("s2sApp") as Record<string, unknown>;

		// 1. Find or create user by email
		let user = await userQueries.findByEmail(db, body.email);
		let created = false;

		if (!user) {
			const publicId = createId("user");
			user = await userQueries.create(db, {
				public_id: publicId,
				primary_email: body.email.toLowerCase(),
				primary_email_verified: true,
				name: body.name ?? null,
				avatar_url: body.avatarUrl ?? null,
			});
			created = true;
			log.info({ email: body.email, userId: publicId }, "Provision: created new user");
		} else {
			log.debug({ email: body.email, userId: user.public_id }, "Provision: returning existing user");
		}

		// 2. Ensure app_users link exists (upsert bumps last_seen_at on repeat calls)
		await appUserQueries.upsert(db, s2sApp["id"] as number, user.id);

		return c.json({ ok: true, data: { userId: user.public_id } }, created ? 201 : 200);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Provision user error");
		return c.json({ ok: false, error: "Failed to provision user" }, 500);
	}
});
