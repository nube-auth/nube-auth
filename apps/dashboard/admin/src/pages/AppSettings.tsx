import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useApp, useUpdateApp, useProject } from "../hooks/api";
import { App } from "../types/admin";

type SettingsTab = "general" | "authentication" | "licensing" | "security" | "danger";

export function AppSettingsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const updateAppMutation = useUpdateApp(projectId || "", appId || "");

	const [activeTab, setActiveTab] = useState<SettingsTab>("general");
	const [formData, setFormData] = useState<Partial<App> | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	// Initialize formData when app data is loaded
	if (app && !formData) {
		setFormData({
			name: app.name,
			slug: app.slug,
			description: app.description,
			redirectUris: app.redirectUris || [],
			requiredProviders: app.requiredProviders || [],
			allowedHosts: app.allowedHosts || [],
			appSessionTtlDays: app.appSessionTtlDays || 28,
			accountLockoutMinutes: app.accountLockoutMinutes || 15,
			cacheTtlMinutes: app.cacheTtlMinutes || 10,
			rateLimitRequestsPerMinute: app.rateLimitRequestsPerMinute || 100,
			licensingRequired: app.licensingRequired ?? true,
			defaultPlanId: app.defaultPlanId,
			isActive: app.isActive ?? true,
		});
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value, type } = e.target;
		if (!formData) return;

		if (type === "checkbox") {
			setFormData((prev) => ({
				...prev,
				[name]: (e.target as HTMLInputElement).checked,
			}));
		} else if (type === "number") {
			setFormData((prev) => ({
				...prev,
				[name]: parseInt(value, 10),
			}));
		} else {
			setFormData((prev) => ({
				...prev,
				[name]: value,
			}));
		}
	};

	const handleArrayFieldChange = (field: string, index: number, value: string) => {
		if (!formData) return;
		setFormData((prev) => {
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
		setFormData((prev) => {
			if (!prev) return null;
			return {
				...prev,
				[field]: [...(prev[field as keyof typeof formData] as string[]), ""],
			};
		});
	};

	const removeArrayField = (field: string, index: number) => {
		if (!formData) return;
		setFormData((prev) => {
			if (!prev) return null;
			const arr = [...(prev[field as keyof typeof formData] as string[])];
			arr.splice(index, 1);
			return {
				...prev,
				[field]: arr,
			};
		});
	};

	const handleProviderToggle = (provider: string) => {
		if (!formData) return;
		const providers = formData.requiredProviders || [];
		setFormData((prev) => ({
			...prev,
			requiredProviders: providers.includes(provider)
				? providers.filter((p) => p !== provider)
				: [...providers, provider],
		}));
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData) return;

		setIsSaving(true);

		const dataToSend = {
			name: formData.name,
			slug: formData.slug,
			description: formData.description,
			redirectUris: (formData.redirectUris || []).filter((uri) => uri.trim()),
			requiredProviders: (formData.requiredProviders || []).filter((p) => p.trim()),
			allowedHosts: (formData.allowedHosts || []).filter((host) => host.trim()),
			appSessionTtlDays: formData.appSessionTtlDays || 28,
			accountLockoutMinutes: formData.accountLockoutMinutes || 15,
			cacheTtlMinutes: formData.cacheTtlMinutes || 10,
			rateLimitRequestsPerMinute: formData.rateLimitRequestsPerMinute || 100,
			licensingRequired: formData.licensingRequired ?? true,
			isActive: formData.isActive ?? true,
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
		{ id: "licensing", label: "Licensing" },
		{ id: "security", label: "Security" },
		{ id: "danger", label: "Danger Zone" },
	];

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div style={{ marginBottom: "24px" }}>
				<div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
					<Link to="/projects" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						Projects
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}`} style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						{project.name}
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}/apps/${appId}`} style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
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
								borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
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
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>Basic Information</h3>

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

								<div>
									<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
										<input
											type="checkbox"
											name="isActive"
											checked={formData.isActive ?? true}
											onChange={handleInputChange}
											style={{ width: "18px", height: "18px", cursor: "pointer" }}
										/>
										<span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
											App is Active
										</span>
									</label>
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px", marginLeft: "26px" }}>
										Inactive apps cannot accept new logins or API requests
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
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>OAuth Providers</h3>
							<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "20px" }}>
								Select which authentication providers users can use to sign in
							</p>

							<div style={{ display: "grid", gap: "16px" }}>
								<label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "var(--surface-secondary)", borderRadius: "8px", cursor: "pointer" }}>
									<input
										type="checkbox"
										checked={(formData.requiredProviders || []).includes("google")}
										onChange={() => handleProviderToggle("google")}
										style={{ width: "18px", height: "18px", cursor: "pointer" }}
									/>
									<svg style={{ width: "24px", height: "24px" }} viewBox="0 0 24 24">
										<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
										<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
										<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
										<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
									</svg>
									<div>
										<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Google</div>
										<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Sign in with Google account</div>
									</div>
								</label>

								<label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "var(--surface-secondary)", borderRadius: "8px", cursor: "pointer" }}>
									<input
										type="checkbox"
										checked={(formData.requiredProviders || []).includes("github")}
										onChange={() => handleProviderToggle("github")}
										style={{ width: "18px", height: "18px", cursor: "pointer" }}
									/>
									<svg style={{ width: "24px", height: "24px" }} viewBox="0 0 24 24">
										<path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
									</svg>
									<div>
										<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>GitHub</div>
										<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Sign in with GitHub account</div>
									</div>
								</label>
							</div>
						</div>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>Redirect URIs</h3>
							<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "16px" }}>
								Allowed callback URLs after successful authentication
							</p>

							{(formData.redirectUris || []).map((uri, index) => (
								<div key={index} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
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
										onClick={() => removeArrayField("redirectUris", index)}
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

							{(formData.allowedHosts || []).map((host, index) => (
								<div key={index} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
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
										onClick={() => removeArrayField("allowedHosts", index)}
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

				{/* Licensing Tab */}
				{activeTab === "licensing" && (
					<div>
						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>License Management</h3>

							<div style={{ display: "grid", gap: "20px" }}>
								<div>
									<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
										<input
											type="checkbox"
											name="licensingRequired"
											checked={formData.licensingRequired ?? true}
											onChange={handleInputChange}
											style={{ width: "18px", height: "18px", cursor: "pointer" }}
										/>
										<span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
											Enable License Management
										</span>
									</label>
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px", marginLeft: "26px" }}>
										Require users to have an active license to access the app
									</p>
								</div>

								{formData.licensingRequired && app.defaultPlan && (
									<div>
										<label className="form-label">Default License Plan</label>
										<div style={{ 
											padding: "12px 16px", 
											background: "var(--surface-secondary)", 
											borderRadius: "8px",
											border: "1px solid var(--border-primary)",
										}}>
											<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", textTransform: "capitalize" }}>
												{app.defaultPlan.name}
											</div>
											<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
												Slug: {app.defaultPlan.slug}
											</div>
										</div>
										<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
											To change the default plan, go to{" "}
											<Link to={`/projects/${projectId}/apps/${appId}/licenses`} style={{ color: "var(--primary)" }}>
												Licenses & Plans
											</Link>
										</p>
									</div>
								)}

								<div>
									<label className="form-label">Session TTL (Days)</label>
									<input
										type="number"
										name="appSessionTtlDays"
										className="form-control"
										value={formData.appSessionTtlDays || 28}
										onChange={handleInputChange}
										min={1}
										max={365}
										required
									/>
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
										How long users stay logged in (1-365 days)
									</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Security Tab */}
				{activeTab === "security" && (
					<div>
						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>Security Settings</h3>

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
										name="rateLimitRequestsPerMinute"
										className="form-control"
										value={formData.rateLimitRequestsPerMinute || 100}
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

						<div style={{
							padding: "16px",
							background: "var(--info-bg)",
							border: "1px solid var(--info-border)",
							borderRadius: "8px",
							fontSize: "14px",
							color: "var(--info-text)",
						}}>
							<strong>💡 Pro Tip:</strong> Adjust these settings based on your app's needs. Higher values provide better UX but may increase security risks.
						</div>
					</div>
				)}

				{/* Danger Zone Tab */}
				{activeTab === "danger" && (
					<div>
						<div className="card" style={{ padding: "24px", borderColor: "var(--danger)", borderWidth: "2px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "var(--danger)" }}>
								⚠️ Danger Zone
							</h3>
							<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
								These actions are permanent and cannot be undone.
							</p>

							<div style={{ padding: "20px", background: "rgba(239, 68, 68, 0.05)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
								<h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--danger)" }}>
									Delete This App
								</h4>
								<p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
									Once you delete an app, there is no going back. This will:
								</p>
								<ul style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px", paddingLeft: "20px" }}>
									<li>Delete all user data and sessions</li>
									<li>Revoke all active licenses</li>
									<li>Remove all API keys and integrations</li>
									<li>Cancel all active subscriptions</li>
								</ul>
								<button
									type="button"
									onClick={() => {
										const confirmed = window.confirm(
											`Are you sure you want to delete "${app.name}"?\n\nThis action cannot be undone. Type the app name to confirm.`
										);
										if (confirmed) {
											const typedName = prompt(`Type "${app.name}" to confirm deletion:`);
											if (typedName === app.name) {
												alert("App deletion is not yet implemented in the backend.");
												// TODO: Implement delete app endpoint
												// deleteAppMutation.mutate();
											} else {
												alert("App name didn't match. Deletion cancelled.");
											}
										}
									}}
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
		</div>
	);
}
