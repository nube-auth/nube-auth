import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { pingpong } from "../lib/pingpong";

interface AdminProfile {
	id: string;
	email?: string;
	name?: string;
	primary_email?: string;
}

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await pingpong(`${GATEWAY_URL}${path}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw new Error(error.message || "Request failed");
	}

	return response.json();
}

export function ProfilePage() {
	const queryClient = useQueryClient();
	const [isEditing, setIsEditing] = useState(false);
	const [name, setName] = useState("");
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Fetch profile
	const { data: profile, isLoading } = useQuery<AdminProfile>({
		queryKey: ["admin", "me"],
		queryFn: () => fetchAPI<AdminProfile>("/v1/admin/me"),
	});

	// Update profile mutation
	const updateProfile = useMutation({
		mutationFn: async (data: { name: string }) => {
			return fetchAPI("/v1/admin/me", {
				method: "PATCH",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin", "me"] });
			setIsEditing(false);
			setSuccessMessage("Profile updated successfully!");
			setTimeout(() => setSuccessMessage(null), 3000);
		},
	});

	const handleEdit = () => {
		setName(profile?.name || "");
		setIsEditing(true);
		setSuccessMessage(null);
	};

	const handleCancel = () => {
		setIsEditing(false);
		setName("");
		setSuccessMessage(null);
	};

	const handleSave = () => {
		if (!name.trim()) {
			return;
		}
		updateProfile.mutate({ name: name.trim() });
	};

	if (isLoading) {
		return (
			<div className="page-header">
				<h1 className="page-title">Profile</h1>
				<div style={{ marginTop: "24px" }}>
					<div className="spinner" />
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="page-header">
				<h1 className="page-title">Profile</h1>
				<p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>Failed to load profile</p>
			</div>
		);
	}

	const initials = profile.name
		? profile.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: (profile.email || profile.primary_email)?.charAt(0).toUpperCase() || "U";

	return (
		<div>
			<div className="page-header">
				<h1 className="page-title">Profile</h1>
				<p className="page-description">Manage your personal information and preferences</p>
			</div>

			{/* Success Message */}
			{successMessage && (
				<div
					style={{
						padding: "12px 16px",
						backgroundColor: "rgba(34, 197, 94, 0.1)",
						border: "1px solid rgba(34, 197, 94, 0.3)",
						borderRadius: "8px",
						color: "rgb(34, 197, 94)",
						marginBottom: "24px",
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<svg
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						style={{ width: "20px", height: "20px", flexShrink: 0 }}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					{successMessage}
				</div>
			)}

			<div className="card" style={{ padding: "24px" }}>
				{/* Profile Header */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "20px",
						paddingBottom: "24px",
						borderBottom: "1px solid var(--border-color)",
						marginBottom: "24px",
					}}
				>
					<div
						style={{
							width: "80px",
							height: "80px",
							borderRadius: "50%",
							background: "linear-gradient(135deg, var(--primary) 0%, #9333ea 100%)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "32px",
							fontWeight: "600",
							color: "white",
							flexShrink: 0,
							boxShadow: "0 4px 12px rgba(139, 92, 246, 0.25)",
						}}
					>
						{initials}
					</div>
					<div style={{ flex: 1 }}>
						<h2
							style={{
								fontSize: "24px",
								fontWeight: "600",
								marginBottom: "4px",
								color: "var(--text-primary)",
							}}
						>
							{profile.name || "Admin User"}
						</h2>
						<p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
							{profile.email || profile.primary_email}
						</p>
					</div>
					{!isEditing && (
						<button
							type="button"
							onClick={handleEdit}
							className="btn-secondary"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								padding: "10px 16px",
								fontSize: "14px",
								fontWeight: "500",
								borderRadius: "var(--radius)",
							}}
						>
							<svg
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								style={{ width: "16px", height: "16px" }}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
							Edit Profile
						</button>
					)}
				</div>

				{/* Profile Information */}
				<div>
					<h3
						style={{
							fontSize: "16px",
							fontWeight: "600",
							marginBottom: "20px",
							color: "var(--text-primary)",
						}}
					>
						Personal Information
					</h3>

					<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
						{/* Name Field */}
						<div>
							<label
								htmlFor="name"
								style={{
									display: "block",
									fontSize: "13px",
									fontWeight: "500",
									marginBottom: "8px",
									color: "var(--text-secondary)",
								}}
							>
								Full Name
							</label>
							{isEditing ? (
								<input
									id="name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Enter your full name"
									className="input"
									style={{
										maxWidth: "500px",
										fontSize: "14px",
									}}
								/>
							) : (
								<div
									style={{
										padding: "10px 14px",
										backgroundColor: "var(--input-bg)",
										border: "1px solid var(--input-border)",
										borderRadius: "6px",
										maxWidth: "500px",
										color: profile.name ? "var(--text-primary)" : "var(--text-tertiary)",
										fontSize: "14px",
									}}
								>
									{profile.name || "Not set"}
								</div>
							)}
						</div>

						{/* Email Field (Read-only) */}
						<div>
							<label
								htmlFor="email"
								style={{
									display: "block",
									fontSize: "13px",
									fontWeight: "500",
									marginBottom: "8px",
									color: "var(--text-secondary)",
								}}
							>
								Email Address
							</label>
							<div
								style={{
									padding: "10px 14px",
									backgroundColor: "var(--input-bg)",
									border: "1px solid var(--input-border)",
									borderRadius: "6px",
									maxWidth: "500px",
									color: "var(--text-secondary)",
									display: "flex",
									alignItems: "center",
									gap: "10px",
									fontSize: "14px",
								}}
							>
								<span style={{ flex: 1 }}>{profile.email || profile.primary_email}</span>
								<svg
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									style={{ width: "16px", height: "16px", opacity: 0.4, flexShrink: 0 }}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
									/>
								</svg>
							</div>
							<p
								style={{
									fontSize: "12px",
									color: "var(--text-tertiary)",
									marginTop: "6px",
								}}
							>
								Email address is managed by your authentication provider and cannot be changed here.
							</p>
						</div>

						{/* User ID (Read-only) */}
						<div>
							<label
								htmlFor="userId"
								style={{
									display: "block",
									fontSize: "13px",
									fontWeight: "500",
									marginBottom: "8px",
									color: "var(--text-secondary)",
								}}
							>
								User ID
							</label>
							<div
								style={{
									padding: "10px 14px",
									backgroundColor: "var(--input-bg)",
									border: "1px solid var(--input-border)",
									borderRadius: "6px",
									maxWidth: "500px",
									fontFamily: "monospace",
									fontSize: "13px",
									color: "var(--text-secondary)",
								}}
							>
								{profile.id}
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					{isEditing && (
						<div
							style={{
								display: "flex",
								gap: "10px",
								marginTop: "24px",
								paddingTop: "24px",
								borderTop: "1px solid var(--border-color)",
							}}
						>
							<button
								type="button"
								onClick={handleSave}
								disabled={updateProfile.isPending || !name.trim()}
								className="btn-primary"
								style={{
									minWidth: "110px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "8px",
									padding: "10px 16px",
									fontSize: "14px",
									fontWeight: "500",
									borderRadius: "var(--radius)",
								}}
							>
								{updateProfile.isPending ? (
									<>
										<div className="spinner" style={{ width: "14px", height: "14px" }} />
										Saving...
									</>
								) : (
									<>
										<svg
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											style={{ width: "16px", height: "16px" }}
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 13l4 4L19 7"
											/>
										</svg>
										Save Changes
									</>
								)}
							</button>
							<button
								type="button"
								onClick={handleCancel}
								disabled={updateProfile.isPending}
								className="btn-secondary"
								style={{
									padding: "10px 16px",
									fontSize: "14px",
									fontWeight: "500",
									borderRadius: "var(--radius)",
								}}
							>
								Cancel
							</button>
						</div>
					)}

					{/* Error Message */}
					{updateProfile.isError && (
						<div
							style={{
								marginTop: "16px",
								padding: "12px 16px",
								backgroundColor: "rgba(239, 68, 68, 0.1)",
								border: "1px solid rgba(239, 68, 68, 0.3)",
								borderRadius: "8px",
								color: "rgb(239, 68, 68)",
								fontSize: "14px",
							}}
						>
							{updateProfile.error instanceof Error
								? updateProfile.error.message
								: "Failed to update profile"}
						</div>
					)}
				</div>
			</div>

			{/* Additional Settings Section */}
			<div className="card" style={{ marginTop: "20px", padding: "24px" }}>
				<h3
					style={{
						fontSize: "16px",
						fontWeight: "600",
						marginBottom: "8px",
						color: "var(--text-primary)",
					}}
				>
					Account Settings
				</h3>
				<p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
					Additional account preferences and security settings
				</p>

				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{/* Theme Preference */}
					<div
						style={{
							padding: "16px",
							backgroundColor: "var(--input-bg)",
							border: "1px solid var(--input-border)",
							borderRadius: "6px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<div>
							<div style={{ fontWeight: "500", marginBottom: "4px", fontSize: "14px" }}>
								Theme Preference
							</div>
							<div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
								Your theme preference is managed in the header
							</div>
						</div>
						<svg
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							style={{ width: "20px", height: "20px", color: "var(--text-tertiary)", flexShrink: 0 }}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
							/>
						</svg>
					</div>

					{/* Sessions */}
					<div
						style={{
							padding: "16px",
							backgroundColor: "var(--input-bg)",
							border: "1px solid var(--input-border)",
							borderRadius: "6px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<div>
							<div style={{ fontWeight: "500", marginBottom: "4px", fontSize: "14px" }}>
								Active Sessions
							</div>
							<div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
								You are currently signed in
							</div>
						</div>
						<svg
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							style={{ width: "20px", height: "20px", color: "rgb(34, 197, 94)", flexShrink: 0 }}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
				</div>
			</div>
		</div>
	);
}
