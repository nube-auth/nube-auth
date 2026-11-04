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
 *
 * All slugs strictly follow a two-word pattern: `[resource]-[action/event]`.
 */
export type BaseEmailTemplateSlug =
	// Account & User
	| "account-welcome"
	| "app-welcome"
	| "admin-welcome"
	| "account-locked"
	| "account-unlocked"
	| "account-deleted"
	// Auth & Credentials
	| "email-verify"
	| "email-verified"
	| "email-change"
	| "email-changed"
	| "otp-code"
	| "magic-link"
	| "password-reset"
	| "password-changed"
	| "login-alert"
	| "oauth-linked"
	// Collaboration
	| "team-invite"
	| "app-invite"
	// Resources
	| "project-created"
	| "app-created"
	| "apikey-created"
	| "apikey-revoked"
	| "license-granted"
	| "license-revoked"
	// Billing
	| "payment-failed"
	| "refund-approved"
	| "subscription-cancelled"
	| "subscription-resumed"
	| "sync-failed";

export type EmailTemplateSlug = BaseEmailTemplateSlug | `nubeauth-${BaseEmailTemplateSlug}`;

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
	/** Prefix prepended to all template slugs (defaults to "nubeauth-"). */
	templatePrefix?: string | undefined;
}

/** Default subjects per template — overridable per send. */
const DEFAULT_SUBJECTS: Record<BaseEmailTemplateSlug, string> = {
	"account-welcome": "Your Nube Auth account is ready",
	"app-welcome": "You're all set with {{appName}}",
	"admin-welcome": "Your admin workspace is ready",
	"account-locked": "Your account has been temporarily locked",
	"account-unlocked": "Your {{appName}} account has been unlocked",
	"account-deleted": "Your {{appName}} account has been deleted",
	"email-verify": "Verify your email address",
	"email-verified": "Your email was verified for {{appName}}",
	"email-change": "Confirm your new email for {{appName}}",
	"email-changed": "Your email address was updated in {{appName}}",
	"otp-code": "Your {{appName}} verification code: {{code}}",
	"magic-link": "Your sign-in link for {{appName}}",
	"password-reset": "Reset your {{appName}} password",
	"password-changed": "Your {{appName}} password has been changed",
	"login-alert": "New sign-in detected",
	"oauth-linked": "Security alert: new sign-in provider linked",
	"team-invite": "You've been invited to a project",
	"app-invite": "You've been invited to an app",
	"project-created": "Your project {{projectName}} has been created",
	"app-created": "Your app {{appName}} has been created",
	"apikey-created": "New API key created in {{appName}}",
	"apikey-revoked": "API key {{keyName}} revoked in {{appName}}",
	"license-granted": "Your license has been granted",
	"license-revoked": "Your license has been revoked",
	"payment-failed": "Payment failed — action required",
	"refund-approved": "Your refund has been issued",
	"subscription-cancelled": "Your subscription has been canceled",
	"subscription-resumed": "Your subscription has been resumed",
	"sync-failed": "Plan sync failed",
};

class EmailService {
	private config: EmailConfig;

	constructor(config: EmailConfig) {
		this.config = config;
	}

	async sendTemplate(options: EmailOptions): Promise<void> {
		const prefix = this.config.templatePrefix ?? "nubeauth-";
		const {
			to,
			templateSlug: inputSlug,
			themeId = this.config.themeId,
			variables = {},
			from = this.config.defaultFrom,
		} = options;

		// 1. Strip existing prefix if present to find the clean slug
		const cleanSlug = (
			inputSlug.startsWith(prefix) ? inputSlug.slice(prefix.length) : inputSlug
		) as BaseEmailTemplateSlug;

		// 2. Apply the configured prefix for the Email API
		const templateSlug = `${prefix}${cleanSlug}`;

		// 3. Resolve subject from options, clean slug, or empty
		const subject = options.subject ?? DEFAULT_SUBJECTS[cleanSlug] ?? "";

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
