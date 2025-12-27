import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp, useUpdateApp, useProject } from "../hooks/api";
import { App } from "../types/admin";

export function AppDetailPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const updateAppMutation = useUpdateApp(projectId || "", appId || "");

	const [isEditing, setIsEditing] = useState(false);
	const [copied, setCopied] = useState(false);
	const [formData, setFormData] = useState<Partial<App> | null>(null);

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
			licensingRequired: app.licensingRequired ?? true,
			defaultLicensePlan: app.defaultLicensePlan || "free",
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

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData) return;

		const dataToSend = {
			name: formData.name,
			slug: formData.slug,
			description: formData.description,
			redirectUris: (formData.redirectUris || []).filter((uri) => uri.trim()),
			requiredProviders: (formData.requiredProviders || []).filter((p) => p.trim()),
			allowedHosts: (formData.allowedHosts || []).filter((host) => host.trim()),
			appSessionTtlDays: formData.appSessionTtlDays,
			licensingRequired: Boolean(formData.licensingRequired),
			defaultLicensePlan: formData.defaultLicensePlan as "free" | "trial",
			trialDays: formData.trialDays,
		};

		updateAppMutation.mutate(dataToSend, {
			onSuccess: () => {
				setIsEditing(false);
			},
		});
	};

	const copyPublicId = () => {
		if (app?.id) {
			navigator.clipboard.writeText(app.id);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	if (projectLoading || appLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project) {
		return (
			<div className="alert alert-danger">
				<span>Project not found</span>
			</div>
		);
	}

	if (!app) {
		return (
			<div className="alert alert-danger">
				<span>App not found</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
				<button
					onClick={() => navigate(`/projects/${projectId}`)}
					style={{
						background: "none",
						border: "none",
						color: "var(--primary)",
						cursor: "pointer",
						textDecoration: "underline",
					}}
				>
					{project.name}
				</button>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<button
					onClick={() => navigate(`/projects/${projectId}`)}
					style={{
						background: "none",
						border: "none",
						color: "var(--text-secondary)",
						cursor: "pointer",
						textDecoration: "underline",
					}}
				>
					Apps
				</button>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>{app.name}</span>
			</nav>

			{/* App Header Card */}
			<div className="card">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px" }}>
					<div>
						<h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>
							{app.name}
						</h1>
						<p style={{ color: "var(--text-secondary)" }}>
							{app.description || "No description provided"}
						</p>
					</div>
					<button
						onClick={() => setIsEditing(!isEditing)}
						className="btn btn-primary"
					>
						{isEditing ? "Cancel" : "Edit"}
					</button>
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", padding: "16px 0", borderTop: "1px solid var(--border-secondary)" }}>
					<div>
						<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Public ID</p>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
							<code style={{ background: "var(--content-bg)", padding: "4px 8px", borderRadius: "4px", fontFamily: "monospace", fontSize: "13px" }}>
								{app.id}
							</code>
							<button
								onClick={copyPublicId}
								style={{
									background: "none",
									border: "none",
									cursor: "pointer",
									color: "var(--primary)",
									fontSize: "13px",
									fontWeight: "500",
								}}
							>
								{copied ? "Copied!" : "Copy"}
							</button>
						</div>
					</div>
					<div>
						<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Status</p>
						<div style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							padding: "4px 12px",
							borderRadius: "12px",
							background: app.isActive ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
							color: app.isActive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
							fontSize: "13px",
							fontWeight: "500",
						}}>
							<div style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								background: app.isActive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
							}} />
							{app.isActive ? "Active" : "Inactive"}
						</div>
					</div>
					<div>
						<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Created</p>
						<p style={{ fontSize: "13px", color: "var(--text-primary)" }}>
							{new Date(app.createdAt).toLocaleDateString()}
						</p>
					</div>
					<div>
						<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Last Updated</p>
						<p style={{ fontSize: "13px", color: "var(--text-primary)" }}>
							{new Date(app.updatedAt).toLocaleDateString()}
						</p>
					</div>
				</div>
			</div>

			{/* Edit Form */}
			{isEditing && formData && (
				<form onSubmit={handleSave} className="card">
					<h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "24px", color: "var(--text-primary)" }}>
						Edit Application
					</h2>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", marginBottom: "24px" }}>
						<div>
							<label htmlFor="name" className="form-label">
								App Name *
							</label>
							<input
								type="text"
								id="name"
								name="name"
								required
								value={formData.name || ""}
								onChange={handleInputChange}
							/>
						</div>

						<div>
							<label htmlFor="slug" className="form-label">
								App Slug
							</label>
							<input
								type="text"
								id="slug"
								name="slug"
								value={formData.slug || ""}
								onChange={handleInputChange}
							/>
						</div>

						<div style={{ gridColumn: "1 / -1" }}>
							<label htmlFor="description" className="form-label">
								Description
							</label>
							<textarea
								id="description"
								name="description"
								value={formData.description || ""}
								onChange={handleInputChange}
								rows={3}
							/>
						</div>

						<div style={{ gridColumn: "1 / -1" }}>
							<label className="form-label">Required OAuth Providers *</label>
							<div style={{ display: "flex", gap: "12px" }}>
								{["google", "github"].map((provider) => (
									<label key={provider} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
										<input
											type="checkbox"
											value={provider}
											checked={(formData.requiredProviders || []).includes(provider)}
											onChange={(e) => {
												if (e.target.checked) {
													setFormData((prev) => ({
														...prev,
														requiredProviders: [...(prev?.requiredProviders || []), provider],
													}));
												} else {
													setFormData((prev) => ({
														...prev,
														requiredProviders: (prev?.requiredProviders || []).filter((p) => p !== provider),
													}));
												}
											}}
										/>
										<span style={{ textTransform: "capitalize", fontWeight: "500" }}>{provider}</span>
									</label>
								))}
							</div>
						</div>

						<div style={{ gridColumn: "1 / -1" }}>
							<label className="form-label">
								Redirect URIs *
							</label>
							<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
								{(formData.redirectUris || []).map((uri, index) => (
									<div key={index} style={{ display: "flex", gap: "8px" }}>
										<input
											type="url"
											placeholder="e.g., http://localhost:3000/callback"
											value={uri}
											onChange={(e) => handleArrayFieldChange("redirect_uris", index, e.target.value)}
											style={{ flex: 1 }}
										/>
										{(formData.redirectUris || []).length > 1 && (
											<button
												type="button"
												onClick={() => removeArrayField("redirectUris", index)}
												className="btn btn-ghost btn-sm"
												style={{ color: "var(--danger)" }}
											>
												<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										)}
									</div>
								))}
							</div>
							<button
								type="button"
								onClick={() => addArrayField("redirect_uris")}
								className="btn btn-secondary btn-sm"
							>
								<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								Add URI
							</button>
						</div>

						<div style={{ gridColumn: "1 / -1" }}>
							<label className="form-label">Allowed Hosts</label>
							<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
								{(formData.allowedHosts || []).map((host, index) => (
									<div key={index} style={{ display: "flex", gap: "8px" }}>
										<input
											type="text"
											placeholder="e.g., localhost:3000, example.com"
											value={host}
											onChange={(e) => handleArrayFieldChange("allowed_hosts", index, e.target.value)}
											style={{ flex: 1 }}
										/>
										{(formData.allowedHosts || []).length > 1 && (
											<button
												type="button"
												onClick={() => removeArrayField("allowedHosts", index)}
												className="btn btn-ghost btn-sm"
												style={{ color: "var(--danger)" }}
											>
												<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										)}
									</div>
								))}
							</div>
							<button
								type="button"
								onClick={() => addArrayField("allowed_hosts")}
								className="btn btn-secondary btn-sm"
							>
								<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								Add Host
							</button>
						</div>

						<div>
							<label htmlFor="app_session_ttl_days" className="form-label">
								Session TTL (days)
							</label>
							<input
								type="number"
								id="app_session_ttl_days"
								name="app_session_ttl_days"
								min="1"
								max="365"
								value={formData.appSessionTtlDays || 28}
								onChange={handleInputChange}
							/>
						</div>

						<div>
							<label htmlFor="default_license_plan" className="form-label">
								Default License Plan
							</label>
							<select
								id="default_license_plan"
								name="default_license_plan"
								value={formData.defaultLicensePlan || "free"}
								onChange={handleInputChange}
							>
								<option value="free">Free</option>
								<option value="trial">Trial</option>
								<option value="pro">Pro</option>
								<option value="enterprise">Enterprise</option>
							</select>
						</div>

						<div style={{ gridColumn: "1 / -1" }}>
							<label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "12px", background: "var(--content-bg)", borderRadius: "8px" }}>
								<input
									type="checkbox"
									name="licensingRequired"
									checked={formData.licensingRequired ?? true}
									onChange={handleInputChange}
									style={{ cursor: "pointer" }}
								/>
								<div>
									<div style={{ fontWeight: "500", color: "var(--text-primary)" }}>Licensing Required</div>
									<div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
										Users must have a valid license to access this app
									</div>
								</div>
							</label>
						</div>

						<div style={{ gridColumn: "1 / -1" }}>
							<label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "12px", background: "var(--content-bg)", borderRadius: "8px" }}>
								<input
									type="checkbox"
									name="isActive"
									checked={formData.isActive ?? true}
									onChange={handleInputChange}
									style={{ cursor: "pointer" }}
								/>
								<div>
									<div style={{ fontWeight: "500", color: "var(--text-primary)" }}>App Active</div>
									<div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
										When disabled, users cannot authenticate with this app
									</div>
								</div>
							</label>
						</div>
					</div>

					<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--border-secondary)", paddingTop: "24px" }}>
						<button
							type="button"
							onClick={() => {
								setIsEditing(false);
								setFormData(null);
							}}
							className="btn btn-secondary"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={updateAppMutation.isPending}
							className="btn btn-primary"
						>
							{updateAppMutation.isPending ? "Saving..." : "Save Changes"}
						</button>
					</div>

					{updateAppMutation.isError && (
						<div className="alert alert-danger" style={{ marginTop: "16px" }}>
							<span>Error updating app. Please try again.</span>
						</div>
					)}
					{updateAppMutation.isSuccess && (
						<div className="alert alert-success" style={{ marginTop: "16px" }}>
							<span>App updated successfully!</span>
						</div>
					)}
				</form>
			)}

			{/* Details Grid */}
			{!isEditing && (
				<div className="card">
					<h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "24px", color: "var(--text-primary)" }}>
						Configuration
					</h2>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
						<div>
							<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "8px" }}>OAuth Providers</p>
							<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
								{app.requiredProviders?.length ? (
									app.requiredProviders.map((provider) => (
										<span
											key={provider}
											style={{
												display: "inline-block",
												padding: "4px 12px",
												background: "var(--primary)",
												color: "white",
												borderRadius: "12px",
												fontSize: "13px",
												fontWeight: "500",
												textTransform: "capitalize",
											}}
										>
											{provider}
										</span>
									))
								) : (
									<p style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>Not configured</p>
								)}
							</div>
						</div>

						<div>
							<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "8px" }}>Session TTL</p>
							<p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "500" }}>
								{app.appSessionTtlDays} days
							</p>
						</div>

						<div style={{ gridColumn: "1 / -1" }}>
							<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "8px" }}>Redirect URIs</p>
							<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
								{app.redirectUris?.length ? (
									app.redirectUris.map((uri, index) => (
										<code
											key={index}
											style={{
												background: "var(--content-bg)",
												padding: "8px 12px",
												borderRadius: "4px",
												fontFamily: "monospace",
												fontSize: "13px",
												color: "var(--text-primary)",
											}}
										>
											{uri}
										</code>
									))
								) : (
									<p style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>Not configured</p>
								)}
							</div>
						</div>

						<div style={{ gridColumn: "1 / -1" }}>
							<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "8px" }}>Allowed Hosts</p>
							<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
								{app.allowedHosts?.length ? (
									app.allowedHosts.map((host, index) => (
										<code
											key={index}
											style={{
												background: "var(--content-bg)",
												padding: "8px 12px",
												borderRadius: "4px",
												fontFamily: "monospace",
												fontSize: "13px",
												color: "var(--text-primary)",
											}}
										>
											{host}
										</code>
									))
								) : (
									<p style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>Not configured</p>
								)}
							</div>
						</div>

						<div>
							<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "8px" }}>License Plan</p>
							<p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "500", textTransform: "capitalize" }}>
								{app.defaultLicensePlan}
							</p>
						</div>

						<div>
							<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "8px" }}>Licensing Required</p>
							<p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "500" }}>
								{app.licensingRequired ? "Yes" : "No"}
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
