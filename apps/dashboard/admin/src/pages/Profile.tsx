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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
				<div className="mt-6">
					<div className="spinner" />
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="page-header">
				<h1 className="page-title">Profile</h1>
				<p className="text-text-secondary mt-4">Failed to load profile</p>
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
				<div className="alert-success mb-6 flex items-center gap-2">
					<svg
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						className="w-5 h-5 flex-shrink-0"
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

			<div className="card p-6">
				{/* Profile Header */}
				<div className="flex items-center gap-5 pb-6 border-b border-border-color mb-6">
					<div className="w-20 h-20 rounded-full flex items-center justify-center text-32px font-semibold text-white flex-shrink-0 shadow-lg bg-gradient-to-br from-primary to-purple-600">
						{initials}
					</div>
					<div className="flex-1">
						<h2 className="text-24px font-semibold mb-1 text-text-primary">
							{profile.name || "Admin User"}
						</h2>
						<p className="text-text-secondary text-14px">
							{profile.email || profile.primary_email}
						</p>
					</div>
					{!isEditing && (
						<button
							type="button"
							onClick={handleEdit}
							className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-14px font-medium rounded-[var(--radius)]"
						>
							<svg
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								className="w-4 h-4"
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
					<h3 className="text-16px font-semibold mb-5 text-text-primary">
						Personal Information
					</h3>

					<div className="flex flex-col gap-5">
						{/* Name Field */}
						<div>
							<label
								htmlFor="name"
								className="form-label"
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
									className="input max-w-500px text-14px"
								/>
							) : (
								<div 
									className={`px-3.5 py-2.5 bg-input-bg border border-input-border rounded-6px max-w-500px text-14px ${
										profile.name ? "text-text-primary" : "text-text-tertiary"
									}`}
								>
									{profile.name || "Not set"}
								</div>
							)}
						</div>

						{/* Email Field (Read-only) */}
						<div>
							<label
								htmlFor="email"
								className="form-label"
							>
								Email Address
							</label>
							<div className="px-3.5 py-2.5 bg-input-bg border border-input-border rounded-6px max-w-500px text-text-secondary flex items-center gap-2.5 text-14px">
								<span className="flex-1">{profile.email || profile.primary_email}</span>
								<svg
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									className="w-4 h-4 opacity-40 flex-shrink-0"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
									/>
								</svg>
							</div>
							<p className="text-12px text-text-tertiary mt-1.5">
								Email address is managed by your authentication provider and cannot be changed here.
							</p>
						</div>

						{/* User ID (Read-only) */}
						<div>
							<label
								htmlFor="userId"
								className="form-label"
							>
								User ID
							</label>
							<div className="px-3.5 py-2.5 bg-input-bg border border-input-border rounded-6px max-w-500px font-mono text-13px text-text-secondary">
								{profile.id}
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					{isEditing && (
						<div className="flex gap-2.5 mt-6 pt-6 border-t border-border-color">
							<button
								type="button"
								onClick={handleSave}
								disabled={updateProfile.isPending || !name.trim()}
								className="btn-primary min-w-110px flex items-center justify-center gap-2 px-4 py-2.5 text-14px font-medium rounded-[var(--radius)]"
							>
								{updateProfile.isPending ? (
									<>
										<div className="spinner w-3.5 h-3.5" />
										Saving...
									</>
								) : (
									<>
										<svg
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											className="w-4 h-4"
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
								className="btn-secondary px-4 py-2.5 text-14px font-medium rounded-[var(--radius)]"
							>
								Cancel
							</button>
						</div>
					)}

					{/* Error Message */}
					{updateProfile.isError && (
						<div className="alert-danger mt-4">
							{updateProfile.error instanceof Error
								? updateProfile.error.message
								: "Failed to update profile"}
						</div>
					)}
				</div>
			</div>

			{/* Additional Settings Section */}
			<div className="card mt-5 p-6">
				<h3 className="text-16px font-semibold mb-2 text-text-primary">
					Account Settings
				</h3>
				<p className="text-text-secondary text-13px mb-5">Additional account preferences and security settings</p>

				<div className="flex flex-col gap-2.5">
					{/* Theme Preference */}
					<div className="p-4 bg-input-bg border border-input-border rounded-6px flex items-center justify-between">
						<div>
							<div className="font-medium mb-1 text-14px">
								Theme Preference
							</div>
							<div className="text-12px text-text-secondary">
								Your theme preference is managed in the header
							</div>
						</div>
						<svg
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							className="w-5 h-5 text-text-tertiary flex-shrink-0"
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
					<div className="p-4 bg-input-bg border border-input-border rounded-6px flex items-center justify-between">
						<div>
							<div className="font-medium mb-1 text-14px">
								Active Sessions
							</div>
							<div className="text-12px text-text-secondary">
								You are currently signed in
							</div>
						</div>
						<svg
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							className="w-5 h-5 text-success flex-shrink-0"
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
