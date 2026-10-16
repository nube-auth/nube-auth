import { getDb, userQueries } from "@nube-auth/db";
import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";

const log = createLogger("admin-me");
export const adminMeRouter = new Hono();

adminMeRouter.get("/me", async (c: Context) => {
	try {
		const userId = c.req.header("X-Nube-User-Id");
		if (!userId) return c.json({ error: "Unauthorized" }, 401);

		const user = await userQueries.findByPublicId(getDb(), userId);
		if (!user) return c.json({ error: "User not found" }, 404);

		return c.json({
			id: user.public_id,
			email: user.primary_email,
			name: user.name,
			createdAt: user.created_at ? new Date(user.created_at).toISOString() : null,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get admin profile error");
		return c.json({ error: "Failed to get profile" }, 500);
	}
});
