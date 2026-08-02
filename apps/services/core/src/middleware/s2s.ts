import { timingSafeEqual } from "node:crypto";
import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context, Next } from "hono";
import { env } from "../config/env";

const log = createLogger("s2s-middleware");

/**
 * S2S token validation middleware
 * Validates server-to-server authentication tokens for gateway communication
 *
 * Security: Uses constant-time comparison to prevent timing attacks
 * Tracking: https://github.com/0xdps/nube-auth/issues/43
 */
export async function s2sMiddleware(c: Context, next: Next): Promise<Response | undefined> {
	try {
		const s2sToken = c.req.header("x-nube-s2s-token");

		if (!s2sToken) {
			log.warn({ path: c.req.path }, "Missing S2S token");
			return c.json({ error: "Missing S2S token" }, 401);
		}

		// Validate S2S token against environment secret
		// Use constant-time comparison to prevent timing attacks
		const expectedToken = env.S2S_SECRET;

		if (!expectedToken) {
			log.error("S2S_SECRET not configured in environment");
			return c.json({ error: "S2S authentication not configured" }, 500);
		}

		// Ensure both tokens are the same length before comparing
		if (s2sToken.length !== expectedToken.length) {
			log.warn({ tokenLength: s2sToken.length, path: c.req.path }, "Invalid S2S token length");
			return c.json({ error: "Invalid S2S token" }, 401);
		}

		// Constant-time comparison to prevent timing attacks
		try {
			const tokenBuffer = Buffer.from(s2sToken, "utf8");
			const expectedBuffer = Buffer.from(expectedToken, "utf8");

			if (!timingSafeEqual(tokenBuffer, expectedBuffer)) {
				log.warn({ path: c.req.path }, "Invalid S2S token");
				return c.json({ error: "Invalid S2S token" }, 401);
			}
		} catch (error) {
			log.warn({ err: serializeError(error as Error), path: c.req.path }, "S2S token comparison failed");
			return c.json({ error: "Invalid S2S token" }, 401);
		}

		// Token is valid - add S2S context to request
		(c as any).s2sTokenValid = true;

		log.debug({ path: c.req.path }, "S2S authentication successful");

		await next();
		return;
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "S2S middleware error");
		return c.json({ error: "S2S authentication failed" }, 500);
	}
}
