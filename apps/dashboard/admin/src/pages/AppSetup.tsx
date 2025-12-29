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
		allowedHosts: [""],
		sessionTtlDays: 28,
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
			allowedHosts: formData.allowedHosts.filter((host) => host.trim()),
			sessionTtlDays: formData.sessionTtlDays || 28,
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
								<label htmlFor="sessionTtlDays" className="form-label" style={{ marginBottom: "8px" }}>
									Session TTL (days)
								</label>
								<input
									type="number"
									id="sessionTtlDays"
									name="sessionTtlDays"
									min="1"
									max="365"
									value={formData.sessionTtlDays}
									onChange={handleInputChange}
									className="form-control"
									style={{ marginBottom: "8px" }}
								/>
								<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
									How long user sessions remain active (1-365 days). Default: 28 days.
								</p>
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
