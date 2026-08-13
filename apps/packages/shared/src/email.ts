/**
 * Email Service
 *
 * Sends transactional email through the Nube Auth Email API (template-based).
 * Replaces the previous Resend/Mailpit (raw-HTML) implementation.
 *
 * API:
 *   POST {baseUrl}/v1/send
 *   Authorization: Bearer {apiKey}
 *   {
 *     "from": "hello@yourdomain.com",
 *     "to": "recipient@example.com",
 *     "subject": "Verify your email address for {{appName}}",
 *     "templateSlug": "email-verify",
 *     "themeId": "default",
 *     "variables": { ... }
 *   }
 */

import pingpong from "@pingpong-js/fetch";
import { createLogger, serializeError } from "./utils/logger.js";

const log = createLogger("email-service");

/**
 * Known transactional email templates. Each slug maps to a server-side
 * template in the Email API; `variables` feed its {{placeholders}}.
 */
export type EmailTemplateSlug =
	| "email-verify"
	| "account-welcome"
	| "app-signup"
	| "admin-signup"
	| "project-created"
	| "app-created"
	| "license-granted"
	| "license-revoked"
	| "project-invite"
	| "app-invite"
	| "payment-failed"
	| "refund-issued"
	| "subscription-canceled"
	| "subscription-resumed"
	| "account-locked"
	| "new-device-login"
	| "plan-sync-failed";

export type EmailVariables = Record<string, string | number | boolean | null | undefined>;

export interface EmailOptions {
	to: string;
	templateSlug: EmailTemplateSlug;
	subject?: string;
	themeId?: string;
	variables?: EmailVariables;
	from?: string;
}

export interface EmailConfig {
	/** Master kill-switch — when false, sendTemplate() logs and no-ops. */
	sendEmails: boolean;
	/** Base URL of the Email API, e.g. https://your-emailflare.com */
	baseUrl: string;
	/** Bearer API key for the Email API. */
	apiKey: string;
	defaultFrom: string;
	themeId?: string | undefined;
}

/** Default subjects per template — overridable per send. */
const DEFAULT_SUBJECTS: Record<EmailTemplateSlug, string> = {
	"email-verify": "Verify your email address",
	"account-welcome": "Your Nube Auth account is ready",
	"app-signup": "You're all set with {{appName}}",
	"admin-signup": "Your admin workspace is ready",
	"project-created": "Your project {{projectName}} has been created",
	"app-created": "Your app {{appName}} has been created",
	"license-granted": "Your license has been granted",
	"license-revoked": "Your license has been revoked",
	"project-invite": "You've been invited to a project",
	"app-invite": "You've been invited to an app",
	"payment-failed": "Payment failed — action required",
	"refund-issued": "Your refund has been issued",
	"subscription-canceled": "Your subscription has been canceled",
	"subscription-resumed": "Your subscription has been resumed",
	"account-locked": "Your account has been temporarily locked",
	"new-device-login": "New sign-in detected",
	"plan-sync-failed": "Plan sync failed",
};

class EmailService {
	private config: EmailConfig;

	constructor(config: EmailConfig) {
		this.config = config;
	}

	async sendTemplate(options: EmailOptions): Promise<void> {
		const {
			to,
			templateSlug,
			subject = DEFAULT_SUBJECTS[templateSlug],
			themeId = this.config.themeId,
			variables = {},
			from = this.config.defaultFrom,
		} = options;

		const payload: Record<string, unknown> = {
			from,
			to,
			subject,
			templateSlug,
			variables,
		};
		if (themeId) payload.themeId = themeId;

		if (!this.config.sendEmails) {
			log.info({ to, templateSlug, subject, variables }, "Email skipped (SEND_EMAILS=false)");
			return;
		}

		if (!this.config.baseUrl) {
			throw new Error("EMAIL_API_BASE_URL is not configured");
		}

		try {
			const response = await pingpong.post(`${this.config.baseUrl}/v1/send`, payload, {
				headers: {
					Authorization: `Bearer ${this.config.apiKey}`,
				},
			});

			if (!response.ok()) {
				throw new Error(`Email API error: HTTP ${response.status} — ${response.text()}`);
			}

			log.info({ to, templateSlug }, "Email sent");
		} catch (error) {
			log.error({ err: serializeError(error as Error), to, templateSlug }, "Failed to send email");
			throw error;
		}
	}
}

/**
 * Factory function to create an email service instance.
 * Should be called once at application startup.
 */
export function createEmailService(config: EmailConfig): EmailService {
	return new EmailService(config);
}

/**
 * Export the EmailService class for testing/advanced usage
 */
export { EmailService };
