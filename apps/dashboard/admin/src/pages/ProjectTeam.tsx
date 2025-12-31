import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { useProject, useProjectMembers, useProjectInvitations, useUpdateTeamMember, useRemoveTeamMember, useCancelInvitation } from "../hooks/api";
import { InviteTeamMemberModal } from "../components/InviteTeamMemberModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { Select } from "../components/Select";

export function ProjectTeamPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: members, isLoading: membersLoading } = useProjectMembers(projectId || "");
	const { data: invitationsData, isLoading: invitationsLoading } = useProjectInvitations(projectId || "");
	const updateMemberMutation = useUpdateTeamMember(projectId || "");
	const removeMemberMutation = useRemoveTeamMember(projectId || "");
	const cancelInvitationMutation = useCancelInvitation(projectId || "");

	const [showInviteModal, setShowInviteModal] = useState(false);
	const [editingMember, setEditingMember] = useState<{ id: string; currentRole: string } | null>(null);
	const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string; email: string } | null>(null);
	const [invitationToCancel, setInvitationToCancel] = useState<{ id: string; email: string } | null>(null);
	const { showToast } = useToast();

	const invitations = invitationsData?.invitations || [];

	if (projectLoading || membersLoading || invitationsLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project) {
		return <div className="error-state">Project not found</div>;
	}

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div style={{ marginBottom: "24px" }}>
				<div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
					<Link to="/projects" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						Projects
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}`} style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						{project.name}
					</Link>
					<span>›</span>
					<span style={{ color: "var(--text-primary)" }}>Team</span>
				</div>
			</div>

			{/* Page Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
				<div>
					<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Team Members</h1>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
						Manage team members and their roles for {project.name}
					</p>
				</div>
				<button
					type="button"
					className="btn btn-primary"
					onClick={() => setShowInviteModal(true)}
				>
					+ Invite Member
				</button>
			</div>

			{/* Team Members Table */}
			<div className="card" style={{ padding: "0", overflow: "hidden" }}>
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr style={{ borderBottom: "1px solid var(--border-primary)", background: "var(--surface-secondary)" }}>
							<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
								Member
							</th>
							<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
								Role
							</th>
							<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
								Joined
							</th>
							<th style={{ padding: "14px 16px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{members && members.length > 0 ? (
							members.map((member) => (
								<tr key={member.id} style={{ borderBottom: "1px solid var(--border-primary)" }}>
									<td style={{ padding: "14px 16px" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
											<div style={{
												width: "40px",
												height: "40px",
												borderRadius: "50%",
												background: "var(--primary-light)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: "14px",
												fontWeight: "600",
												color: "var(--primary)",
												textTransform: "uppercase",
											}}>
												{member.name?.charAt(0) || "U"}
											</div>
											<div>
												<div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
													{member.name || "Unknown User"}
												</div>
												<div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
													{member.email}
												</div>
											</div>
										</div>
									</td>
									<td style={{ padding: "14px 16px" }}>
										<span className="badge badge-info" style={{ textTransform: "capitalize" }}>
											{member.role}
										</span>
									</td>
									<td style={{ padding: "14px 16px", fontSize: "14px", color: "var(--text-secondary)" }}>
										{new Date(member.createdAt).toLocaleDateString()}
									</td>
									<td style={{ padding: "14px 16px", textAlign: "right" }}>
										<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
											{member.role !== "owner" && (
												<>
													<button
														type="button"
														className="btn btn-secondary-outline btn-sm"
														onClick={() => setEditingMember({ id: member.id, currentRole: member.role })}
														disabled={updateMemberMutation.isPending || removeMemberMutation.isPending}
													>
														Edit Role
													</button>
													<button
														type="button"
														className="btn btn-danger-outline btn-sm"
														onClick={() => setMemberToRemove({ id: member.id, name: member.name || "", email: member.email || "" })}
														disabled={updateMemberMutation.isPending || removeMemberMutation.isPending}
													>
														Remove
													</button>
												</>
											)}
											{member.role === "owner" && (
												<span style={{ fontSize: "13px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
													Owner
												</span>
											)}
										</div>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={4} style={{ padding: "48px", textAlign: "center" }}>
									<div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
									<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
										No team members yet
									</h3>
									<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "20px" }}>
										Invite team members to collaborate on this project
									</p>
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => setShowInviteModal(true)}
									>
										+ Invite First Member
									</button>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Pending Invitations */}
			{invitations.length > 0 && (
				<div style={{ marginTop: "32px" }}>
					<h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
						Pending Invitations ({invitations.length})
					</h2>
					<div className="card" style={{ padding: "0", overflow: "hidden" }}>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead>
								<tr style={{ borderBottom: "1px solid var(--border-primary)", background: "var(--surface-secondary)" }}>
									<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
										Email
									</th>
									<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
										Role
									</th>
									<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
										Invited
									</th>
									<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
										Expires
									</th>
									<th style={{ padding: "14px 16px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{invitations.map((invitation) => (
									<tr key={invitation.id} style={{ borderBottom: "1px solid var(--border-primary)" }}>
										<td style={{ padding: "14px 16px" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
												<div style={{
													width: "40px",
													height: "40px",
													borderRadius: "50%",
													background: "rgba(139, 92, 246, 0.1)",
													border: "2px dashed rgba(139, 92, 246, 0.3)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontSize: "18px",
												}}>
													📧
												</div>
												<div>
													<div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
														{invitation.email}
													</div>
													<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
														Pending signup
													</div>
												</div>
											</div>
										</td>
										<td style={{ padding: "14px 16px" }}>
											<span className="badge badge-warning" style={{ textTransform: "capitalize" }}>
												{invitation.role}
											</span>
										</td>
										<td style={{ padding: "14px 16px", fontSize: "14px", color: "var(--text-secondary)" }}>
											{new Date(invitation.createdAt).toLocaleDateString()}
										</td>
										<td style={{ padding: "14px 16px", fontSize: "14px", color: "var(--text-secondary)" }}>
											{new Date(invitation.expiresAt).toLocaleDateString()}
										</td>
										<td style={{ padding: "14px 16px", textAlign: "right" }}>
											<button
												type="button"
												className="btn btn-danger-outline btn-sm"
												onClick={() => setInvitationToCancel({ id: invitation.id, email: invitation.email })}
												disabled={cancelInvitationMutation.isPending}
											>
												Cancel
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Invite Modal */}
			{showInviteModal && (
				<InviteTeamMemberModal
					projectId={projectId || ""}
					onClose={() => setShowInviteModal(false)}
				/>
			)}

			{/* Edit Role Modal */}
			{editingMember && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(0, 0, 0, 0.5)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
					}}
					onClick={() => setEditingMember(null)}
				>
					<div
						style={{
							background: "var(--card-bg)",
							borderRadius: "12px",
							padding: "28px",
							width: "90%",
							maxWidth: "400px",
							boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
							Edit Member Role
						</h2>
						<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "24px" }}>
							Change the role for this team member.
						</p>

						<div style={{ marginBottom: "24px" }}>
							<label
								htmlFor="edit-role"
								style={{
									display: "block",
									fontSize: "13px",
									fontWeight: "600",
									marginBottom: "8px",
									color: "var(--text-secondary)",
								}}
							>
								Role
							</label>
						<Select
							value={editingMember.currentRole}
							options={[
								{ value: "admin", label: "Admin" },
								{ value: "member", label: "Member" },
							]}
							onChange={async (newRole) => {
								if (newRole === editingMember.currentRole) {
									setEditingMember(null);
									return;
								}
								try {
									await updateMemberMutation.mutateAsync({
										memberId: editingMember.id,
										role: newRole,
									});
									showToast("Member role updated successfully", "success");
									setEditingMember(null);
								} catch (error: unknown) {
									if (error && typeof error === "object" && "message" in error) {
										showToast(`Failed to update role: ${(error as { message: string }).message}`, "error");
									} else {
										showToast("Failed to update role", "error");
									}
								}
							}}
							style={{
								width: "100%",
							}}
						/>
					</div>

					<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
						<button
							type="button"
							className="btn btn-secondary-outline"
							onClick={() => setEditingMember(null)}
						>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Remove Member Confirmation Modal with Captcha */}
			<ConfirmModal
				isOpen={!!memberToRemove}
				onClose={() => setMemberToRemove(null)}
				onConfirm={async () => {
					if (!memberToRemove) return;
					try {
						await removeMemberMutation.mutateAsync(memberToRemove.id);
						showToast("Member removed successfully", "success");
						setMemberToRemove(null);
					} catch (error: unknown) {
						if (error && typeof error === "object" && "message" in error) {
							showToast(`Failed to remove member: ${(error as { message: string }).message}`, "error");
						} else {
							showToast("Failed to remove member", "error");
						}
					}
				}}
				title="Remove Team Member"
				message={`Are you sure you want to remove ${memberToRemove?.name || memberToRemove?.email} from this project? They will lose access to all project resources.`}
				confirmText="Remove Member"
				variant="danger"
				requireCaptcha={true}
				isLoading={removeMemberMutation.isPending}
			/>

			{/* Cancel Invitation Confirmation Modal */}
			<ConfirmModal
				isOpen={!!invitationToCancel}
				onClose={() => setInvitationToCancel(null)}
				onConfirm={async () => {
					if (!invitationToCancel) return;
					try {
						await cancelInvitationMutation.mutateAsync(invitationToCancel.id);
						showToast("Invitation cancelled", "success");
						setInvitationToCancel(null);
					} catch (error: unknown) {
						if (error && typeof error === "object" && "message" in error) {
							showToast(`Failed to cancel invitation: ${(error as { message: string }).message}`, "error");
						} else {
							showToast("Failed to cancel invitation", "error");
						}
					}
				}}
				title="Cancel Invitation"
				message={`Cancel the invitation for ${invitationToCancel?.email}? They will no longer be able to join using this invitation link.`}
				confirmText="Cancel Invitation"
				variant="warning"
				isLoading={cancelInvitationMutation.isPending}
			/>
		</div>
	);
}
