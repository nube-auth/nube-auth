/**
 * Email Service Utility
 * Handles both Resend API and Mailpit (SMTP) for local development
 * To be used by both Core (OTP) and Gateway (Invitations) services
 */

import { createTransport } from "nodemailer";
import { Resend } from "resend";

export interface EmailOptions {
	to: string;
	subject: string;
	html: string;
	from?: string;
	replyTo?: string;
}

export interface EmailConfig {
	sendEmails: boolean;
	resendApiKey: string;
	useMailpit: boolean;
	smtpHost: string | undefined;
	smtpPort: number | undefined;
	defaultFrom: string;
}

class EmailService {
	private resend: Resend;
	private smtpTransport: ReturnType<typeof createTransport> | null;
	private config: EmailConfig;
	private useMailpit: boolean;

	constructor(config: EmailConfig) {
		this.config = config;
		this.resend = new Resend(config.resendApiKey);
		this.useMailpit = config.useMailpit;

		// Initialize SMTP transport for Mailpit if in development
		if (this.useMailpit && config.smtpHost && config.smtpPort) {
			this.smtpTransport = createTransport({
				host: config.smtpHost,
				port: config.smtpPort,
				secure: false,
				auth: undefined,
			});
		} else {
			this.smtpTransport = null;
		}
	}

	async send(options: EmailOptions): Promise<void> {
		const { to, subject, html, from = this.config.defaultFrom, replyTo } = options;

		if (!this.config.sendEmails) {
			console.log("\n=== EMAIL (DEV MODE) ===");
			console.log(`To: ${to}`);
			console.log(`From: ${from}`);
			console.log(`Subject: ${subject}`);
			console.log(`Reply-To: ${replyTo || "N/A"}`);
			console.log(`Body:\n${html}`);
			console.log("========================\n");
			return;
		}

		try {
			if (this.useMailpit && this.smtpTransport) {
				// Use Mailpit (SMTP) for local development
				await this.smtpTransport.sendMail({
					from,
					to,
					subject,
					html,
					...(replyTo && { replyTo }),
				});
				console.log(`[Email] Sent via Mailpit to ${to}: ${subject}`);
			} else {
				// Use Resend for production/staging
				await this.resend.emails.send({
					from,
					to,
					subject,
					html,
					...(replyTo && { replyTo }),
				});
				console.log(`[Email] Sent via Resend to ${to}: ${subject}`);
			}
		} catch (error) {
			console.error(`[Email Error] Failed to send email to ${to}:`, error);
			throw error;
		}
	}
}

/**
 * Factory function to create an email service instance
 * Should be called once at application startup
 */
export function createEmailService(config: EmailConfig): EmailService {
	return new EmailService(config);
}

/**
 * Export the EmailService class for testing/advanced usage
 */
export { EmailService };
