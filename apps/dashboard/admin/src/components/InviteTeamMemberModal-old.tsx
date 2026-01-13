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
			onClick={onClose}
		>
			<div
				style={{
					background: "var(--card-bg)",
					borderRadius: "12px",
					padding: "28px",
					width: "90%",
					maxWidth: "500px",
					boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Invite Team Member</h2>
				<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "24px" }}>
					Add a team member to this project. They must have a Proofa account.
				</p>

				<form onSubmit={handleSubmit}>
					{/* Email */}
					<div style={{ marginBottom: "20px" }}>
						<label
							htmlFor="email"
							style={{
								display: "block",
								fontSize: "13px",
								fontWeight: "600",
								marginBottom: "8px",
								color: "var(--text-secondary)",
							}}
						>
							Email Address *
						</label>
						<input
							id="email"
							type="email"
							className="form-control"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="user@example.com"
							required
							style={{
								width: "100%",
								padding: "10px 14px",
								background: "var(--content-bg)",
								border: "1px solid var(--card-border)",
								borderRadius: "var(--radius)",
								fontSize: "14px",
								color: "var(--text-primary)",
							}}
						/>
					</div>

					{/* Role */}
					<div style={{ marginBottom: "28px" }}>
						<label
							htmlFor="role"
							style={{
								display: "block",
								fontSize: "13px",
								fontWeight: "600",
								marginBottom: "8px",
								color: "var(--text-secondary)",
							}}
						>
							Role *
						</label>
						<Select
							value={role}
							onChange={(value) => setRole(value)}
							options={[
								{ value: "admin", label: "Admin" },
								{ value: "member", label: "Member" },
							]}
							style={{
								width: "100%",
								padding: "10px 14px",
								background: "var(--content-bg)",
								border: "1px solid var(--card-border)",
								borderRadius: "var(--radius)",
								fontSize: "14px",
								color: "var(--text-primary)",
							}}
						/>
						<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
							<strong>Admin:</strong> Can manage apps, users, and invite members. <strong>Member:</strong>{" "}
							Read-only access.
						</p>
					</div>

					{/* Actions */}
					<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
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
