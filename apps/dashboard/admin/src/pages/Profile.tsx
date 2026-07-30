import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { pingpong } from "../lib/pingpong";
import config from "../config";
import { useMe } from "../hooks/api";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Card,
	CardHeader,
	CardTitle,
	CardBody,
	Field,
	Chip,
	Heading,
	Text,
	Label,
	Input,
	Button,
} from "@nube-auth/components";
import { ProfileHeader, InfoGrid } from "@nube-auth/components";
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
	const [name, setName] = useState("");
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Fetch profile using shared hook
	const { data: profile, isLoading } = useMe();

	useEffect(() => {
		setName(profile?.name || "");
	}, [profile?.name]);

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
			setSuccessMessage("Profile updated successfully!");
			setTimeout(() => setSuccessMessage(null), 3000);
		},
	});

	const handleSave = (e: FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		updateProfile.mutate({ name: name.trim() });
	};

	if (isLoading) {
		return <PageLoader />;
	}

	if (!profile) {
		return <Alert variant="danger">Failed to load profile</Alert>;
	}

	const email = profile.email || profile.primary_email || "";
	const createdAt = (profile as { createdAt?: string | null }).createdAt;
	const formatDate = (value?: string | null) => {
		if (!value) return "Recently";
		return new Date(value).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const initials = profile.name
		? profile.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: email.charAt(0).toUpperCase() || "U";

	return (
		<div className="space-y-6">
			<ProfileHeader
				name={profile.name || "Admin"}
				email={email}
				meta="Admin account"
				avatar={
					<div className="size-16 rounded-full bg-primary text-white grid place-items-center font-semibold ring-2 ring-card-border/80 shadow-sm">
						{initials}
					</div>
				}
			/>

			<Card>
				<CardBody>
					<InfoGrid
						items={[
							{ label: "Email", value: email },
							{
								label: "Status",
								value: (
									<span className="inline-flex items-center gap-2">
										<span className="size-2 rounded-full bg-emerald-500" /> Active
									</span>
								),
							},
							{
								label: "Account Type",
								value: (
									<span className="inline-flex items-center gap-2">
										<Icon icon={IconType.User} size={16} /> Admin
									</span>
								),
							},
							{ label: "Joined", value: formatDate(createdAt) },
						]}
						columns={4}
					/>
				</CardBody>
			</Card>

			{/* Success Message */}
			{successMessage && (
				<Alert variant="success" className="items-center gap-2">
					<Icon icon={IconType.CheckCircle} size={20} bold className="shrink-0" />
					<span>{successMessage}</span>
				</Alert>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Personal Information</CardTitle>
				</CardHeader>
				<CardBody>
					<form onSubmit={handleSave} className="flex flex-col gap-6">
						<Field>
							<Label>Email Address</Label>
							<div className="flex items-center gap-2">
								<Input type="email" value={email} disabled className="flex-1" />
								<Chip variant="success" size="sm" pill>
									Verified
								</Chip>
							</div>
							<Text className="text-sm text-muted mt-1">Email cannot be changed here.</Text>
						</Field>

						<Field>
							<Label htmlFor="displayName">Display Name</Label>
							<Input
								id="displayName"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter your name"
							/>
							<Text className="text-sm text-muted mt-1">
								This name is shown across the admin dashboard.
							</Text>
						</Field>

						<div>
							<Button type="submit" disabled={updateProfile.isPending || !name.trim()}>
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
						</div>
					</form>

					{updateProfile.isError && (
						<Alert variant="danger" className="mt-4">
							{updateProfile.error instanceof Error
								? updateProfile.error.message
								: "Failed to update profile"}
						</Alert>
					)}
				</CardBody>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Account Information</CardTitle>
				</CardHeader>
				<CardBody>
					<div className="flex flex-col divide-y divide-border">
						<div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
							<div className="flex flex-col gap-1">
								<Text className="text-sm font-medium">User ID</Text>
								<Text className="text-sm text-muted">Public identifier</Text>
							</div>
							<code className="text-sm bg-accent px-2 py-1 rounded">{profile.id}</code>
						</div>
						<div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
							<div className="flex flex-col gap-1">
								<Text className="text-sm font-medium">Account Created</Text>
								<Text className="text-sm text-muted">When this admin account was created</Text>
							</div>
							<Text className="text-sm">{formatDate(createdAt)}</Text>
						</div>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
