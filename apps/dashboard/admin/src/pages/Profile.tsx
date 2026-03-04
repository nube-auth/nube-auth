import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { pingpong } from "../lib/pingpong";
import config from "../config";
import { useMe } from "../hooks/api";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Heading,
	Text,
	Card,
	CardBody,
	Label,
	Input,
	Button
} from "@proofa/components";
import { PageLoader } from "../components/PageLoader";

// Helper to normalize headers to Record<string, string>
function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
	if (!headers) return {};
	if (headers instanceof Headers) {
		return Object.fromEntries(headers.entries());
	}
	if (Array.isArray(headers)) {
		return Object.fromEntries(headers);
	}
	return headers;
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await pingpong(`${config.gatewayUrl}${path}`, {
		method: options?.method,
		credentials: "include",
		body: options?.body,
		headers: {
			"Content-Type": "application/json",
			...normalizeHeaders(options?.headers),
		},
	});

	if (!response.ok()) {
		const error = response.data ?? { message: "Request failed" };
		throw new Error(error.message || "Request failed");
	}

	return response.data as T;
}

export function ProfilePage() {
	const queryClient = useQueryClient();
	const [isEditing, setIsEditing] = useState(false);
	const [name, setName] = useState("");
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Fetch profile using shared hook
	const { data: profile, isLoading } = useMe();

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
		return <PageLoader />;
	}

	if (!profile) {
		return (
			<div>
				<Heading level={1} size="lg">Profile</Heading>
				<Alert variant="danger" className="mt-4">Failed to load profile</Alert>
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
			<div className="mb-8">
				<Heading level={1} size="lg">Profile</Heading>
				<Text className="text-text-muted mt-2">Manage your personal information and preferences</Text>
			</div>

			{/* Success Message */}
			{successMessage && (
				<Alert variant="success" className="mb-6">
					{successMessage}
				</Alert>
			)}

			<Card>
				<CardBody>
					{/* Profile Header */}
					<div className="flex items-center gap-5 pb-6 border-b border-border-color mb-6">
						<div className="w-20 h-20 rounded-full flex items-center justify-center text-32px font-semibold text-white shrink-0 shadow-lg bg-linear-to-br from-primary to-purple-600">
							{initials}
						</div>
						<div className="flex-1">
							<Heading level={2} size="lg" className="mb-1">
								{profile.name || "Admin User"}
							</Heading>
							<Text className="text-text-secondary">
								{profile.email || profile.primary_email}
							</Text>
						</div>
						{!isEditing && (
							<Button
								variant="secondary"
								onClick={handleEdit}
							>
								<Icon icon={IconType.Edit} size={16} />
								Edit Profile
							</Button>
						)}
					</div>

					{/* Profile Information */}
					<div>
						<Heading level={3} size="lg" className="mb-5">
							Personal Information
						</Heading>

						<div className="flex flex-col gap-5">
							{/* Name Field */}
							<div>
								<Label htmlFor="name">Full Name</Label>
								{isEditing ? (
									<Input
										id="name"
										type="text"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Enter your full name"
										className="max-w-500px"
									/>
								) : (
									<div 
										className={`px-3.5 py-2.5 bg-input-bg border border-input-border rounded-6px max-w-500px ${
											profile.name ? "text-text-primary" : "text-text-tertiary"
										}`}
									>
										{profile.name || "Not set"}
									</div>
								)}
							</div>

							{/* Email Field (Read-only) */}
							<div>
								<Label htmlFor="email">Email Address</Label>
								<div className="px-3.5 py-2.5 bg-input-bg border border-input-border rounded-6px max-w-500px text-text-secondary flex items-center gap-2.5">
									<span className="flex-1">{profile.email || profile.primary_email}</span>
									<Icon icon={IconType.Lock} size={16} className="opacity-40 shrink-0" />
								</div>
								<Text className="text-text-tertiary mt-1.5">
									Email address is managed by your authentication provider and cannot be changed here.
								</Text>
							</div>

							{/* User ID (Read-only) */}
							<div>
								<Label htmlFor="userId">User ID</Label>
								<div className="px-3.5 py-2.5 bg-input-bg border border-input-border rounded-6px max-w-500px font-mono text-13px text-text-secondary">
									{profile.id}
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						{isEditing && (
							<div className="flex gap-2.5 mt-6 pt-6 border-t border-border-color">
								<Button
									variant="primary"
									onClick={handleSave}
									disabled={updateProfile.isPending || !name.trim()}
									className="min-w-110px"
								>
									{updateProfile.isPending ? (
										<>
											<Spinner />
											Saving...
										</>
									) : (
										<>
											<Icon icon={IconType.Check} size={18} bold />
											Save Changes
										</>
									)}
								</Button>
								<Button
									variant="secondary"
									onClick={handleCancel}
									disabled={updateProfile.isPending}
								>
									Cancel
								</Button>
							</div>
						)}

						{/* Error Message */}
						{updateProfile.isError && (
							<Alert variant="danger" className="mt-4">
								{updateProfile.error instanceof Error
									? updateProfile.error.message
									: "Failed to update profile"}
							</Alert>
						)}
					</div>
				</CardBody>
			</Card>

			{/* Additional Settings Section */}
			<Card className="mt-5">
				<CardBody>
					<Heading level={3} size="lg" className="mb-2">
						Account Settings
					</Heading>
					<Text className="text-text-secondary mb-5">
						Additional account preferences and security settings
					</Text>

					<div className="flex flex-col gap-2.5">
						{/* Theme Preference */}
						<div className="p-4 bg-input-bg border border-input-border rounded-6px flex items-center justify-between">
							<div>
								<Text className="font-medium mb-1">
									Theme Preference
								</Text>
								<Text className="text-text-secondary">
									Your theme preference is managed in the header
								</Text>
							</div>
							<Icon icon={IconType.Moon} size={20} className="text-text-tertiary shrink-0" />
						</div>

						{/* Sessions */}
						<div className="p-4 bg-input-bg border border-input-border rounded-6px flex items-center justify-between">
							<div>
								<Text className="font-medium mb-1">
									Active Sessions
								</Text>
								<Text className="text-text-secondary">
									You are currently signed in
								</Text>
							</div>
							<Icon icon={IconType.CheckBadge} size={20} bold className="text-success shrink-0" />
						</div>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
