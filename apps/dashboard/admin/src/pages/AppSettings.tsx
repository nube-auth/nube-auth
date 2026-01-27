import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useApp, useProject, useUpdateApp } from "../hooks/api";
import { pingpong } from "../lib/pingpong";
import type { App } from "../types/admin";
import {
	Spinner,
	Alert,
	Heading,
	Text,
	Tabs,
	TabsList,
	TabsItem,
	TabsPanel,
	Card,
	CardBody,
	Label,
	Input,
	Textarea,
	Button
} from "@proofa/components";

type SettingsTab = "general" | "authentication" | "security" | "danger";

export function AppSettingsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const updateAppMutation = useUpdateApp(projectId || "", appId || "");

	const [activeTab, setActiveTab] = useState<SettingsTab>("general");
	const [formData, setFormData] = useState<Partial<App> | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const { showToast } = useToast();

	// Initialize formData when app data is loaded
	if (app && !formData) {
		setFormData({
			name: app.name,
			slug: app.slug,
			description: app.description,
			redirectUris: app.redirectUris || [],
			allowedHosts: app.allowedHosts || [],
			sessionTtlDays: app.sessionTtlDays || 30,
			accountLockoutMinutes: app.accountLockoutMinutes || 15,
			cacheTtlMinutes: app.cacheTtlMinutes || 10,
			rateLimit: app.rateLimit || 100,
			corsOrigins: app.corsOrigins || [],
		});
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value, type } = e.target;
		if (!formData) return;

		if (type === "checkbox") {
			setFormData((prev: Partial<App> | null) => ({
				...prev,
				[name]: (e.target as HTMLInputElement).checked,
			}));
		} else if (type === "number") {
			setFormData((prev: Partial<App> | null) => ({
				...prev,
				[name]: parseInt(value, 10),
			}));
		} else {
			setFormData((prev: Partial<App> | null) => ({
				...prev,
				[name]: value,
			}));
		}
	};

	const handleArrayFieldChange = (field: string, index: number, value: string) => {
		if (!formData) return;
		setFormData((prev: Partial<App> | null) => {
			if (!prev) return null;
			const arr = [...(prev[field as keyof typeof formData] as string[])];
			arr[index] = value;
			return {
				...prev,
				[field]: arr,
			};
		});
	};

	const addArrayField = (field: string) => {
		if (!formData) return;
		setFormData((prev: Partial<App> | null) => {
			if (!prev) return null;
			return {
				...prev,
				[field]: [...(prev[field as keyof typeof formData] as string[]), ""],
			};
		});
	};

	const removeArrayField = (field: string, index: number) => {
		if (!formData) return;
		setFormData((prev: Partial<App> | null) => {
			if (!prev) return null;
			const arr = [...(prev[field as keyof typeof formData] as string[])];
			arr.splice(index, 1);
			return {
				...prev,
				[field]: arr,
			};
		});
	};

	// OAuth providers are now managed via oauth_providers table, not inline

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData) return;

		setIsSaving(true);

		const dataToSend = {
			name: formData.name,
			slug: formData.slug,
			description: formData.description,
			redirectUris: (formData.redirectUris || []).filter((uri: string) => uri.trim()),
			allowedHosts: (formData.allowedHosts || []).filter((host: string) => host.trim()),
			sessionTtlDays: formData.sessionTtlDays || 30,
			accountLockoutMinutes: formData.accountLockoutMinutes || 15,
			cacheTtlMinutes: formData.cacheTtlMinutes || 10,
			rateLimit: formData.rateLimit || 100,
			corsOrigins: formData.corsOrigins || [],
		};

		try {
			await updateAppMutation.mutateAsync(dataToSend);
			// Success feedback (you can add a toast notification here)
		} catch (error) {
			console.error("Failed to update app:", error);
			// Error feedback (you can add a toast notification here)
		} finally {
			setIsSaving(false);
		}
	};

	if (projectLoading || appLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Spinner />
			</div>
		);
	}

	if (!project || !app || !formData) {
		return <Alert variant="danger">App not found</Alert>;
	}

	const tabs: { id: SettingsTab; label: string }[] = [
		{ id: "general", label: "General" },
		{ id: "authentication", label: "Authentication" },
		{ id: "security", label: "Security" },
		{ id: "danger", label: "Danger Zone" },
	];

	return (
		<div className="page">
			{/* Page Header *}
			<div className="mb-8">
				<Heading level={1} size="lg">App Settings</Heading>
				<Text className="text-text-muted mt-2">Configure your application settings and preferences</Text>
			</div>

			{/* Tabs */}
			<div className="border-b border-card-border mb-8">
				<div className="flex gap-8">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`py-3 text-14px font-semibold bg-transparent border-none cursor-pointer transition-all ${
								activeTab === tab.id
									? "text-primary border-b-2 border-primary"
									: "text-text-tertiary border-b-2 border-transparent"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Tab Content */}
			<form onSubmit={handleSave}>
				{/* General Tab */}
				{activeTab === "general" && (
					<div>
						<div className="card p-6 mb-4">
							<h3 className="text-16px font-semibold mb-5">Basic Information</h3>

							<div className="grid gap-5">
								<div>
									<label className="form-label">App Name *</label>
									<input
										type="text"
										name="name"
										className="form-control"
										value={formData.name || ""}
										onChange={handleInputChange}
										required
										placeholder="My Awesome App"
									/>
									<p className="text-12px text-text-tertiary mt-1.5">
										The public name of your application
									</p>
								</div>

								<div>
									<label className="form-label">App Slug *</label>
									<input
										type="text"
										name="slug"
										className="form-control"
										value={formData.slug || ""}
										onChange={handleInputChange}
										required
										pattern="[a-z0-9-]+"
										placeholder="my-awesome-app"
									/>
									<p className="text-12px text-text-tertiary mt-1.5">
										URL-friendly identifier (lowercase, hyphens only)
									</p>
								</div>

								<div>
									<label className="form-label">Description</label>
									<textarea
										name="description"
										className="form-control resize-y"
										value={formData.description || ""}
										onChange={handleInputChange}
										rows={3}
										placeholder="A brief description of your application..."
									/>
									<p className="text-12px text-text-tertiary mt-1.5">
										Optional description for internal reference
									</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Authentication Tab */}
				{activeTab === "authentication" && (
					<div>
						<div className="card p-6 mb-4">
							<h3 className="text-16px font-semibold mb-5">OAuth Providers</h3>
							<p className="text-14px text-text-tertiary mb-5">
								OAuth providers are now managed at the project level. Go to Project Settings to
								configure authentication providers.
							</p>
							<p className="text-14px text-text-tertiary mb-4">
								Allowed callback URLs after successful authentication
							</p>

							{(formData.redirectUris || []).map((uri: string, index: number) => (
								<div key={`redirectUri-${index}`} className="flex gap-2 mb-3">
									<input
										type="url"
										className="form-control flex-1"
										value={uri}
										onChange={(e) => handleArrayFieldChange("redirectUris", index, e.target.value)}
										placeholder="https://myapp.com/callback"
									/>
									<button
										type="button"
										onClick={() =>
											removeArrayField("redirectUris", (formData.redirectUris || []).indexOf(uri))
										}
										className="btn-danger btn-sm"
									>
										Remove
									</button>
								</div>
							))}

							<button
								type="button"
								onClick={() => addArrayField("redirectUris")}
								className="btn-secondary btn-sm mt-2"
							>
								+ Add Redirect URI
							</button>
						</div>

						<div className="card p-6">
							<h3 className="text-16px font-semibold mb-5">Allowed Hosts</h3>
							<p className="text-14px text-text-tertiary mb-4">
								Domains allowed to make requests to your app
							</p>

							{(formData.allowedHosts || []).map((host: string, index: number) => (
								<div key={`allowedHost-${index}`} className="flex gap-2 mb-3">
									<input
										type="text"
										className="form-control flex-1"
										value={host}
										onChange={(e) => handleArrayFieldChange("allowedHosts", index, e.target.value)}
										placeholder="myapp.com or localhost:3000"
									/>
									<button
										type="button"
										onClick={() =>
											removeArrayField(
												"allowedHosts",
												(formData.allowedHosts || []).indexOf(host),
											)
										}
										className="btn-danger btn-sm"
									>
										Remove
									</button>
								</div>
							))}

							<button
								type="button"
								onClick={() => addArrayField("allowedHosts")}
								className="btn-secondary btn-sm mt-2"
							>
								+ Add Allowed Host
							</button>
						</div>
					</div>
				)}

				{/* Security Tab */}
				{activeTab === "security" && (
					<div>
						<div className="card p-6 mb-4">
							<h3 className="text-16px font-semibold mb-5">Security Settings</h3>

							<div className="grid gap-5">
								<div>
									<label className="form-label">Account Lockout Duration (Minutes)</label>
									<input
										type="number"
										name="accountLockoutMinutes"
										className="form-control"
										value={formData.accountLockoutMinutes || 15}
										onChange={handleInputChange}
										min={5}
										max={120}
										required
									/>
									<p className="text-12px text-text-tertiary mt-1.5">
										Duration to lock accounts after failed login attempts (5-120 minutes)
									</p>
								</div>

								<div>
									<label className="form-label">Cache TTL (Minutes)</label>
									<input
										type="number"
										name="cacheTtlMinutes"
										className="form-control"
										value={formData.cacheTtlMinutes || 10}
										onChange={handleInputChange}
										min={1}
										max={60}
										required
									/>
									<p className="text-12px text-text-tertiary mt-1.5">
										How long to cache user session data (1-60 minutes)
									</p>
								</div>

								<div>
									<label className="form-label">Rate Limit (Requests Per Minute)</label>
									<input
										type="number"
										name="rateLimit"
										className="form-control"
										value={formData.rateLimit || 100}
										onChange={handleInputChange}
										min={10}
										max={1000}
										required
									/>
									<p className="text-12px text-text-tertiary mt-1.5">
										Maximum API requests per minute per user (10-1000)
									</p>
								</div>
							</div>
						</div>

						<div className="p-4 bg-info-bg border border-info-border rounded-lg text-14px text-info-text">
							<strong>💡 Pro Tip:</strong> Adjust these settings based on your app's needs. Higher values
							provide better UX but may increase security risks.
						</div>
					</div>
				)}

				{/* Danger Zone Tab */}
				{activeTab === "danger" && (
					<div>
						<div className="card p-6 border-2 border-danger">
							<h3 className="text-16px font-semibold mb-3 text-danger">⚠️ Danger Zone</h3>
							<p className="text-14px text-text-secondary mb-5">
								These actions are permanent and cannot be undone.
							</p>

							<div className="p-5 bg-danger-bg bg-opacity-5 rounded-lg border border-danger border-opacity-20">
								<h4 className="text-14px font-semibold mb-2 text-danger">Delete This App</h4>
								<p className="text-13px text-text-secondary mb-4">
									Once you delete an app, there is no going back. This will:
								</p>
								<ul className="text-13px text-text-secondary mb-4 pl-5">
									<li>Delete all user data and sessions</li>
									<li>Revoke all active licenses</li>
									<li>Remove all API keys and integrations</li>
									<li>Cancel all active subscriptions</li>
								</ul>
								<button type="button" onClick={() => setShowDeleteModal(true)} className="btn-danger">
									Delete App
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Save Button (shown for all tabs except danger zone) */}
				{activeTab !== "danger" && (
					<div className="mt-6 flex gap-3">
						<button
							type="submit"
							disabled={isSaving || updateAppMutation.isPending}
							className={`btn-primary ${isSaving || updateAppMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
						>
							{isSaving || updateAppMutation.isPending ? "Saving..." : "Save Changes"}
						</button>
						<button
							type="button"
							onClick={() => navigate(`/projects/${projectId}/apps/${appId}`)}
							className="btn-secondary"
						>
							Cancel
						</button>
					</div>
				)}
			</form>

			{/* Delete Confirmation Modal with Captcha */}
			<ConfirmModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={async () => {
					try {
						const response = await pingpong(
							`${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/admin/projects/${projectId}/apps/${appId}`,
							{
								method: "DELETE",
								credentials: "include",
							},
						);

						if (!response.ok) {
							const data = await response.json();
							throw new Error(data.error || "Failed to delete app");
						}

						showToast("App deleted successfully", "success");
						setShowDeleteModal(false);

						// Redirect to project apps page
						window.location.href = `/projects/${projectId}/apps`;
					} catch (error) {
						showToast(error instanceof Error ? error.message : "Failed to delete app", "error");
					}
				}}
				title="Delete Application"
				message={`Are you sure you want to delete "${app?.name}"? This action cannot be undone and will permanently delete all user data, sessions, licenses, API keys, and integrations.`}
				confirmText="Delete App"
				variant="danger"
				requireCaptcha={true}
			/>
		</div>
	);
}
