import { createLogger } from "@proofa/shared";
import type { Context, Next } from "hono";

const log = createLogger("cors");

/**
 * CORS middleware with app-level origin validation
 * Checks the app's allowed origins configuration from database
 */
export function corsMiddleware(options: {
	/** Fallback origins if no app-specific config */
	defaultOrigins?: string[];
	/** Whether to allow credentials */
	credentials?: boolean;
	/** Allowed HTTP methods */
	methods?: string[];
	/** Allowed headers */
	headers?: string[];
}) {
	const {
		defaultOrigins = [],
		credentials = true,
		methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		headers = ["Content-Type", "Authorization", "X-Proofa-Service-Token"],
	} = options;

	return async (c: Context, next: Next) => {
		const origin = c.req.header("origin");
		const appId = c.get("appId") as string | undefined;

		// Allow requests with no origin (same-origin, curl, etc.)
		if (!origin) {
			await next();
			return;
		}

		let allowedOrigins: string[] = defaultOrigins;

		// Check app-specific CORS configuration if app is identified
		if (appId) {
			try {
				const appOrigins = c.get("appCorsOrigins") as string[] | undefined;
				if (appOrigins && appOrigins.length > 0) {
					allowedOrigins = appOrigins;
					log.debug({ appId, allowedOrigins }, "Using app-specific CORS origins");
				}
			} catch (error) {
				log.error({ error, appId }, "Failed to get app CORS origins");
			}
		}

		// Check if origin is allowed
		const isAllowed = allowedOrigins.some((allowed) => {
			// Exact match
			if (allowed === origin) return true;
			// Wildcard subdomain match (e.g., *.example.com)
			if (allowed.startsWith("*.")) {
				const domain = allowed.slice(2);
				return origin.endsWith(`.${domain}`) || origin === `https://${domain}` || origin === `http://${domain}`;
			}
			return false;
		});

		if (!isAllowed) {
			log.warn({ origin, appId, allowedOrigins }, "CORS: Origin not allowed");
			return c.json(
				{
					ok: false,
					error: {
						code: "FORBIDDEN",
						message: "Origin not allowed by CORS policy",
					},
				},
				403,
			);
		}

		// Set CORS headers
		c.header("Access-Control-Allow-Origin", origin);
		if (credentials) {
			c.header("Access-Control-Allow-Credentials", "true");
		}
		c.header("Access-Control-Allow-Methods", methods.join(", "));
		c.header("Access-Control-Allow-Headers", headers.join(", "));
		c.header("Access-Control-Expose-Headers", "Set-Cookie");
		c.header("Access-Control-Max-Age", "86400"); // 24 hours

		// Handle preflight requests
		if (c.req.method === "OPTIONS") {
			return c.body(null, 204);
		}

		await next();
		return;
	};
}

/**
 * Helper to set app CORS origins in context
 * Should be called after app is identified
 */
export function setAppCorsOrigins(c: Context, origins: string[]) {
	c.set("appCorsOrigins", origins);
}
