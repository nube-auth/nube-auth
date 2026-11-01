import crypto from "node:crypto";
import { pingpong } from "@nube-auth/auth";
import { cache, sessionStore } from "@nube-auth/cache";
import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { EXCHANGE_CODE_TTL, SESSION_ID_BYTES, SESSION_TTL } from "../config/constants";
import { env } from "../config/env";

const log = createLogger("email-routes");

export const emailRoutes = new Hono();

function getClientIp(c: Context): string {
	return (
		c.req.header("cf-connecting-ip") ||
		c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
		c.req.header("x-real-ip") ||
		"unknown"
	);
}

/**
 * POST /v1/email/start
 * Request OTP + magic link via email
 */
emailRoutes.post("/start", async (c: Context) => {
	try {
		const body = await c.req.json();
		const coreUrl = `${env.CORE_URL}/v1/email/start`;

		const response = await pingpong(coreUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Nube-S2S-Token": env.S2S_SECRET,
				"X-Nube-Gateway-Url": env.GATEWAY_PUBLIC_URL,
				...(c.req.header("cf-connecting-ip") ? { "CF-Connecting-IP": c.req.header("cf-connecting-ip")! } : {}),
				...(c.req.header("x-forwarded-for") ? { "X-Forwarded-For": c.req.header("x-forwarded-for")! } : {}),
				...(c.req.header("user-agent") ? { "User-Agent": c.req.header("user-agent")! } : {}),
			},
			body,
		});

		return c.json(response.data, response.status as ContentfulStatusCode);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Email start proxy error");
		return c.json({ error: "Email service unavailable" }, 502);
	}
});

/**
 * POST /v1/email/verify
 * Verify OTP, create app session and exchange code
 */
emailRoutes.post("/verify", async (c: Context) => {
	try {
		const body = await c.req.json<{
			email?: string;
			otp?: string;
			appId?: string;
			name?: string;
		}>();
		const coreUrl = `${env.CORE_URL}/v1/email/verify`;

		const response = await pingpong(coreUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Nube-S2S-Token": env.S2S_SECRET,
				...(c.req.header("cf-connecting-ip") ? { "CF-Connecting-IP": c.req.header("cf-connecting-ip")! } : {}),
				...(c.req.header("x-forwarded-for") ? { "X-Forwarded-For": c.req.header("x-forwarded-for")! } : {}),
				...(c.req.header("user-agent") ? { "User-Agent": c.req.header("user-agent")! } : {}),
			},
			body,
		});

		if (!response.ok()) {
			return c.json(response.data, response.status as ContentfulStatusCode);
		}

		const data = response.data as {
			sessionId: string;
			userId: string;
			email: string;
		};

		const targetAppId = body.appId || "default-tamer";
		const ipAddress = getClientIp(c);
		const userAgent = c.req.header("user-agent") || "unknown";

		// Create Gateway App Session in Redis
		const appSessionToken = crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
		await sessionStore.setAppSession(appSessionToken, data.userId, targetAppId, SESSION_TTL, {
			coreSessionId: data.sessionId,
			sessionType: "app",
			createdAt: Date.now(),
			lastActivityAt: Date.now(),
			ipAddress,
			userAgent,
		});

		// Create single-use exchange code
		const exchangeCode = crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
		await cache.set(
			`exchange:${exchangeCode}`,
			{
				sessionToken: appSessionToken,
				appId: targetAppId,
			},
			EXCHANGE_CODE_TTL,
		);

		return c.json({
			sessionToken: appSessionToken,
			exchangeCode,
			userId: data.userId,
			email: data.email,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Email verify proxy error");
		return c.json({ error: "Verification service unavailable" }, 502);
	}
});

/**
 * GET /v1/email/magic
 * Handle magic link click: verify token, create app session, and redirect with code
 */
emailRoutes.get("/magic", async (c: Context) => {
	const token = c.req.query("token");
	const queryRedirectUrl = c.req.query("redirectUrl");

	if (!token) {
		return c.json({ error: "Missing token" }, 400);
	}

	try {
		const coreUrl = `${env.CORE_URL}/v1/email/verify-magic`;
		const response = await pingpong(coreUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Nube-S2S-Token": env.S2S_SECRET,
				...(c.req.header("cf-connecting-ip") ? { "CF-Connecting-IP": c.req.header("cf-connecting-ip")! } : {}),
				...(c.req.header("x-forwarded-for") ? { "X-Forwarded-For": c.req.header("x-forwarded-for")! } : {}),
				...(c.req.header("user-agent") ? { "User-Agent": c.req.header("user-agent")! } : {}),
			},
			body: { token },
		});

		if (!response.ok()) {
			const fallbackRedirect = queryRedirectUrl || env.FRONTEND_URL;
			if (fallbackRedirect) {
				const delim = fallbackRedirect.includes("?") ? "&" : "?";
				return c.redirect(`${fallbackRedirect}${delim}error=invalid_magic_link`);
			}
			return c.json(response.data, response.status as ContentfulStatusCode);
		}

		const data = response.data as {
			sessionId: string;
			userId: string;
			email: string;
			appId?: string;
			redirectUrl?: string;
		};

		const targetAppId = data.appId || "default-tamer";
		const ipAddress = getClientIp(c);
		const userAgent = c.req.header("user-agent") || "unknown";

		// Create Gateway App Session in Redis
		const appSessionToken = crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
		await sessionStore.setAppSession(appSessionToken, data.userId, targetAppId, SESSION_TTL, {
			coreSessionId: data.sessionId,
			sessionType: "app",
			createdAt: Date.now(),
			lastActivityAt: Date.now(),
			ipAddress,
			userAgent,
		});

		// Create single-use exchange code
		const exchangeCode = crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
		await cache.set(
			`exchange:${exchangeCode}`,
			{
				sessionToken: appSessionToken,
				appId: targetAppId,
			},
			EXCHANGE_CODE_TTL,
		);

		const targetRedirect = data.redirectUrl || queryRedirectUrl || env.FRONTEND_URL;
		const delim = targetRedirect.includes("?") ? "&" : "?";
		return c.redirect(`${targetRedirect}${delim}code=${exchangeCode}`);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Magic link handler error");
		return c.json({ error: "Magic link service unavailable" }, 502);
	}
});
