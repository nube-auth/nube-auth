import { useState } from "react";
import { useInviteTeamMember } from "../hooks/api";
import { Select } from "./Select";
import { useToast } from "./Toast";
import {
	Button,
	Dialog,
	DialogBody,
	DialogFooter,
	DialogHeader,
	DialogPopup,
	DialogTitle,
	Input,
	Label,
} from "@nube-auth/components";

interface InviteTeamMemberModalProps {
	projectId: string;
	onClose: () => void;
}

export function InviteTeamMemberModal({ projectId, onClose }: InviteTeamMemberModalProps) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("admin");
	const inviteMutation = useInviteTeamMember(projectId);
	const { showToast } = useToast();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email) {
			showToast("Please enter an email address", "warning");
			return;
		}

		try {
			const result = await inviteMutation.mutateAsync({ email, role });
			if (result.type === "member") {
				showToast("User added to project successfully!", "success");
			} else {
				showToast("Invitation sent! The user will be added when they sign up with this email.", "success");
			}
			onClose();
		} catch (error: unknown) {
			if (error && typeof error === "object" && "message" in error) {
				showToast(`Failed to invite team member: ${(error as { message: string }).message}`, "error");
			} else {
				showToast("Failed to invite team member", "error");
			}
		}
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogPopup className="w-[90%] max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Invite Team Member</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
						Add a team member to this project. They must have a Nube Auth account.
					</p>

					<form id="invite-team-member" onSubmit={handleSubmit}>
						<div className="mb-5">
							<Label htmlFor="email" className="font-semibold">Email Address *</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="user@example.com"
								required
							/>
						</div>

						<div className="mb-7">
							<Label htmlFor="role" className="font-semibold">Role *</Label>
							<Select
								value={role}
								onChange={(value) => setRole(value)}
								options={[
									{ value: "admin", label: "Admin" },
									{ value: "member", label: "Member" },
								]}
							/>
							<p className="text-xs mt-1.5" style={{ color: "var(--dimmed)" }}>
								<strong>Admin:</strong> Can manage apps, users, and invite members. <strong>Member:</strong> Read-only access.
							</p>
						</div>
					</form>
				</DialogBody>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={inviteMutation.isPending}
					>
						Cancel
					</Button>
					<Button type="submit" form="invite-team-member" disabled={inviteMutation.isPending}>
						{inviteMutation.isPending ? "Inviting..." : "Invite Member"}
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}
