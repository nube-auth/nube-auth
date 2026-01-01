/**
 * Email Service
 * Centralized email sending with Resend
 */

import { Resend } from "resend";

import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);

const SEND_EMAILS = env.SEND_EMAILS === "true";
const DEFAULT_FROM = env.EMAIL_FROM ?? "Proofa <noreply@proofa.sh>";
const ADMIN_DASHBOARD_URL = env.ADMIN_DASHBOARD_URL ?? "http://localhost:5174";

interface EmailOptions {
	to: string;
	subject: string;
	html: string;
	from?: string;
	replyTo?: string;
}

/**
 * Send an email using Resend
 * In development, logs to console instead of sending
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
	const { to, subject, html, from = DEFAULT_FROM, replyTo } = options;

	if (!SEND_EMAILS) {
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
		await resend.emails.send({
			from,
			to,
			subject,
			html,
			...(replyTo && { replyTo }),
		});
		console.log(`Email sent to ${to}: ${subject}`);
	} catch (error) {
		console.error("Failed to send email:", error);
		throw error;
	}
}

/**
 * Email Templates
 */

interface AppUserInvitationEmailData {
	inviteeEmail: string;
	appName: string;
	inviterName: string;
	planName?: string;
	customMessage?: string;
	inviteLink: string;
	expiresInDays: number;
}

export function generateAppUserInvitationEmail(data: AppUserInvitationEmailData): string {
	const {
		inviteeEmail: _inviteeEmail,
		appName,
		inviterName,
		planName,
		customMessage,
		inviteLink,
		expiresInDays,
	} = data;

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>You've been invited to ${appName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
							<h1 style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: 700;">🎉 You're Invited!</h1>
						</td>
					</tr>
					
					<!-- Body -->
					<tr>
						<td style="padding: 40px;">
							<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								Hi there,
							</p>
							<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								<strong>${inviterName}</strong> has invited you to join <strong>${appName}</strong>.
							</p>
							${
								planName
									? `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								You've been granted access to the <strong style="color: #8b5cf6;">${planName}</strong> plan.
							</p>`
									: ""
							}
							${
								customMessage
									? `<div style="margin: 0 0 30px; padding: 20px; background-color: #f9fafb; border-left: 4px solid #8b5cf6; border-radius: 4px;">
								<p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">
									"${customMessage}"
								</p>
							</div>`
									: ""
							}
							<table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
								<tr>
									<td align="center">
										<a href="${inviteLink}" style="display: inline-block; padding: 14px 32px; background-color: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
											Accept Invitation
										</a>
									</td>
								</tr>
							</table>
							<p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
								Or copy and paste this link into your browser:
							</p>
							<p style="margin: 0 0 30px; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; font-size: 13px; color: #8b5cf6;">
								${inviteLink}
							</p>
							<p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
								This invitation will expire in ${expiresInDays} days.
							</p>
						</td>
					</tr>
					
					<!-- Footer -->
					<tr>
						<td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
							<p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
								Powered by <strong style="color: #8b5cf6;">Proofa</strong>
							</p>
							<p style="margin: 0; color: #9ca3af; font-size: 12px;">
								If you didn't expect this invitation, you can safely ignore this email.
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`.trim();
}

interface ProjectTeamInvitationEmailData {
	inviteeEmail: string;
	projectName: string;
	inviterName: string;
	role: string;
	invitationCode: string;
	expiresInDays: number;
}

export function generateProjectTeamInvitationEmail(data: ProjectTeamInvitationEmailData): string {
	const { inviteeEmail, projectName, inviterName, role, invitationCode, expiresInDays } = data;

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>You've been invited to ${projectName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
							<h1 style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: 700;">👥 Team Invitation</h1>
						</td>
					</tr>
					
					<!-- Body -->
					<tr>
						<td style="padding: 40px;">
							<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								Hi there,
							</p>
							<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								<strong>${inviterName}</strong> has invited you to join the <strong>${projectName}</strong> project team as a <strong style="color: #8b5cf6; text-transform: capitalize;">${role}</strong>.
							</p>
							<table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
								<tr>
									<td align="center">
										<a href="${ADMIN_DASHBOARD_URL}/login?invite=${invitationCode}" style="display: inline-block; padding: 14px 32px; background-color: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
											Sign In to Accept
										</a>
									</td>
								</tr>
							</table>
							<p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
								Or copy and paste this link into your browser:
							</p>
							<p style="margin: 0 0 20px; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; font-size: 13px; color: #8b5cf6;">
								${ADMIN_DASHBOARD_URL}/login?invite=${invitationCode}
							</p>
							<p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
								Once you sign in with <strong>${inviteeEmail}</strong>, you'll automatically be added to the project team.
							</p>
							<p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
								This invitation will expire in ${expiresInDays} days.
							</p>
						</td>
					</tr>
					
					<!-- Footer -->
					<tr>
						<td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
							<p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
								Powered by <strong style="color: #8b5cf6;">Proofa</strong>
							</p>
							<p style="margin: 0; color: #9ca3af; font-size: 12px;">
								If you didn't expect this invitation, you can safely ignore this email.
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`.trim();
}

interface WelcomeEmailData {
	userName: string;
	appName: string;
	planName?: string;
	dashboardUrl: string;
}

export function generateWelcomeEmail(data: WelcomeEmailData): string {
	const { userName, appName, planName, dashboardUrl } = data;

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Welcome to ${appName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
							<h1 style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: 700;">🎊 Welcome to ${appName}!</h1>
						</td>
					</tr>
					
					<!-- Body -->
					<tr>
						<td style="padding: 40px;">
							<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								Hi ${userName},
							</p>
							<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								Welcome to <strong>${appName}</strong>! We're excited to have you on board.
							</p>
							${
								planName
									? `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								Your account has been set up with the <strong style="color: #8b5cf6;">${planName}</strong> plan.
							</p>`
									: ""
							}
							<table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
								<tr>
									<td align="center">
										<a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background-color: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
											Get Started
										</a>
									</td>
								</tr>
							</table>
							<p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
								If you have any questions, feel free to reach out to our support team.
							</p>
						</td>
					</tr>
					
					<!-- Footer -->
					<tr>
						<td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
							<p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
								Powered by <strong style="color: #8b5cf6;">Proofa</strong>
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`.trim();
}

interface LicenseGrantedEmailData {
	userName: string;
	appName: string;
	planName: string;
	validUntil?: string;
	dashboardUrl: string;
}

export function generateLicenseGrantedEmail(data: LicenseGrantedEmailData): string {
	const { userName, appName, planName, validUntil, dashboardUrl } = data;

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0;">
	<title>License Granted - ${appName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
							<h1 style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: 700;">🎁 License Granted!</h1>
						</td>
					</tr>
					
					<!-- Body -->
					<tr>
						<td style="padding: 40px;">
							<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								Hi ${userName},
							</p>
							<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								Great news! You've been granted access to the <strong style="color: #8b5cf6;">${planName}</strong> plan for <strong>${appName}</strong>.
							</p>
							${
								validUntil
									? `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								Your license is valid until <strong>${validUntil}</strong>.
							</p>`
									: ""
							}
							<table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
								<tr>
									<td align="center">
										<a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background-color: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
											Access Your Account
										</a>
									</td>
								</tr>
							</table>
							<p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
								Enjoy your new features and benefits!
							</p>
						</td>
					</tr>
					
					<!-- Footer -->
					<tr>
						<td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
							<p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
								Powered by <strong style="color: #8b5cf6;">Proofa</strong>
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`.trim();
}
