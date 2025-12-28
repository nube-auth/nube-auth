import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCreateApp, useProject } from "../hooks/api";

export function AppSetupPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const createAppMutation = useCreateApp(projectId || "");
	const [step, setStep] = useState(1);

	const [formData, setFormData] = useState({
		name: "",
		slug: "",
		description: "",
		redirectUris: [""],
		requiredProviders: ["google"],
		allowedHosts: [""],
		appSessionTtlDays: 28,
		licensingRequired: false,
	});

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value, type } = e.target;
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
		setFormData((prev) => {
			const arr = [...(prev[field as keyof typeof formData] as string[])];
			arr[index] = value;
			return {
				...prev,
				[field]: arr,
			};
		});
	};

	const addArrayField = (field: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: [...(prev[field as keyof typeof formData] as string[]), ""],
		}));
	};

	const removeArrayField = (field: string, index: number) => {
		setFormData((prev) => {
			const arr = [...(prev[field as keyof typeof formData] as string[])];
			arr.splice(index, 1);
			return {
				...prev,
				[field]: arr,
			};
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const dataToSend = {
			name: formData.name,
			slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
			description: formData.description,
			redirectUris: formData.redirectUris.filter((uri) => uri.trim()),
			requiredProviders: formData.requiredProviders.filter((p) => p.trim()),
			allowedHosts: formData.allowedHosts.filter((host) => host.trim()),
			appSessionTtlDays: formData.appSessionTtlDays,
			licensingRequired: formData.licensingRequired,
		};

		createAppMutation.mutate(dataToSend, {
			onSuccess: (app) => {
				navigate(`/projects/${projectId}/apps/${app.id}`);
			},
		});
	};

	if (projectLoading) {
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

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", marginBottom: "8px" }}>
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
				<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>Setup New App</span>
			</nav>

			<div className="card" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
				<div style={{ marginBottom: "32px" }}>
					<h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>
						Create a New Application
					</h1>
					<p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "14px" }}>
						Configure your application's authentication settings and deployment details.
					</p>

					{/* Step Indicator */}
					<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
						{[1, 2, 3].map((num) => (
							<div key={num} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<button
									type="button"
									onClick={() => setStep(num)}
									style={{
										width: "36px",
										height: "36px",
										borderRadius: "50%",
										border: "2px solid",
										background: step >= num ? "var(--primary)" : "transparent",
										borderColor: step >= num ? "var(--primary)" : "var(--border-secondary)",
										color: step >= num ? "white" : "var(--text-secondary)",
										fontWeight: "600",
										cursor: "pointer",
										fontSize: "14px",
										transition: "all 0.2s ease",
									}}
								>
									{num}
								</button>
								{num < 3 && (
									<div
										style={{
											width: "32px",
											height: "2px",
											background: step > num ? "var(--primary)" : "var(--border-secondary)",
											transition: "all 0.3s ease",
										}}
									/>
								)}
							</div>
						))}
					</div>
				</div>

				<form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
					{/* Step 1: Basic Information */}
					{step === 1 && (
						<div className="space-y-6">
							<div>
								<label htmlFor="name" className="form-label" style={{ marginBottom: "8px" }}>
									App Name <span style={{ color: "var(--danger)" }}>*</span>
								</label>
								<input
									type="text"
									id="name"
									name="name"
									placeholder="e.g., My Web App, Mobile Client"
									required
									value={formData.name}
									onChange={handleInputChange}
									className="form-control"
									style={{ marginBottom: "8px" }}
								/>
								<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
									A friendly name to identify your application
								</p>
							</div>

							<div>
								<label htmlFor="slug" className="form-label" style={{ marginBottom: "8px" }}>
									App Slug
								</label>
								<input
									type="text"
									id="slug"
									name="slug"
									placeholder="auto-generated from name if empty"
									value={formData.slug}
									onChange={handleInputChange}
									className="form-control"
									style={{ marginBottom: "8px" }}
								/>
								<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
									URL-safe identifier. Auto-generated if left empty.
								</p>
							</div>

							<div>
								<label htmlFor="description" className="form-label" style={{ marginBottom: "8px" }}>
									Description
								</label>
								<textarea
									id="description"
									name="description"
									placeholder="What is this app for?"
									value={formData.description}
									onChange={handleInputChange}
									rows={4}
									className="form-control"
									style={{ marginBottom: "8px", resize: "vertical" }}
								/>
								<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
									Optional description of your application
								</p>
							</div>

							<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "32px" }}>
								<button type="button" onClick={() => navigate(`/projects/${projectId}`)} className="btn btn-secondary">
									Cancel
								</button>
								<button type="button" onClick={() => setStep(2)} className="btn btn-primary" disabled={!formData.name.trim()}>
									Next
								</button>
							</div>
						</div>
					)}

					{/* Step 2: OAuth & Redirect */}
					{step === 2 && (
						<div className="space-y-6">
							<div>
								<label className="form-label" style={{ marginBottom: "12px" }}>
									Required OAuth Providers <span style={{ color: "var(--danger)" }}>*</span>
								</label>
								<div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
									{[
										{
											name: "google",
											icon: (
												<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
													<path
														d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
														fill="#4285F4"
													/>
													<path
														d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
														fill="#34A853"
													/>
													<path
														d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
														fill="#FBBC05"
													/>
													<path
														d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
														fill="#EA4335"
													/>
												</svg>
											),
										},
										{
											name: "github",
											icon: (
												<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
													<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
												</svg>
											),
										},
									].map((provider) => (
										<label
											key={provider.name}
											style={{
												display: "flex",
												alignItems: "center",
												gap: "8px",
												cursor: "pointer",
												padding: "8px 12px",
												background: "transparent",
												border: "1px solid",
												borderColor: formData.requiredProviders.includes(provider.name)
													? "var(--primary)"
													: "var(--border-primary)",
												borderRadius: "6px",
												transition: "all 0.2s ease",
											}}
										>
											<input
												type="checkbox"
												value={provider.name}
												checked={formData.requiredProviders.includes(provider.name)}
												onChange={(e) => {
													if (e.target.checked) {
														setFormData((prev) => ({
															...prev,
															requiredProviders: [...prev.requiredProviders, provider.name],
														}));
													} else {
														setFormData((prev) => ({
															...prev,
															requiredProviders: prev.requiredProviders.filter((p) => p !== provider.name),
														}));
													}
												}}
												style={{ cursor: "pointer" }}
											/>
											{provider.icon}
											<span style={{ textTransform: "capitalize", fontWeight: "500", fontSize: "14px" }}>
												{provider.name}
											</span>
										</label>
									))}
								</div>
								<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
									Which OAuth providers can users use to sign in?
								</p>
							</div>

							<div>
								<label className="form-label" style={{ marginBottom: "8px" }}>
									Redirect URIs <span style={{ color: "var(--danger)" }}>*</span>
								</label>
								<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
									{formData.redirectUris.map((uri, index) => (
										<div key={index} style={{ display: "flex", gap: "8px" }}>
											<input
												type="url"
												placeholder="e.g., http://localhost:3000/callback"
												value={uri}
												onChange={(e) => handleArrayFieldChange("redirectUris", index, e.target.value)}
												className="form-control"
											/>
											{formData.redirectUris.length > 1 && (
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
									onClick={() => addArrayField("redirectUris")}
									className="btn btn-secondary btn-sm"
									style={{ marginBottom: "12px" }}
								>
									<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
									</svg>
									Add Redirect URI
								</button>
								<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
									URLs where users will be redirected after authentication
								</p>
							</div>

							<div>
								<label className="form-label" style={{ marginBottom: "8px" }}>
									Allowed Hosts
								</label>
								<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
									{formData.allowedHosts.map((host, index) => (
										<div key={index} style={{ display: "flex", gap: "8px" }}>
											<input
												type="text"
												placeholder="e.g., localhost:3000, example.com"
												value={host}
												onChange={(e) => handleArrayFieldChange("allowedHosts", index, e.target.value)}
												className="form-control"
											/>
											{formData.allowedHosts.length > 1 && (
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
									onClick={() => addArrayField("allowedHosts")}
									className="btn btn-secondary btn-sm"
									style={{ marginBottom: "12px" }}
								>
									<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
									</svg>
									Add Allowed Host
								</button>
								<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
									Domains from which requests to your app will be accepted
								</p>
							</div>

							<div style={{ display: "flex", gap: "12px", justifyContent: "space-between", marginTop: "32px" }}>
								<button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
									Back
								</button>
								<button
									type="button"
									onClick={() => setStep(3)}
									className="btn btn-primary"
									disabled={formData.redirectUris.filter((uri) => uri.trim()).length === 0}
								>
									Next
								</button>
							</div>
						</div>
					)}

					{/* Step 3: Advanced Settings */}
					{step === 3 && (
						<div className="space-y-6">
							<div>
								<label htmlFor="appSessionTtlDays" className="form-label" style={{ marginBottom: "8px" }}>
									Session TTL (days)
								</label>
								<input
									type="number"
									id="appSessionTtlDays"
									name="appSessionTtlDays"
									min="1"
									max="365"
									value={formData.appSessionTtlDays}
									onChange={handleInputChange}
									className="form-control"
									style={{ marginBottom: "8px" }}
								/>
								<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
									How long user sessions remain active (1-365 days). Default: 28 days.
								</p>
							</div>

							<div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "var(--content-bg)", borderRadius: "8px", border: "1px solid var(--border-primary)" }}>
								<input
									type="checkbox"
									id="licensingRequired"
									name="licensingRequired"
									checked={formData.licensingRequired}
									onChange={handleInputChange}
									style={{ cursor: "pointer" }}
								/>
								<label htmlFor="licensingRequired" style={{ cursor: "pointer", flex: 1 }}>
									<div style={{ fontWeight: "500", color: "var(--text-primary)", marginBottom: "4px" }}>
										Enable License Management
									</div>
									<div style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: "1.5" }}>
										Require users to have a valid license to access this app. You can create and manage license plans after app creation.
									</div>
								</label>
							</div>

							<div style={{ display: "flex", gap: "12px", justifyContent: "space-between", marginTop: "32px" }}>
								<button type="button" onClick={() => setStep(2)} className="btn btn-secondary">
									Back
								</button>
								<button type="submit" disabled={createAppMutation.isPending} className="btn btn-primary">
									{createAppMutation.isPending ? "Creating..." : "Create App"}
								</button>
							</div>

							{createAppMutation.isError && (
								<div className="alert alert-danger">
									<span>Error creating app. Please try again.</span>
								</div>
							)}
						</div>
					)}
				</form>
			</div>
		</div>
	);
}
