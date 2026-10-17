/**
 * Payment Testing Playground Routes
 * Admin-only endpoints for testing payment flows without manual setup
 */

import { appQueries, getDb, testSessionQueries } from "@nube-auth/db";
import { serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";

import { assertProjectAdmin, log } from "./shared.js";

const cleanupRoutes = new Hono();

/**
 * DELETE /v1/admin/test/cleanup
 * Cleanup test data (manual trigger)
 */
cleanupRoutes.delete("/cleanup", async (c: Context) => {
	try {
		const { sessionId, all } = c.req.query();

		const db = getDb();

		if (sessionId) {
			// Delete specific session
			const session = await testSessionQueries.findByPublicId(db, sessionId);
			if (!session) {
				return c.json({ error: "Session not found" }, 404);
			}
			const testApp = session.test_app_id ? await appQueries.findByInternalId_(db, session.test_app_id) : null;
			const callerId = c.req.header("X-Nube-User-Id");
			if (!testApp || !callerId || !(await assertProjectAdmin(db, callerId, testApp.project_id))) {
				return c.json({ error: "Forbidden" }, 403);
			}

			await testSessionQueries.delete(db, session.id);

			return c.json({
				success: true,
				deleted: {
					sessions: 1,
				},
			});
		}

		if (all === "true") {
			return c.json({ error: "Global test cleanup is disabled" }, 403);
		}

		return c.json({ error: "Must provide sessionId" }, 400);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to cleanup test data");
		return c.json({ error: "Failed to cleanup test data" }, 500);
	}
});

export { cleanupRoutes };
