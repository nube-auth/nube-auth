import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useApp, useProject, useUpdateApp } from "../hooks/api";
import { pingpong } from "../lib/pingpong";
import type { App } from "../types/admin";

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
			sessionTtlDays: app.sessionTtlDays || 28,
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
			sessionTtlDays: formData.sessionTtlDays || 28,
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
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project || !app || !formData) {
		return <div className="error-state">App not found</div>;
	}

	const tabs: { id: SettingsTab; label: string }[] = [
		{ id: "general", label: "General" },
		{ id: "authentication", label: "Authentication" },
		{ id: "security", label: "Security" },
		{ id: "danger", label: "Danger Zone" },
	];

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div style={{ marginBottom: "24px" }}>
				<div
					style={{
						display: "flex",
						gap: "8px",
						alignItems: "center",
						fontSize: "13px",
						color: "var(--text-tertiary)",
					}}
				>
					<Link to="/projects" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						Projects
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}`}
						style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
					>
						{project.name}
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}/apps/${appId}`}
						style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
					>
						{app.name}
					</Link>
					<span>›</span>
					<span style={{ color: "var(--text-primary)" }}>Settings</span>
				</div>
			</div>

			{/* Page Header */}
			<div style={{ marginBottom: "32px" }}>
				<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>App Settings</h1>
				<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
					Configure your application settings and preferences
				</p>
			</div>

			{/* Tabs */}
			<div style={{ borderBottom: "1px solid var(--border-primary)", marginBottom: "32px" }}>
				<div style={{ display: "flex", gap: "32px" }}>
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							style={{
								padding: "12px 0",
								fontSize: "14px",
								fontWeight: "600",
								color: activeTab === tab.id ? "var(--primary)" : "var(--text-tertiary)",
								background: "none",
								border: "none",
								borderBottom:
									activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
								cursor: "pointer",
								transition: "all 0.2s ease",
							}}
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
						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>
								Basic Information
							</h3>

							<div style={{ display: "grid", gap: "20px" }}>
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
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
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
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
										URL-friendly identifier (lowercase, hyphens only)
									</p>
								</div>

								<div>
									<label className="form-label">Description</label>
									<textarea
										name="description"
										className="form-control"
										value={formData.description || ""}
										onChange={handleInputChange}
										rows={3}
										placeholder="A brief description of your application..."
										style={{ resize: "vertical" }}
									/>
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
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
						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>
								OAuth Providers
							</h3>
							<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "20px" }}>
								OAuth providers are now managed at the project level. Go to Project Settings to
								configure authentication providers.
							</p>
							<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "16px" }}>
								Allowed callback URLs after successful authentication
							</p>

						{(formData.redirectUris || []).map((uri: string, index: number) => (
							<div key={`redirectUri-${index}`} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
									<input
										type="url"
										className="form-control"
										value={uri}
									onChange={(e) => handleArrayFieldChange("redirectUris", index, e.target.value)}
									placeholder="https://myapp.com/callback"
									style={{ flex: 1 }}
								/>
								<button
									type="button"
									onClick={() => removeArrayField("redirectUris", (formData.redirectUris || []).indexOf(uri))}
										className="btn btn-danger-outline btn-sm"
									>
										Remove
									</button>
								</div>
							))}

							<button
								type="button"
								onClick={() => addArrayField("redirectUris")}
								className="btn btn-secondary-outline btn-sm"
								style={{ marginTop: "8px" }}
							>
								+ Add Redirect URI
							</button>
						</div>

						<div className="card" style={{ padding: "24px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>Allowed Hosts</h3>
							<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "16px" }}>
								Domains allowed to make requests to your app
							</p>

						{(formData.allowedHosts || []).map((host: string, index: number) => (
							<div key={`allowedHost-${index}`} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
									<input
										type="text"
										className="form-control"
										value={host}
									onChange={(e) => handleArrayFieldChange("allowedHosts", index, e.target.value)}
									placeholder="myapp.com or localhost:3000"
									style={{ flex: 1 }}
								/>
								<button
									type="button"
									onClick={() => removeArrayField("allowedHosts", (formData.allowedHosts || []).indexOf(host))}
										className="btn btn-danger-outline btn-sm"
									>
										Remove
									</button>
								</div>
							))}

							<button
								type="button"
								onClick={() => addArrayField("allowedHosts")}
								className="btn btn-secondary-outline btn-sm"
								style={{ marginTop: "8px" }}
							>
								+ Add Allowed Host
							</button>
						</div>
					</div>
				)}

				{/* Security Tab */}
				{activeTab === "security" && (
					<div>
						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>
								Security Settings
							</h3>

							<div style={{ display: "grid", gap: "20px" }}>
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
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
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
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
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
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
										Maximum API requests per minute per user (10-1000)
									</p>
								</div>
							</div>
						</div>

						<div
							style={{
								padding: "16px",
								background: "var(--info-bg)",
								border: "1px solid var(--info-border)",
								borderRadius: "8px",
								fontSize: "14px",
								color: "var(--info-text)",
							}}
						>
							<strong>💡 Pro Tip:</strong> Adjust these settings based on your app's needs. Higher values
							provide better UX but may increase security risks.
						</div>
					</div>
				)}

				{/* Danger Zone Tab */}
				{activeTab === "danger" && (
					<div>
						<div
							className="card"
							style={{ padding: "24px", borderColor: "var(--danger)", borderWidth: "2px" }}
						>
							<h3
								style={{
									fontSize: "16px",
									fontWeight: "600",
									marginBottom: "12px",
									color: "var(--danger)",
								}}
							>
								⚠️ Danger Zone
							</h3>
							<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
								These actions are permanent and cannot be undone.
							</p>

							<div
								style={{
									padding: "20px",
									background: "rgba(239, 68, 68, 0.05)",
									borderRadius: "8px",
									border: "1px solid rgba(239, 68, 68, 0.2)",
								}}
							>
								<h4
									style={{
										fontSize: "14px",
										fontWeight: "600",
										marginBottom: "8px",
										color: "var(--danger)",
									}}
								>
									Delete This App
								</h4>
								<p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
									Once you delete an app, there is no going back. This will:
								</p>
								<ul
									style={{
										fontSize: "13px",
										color: "var(--text-secondary)",
										marginBottom: "16px",
										paddingLeft: "20px",
									}}
								>
									<li>Delete all user data and sessions</li>
									<li>Revoke all active licenses</li>
									<li>Remove all API keys and integrations</li>
									<li>Cancel all active subscriptions</li>
								</ul>
								<button
									type="button"
									onClick={() => setShowDeleteModal(true)}
									className="btn btn-danger"
								>
									Delete App
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Save Button (shown for all tabs except danger zone) */}
				{activeTab !== "danger" && (
					<div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
						<button
							type="submit"
							disabled={isSaving || updateAppMutation.isPending}
							className="btn btn-primary"
							style={{
								opacity: isSaving || updateAppMutation.isPending ? 0.6 : 1,
								cursor: isSaving || updateAppMutation.isPending ? "not-allowed" : "pointer",
							}}
						>
							{isSaving || updateAppMutation.isPending ? "Saving..." : "Save Changes"}
						</button>
						<button
							type="button"
							onClick={() => navigate(`/projects/${projectId}/apps/${appId}`)}
							className="btn btn-secondary-outline"
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
