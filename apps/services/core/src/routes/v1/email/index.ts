import crypto from "node:crypto";
import { generateOTP, hashOTP, verifyOTP } from "@nube-auth/auth";
import { cache, rateLimit } from "@nube-auth/cache";
import {
	appQueries,
	appUserQueries,
	emailVerificationQueries,
	getDb,
	identityQueries,
	sessionQueries,
	userQueries,
} from "@nube-auth/db";
import { enqueueEmail } from "@nube-auth/queue";
import {
	createId,
	createLogger,
	OTP_LENGTH,
	OTP_LOCKOUT_MINUTES,
	OTP_MAX_ATTEMPTS,
	serializeError,
} from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { env } from "../../../config/env";
import { getClientCountry, getClientIp } from "../../../middleware/rateLimit";
import { ensureLicenseForApp } from "../../../utils/license";
import { enqueueSignupEmails } from "../../../utils/signup-email";

const log = createLogger("email-routes");

const router = new Hono();

/**
 * Shared logic to complete email authentication:
 * creates user if missing, ensures license, sets up app_user, and creates Core session.
 */
async function completeEmailAuth(
	db: ReturnType<typeof getDb>,
	email: string,
	name: string | undefined,
	appId: string | undefined,
	c: Context,
) {
	const now = new Date();
	const existingUser = await userQueries.findByEmail(db, email);
	let userId = existingUser?.id;
	let userPublicId = existingUser?.public_id;
	let isNewUser = false;

	if (!userId) {
		isNewUser = true;
		const newUser = await userQueries.create(db, {
			public_id: createId("user"),
			primary_email: email,
			name: name || email.split("@")[0] || email,
			avatar_url: null,
			created_at: now,
			updated_at: now,
		});
		userId = newUser.id;
		userPublicId = newUser.public_id;

		// Create identity for email-based auth
		await identityQueries.create(db, {
			public_id: createId("identity"),
			user_id: userId,
			provider: "email",
			provider_user_id: email,
			email,
			created_at: now,
		});
	}

	// Get or create identity
	let identity = await identityQueries.findByProviderUserId(db, "email", email);
	if (!identity) {
		identity = await identityQueries.create(db, {
			public_id: createId("identity"),
			user_id: userId,
			provider: "email",
			provider_user_id: email,
			email,
			created_at: now,
		});
	}

	// Capture IP address, user-agent, and location for session tracking
	const ipAddress = getClientIp(c);
	const userAgent = c.req.header("user-agent") || null;
	const country = getClientCountry(c);

	// Auto-provision free/default plan license if the app has one configured
	await ensureLicenseForApp(db, userId, appId);

	// Resolve app internal id for session scoping and app_users upsert
	let appInternalId: number | undefined;
	let resolvedAppName: string | undefined;
	if (appId) {
		try {
			const resolvedApp = await appQueries.findByPublicId(db, appId);
			appInternalId = resolvedApp?.id;
			resolvedAppName = resolvedApp?.name;
		} catch (appLookupError) {
			log.error({ err: serializeError(appLookupError as Error), appId }, "Failed to resolve app for email login");
		}
	}

	// Upsert persistent app_users record
	if (appInternalId !== undefined) {
		try {
			await appUserQueries.upsert(db, appInternalId, userId);
		} catch (appUserError) {
			log.error({ err: serializeError(appUserError as Error), appId }, "Failed to upsert app_user");
		}
	}

	// Create core session
	const sessionData = {
		public_id: createId("session"),
		user_id: userId,
		created_at: now,
		last_seen_at: now,
		expires_at: new Date(now.getTime() + env.SESSION_TTL_SECONDS * 1000),
		ip_address: ipAddress,
		user_agent: userAgent,
		country: country,
		...(appInternalId !== undefined && { app_id: appInternalId }),
	};

	const session = await sessionQueries.create(db, sessionData);

	// First-signup emails: Nube Auth account welcome + app-specific signup
	if (isNewUser) {
		enqueueSignupEmails({
			email,
			userName: name || email.split("@")[0] || email,
			appName: resolvedAppName,
		});
	}

	return {
		sessionId: session.public_id,
		userId: userPublicId as string,
		email,
	};
}

/**
 * POST /v1/email/start
 * Request OTP and magic link via email
 */
router.post("/start", async (c: Context) => {
	const { email, name, appId, redirectUrl } = (await c.req.json()) as {
		email?: string;
		name?: string;
		appId?: string;
		redirectUrl?: string;
	};

	if (!email?.includes("@")) {
		return c.json({ error: "Invalid email" }, 400);
	}

	// Rate limit: 5 OTP requests per email per hour (skip in development)
	if (!env.IS_DEVELOPMENT) {
		const allowed = await rateLimit.checkLimit(email, "otp_request", 5, 3600);
		if (!allowed) {
			return c.json({ error: "Too many OTP requests. Try again in 1 hour." }, 429);
		}
	}

	try {
		const db = getDb();
		const now = new Date();

		// Check if email has verification record and is locked out
		const emailVerification = await emailVerificationQueries.findByEmail(db, email);

		if (emailVerification?.locked_until && emailVerification.locked_until > now) {
			const remainingMinutes = Math.ceil((emailVerification.locked_until.getTime() - now.getTime()) / 60000);
			return c.json({ error: `Account locked. Try again in ${remainingMinutes} minutes.` }, 429);
		}

		// Generate OTP
		const otp = generateOTP();
		const otpHash = hashOTP(otp);
		const expiresAt = new Date(now.getTime() + env.EMAIL_CODE_TTL_SECONDS * 1000);

		// Save or update OTP record in DB
		if (emailVerification) {
			await emailVerificationQueries.update(db, emailVerification.id, {
				otp_hash: otpHash,
				expires_at: expiresAt,
				attempts: 0,
				locked_until: null,
			});
		} else {
			await emailVerificationQueries.create(db, {
				public_id: createId("emailVerification"),
				email,
				otp_hash: otpHash,
				expires_at: expiresAt,
				attempts: 0,
				locked_until: null,
				created_at: now,
			});
		}

		// Generate single-use magic link token and store in Redis
		const magicToken = crypto.randomBytes(32).toString("hex");
		await cache.set(
			`magic:${magicToken}`,
			{
				email,
				name,
				appId,
				redirectUrl,
			},
			env.EMAIL_CODE_TTL_SECONDS,
		);

		// Resolve app name if appId is provided
		let appName = "Default Tamer";
		if (appId) {
			try {
				const app = await appQueries.findByPublicId(db, appId);
				if (app?.name) appName = app.name;
			} catch {
				// use default app name
			}
		}

		// Construct magic link URL through Gateway
		const gatewayUrl = c.req.header("x-nube-gateway-url") || env.API_BASE_URL;
		const magicUrl = `${gatewayUrl}/v1/email/magic?token=${magicToken}`;

		// Send email with both OTP code and magic link button
		await enqueueEmail({
			to: email,
			templateSlug: "email-verify",
			variables: {
				name: name || email.split("@")[0] || "there",
				appName,
				otp,
				code: otp,
				verifyUrl: magicUrl,
				magicUrl,
				expiresIn: `${Math.ceil(env.EMAIL_CODE_TTL_SECONDS / 60)} minutes`,
				expiresInMinutes: Math.ceil(env.EMAIL_CODE_TTL_SECONDS / 60),
			},
		});

		return c.json({
			message: "Verification email sent",
			expiresIn: env.EMAIL_CODE_TTL_SECONDS,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Email start error");
		return c.json({ error: "Failed to send verification email" }, 500);
	}
});

/**
 * POST /v1/email/verify
 * Verify OTP and create session
 */
router.post("/verify", async (c: Context) => {
	const { email, otp, appId, name } = (await c.req.json()) as {
		email?: string;
		otp?: string;
		appId?: string;
		name?: string;
	};

	if (!email?.includes("@")) {
		return c.json({ error: "Invalid email" }, 400);
	}

	if (!otp || otp.length !== OTP_LENGTH) {
		return c.json({ error: `OTP must be ${OTP_LENGTH} digits` }, 400);
	}

	// Rate limit: 5 OTP verification attempts per email per 5 minutes (skip in development)
	if (!env.IS_DEVELOPMENT) {
		const allowed = await rateLimit.checkLimit(email, "otp_verify", 5, 300);
		if (!allowed) {
			return c.json({ error: "Too many OTP attempts. Try again later." }, 429);
		}
	}

	try {
		const db = getDb();
		const now = new Date();

		const emailVerification = await emailVerificationQueries.findByEmail(db, email);

		if (!emailVerification) {
			return c.json({ error: "No OTP request found" }, 404);
		}

		// Check if locked out
		if (emailVerification.locked_until && emailVerification.locked_until > now) {
			return c.json({ error: "Account locked. Try again later." }, 429);
		}

		// Check if OTP expired
		if (emailVerification.expires_at < now) {
			return c.json({ error: "OTP expired" }, 401);
		}

		// Verify OTP
		const otpValid = verifyOTP(otp, emailVerification.otp_hash);

		if (!otpValid) {
			// Increment attempts
			const newAttempts = (emailVerification.attempts || 0) + 1;

			if (newAttempts >= OTP_MAX_ATTEMPTS) {
				// Lock account for 30 minutes
				const lockedUntil = new Date(now.getTime() + OTP_LOCKOUT_MINUTES * 60 * 1000);
				await emailVerificationQueries.update(db, emailVerification.id, {
					attempts: newAttempts,
					locked_until: lockedUntil,
				});

				return c.json({ error: "Too many failed attempts. Account locked for 30 minutes." }, 429);
			} else {
				await emailVerificationQueries.update(db, emailVerification.id, {
					attempts: newAttempts,
				});

				return c.json(
					{
						error: "Invalid OTP",
						attemptsRemaining: OTP_MAX_ATTEMPTS - newAttempts,
					},
					401,
				);
			}
		}

		// OTP verified - clear email verification record
		await emailVerificationQueries.delete(db, emailVerification.id);

		// Complete auth: find/create user and session
		const result = await completeEmailAuth(db, email, name, appId, c);

		return c.json(result);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Email verify error");
		return c.json({ error: "Failed to verify OTP" }, 500);
	}
});

/**
 * POST /v1/email/verify-magic
 * Verify single-use magic link token and create session
 */
router.post("/verify-magic", async (c: Context) => {
	const { token } = (await c.req.json()) as { token?: string };

	if (!token || typeof token !== "string") {
		return c.json({ error: "Token is required" }, 400);
	}

	try {
		// Single-use token consumption from Redis
		const data = await cache.getAndDelete<{
			email: string;
			name?: string;
			appId?: string;
			redirectUrl?: string;
		}>(`magic:${token}`);

		if (!data || !data.email) {
			return c.json({ error: "Invalid or expired magic link" }, 400);
		}

		const db = getDb();

		// Clean up any pending OTP verification for this email
		const emailVerification = await emailVerificationQueries.findByEmail(db, data.email);
		if (emailVerification) {
			await emailVerificationQueries.delete(db, emailVerification.id);
		}

		// Complete auth: find/create user and session
		const result = await completeEmailAuth(db, data.email, data.name, data.appId, c);

		return c.json({
			...result,
			appId: data.appId,
			redirectUrl: data.redirectUrl,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Magic link verify error");
		return c.json({ error: "Failed to verify magic link" }, 500);
	}
});

export const emailRoutes = router;
