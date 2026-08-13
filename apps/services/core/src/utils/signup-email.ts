/**
 * Signup email helpers
 *
 * On a user's very first signup, two emails are sent:
 *  1. account-welcome — Nube Auth account welcome with the user dashboard link.
 *  2. app-signup     — app-specific welcome (only when signing up through an app).
 *
 * These are enqueued fire-and-forget; delivery + retries are handled by the
 * email worker.
 */

import { enqueueEmail } from "@nube-auth/queue";
import { createLogger, serializeError } from "@nube-auth/shared";
import { env } from "../config/env";

const log = createLogger("signup-email");

interface SignupEmailParams {
	email: string;
	userName: string;
	/** Display name of the app the user signed up through (optional). */
	appName?: string | undefined;
}

/**
 * Enqueue the two first-signup emails.
 * Non-fatal: errors are logged, never thrown, so signup always succeeds.
 */
export function enqueueSignupEmails(params: SignupEmailParams): void {
	const { email, userName, appName } = params;

	// OAuth providers can occasionally return an empty email — never enqueue to "".
	if (!email?.includes("@")) {
		log.warn({ userName, appName }, "Skipping signup emails: no valid email address");
		return;
	}

	// 1. Nube Auth account welcome (always) — links to the user dashboard.
	enqueueEmail({
		to: email,
		templateSlug: "account-welcome",
		variables: {
			userName,
			dashboardUrl: env.USER_DASHBOARD_URL,
		},
	}).catch((err: unknown) => {
		log.error({ err: serializeError(err as Error), email }, "Failed to enqueue account-welcome email");
	});

	// 2. App-specific signup welcome (only when the signup came through an app).
	if (appName) {
		enqueueEmail({
			to: email,
			templateSlug: "app-signup",
			variables: {
				userName,
				appName,
			},
		}).catch((err: unknown) => {
			log.error({ err: serializeError(err as Error), email, appName }, "Failed to enqueue app-signup email");
		});
	}
}
