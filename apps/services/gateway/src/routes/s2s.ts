/**
 * S2S Routes — service-to-service operations for trusted backend callers.
 * All routes under /v1/s2s/* require a valid X-Nube-Service-Token header
 * (enforced by the s2sAuthMiddleware mounted in index.ts).
 */

import { getDb, userQueries } from "@nube-auth/db";
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

		// Idempotent upsert: find existing user by email first
		const existing = await userQueries.findByEmail(db, body.email);
		if (existing) {
			log.debug({ email: body.email, userId: existing.public_id }, "Provision: returning existing user");
			return c.json({ ok: true, data: { userId: existing.public_id } });
		}

		// Create new user
		const publicId = createId("user");
		await userQueries.create(db, {
			public_id: publicId,
			primary_email: body.email.toLowerCase(),
			primary_email_verified: true,
			name: body.name ?? null,
			avatar_url: body.avatarUrl ?? null,
		});

		log.info({ email: body.email, userId: publicId }, "Provision: created new user");
		return c.json({ ok: true, data: { userId: publicId } }, 201);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Provision user error");
		return c.json({ ok: false, error: "Failed to provision user" }, 500);
	}
});
