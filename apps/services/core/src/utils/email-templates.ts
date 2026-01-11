/**
 * Email Templates for Core Service
 * Centralized email template generation
 */

import { env } from "../config/env";

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
										<a href="${env.ADMIN_DASHBOARD_URL}/login?invite=${invitationCode}" style="display: inline-block; padding: 14px 32px; background-color: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
											Sign In to Accept
										</a>
									</td>
								</tr>
							</table>
							<p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
								Or copy and paste this link into your browser:
							</p>
							<p style="margin: 0 0 20px; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; font-size: 13px; color: #8b5cf6;">
								${env.ADMIN_DASHBOARD_URL}/login?invite=${invitationCode}
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

interface OTPEmailData {
	email: string;
	otp: string;
	expiresInMinutes: number;
}

export function generateOTPEmail(data: OTPEmailData): string {
	const { email: _email, otp, expiresInMinutes } = data;

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Your Proofa OTP Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
							<h1 style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: 700;">🔐 Verification Code</h1>
						</td>
					</tr>
					
					<!-- Body -->
					<tr>
						<td style="padding: 40px;">
							<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
								Your Proofa verification code is:
							</p>
							<table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
								<tr>
									<td align="center">
										<div style="display: inline-block; padding: 20px 40px; background-color: #f9fafb; border: 2px dashed #8b5cf6; border-radius: 8px;">
											<span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #8b5cf6; font-family: 'Courier New', monospace;">
												${otp}
											</span>
										</div>
									</td>
								</tr>
							</table>
							<p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
								This code will expire in <strong>${expiresInMinutes} minutes</strong>.
							</p>
							<p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
								If you didn't request this code, you can safely ignore this email.
							</p>
						</td>
					</tr>
					
					<!-- Footer -->
					<tr>
						<td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
							<p style="margin: 0; color: #6b7280; font-size: 13px;">
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
