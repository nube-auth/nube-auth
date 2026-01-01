import { generateOTP, hashOTP, verifyOTP } from "@proofa/auth";
import { rateLimit } from "@proofa/cache";
import { emailVerificationQueries, getDb, identityQueries, sessionQueries, userQueries } from "@proofa/db";
import { id, OTP_LENGTH, OTP_LOCKOUT_MINUTES, OTP_MAX_ATTEMPTS } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailRoutes = new Hono();

/**
 * POST /v1/email/start
 * Request OTP via email
 */
emailRoutes.post("/start", async (c: Context) => {
	const { email } = (await c.req.json()) as { email?: string };

	if (!email || !email.includes("@")) {
		return c.json({ error: "Invalid email" }, 400);
	}

	// Rate limit: 5 OTP requests per email per hour
	const allowed = await rateLimit.checkLimit(email, "otp_request", 5, 3600);
	if (!allowed) {
		return c.json({ error: "Too many OTP requests. Try again in 1 hour." }, 429);
	}

	try {
		const db = getDb();
		const now = new Date();

		// Check if email has verification record and is locked out
		const emailVerification = await emailVerificationQueries.findByEmail(db, email);

		if (emailVerification?.locked_until && emailVerification.locked_until > now) {
			const remainingMinutes = Math.ceil(
				(new Date(emailVerification.locked_until).getTime() - now.getTime()) / 60000,
			);
			return c.json({ error: `Account locked. Try again in ${remainingMinutes} minutes.` }, 429);
		}

		// Generate OTP
		const otp = generateOTP();
		const otpHash = hashOTP(otp);
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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
				public_id: id.emailVerification(),
				email,
				otp_hash: otpHash,
				expires_at: expiresAt,
				attempts: 0,
				locked_until: null,
				created_at: now,
			});
		}

		// Send OTP email (in production, use Resend)
		if (process.env.SEND_EMAILS === "true") {
			await resend.emails.send({
				from: process.env.EMAIL_FROM || "noreply@proofa.ai",
				to: email,
				subject: "Your Proofa OTP Code",
				html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`,
			});
		} else {
			console.log(`[DEV] OTP for ${email}: ${otp}`);
		}

		return c.json({
			message: "OTP sent to email",
			expiresIn: 600, // 10 minutes in seconds
		});
	} catch (error) {
		console.error("Email start error:", error);
		return c.json({ error: "Failed to send OTP" }, 500);
	}
});

/**
 * POST /v1/email/verify
 * Verify OTP and create session
 */
emailRoutes.post("/verify", async (c: Context) => {
	const { email, otp } = (await c.req.json()) as { email?: string; otp?: string };

	if (!email || !email.includes("@")) {
		return c.json({ error: "Invalid email" }, 400);
	}

	if (!otp || otp.length !== OTP_LENGTH) {
		return c.json({ error: `OTP must be ${OTP_LENGTH} digits` }, 400);
	}

	// Rate limit: 5 OTP verification attempts per email per 5 minutes
	const allowed = await rateLimit.checkLimit(email, "otp_verify", 5, 300);
	if (!allowed) {
		return c.json({ error: "Too many OTP attempts. Try again later." }, 429);
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
				const lockedUntil = new Date(Date.now() + OTP_LOCKOUT_MINUTES * 60 * 1000);
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
				public_id: id.user(),
				primary_email: email,
				name: email.split("@")[0],
				avatar_url: null,
				created_at: now,
				updated_at: now,
			});
			userId = newUser.id;
			userPublicId = newUser.public_id;

			// Create identity for email-based auth
			await identityQueries.create(db, {
				public_id: id.identity(),
				user_id: userId,
				provider: "email",
				provider_user_id: email,
				email,
				created_at: now,
			});
		}

		// Create core session
		const sessionData = {
			public_id: id.session(),
			user_id: userId,
			created_at: now,
			last_seen_at: now,
			expires_at: now + 7 * 24 * 60 * 60, // 7 days
			updated_at: now,
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
		console.error("Email verify error:", error);
		return c.json({ error: "Failed to verify OTP" }, 500);
	}
});
