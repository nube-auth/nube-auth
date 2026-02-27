import {
	auditLogQueries,
	getDb,
	projectInvitationQueries,
	projectMemberQueries,
	projectQueries,
	userQueries,
} from "@proofa/db";
import { createId, createLogger, idPatterns, serializeError } from "@proofa/shared";
import { createEmailService } from "@proofa/shared/email";
import type { Context } from "hono";
import { Hono } from "hono";
import { env } from "../../../config/env";
import { generateProjectTeamInvitationEmail } from "../../../utils/email-templates";

const log = createLogger("admin-members-routes");

// Initialize email service
const emailService = createEmailService({
	sendEmails: env.SEND_EMAILS,
	resendApiKey: env.RESEND_API_KEY,
	useMailpit: env.IS_DEVELOPMENT,
	smtpHost: env.SMTP_HOST,
	smtpPort: env.SMTP_PORT,
	defaultFrom: env.EMAIL_FROM,
});

export const membersRouter = new Hono();

/**
 * GET /:projectId/members
 * List team members for a project
 */
membersRouter.get("/:projectId/members", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		const db = getDb();

		// Get project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get all members with user details
		const members = await projectMemberQueries.findByProjectId(db, project.id);

		const membersList = await Promise.all(
			members.map(async (member) => {
				const user = await userQueries.findById(db, member.user_id);
				return {
					id: member.public_id,
					userId: user?.public_id || "unknown",
					email: user?.primary_email || "unknown",
					name: user?.name || null,
					role: member.role,
					createdAt: new Date(member.created_at).toISOString(),
				};
			})
		);

		return c.json({
			members: membersList,
			total: membersList.length,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "List members error");
		return c.json({ error: "Failed to list members" }, 500);
	}
});

/**
 * POST /:projectId/members
 * Invite a member or add existing user to project
 */
membersRouter.post("/:projectId/members", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const { email, role = "member" } = (await c.req.json()) as {
			email?: string;
			role?: string;
		};

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		if (!email) {
			return c.json({ error: "Missing required field: email" }, 400);
		}

		if (!["member", "admin", "owner"].includes(role)) {
			return c.json({ error: "Invalid role. Must be member, admin, or owner" }, 400);
		}

		const userId = c.req.header("X-Proofa-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		// Get project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get requesting user
		const requestingUser = await userQueries.findByPublicId(db, userId);
		if (!requestingUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check authorization: must be owner or admin
		const requestingMember = await projectMemberQueries.findByProjectAndUser(
			db,
			project.id,
			requestingUser.id
		);
		const requestingUserMember = requestingMember?.[0];
		if (!requestingUserMember || (requestingUserMember.role !== "owner" && requestingUserMember.role !== "admin")) {
			return c.json({ error: "Forbidden - only owner or admin can invite members" }, 403);
		}

		// Check if user already exists
		const existingUser = await userQueries.findByEmail(db, email);

		if (existingUser) {
			// Check if already a member
			const existingMember = await projectMemberQueries.findByProjectAndUser(db, project.id, existingUser.id);
			if (existingMember && existingMember.length > 0) {
				return c.json({ error: "User is already a member of this project" }, 409);
			}

			// Add existing user as member
			const newMember = await projectMemberQueries.create(db, {
				public_id: createId("projectMember"),
				project_id: project.id,
				user_id: existingUser.id,
				role,
			});

			// Audit log: member added
			try {
				await auditLogQueries.create(db, {
					public_id: createId("auditLog"),
					user_id: requestingUser.id,
					project_id: project.id,
					action: "project.member_added",
					entity_type: "project_member",
					entity_id: newMember.public_id,
					changes: { userId: existingUser.public_id, email: existingUser.primary_email, role },
					ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
				});
			} catch (auditError) {
				log.error({ err: serializeError(auditError as Error) }, "Failed to create audit log");
			}

			return c.json(
				{
					id: newMember.public_id,
					userId: existingUser.public_id,
					email: existingUser.primary_email,
					name: existingUser.name,
					role: newMember.role,
					joinedAt: new Date(newMember.created_at).toISOString(),
				},
				201
			);
		}

		// Create invitation for new user
		const invitation = await projectInvitationQueries.create(db, {
			public_id: createId("invitation"),
			project_id: project.id,
			email,
			role,
			status: "pending",
			invited_by_user_id: requestingUser.id,
			expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
		});

		// Audit log: invitation sent
		try {
			await auditLogQueries.create(db, {
				public_id: createId("auditLog"),
				user_id: requestingUser.id,
				project_id: project.id,
				action: "invitation.sent",
				entity_type: "project_invitation",
				entity_id: invitation.public_id,
				changes: { email, role, expiresAt: invitation.expires_at.toISOString() },
				ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
			});
		} catch (auditError) {
			log.error({ err: serializeError(auditError as Error) }, "Failed to create audit log");
		}

		// Send invitation email
		try {
			const emailHtml = generateProjectTeamInvitationEmail({
				inviteeEmail: email,
				projectName: project.name,
				inviterName: requestingUser.name || requestingUser.primary_email || "A team member",
				role,
				invitationCode: invitation.public_id,
				expiresInDays: 7,
			});

			await emailService.send({
				to: email,
				subject: `You've been invited to join ${project.name}`,
				html: emailHtml,
			});

			log.info({ email, projectId: project.public_id }, "Team invitation email sent");
		} catch (emailError) {
			log.error({ err: serializeError(emailError as Error), email }, "Failed to send invitation email");
			// Don't fail the request if email fails - invitation is still created
		}

		return c.json(
			{
				id: invitation.public_id,
				email,
				role,
				status: "pending",
				expiresAt: new Date(invitation.expires_at).toISOString(),
				createdAt: new Date(invitation.created_at).toISOString(),
			},
			201
		);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Invite member error");
		return c.json({ error: "Failed to invite member" }, 500);
	}
});

/**
 * PATCH /:projectId/members/:memberId
 * Update member role
 */
membersRouter.patch("/:projectId/members/:memberId", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const memberId = c.req.param("memberId");
		const { role } = (await c.req.json()) as {
			role?: string;
		};

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		if (!memberId || !idPatterns.projectMember.test(memberId)) {
			return c.json({ error: "Invalid memberId" }, 400);
		}

		if (!role || !["member", "admin", "owner"].includes(role)) {
			return c.json({ error: "Invalid role. Must be member, admin, or owner" }, 400);
		}

		const userId = c.req.header("X-Proofa-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		// Get project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get requesting user
		const requestingUser = await userQueries.findByPublicId(db, userId);
		if (!requestingUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check authorization: must be owner
		const requestingMember = await projectMemberQueries.findByProjectAndUser(
			db,
			project.id,
			requestingUser.id
		);
		const requestingUserMember = requestingMember?.[0];
		if (!requestingUserMember || requestingUserMember.role !== "owner") {
			return c.json({ error: "Forbidden - only owner can change member roles" }, 403);
		}

		// Get member to update
		const allMembers = await projectMemberQueries.findByProjectId(db, project.id);
		const memberToUpdate = allMembers.find((m) => m.public_id === memberId);

		if (!memberToUpdate) {
			return c.json({ error: "Member not found" }, 404);
		}

		// Validate project match
		if (memberToUpdate.project_id !== project.id) {
			return c.json({ error: "Member not found in this project" }, 404);
		}

		// Can't change owner role
		if (memberToUpdate.role === "owner" && role !== "owner") {
			return c.json({ error: "Cannot change owner role" }, 400);
		}

		// Can't make someone owner if they're not already owner
		if (role === "owner" && memberToUpdate.role !== "owner") {
			return c.json({ error: "Cannot promote to owner. Owner can only be changed through project transfer" }, 400);
		}

		// Update member
		const updated = await projectMemberQueries.update(db, memberToUpdate.id, { role });

		// Audit log: role changed
		try {
			const targetUser = await userQueries.findById(db, memberToUpdate.user_id);
			await auditLogQueries.create(db, {
				public_id: createId("auditLog"),
				user_id: requestingUser.id,
				project_id: project.id,
				action: "project.member_role_changed",
				entity_type: "project_member",
				entity_id: updated.public_id,
				changes: {
					userId: targetUser?.public_id,
					oldRole: memberToUpdate.role,
					newRole: role,
				},
				ip_address: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || null,
			});
		} catch (auditError) {
			log.error({ err: serializeError(auditError as Error) }, "Failed to create audit log");
		}

		return c.json({
			id: updated.public_id,
			role: updated.role,
			updatedAt: new Date(updated.updated_at).toISOString(),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Update member error");
		return c.json({ error: "Failed to update member" }, 500);
	}
});

/**
 * DELETE /:projectId/members/:memberId
 * Remove member from project
 */
membersRouter.delete("/:projectId/members/:memberId", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const memberId = c.req.param("memberId");

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		if (!memberId || !idPatterns.projectMember.test(memberId)) {
			return c.json({ error: "Invalid memberId" }, 400);
		}

		const userId = c.req.header("X-Proofa-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		// Get project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get requesting user
		const requestingUser = await userQueries.findByPublicId(db, userId);
		if (!requestingUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check authorization: must be owner or admin
		const requestingMember = await projectMemberQueries.findByProjectAndUser(
			db,
			project.id,
			requestingUser.id
		);
		const requestingUserMember = requestingMember?.[0];
		if (!requestingUserMember || (requestingUserMember.role !== "owner" && requestingUserMember.role !== "admin")) {
			return c.json({ error: "Forbidden - only owner or admin can remove members" }, 403);
		}

		// Get member to delete
		const allMembers = await projectMemberQueries.findByProjectId(db, project.id);
		const memberToDelete = allMembers.find((m) => m.public_id === memberId);

		if (!memberToDelete) {
			return c.json({ error: "Member not found" }, 404);
		}

		// Validate project match
		if (memberToDelete.project_id !== project.id) {
			return c.json({ error: "Member not found in this project" }, 404);
		}

		// Can't remove owner
		if (memberToDelete.role === "owner") {
			return c.json({ error: "Cannot remove project owner" }, 400);
		}

		// Can't remove last admin (if you're not the owner)
		if (requestingUserMember.role !== "owner" && memberToDelete.role === "admin") {
			const otherAdmins = allMembers.filter((m) => m.role === "admin" && m.id !== memberToDelete.id);

			if (otherAdmins.length === 0) {
				return c.json({ error: "Cannot remove last admin. Project must have at least one admin" }, 400);
			}
		}

		// Delete member
		await projectMemberQueries.delete(db, memberToDelete.id);

		return c.json({
			message: "Member removed successfully",
			id: memberId,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete member error");
		return c.json({ error: "Failed to remove member" }, 500);
	}
});

/**
 * GET /:projectId/invitations
 * List pending invitations for a project
 */
membersRouter.get("/:projectId/invitations", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		const db = getDb();

		// Get project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get pending invitations
		const invitations = await projectInvitationQueries.findByProjectId(db, project.id);

		const pendingInvitations = invitations
			.filter((inv) => inv.status === "pending" && new Date(inv.expires_at) > new Date())
			.map((inv) => ({
				id: inv.public_id,
				email: inv.email,
				role: inv.role,
				status: inv.status,
				expiresAt: new Date(inv.expires_at).toISOString(),
				createdAt: new Date(inv.created_at).toISOString(),
			}));

		return c.json({
			invitations: pendingInvitations,
			total: pendingInvitations.length,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "List invitations error");
		return c.json({ error: "Failed to list invitations" }, 500);
	}
});

/**
 * DELETE /:projectId/invitations/:invitationId
 * Cancel an invitation
 */
membersRouter.delete("/:projectId/invitations/:invitationId", async (c: Context) => {
	try {
		const projectId = c.req.param("projectId");
		const invitationId = c.req.param("invitationId");

		if (!projectId || !idPatterns.project.test(projectId)) {
			return c.json({ error: "Invalid projectId" }, 400);
		}

		if (!invitationId || !idPatterns.invitation.test(invitationId)) {
			return c.json({ error: "Invalid invitationId" }, 400);
		}

		const userId = c.req.header("X-Proofa-User-Id");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const db = getDb();

		// Get project
		const project = await projectQueries.findByPublicId(db, projectId);
		if (!project) {
			return c.json({ error: "Project not found" }, 404);
		}

		// Get requesting user
		const requestingUser = await userQueries.findByPublicId(db, userId);
		if (!requestingUser) {
			return c.json({ error: "User not found" }, 404);
		}

		// Check authorization: must be owner or admin
		const requestingMember = await projectMemberQueries.findByProjectAndUser(
			db,
			project.id,
			requestingUser.id
		);
		const requestingUserMember = requestingMember?.[0];
		if (!requestingUserMember || (requestingUserMember.role !== "owner" && requestingUserMember.role !== "admin")) {
			return c.json({ error: "Forbidden - only owner or admin can cancel invitations" }, 403);
		}

		// Get invitation
		const invitation = await projectInvitationQueries.findByPublicId(db, invitationId);
		if (!invitation) {
			return c.json({ error: "Invitation not found" }, 404);
		}

		// Validate project match
		if (invitation.project_id !== project.id) {
			return c.json({ error: "Invitation not found for this project" }, 404);
		}

		// Delete invitation
		await projectInvitationQueries.delete(db, invitation.id);

		return c.json({
			message: "Invitation cancelled successfully",
			id: invitationId,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Cancel invitation error");
		return c.json({ error: "Failed to cancel invitation" }, 500);
	}
});
