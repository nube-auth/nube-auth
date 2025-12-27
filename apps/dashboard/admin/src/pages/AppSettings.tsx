import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useApp, useUpdateApp, useProject } from "../hooks/api";
import { App } from "../types/admin";

export function AppSettingsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const updateAppMutation = useUpdateApp(projectId || "", appId || "");

	const [isEditing, setIsEditing] = useState(false);
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

	if (projectLoading || appLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project || !app) {
		return (
			<div className="alert alert-danger">
				<span>Project or App not found</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
				<Link to="/projects" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
					Projects
				</Link>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link to={`/projects/${projectId}`} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
					{project.name}
				</Link>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link to={`/projects/${projectId}/apps/${appId}`} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
					{app.name}
				</Link>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>Settings</span>
			</nav>

			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<button
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}`)}
						style={{
							background: "none",
							border: "1px solid var(--border-secondary)",
							borderRadius: "8px",
							padding: "8px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--text-secondary)",
							transition: "all 0.2s ease",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = "var(--primary)";
							e.currentTarget.style.color = "var(--primary)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.borderColor = "var(--border-secondary)";
							e.currentTarget.style.color = "var(--text-secondary)";
						}}
					>
						<svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
						</svg>
					</button>
					<h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
						Application Settings
					</h2>
				</div>
				{!isEditing && (
					<button
						onClick={() => setIsEditing(true)}
						className="btn btn-primary"
					>
						Edit Settings
					</button>
				)}
			</div>

			{/* Display Mode (non-editing) */}
			{!isEditing && (
				<div style={{ display: "grid", gap: "20px" }}>
					{/* Basic Information Card */}
					<div className="card" style={{ padding: "24px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
							<div style={{
								width: "40px",
								height: "40px",
								borderRadius: "10px",
								background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
								<svg style={{ width: "20px", height: "20px", color: "rgb(59, 130, 246)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
								Basic Information
							</h3>
						</div>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
							<div>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>App Name</p>
								<p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: "500" }}>{app.name}</p>
							</div>
							<div>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>Slug</p>
								<code style={{ 
									fontSize: "13px", 
									color: "var(--primary)", 
									fontWeight: "500",
									background: "rgba(139, 92, 246, 0.1)",
									padding: "4px 8px",
									borderRadius: "6px",
								}}>
									{app.slug}
								</code>
							</div>
						</div>
						{app.description && (
							<div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--card-border)" }}>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>Description</p>
								<p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6" }}>{app.description}</p>
							</div>
						)}
					</div>

					{/* OAuth Configuration Card */}
					<div className="card" style={{ padding: "24px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
							<div style={{
								width: "40px",
								height: "40px",
								borderRadius: "10px",
								background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
								<svg style={{ width: "20px", height: "20px", color: "var(--success)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							</div>
							<h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
								OAuth Configuration
							</h3>
						</div>
						<div style={{ display: "grid", gap: "20px" }}>
							<div>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "8px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>Redirect URIs</p>
								<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
									{app.redirectUris && app.redirectUris.length > 0 ? (
										app.redirectUris.map((uri, idx) => (
											<div key={idx} style={{ 
												display: "flex", 
												alignItems: "center", 
												gap: "8px",
												background: "var(--content-bg)",
												padding: "10px 12px",
												borderRadius: "8px",
												border: "1px solid var(--card-border)",
											}}>
												<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
												</svg>
												<code style={{ fontSize: "13px", color: "var(--text-primary)", fontFamily: "monospace" }}>
													{uri}
												</code>
											</div>
										))
									) : (
										<div style={{ 
											padding: "16px", 
											background: "var(--content-bg)", 
											borderRadius: "8px",
											textAlign: "center",
											color: "var(--text-tertiary)",
											fontSize: "13px",
										}}>
											No redirect URIs configured
										</div>
									)}
								</div>
							</div>
							<div>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "8px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>Allowed Hosts</p>
								<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
									{app.allowedHosts && app.allowedHosts.length > 0 ? (
										app.allowedHosts.map((host, idx) => (
											<div key={idx} style={{ 
												display: "flex", 
												alignItems: "center", 
												gap: "8px",
												background: "var(--content-bg)",
												padding: "10px 12px",
												borderRadius: "8px",
												border: "1px solid var(--card-border)",
											}}>
												<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
												</svg>
												<code style={{ fontSize: "13px", color: "var(--text-primary)", fontFamily: "monospace" }}>
													{host}
												</code>
											</div>
										))
									) : (
										<div style={{ 
											padding: "16px", 
											background: "var(--content-bg)", 
											borderRadius: "8px",
											textAlign: "center",
											color: "var(--text-tertiary)",
											fontSize: "13px",
										}}>
											No allowed hosts configured
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Licensing & Sessions Card */}
					<div className="card" style={{ padding: "24px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
							<div style={{
								width: "40px",
								height: "40px",
								borderRadius: "10px",
								background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
								<svg style={{ width: "20px", height: "20px", color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
								</svg>
							</div>
							<h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
								Licensing & Sessions
							</h3>
						</div>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
							<div style={{ 
								padding: "16px", 
								background: "var(--surface-secondary)", 
								borderRadius: "10px",
								border: "1px solid var(--border-secondary)",
							}}>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>Licensing Required</p>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<span style={{
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										width: "20px",
										height: "20px",
										borderRadius: "50%",
										background: app.licensingRequired ? "rgba(34, 197, 94, 0.1)" : "rgba(156, 163, 175, 0.1)",
										color: app.licensingRequired ? "var(--success)" : "var(--text-tertiary)",
									}}>
										<svg style={{ width: "12px", height: "12px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											{app.licensingRequired ? (
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
											) : (
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
											)}
										</svg>
									</span>
									<p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: "600", margin: 0 }}>
										{app.licensingRequired ? "Yes" : "No"}
									</p>
								</div>
							</div>
							<div style={{ 
								padding: "16px", 
								background: "var(--surface-secondary)", 
								borderRadius: "10px",
								border: "1px solid var(--border-secondary)",
							}}>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>Default License Plan</p>
								<p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: "600", textTransform: "capitalize", margin: 0 }}>
									{app.defaultLicensePlan || "—"}
								</p>
							</div>
							<div style={{ 
								padding: "16px", 
								background: "var(--surface-secondary)", 
								borderRadius: "10px",
								border: "1px solid var(--border-secondary)",
							}}>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>App Session TTL</p>
								<p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: "600", margin: 0 }}>
									{app.appSessionTtlDays} days
								</p>
							</div>
							{app.trialDays && (
								<div style={{ 
									padding: "16px", 
									background: "var(--content-bg)", 
									borderRadius: "10px",
									border: "1px solid var(--card-border)",
								}}>
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "6px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>Trial Days</p>
									<p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: "600", margin: 0 }}>
										{app.trialDays} days
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Edit Form */}
			{isEditing && formData && (
				<form onSubmit={handleSave} className="card" style={{ padding: "32px" }}>
					<h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "28px", color: "var(--text-primary)" }}>
						Edit Application
					</h2>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
						{/* App Name */}
						<div>
							<label htmlFor="name" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
								App Name <span style={{ color: "var(--danger)" }}>*</span>
							</label>
							<input
								type="text"
								id="name"
								name="name"
								required
								value={formData.name || ""}
								onChange={handleInputChange}
								style={{
									width: "100%",
									padding: "10px 12px",
									border: "1px solid var(--card-border)",
									borderRadius: "8px",
									background: "var(--content-bg)",
									color: "var(--text-primary)",
									fontSize: "14px",
									outline: "none",
									transition: "all 0.2s ease",
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = "var(--primary)";
									e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = "var(--card-border)";
									e.currentTarget.style.boxShadow = "none";
								}}
							/>
						</div>

						{/* App Slug */}
						<div>
							<label htmlFor="slug" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
								App Slug
							</label>
							<input
								type="text"
								id="slug"
								name="slug"
								value={formData.slug || ""}
								onChange={handleInputChange}
								style={{
									width: "100%",
									padding: "10px 12px",
									border: "1px solid var(--card-border)",
									borderRadius: "8px",
									background: "var(--content-bg)",
									color: "var(--text-primary)",
									fontSize: "14px",
									outline: "none",
									transition: "all 0.2s ease",
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = "var(--primary)";
									e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = "var(--card-border)";
									e.currentTarget.style.boxShadow = "none";
								}}
							/>
						</div>

						{/* Description */}
						<div style={{ gridColumn: "1 / -1" }}>
							<label htmlFor="description" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
								Description
							</label>
							<textarea
								id="description"
								name="description"
								value={formData.description || ""}
								onChange={handleInputChange}
								rows={3}
								style={{
									width: "100%",
									padding: "10px 12px",
									border: "1px solid var(--card-border)",
									borderRadius: "8px",
									background: "var(--content-bg)",
									color: "var(--text-primary)",
									fontSize: "14px",
									outline: "none",
									transition: "all 0.2s ease",
									resize: "vertical",
									fontFamily: "inherit",
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = "var(--primary)";
									e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = "var(--card-border)";
									e.currentTarget.style.boxShadow = "none";
								}}
							/>
						</div>

						{/* OAuth Providers */}
						<div style={{ gridColumn: "1 / -1" }}>
							<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>
								Required OAuth Providers <span style={{ color: "var(--danger)" }}>*</span>
							</label>
							<div style={{ display: "flex", gap: "16px" }}>
								{["google", "github"].map((provider: string) => (
									<label key={provider} style={{ 
										display: "flex", 
										alignItems: "center", 
										gap: "10px", 
										cursor: "pointer",
										padding: "12px 16px",
										background: (formData.requiredProviders || []).includes(provider) ? "rgba(139, 92, 246, 0.1)" : "var(--surface-secondary)",
										border: `1px solid ${(formData.requiredProviders || []).includes(provider) ? "var(--primary)" : "var(--border-secondary)"}`,
										borderRadius: "8px",
										transition: "all 0.2s ease",
									}}>
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
											style={{ cursor: "pointer", width: "16px", height: "16px" }}
										/>
										<span style={{ textTransform: "capitalize", fontWeight: "500", fontSize: "14px", color: "var(--text-primary)" }}>
											{provider}
										</span>
									</label>
								))}
							</div>
						</div>

						{/* Redirect URIs */}
						<div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
							<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>
								Redirect URIs <span style={{ color: "var(--danger)" }}>*</span>
							</label>
							<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
								{(formData.redirectUris || []).map((uri, index) => (
									<div key={index} style={{ display: "flex", gap: "10px" }}>
										<input
											type="url"
											value={uri}
											onChange={(e) => handleArrayFieldChange("redirectUris", index, e.target.value)}
											placeholder="https://example.com/callback"
											style={{
												flex: 1,
												padding: "10px 12px",
												border: "1px solid var(--card-border)",
												borderRadius: "8px",
												background: "var(--content-bg)",
												color: "var(--text-primary)",
												fontSize: "14px",
												outline: "none",
												fontFamily: "monospace",
											}}
											onFocus={(e) => {
												e.currentTarget.style.borderColor = "var(--primary)";
												e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
											}}
											onBlur={(e) => {
												e.currentTarget.style.borderColor = "var(--card-border)";
												e.currentTarget.style.boxShadow = "none";
											}}
										/>
										<button
											type="button"
											onClick={() => removeArrayField("redirectUris", index)}
											style={{
												padding: "10px 12px",
												border: "1px solid var(--card-border)",
												borderRadius: "8px",
												background: "transparent",
												color: "var(--danger)",
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												transition: "all 0.2s ease",
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
												e.currentTarget.style.borderColor = "var(--danger)";
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = "transparent";
												e.currentTarget.style.borderColor = "var(--card-border)";
											}}
										>
											<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								))}
							</div>
							<button
								type="button"
								onClick={() => addArrayField("redirectUris")}
								style={{
									marginTop: "12px",
									padding: "8px 14px",
									border: "1px solid var(--card-border)",
									borderRadius: "8px",
									background: "var(--content-bg)",
									color: "var(--text-primary)",
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									fontSize: "13px",
									fontWeight: "500",
									transition: "all 0.2s ease",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = "var(--primary)";
									e.currentTarget.style.color = "var(--primary)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = "var(--card-border)";
									e.currentTarget.style.color = "var(--text-primary)";
								}}
							>
								<svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								Add URI
							</button>
						</div>

						{/* Allowed Hosts */}
						<div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
							<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>
								Allowed Hosts
							</label>
							<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
								{(formData.allowedHosts || []).map((host, index) => (
									<div key={index} style={{ display: "flex", gap: "10px" }}>
										<input
											type="text"
											value={host}
											onChange={(e) => handleArrayFieldChange("allowedHosts", index, e.target.value)}
											placeholder="example.com"
											style={{
												flex: 1,
												padding: "10px 12px",
												border: "1px solid var(--card-border)",
												borderRadius: "8px",
												background: "var(--content-bg)",
												color: "var(--text-primary)",
												fontSize: "14px",
												outline: "none",
												fontFamily: "monospace",
											}}
											onFocus={(e) => {
												e.currentTarget.style.borderColor = "var(--primary)";
												e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
											}}
											onBlur={(e) => {
												e.currentTarget.style.borderColor = "var(--card-border)";
												e.currentTarget.style.boxShadow = "none";
											}}
										/>
										<button
											type="button"
											onClick={() => removeArrayField("allowedHosts", index)}
											style={{
												padding: "10px 12px",
												border: "1px solid var(--card-border)",
												borderRadius: "8px",
												background: "transparent",
												color: "var(--danger)",
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												transition: "all 0.2s ease",
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
												e.currentTarget.style.borderColor = "var(--danger)";
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = "transparent";
												e.currentTarget.style.borderColor = "var(--card-border)";
											}}
										>
											<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								))}
							</div>
							<button
								type="button"
								onClick={() => addArrayField("allowedHosts")}
								style={{
									marginTop: "12px",
									padding: "8px 14px",
									border: "1px solid var(--card-border)",
									borderRadius: "8px",
									background: "var(--content-bg)",
									color: "var(--text-primary)",
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									fontSize: "13px",
									fontWeight: "500",
									transition: "all 0.2s ease",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = "var(--primary)";
									e.currentTarget.style.color = "var(--primary)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = "var(--card-border)";
									e.currentTarget.style.color = "var(--text-primary)";
								}}
							>
								<svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								Add Host
							</button>
						</div>

						{/* Session TTL */}
						<div style={{ marginTop: "8px" }}>
							<label htmlFor="app_session_ttl_days" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
								Session TTL (days)
							</label>
							<input
								type="number"
								id="app_session_ttl_days"
								name="appSessionTtlDays"
								min="1"
								max="365"
								value={formData.appSessionTtlDays || 28}
								onChange={handleInputChange}
								style={{
									width: "100%",
									padding: "10px 12px",
									border: "1px solid var(--card-border)",
									borderRadius: "8px",
									background: "var(--content-bg)",
									color: "var(--text-primary)",
									fontSize: "14px",
									outline: "none",
									transition: "all 0.2s ease",
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = "var(--primary)";
									e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = "var(--card-border)";
									e.currentTarget.style.boxShadow = "none";
								}}
							/>
						</div>

						{/* Default License Plan */}
						<div style={{ marginTop: "8px" }}>
							<label htmlFor="default_license_plan" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
								Default License Plan
							</label>
							<select
								id="default_license_plan"
								name="defaultLicensePlan"
								value={formData.defaultLicensePlan || "free"}
								onChange={handleInputChange}
								style={{
									width: "100%",
									padding: "10px 12px",
									border: "1px solid var(--card-border)",
									borderRadius: "8px",
									background: "var(--content-bg)",
									color: "var(--text-primary)",
									fontSize: "14px",
									outline: "none",
									cursor: "pointer",
									transition: "all 0.2s ease",
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = "var(--primary)";
									e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = "var(--card-border)";
									e.currentTarget.style.boxShadow = "none";
								}}
							>
								<option value="free">Free</option>
								<option value="trial">Trial</option>
								<option value="pro">Pro</option>
								<option value="enterprise">Enterprise</option>
							</select>
						</div>

						{/* Licensing Required */}
						<div style={{ gridColumn: "1 / -1", marginTop: "16px" }}>
							<label style={{ 
								display: "flex", 
								alignItems: "flex-start", 
								gap: "14px", 
								cursor: "pointer", 
								padding: "16px", 
								background: "var(--surface-secondary)", 
								borderRadius: "10px",
								border: "1px solid var(--border-secondary)",
								transition: "all 0.2s ease",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.borderColor = "var(--primary-light)";
								e.currentTarget.style.background = "rgba(139, 92, 246, 0.05)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = "var(--border-secondary)";
								e.currentTarget.style.background = "var(--surface-secondary)";
							}}
							>
								<input
									type="checkbox"
									name="licensingRequired"
									checked={formData.licensingRequired ?? true}
									onChange={handleInputChange}
									style={{ cursor: "pointer", width: "18px", height: "18px", marginTop: "2px" }}
								/>
								<div>
									<div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "14px", marginBottom: "4px" }}>
										Licensing Required
									</div>
									<div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
										Users must have a valid license to access this app
									</div>
								</div>
							</label>
						</div>

						{/* App Active */}
						<div style={{ gridColumn: "1 / -1" }}>
							<label style={{ 
								display: "flex", 
								alignItems: "flex-start", 
								gap: "14px", 
								cursor: "pointer", 
								padding: "16px", 
								background: "var(--surface-secondary)", 
								borderRadius: "10px",
								border: "1px solid var(--border-secondary)",
								transition: "all 0.2s ease",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.borderColor = "var(--primary-light)";
								e.currentTarget.style.background = "rgba(139, 92, 246, 0.05)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = "var(--border-secondary)";
								e.currentTarget.style.background = "var(--surface-secondary)";
							}}
							>
								<input
									type="checkbox"
									name="isActive"
									checked={formData.isActive ?? true}
									onChange={handleInputChange}
									style={{ cursor: "pointer", width: "18px", height: "18px", marginTop: "2px" }}
								/>
								<div>
									<div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "14px", marginBottom: "4px" }}>
										App Active
									</div>
									<div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
										When disabled, users cannot authenticate with this app
									</div>
								</div>
							</label>
						</div>
					</div>

					{/* Form Actions */}
					<div style={{ 
						display: "flex", 
						gap: "12px", 
						justifyContent: "flex-end", 
						marginTop: "32px",
						paddingTop: "24px",
						borderTop: "1px solid var(--card-border)",
					}}>
						<button
							type="button"
							onClick={() => {
								setIsEditing(false);
								setFormData(null);
							}}
							className="btn btn-secondary"
							style={{ minWidth: "100px" }}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={updateAppMutation.isPending}
							className="btn btn-primary"
							style={{ minWidth: "140px" }}
						>
							{updateAppMutation.isPending ? "Saving..." : "Save Changes"}
						</button>
					</div>

					{/* Status Messages */}
					{updateAppMutation.isError && (
						<div className="alert alert-danger" style={{ marginTop: "20px" }}>
							<span>Error updating app. Please try again.</span>
						</div>
					)}
					{updateAppMutation.isSuccess && (
						<div className="alert alert-success" style={{ marginTop: "20px" }}>
							<span>App updated successfully!</span>
						</div>
					)}
				</form>
			)}
		</div>
	);
}
