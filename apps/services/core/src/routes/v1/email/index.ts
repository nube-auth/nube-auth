import { generateOTP, hashOTP, verifyOTP } from "@nube-auth/auth";
import { rateLimit } from "@nube-auth/cache";
import { appQueries, appUserQueries, emailVerificationQueries, getDb, identityQueries, sessionQueries, userQueries } from "@nube-auth/db";
import { createId, createLogger, serializeError, OTP_LENGTH, OTP_LOCKOUT_MINUTES, OTP_MAX_ATTEMPTS } from "@nube-auth/shared";
import { createEmailService } from "@nube-auth/shared/email";
import type { Context } from "hono";
import { Hono } from "hono";
import { env } from "../../../config/env";
import { getClientIp, getClientCountry } from "../../../middleware/rateLimit";
import { ensureLicenseForApp } from "../../../utils/license";

const log = createLogger("email-routes");

// Initialize email service
const emailService = createEmailService({
	sendEmails: env.SEND_EMAILS,
	resendApiKey: env.RESEND_API_KEY,
	useMailpit: env.IS_DEVELOPMENT,
	smtpHost: env.SMTP_HOST,
	smtpPort: env.SMTP_PORT,
	defaultFrom: env.EMAIL_FROM,
});

const router = new Hono();

/**
 * POST /v1/email/start
 * Request OTP via email
 */
router.post("/start", async (c: Context) => {
	const { email } = (await c.req.json()) as { email?: string };

	if (!email || !email.includes("@")) {
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
		const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

		// Save or update OTP record
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

		// Send OTP email
		await emailService.send({
			to: email,
			subject: "Your Nube Auth OTP Code",
			html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`,
		});

		return c.json({
			message: "OTP sent to email",
			expiresIn: 600, // 10 minutes in seconds
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Email start error");
		return c.json({ error: "Failed to send OTP" }, 500);
	}
});

/**
 * POST /v1/email/verify
 * Verify OTP and create session
 */
router.post("/verify", async (c: Context) => {
	const { email, otp, appId } = (await c.req.json()) as { email?: string; otp?: string; appId?: string };

	if (!email || !email.includes("@")) {
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

		// OTP verified - find or create user
		const existingUser = await userQueries.findByEmail(db, email);
		let userId = existingUser?.id;
		let userPublicId = existingUser?.public_id;

		if (!userId) {
			const newUser = await userQueries.create(db, {
				public_id: createId("user"),
				primary_email: email,
				name: email.split("@")[0] ?? email,
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
		if (appId) {
			try {
				const resolvedApp = await appQueries.findByPublicId(db, appId);
				appInternalId = resolvedApp?.id;
			} catch (appLookupError) {
				log.error({ err: serializeError(appLookupError as Error), appId }, "Failed to resolve app for email login");
			}
		}

		// Upsert persistent app_users record — survives session deletion and captures
		// every user who has authenticated with the app, regardless of licence status.
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
			expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
			ip_address: ipAddress,
			user_agent: userAgent,
			country: country,
			...(appInternalId !== undefined && { app_id: appInternalId }),
		};

		const session = await sessionQueries.create(db, sessionData);

		// Clear email verification
		await emailVerificationQueries.delete(db, emailVerification.id);

		return c.json({
			sessionId: session.public_id,
			userId: userPublicId,
			email,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Email verify error");
		return c.json({ error: "Failed to verify OTP" }, 500);
	}
});

export const emailRoutes = router;
