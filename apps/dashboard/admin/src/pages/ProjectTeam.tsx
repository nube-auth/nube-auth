import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ConfirmModal } from "../components/ConfirmModal";
import { InviteTeamMemberModal } from "../components/InviteTeamMemberModal";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import { pingpong } from "../lib/pingpong";
import {
	useCancelInvitation,
	useProject,
	useProjectInvitations,
	useProjectMembers,
	useRemoveTeamMember,
	useUpdateTeamMember,
} from "../hooks/api";

export function ProjectTeamPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: members, isLoading: membersLoading } = useProjectMembers(projectId || "");
	const { data: invitationsData, isLoading: invitationsLoading } = useProjectInvitations(projectId || "");
	const updateMemberMutation = useUpdateTeamMember(projectId || "");
	const removeMemberMutation = useRemoveTeamMember(projectId || "");
	const cancelInvitationMutation = useCancelInvitation(projectId || "");

	// Get current user info
	const { data: currentUser } = useQuery({
		queryKey: ["admin", "me"],
		queryFn: async () => {
			const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";
			const res = await pingpong(`${gatewayUrl}/v1/admin/me`, { credentials: "include" });
			if (!res.ok) throw new Error("Unauthorized");
			return res.json() as Promise<{ id: string; email?: string; name?: string }>;
		},
	});

	// Find current user's role in this project
	const currentUserMember = members?.find((m) => m.userId === currentUser?.id);
	const currentUserRole = currentUserMember?.role;
	const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";

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
			<div className="mb-6">
				<div className="flex gap-2 items-center text-xs text-text-tertiary">
					<Link to="/projects" className="text-text-tertiary no-underline">
						Projects
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}`}
						className="text-text-tertiary no-underline"
					>
						{project.name}
					</Link>
					<span>›</span>
					<span className="text-text-primary">Team</span>
				</div>
			</div>

			{/* Page Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-2xl font-bold mb-2">Team Members</h1>
					<p className="text-sm text-text-tertiary">
						Manage team members and their roles for {project.name}
					</p>
				</div>
				{canManageMembers && (
					<button type="button" className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
						+ Invite Member
					</button>
				)}
			</div>

			{/* Team Members Table */}
			<div className="card p-0 overflow-hidden">
				<table className="w-full border-collapse">
					<thead>
						<tr className="border-b border-border-primary bg-surface-secondary">
							<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
								Member
							</th>
							<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
								Role
							</th>
							<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
								Joined
							</th>
							<th className="px-4 py-3.5 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{members && members.length > 0 ? (
							members.map((member) => (
							<tr key={member.id} className="border-b border-border-primary">
								<td className="px-4 py-3.5">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary uppercase">
												{member.name?.charAt(0) || "U"}
											</div>
											<div>
											<div className="text-sm font-medium text-text-primary">
												{member.name || "Unknown User"}
											</div>
											<div className="text-xs text-text-secondary">
													{member.email}
												</div>
											</div>
										</div>
									</td>
								<td className="px-4 py-3.5">
									<span className="badge badge-info capitalize">
											{member.role}
										</span>
									</td>
									<td className="px-4 py-3.5 text-sm text-text-secondary">
										{new Date(member.createdAt).toLocaleDateString()}
									</td>
								<td className="px-4 py-3.5 text-right">
									<div className="flex gap-2 justify-end">
											{member.role === "owner" && (
												<span className="text-xs text-text-tertiary italic">
													Project Owner
												</span>
											)}
											{member.role !== "owner" && canManageMembers && (
												<>
													<button
														type="button"
														className="btn btn-secondary-outline btn-sm"
														onClick={() =>
															setEditingMember({
																id: member.id,
																currentRole: member.role,
															})
														}
														disabled={
															updateMemberMutation.isPending ||
															removeMemberMutation.isPending
														}
													>
														Edit Role
													</button>
													<button
														type="button"
														className="btn btn-danger-outline btn-sm"
														onClick={() =>
															setMemberToRemove({
																id: member.id,
																name: member.name || "",
																email: member.email || "",
															})
														}
														disabled={
															updateMemberMutation.isPending ||
															removeMemberMutation.isPending
														}
													>
														Remove
													</button>
												</>
											)}
											{member.role !== "owner" && !canManageMembers && (
												<span className="text-xs text-text-tertiary italic">
													{member.userId === currentUser?.id ? "You" : "Team Member"}
												</span>
											)}
										</div>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={4} className="p-12 text-center">
									<div className="text-5xl mb-4">👥</div>
									<h3 className="text-base font-semibold mb-2 text-text-primary">
										No team members yet
									</h3>
									<p className="text-sm text-text-tertiary mb-5">
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
				<div className="mt-8">
					<h2 className="text-lg font-bold mb-4">
						Pending Invitations ({invitations.length})
					</h2>
					<div className="card p-0 overflow-hidden">
						<table className="w-full border-collapse">
							<thead>
								<tr className="border-b border-border-primary bg-surface-secondary">
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
										Email
									</th>
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
										Role
									</th>
								<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
										Invited
									</th>
								<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
										Expires
									</th>
								<th className="px-4 py-3.5 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{invitations.map((invitation) => (
								<tr key={invitation.id} className="border-b border-border-primary">
										<td className="px-4 py-3.5">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-primary-light border-2 border-dashed border-primary/30 flex items-center justify-center text-lg">
													📧
												</div>
												<div>
												<div className="text-sm font-medium text-text-primary">
														{invitation.email}
													</div>
												<div className="text-xs text-text-tertiary">
														Pending signup
													</div>
												</div>
											</div>
										</td>
									<td className="px-4 py-3.5">
										<span className="badge badge-warning capitalize">
												{invitation.role}
											</span>
										</td>
										<td className="px-4 py-3.5 text-sm text-text-secondary">
											{new Date(invitation.createdAt).toLocaleDateString()}
										</td>
										<td className="px-4 py-3.5 text-sm text-text-secondary">
											{new Date(invitation.expiresAt).toLocaleDateString()}
										</td>
									<td className="px-4 py-3.5 text-right">
											<button
												type="button"
												className="btn btn-danger-outline btn-sm"
												onClick={() =>
													setInvitationToCancel({
														id: invitation.id,
														email: invitation.email,
													})
												}
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
				<InviteTeamMemberModal projectId={projectId || ""} onClose={() => setShowInviteModal(false)} />
			)}

			{/* Edit Role Modal */}
			{editingMember && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-1000"
					onClick={() => setEditingMember(null)}
				>
					<div
						className="card w-[90%] max-w-sm p-7"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="text-xl font-bold mb-2">Edit Member Role</h2>
						<p className="text-sm text-text-tertiary mb-6">
							Change the role for this team member.
						</p>

						<div className="mb-6">
							<label
								htmlFor="edit-role"
								className="block text-xs font-semibold mb-2 text-text-secondary"
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
											showToast(
												`Failed to update role: ${(error as { message: string }).message}`,
												"error",
											);
										} else {
											showToast("Failed to update role", "error");
										}
									}
								}}
								className="w-full"
							/>
						</div>

						<div className="flex gap-3 justify-end">
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
							showToast(
								`Failed to cancel invitation: ${(error as { message: string }).message}`,
								"error",
							);
						} else {
							showToast("Failed to cancel invitation", "error");
						}
					}
				}}
				title="Cancel Invitation"
				message={`Cancel the invitation for ${invitationToCancel?.email}? They will no longer be able to join using this invitation link.`}
				confirmText="Cancel Invitation"
				variant="warning"
			/>
		</div>
	);
}
