import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Heading,
	Text,
	Button,
	Chip,
	EmptyState,
	Dialog,
	DialogPopup,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
	BreadcrumbSeparator,
	DataTable,
	DataTableRow,
	TableHeader,
	TableHead,
	TableBody,
	TableCell,
} from "@nube-auth/components";
import { ConfirmModal } from "../components/ConfirmModal";
import { InviteTeamMemberModal } from "../components/InviteTeamMemberModal";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import {
	useMe,
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

	// Get current user info using shared hook
	const { data: currentUser } = useMe();

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
			<div className="flex items-center justify-center min-h-[50vh]">
				<Spinner />
			</div>
		);
	}

	if (!project) {
		return (
			<Alert variant="danger">
				<Icon icon={IconType.AlertCircle} size={20} />
				<span>Project not found</span>
			</Alert>
		);
	}

	return (
		<div className="page">
			{/* Breadcrumb */}
			<Breadcrumb className="mb-6">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>
							{project.name}
						</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton active>Team</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Page Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<Heading level={1} size="lg">
						Team Members
					</Heading>
					<Text className="text-text-muted mt-2">Manage team members and their roles for {project.name}</Text>
				</div>
				{canManageMembers && (
					<Button onClick={() => setShowInviteModal(true)}>
						<Icon icon={IconType.UserMultiple} size={16} />
						Invite Member
					</Button>
				)}
			</div>

			{/* Team Members Table */}
			<DataTable
				isEmpty={!members || members.length === 0}
				emptyState={
					<EmptyState
						icon={IconType.UserMultiple}
						title="No team members yet"
						description="Invite team members to collaborate on this project"
					>
						<Button onClick={() => setShowInviteModal(true)} className="mt-4">
							<Icon icon={IconType.UserMultiple} size={16} />
							Invite First Member
						</Button>
					</EmptyState>
				}
			>
				<TableHeader>
					<tr>
						<TableHead>Member</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Joined</TableHead>
						<TableHead align="right">Actions</TableHead>
					</tr>
				</TableHeader>
				<TableBody>
					{(members || []).map((member) => (
						<DataTableRow key={member.id}>
							<TableCell>
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-primary/20 ring-1 ring-primary/40 shadow-sm flex items-center justify-center text-sm font-semibold text-primary uppercase">
										{member.name?.charAt(0) || "U"}
									</div>
									<div>
										<div className="text-sm font-medium text-text-primary">
											{member.name || "Unknown User"}
										</div>
										<div className="text-xs text-text-secondary">{member.email}</div>
									</div>
								</div>
							</TableCell>
							<TableCell>
								<Chip
									variant={member.role === "owner" ? "primary" : "info"}
									size="sm"
									className="capitalize"
								>
									{member.role}
								</Chip>
							</TableCell>
							<TableCell>{new Date(member.createdAt).toLocaleDateString()}</TableCell>
							<TableCell align="right">
								<div className="flex gap-2 justify-end">
									{member.role === "owner" && (
										<span className="text-xs text-text-tertiary italic">Project Owner</span>
									)}
									{member.role !== "owner" && canManageMembers && (
										<>
											<Button
												size="sm"
												variant="secondary"
												onClick={() =>
													setEditingMember({
														id: member.id,
														currentRole: member.role,
													})
												}
												disabled={
													updateMemberMutation.isPending || removeMemberMutation.isPending
												}
											>
												Edit Role
											</Button>
											<Button
												size="sm"
												variant="danger"
												onClick={() =>
													setMemberToRemove({
														id: member.id,
														name: member.name || "",
														email: member.email || "",
													})
												}
												disabled={
													updateMemberMutation.isPending || removeMemberMutation.isPending
												}
											>
												Remove
											</Button>
										</>
									)}
									{member.role !== "owner" && !canManageMembers && (
										<span className="text-xs text-text-tertiary italic">
											{member.userId === currentUser?.id ? "You" : "Team Member"}
										</span>
									)}
								</div>
							</TableCell>
						</DataTableRow>
					))}
				</TableBody>
			</DataTable>
			{/* Pending Invitations */}
			{invitations.length > 0 && (
				<div className="mt-8">
					<Heading level={2} size="lg" className="mb-4">
						Pending Invitations ({invitations.length})
					</Heading>
					<DataTable>
						<TableHeader>
							<tr>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Invited</TableHead>
								<TableHead>Expires</TableHead>
								<TableHead align="right">Actions</TableHead>
							</tr>
						</TableHeader>
						<TableBody>
							{invitations.map((invitation) => (
								<DataTableRow key={invitation.id}>
									<TableCell>
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-primary/15 ring-1 ring-primary/35 border border-dashed border-primary/40 flex items-center justify-center text-lg">
												📧
											</div>
											<div>
												<div className="text-sm font-medium text-text-primary">
													{invitation.email}
												</div>
												<div className="text-xs text-text-tertiary">Pending signup</div>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<Chip variant="warning" size="sm" className="capitalize">
											{invitation.role}
										</Chip>
									</TableCell>
									<TableCell>{new Date(invitation.createdAt).toLocaleDateString()}</TableCell>
									<TableCell>{new Date(invitation.expiresAt).toLocaleDateString()}</TableCell>
									<TableCell align="right">
										<Button
											size="sm"
											variant="danger"
											onClick={() =>
												setInvitationToCancel({
													id: invitation.id,
													email: invitation.email,
												})
											}
											disabled={cancelInvitationMutation.isPending}
										>
											Cancel
										</Button>
									</TableCell>
								</DataTableRow>
							))}
						</TableBody>
					</DataTable>
				</div>
			)}
			{/* Invite Modal */}
			{showInviteModal && (
				<InviteTeamMemberModal projectId={projectId || ""} onClose={() => setShowInviteModal(false)} />
			)}

			{/* Edit Role Modal */}
			{editingMember && (
				<Dialog open={!!editingMember} onOpenChange={(open: boolean) => !open && setEditingMember(null)}>
					<DialogPopup>
						<DialogHeader>
							<DialogTitle>Edit Member Role</DialogTitle>
							<Text className="text-text-muted mt-2">Change the role for this team member.</Text>
						</DialogHeader>

						<DialogBody>
							<label htmlFor="edit-role" className="block text-sm font-semibold mb-2 text-text-secondary">
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
						</DialogBody>

						<DialogFooter>
							<Button variant="secondary" onClick={() => setEditingMember(null)}>
								Cancel
							</Button>
						</DialogFooter>
					</DialogPopup>
				</Dialog>
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
