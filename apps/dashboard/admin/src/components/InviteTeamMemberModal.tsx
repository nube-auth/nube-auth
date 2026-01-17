import { useState } from "react";
import { useInviteTeamMember } from "../hooks/api";
import { Select } from "./Select";
import { useToast } from "./Toast";

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
		<div
			className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-1000"
			onClick={onClose}
		>
			<div className="bg-card-bg rounded-xl p-7 w-[90%] max-w-[500px] shadow-xl" onClick={(e) => e.stopPropagation()}>
				<h2 className="text-20px font-bold mb-2">Invite Team Member</h2>
				<p className="text-14px text-text-tertiary mb-6">
					Add a team member to this project. They must have a Proofa account.
				</p>

				<form onSubmit={handleSubmit}>
					{/* Email */}
					<div className="mb-5">
						<label htmlFor="email" className="block text-13px font-semibold mb-2 text-text-secondary">
							Email Address *
						</label>
						<input
							id="email"
							type="email"
							className="form-control w-full px-3.5 py-2.5 bg-content-bg border border-card-border rounded-[var(--radius)] text-14px text-text-primary"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="user@example.com"
							required
						/>
					</div>

					{/* Role */}
					<div className="mb-7">
						<label htmlFor="role" className="block text-13px font-semibold mb-2 text-text-secondary">
							Role *
						</label>
						<Select
							value={role}
							onChange={(value) => setRole(value)}
							options={[
								{ value: "admin", label: "Admin" },
								{ value: "member", label: "Member" },
							]}
						/>
						<p className="text-12px text-text-tertiary mt-1.5">
							<strong>Admin:</strong> Can manage apps, users, and invite members. <strong>Member:</strong> Read-only access.
						</p>
					</div>

					{/* Actions */}
					<div className="flex gap-3 justify-end">
						<button
							type="button"
							className="btn btn-secondary-outline"
							onClick={onClose}
							disabled={inviteMutation.isPending}
						>
							Cancel
						</button>
						<button type="submit" className="btn btn-primary" disabled={inviteMutation.isPending}>
							{inviteMutation.isPending ? "Inviting..." : "Invite Member"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
