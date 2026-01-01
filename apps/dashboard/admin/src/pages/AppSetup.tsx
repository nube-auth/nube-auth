import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCreateApp, useProject } from "../hooks/api";

const AVAILABLE_PROVIDERS = [
	{
		id: "google",
		name: "Google",
		icon: (
			<svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px" }}>
				<path
					fill="#4285F4"
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				/>
				<path
					fill="#34A853"
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				/>
				<path
					fill="#FBBC05"
					d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				/>
				<path
					fill="#EA4335"
					d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				/>
			</svg>
		),
		color: "#4285F4",
	},
	{
		id: "github",
		name: "GitHub",
		icon: (
			<svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px" }} fill="currentColor">
				<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
			</svg>
		),
		color: "#333",
	},
] as const;

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
		enabledProviders: ["google", "github"] as string[],
		requiresLicensing: false,
		defaultLicensePlan: {
			name: "Free Plan",
			slug: "",
			description: "Default free plan for new users",
			price: 0,
			currency: "USD",
			billing_period: "none" as const,
			trial_days: 0,
			features: {},
		},
	});

	// Close modal on Escape key
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				navigate(`/projects/${projectId}`);
			}
		};
		window.addEventListener("keydown", handleEsc);
		return () => window.removeEventListener("keydown", handleEsc);
	}, [navigate, projectId]);

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

	const toggleProvider = (providerId: string) => {
		setFormData((prev) => {
			const isEnabled = prev.enabledProviders.includes(providerId);
			return {
				...prev,
				enabledProviders: isEnabled
					? prev.enabledProviders.filter((id) => id !== providerId)
					: [...prev.enabledProviders, providerId],
			};
		});
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
		const dataToSend: any = {
			name: formData.name,
			slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
			description: formData.description,
			redirectUris: formData.redirectUris.filter((uri) => uri.trim()),
			allowedHosts: formData.allowedHosts.filter((host) => host.trim()),
			sessionTtlDays: formData.sessionTtlDays || 28,
			enabledProviders: formData.enabledProviders,
			requiresLicensing: formData.requiresLicensing,
		};

		if (formData.requiresLicensing) {
			dataToSend.defaultLicensePlan = {
				...formData.defaultLicensePlan,
				slug:
					formData.defaultLicensePlan.slug ||
					formData.defaultLicensePlan.name.toLowerCase().replace(/\s+/g, "-"),
			};
		}

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
		<div className="page" style={{ background: "var(--content-bg)", minHeight: "100vh" }}>
			{/* Breadcrumb */}
			<nav
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					fontSize: "13px",
					marginBottom: "24px",
					padding: "20px 40px 0",
				}}
			>
				<Link to="/projects" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
					Projects
				</Link>
				<svg
					style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link to={`/projects/${projectId}`} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
					{project.name}
				</Link>
				<svg
					style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>Create New App</span>
			</nav>

			{/* 2 Column Layout */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1.4fr 1fr",
					gap: "40px",
					padding: "20px 40px 40px",
					maxWidth: "1600px",
					margin: "0 auto",
				}}
			>
				{/* Left Column - Form */}
				<div>
					<div style={{ marginBottom: "32px" }}>
						<h1
							style={{
								fontSize: "32px",
								fontWeight: "700",
								marginBottom: "8px",
								color: "var(--text-primary)",
							}}
						>
							Create New Application
						</h1>
						<p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
							Configure your application's authentication settings and OAuth providers.
						</p>

						{/* Step Indicator */}
						<div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "24px" }}>
							{[1, 2, 3, 4].map((num) => (
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
									{num < 4 && (
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

					<div className="card" style={{ padding: "32px" }}>
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
										<label
											htmlFor="description"
											className="form-label"
											style={{ marginBottom: "8px" }}
										>
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

									<div
										style={{
											display: "flex",
											gap: "12px",
											justifyContent: "flex-end",
											marginTop: "32px",
										}}
									>
										<button
											type="button"
											onClick={() => navigate(`/projects/${projectId}`)}
											className="btn btn-secondary"
										>
											Cancel
										</button>
										<button
											type="button"
											onClick={() => setStep(2)}
											className="btn btn-primary"
											disabled={!formData.name.trim()}
										>
											Next
										</button>
									</div>
								</div>
							)}

							{/* Step 2: OAuth Providers & Redirect */}
							{step === 2 && (
								<div className="space-y-6">
									{/* OAuth Providers Section */}
									<div>
										<label
											className="form-label"
											style={{ marginBottom: "12px", display: "block" }}
										>
											OAuth Providers <span style={{ color: "var(--danger)" }}>*</span>
										</label>
										<p
											style={{
												fontSize: "13px",
												color: "var(--text-tertiary)",
												marginBottom: "16px",
											}}
										>
											Select which OAuth providers users can use to authenticate
										</p>

										<div
											style={{
												display: "grid",
												gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
												gap: "12px",
											}}
										>
											{AVAILABLE_PROVIDERS.map((provider) => {
												const isEnabled = formData.enabledProviders.includes(provider.id);
												return (
													<button
														key={provider.id}
														type="button"
														onClick={() => toggleProvider(provider.id)}
														style={{
															padding: "16px",
															borderRadius: "12px",
															border: `2px solid ${isEnabled ? "var(--primary)" : "var(--border-primary)"}`,
															background: isEnabled
																? "var(--primary-light)"
																: "var(--surface-secondary)",
															cursor: "pointer",
															transition: "all 0.2s ease",
															textAlign: "left",
															position: "relative",
														}}
														onMouseEnter={(e) => {
															if (!isEnabled) {
																e.currentTarget.style.borderColor =
																	"var(--border-secondary)";
															}
														}}
														onMouseLeave={(e) => {
															if (!isEnabled) {
																e.currentTarget.style.borderColor =
																	"var(--border-primary)";
															}
														}}
													>
														<div
															style={{
																display: "flex",
																alignItems: "center",
																gap: "12px",
															}}
														>
															<div
																style={{
																	display: "flex",
																	alignItems: "center",
																	justifyContent: "center",
																	width: "32px",
																	height: "32px",
																}}
															>
																{provider.icon}
															</div>
															<div style={{ flex: 1 }}>
																<div
																	style={{
																		fontSize: "15px",
																		fontWeight: "600",
																		color: "var(--text-primary)",
																		marginBottom: "4px",
																	}}
																>
																	{provider.name}
																</div>
																<div
																	style={{
																		fontSize: "12px",
																		color: "var(--text-secondary)",
																	}}
																>
																	Platform managed
																</div>
															</div>
															<div
																style={{
																	width: "20px",
																	height: "20px",
																	borderRadius: "50%",
																	border: `2px solid ${isEnabled ? "var(--primary)" : "var(--border-secondary)"}`,
																	background: isEnabled
																		? "var(--primary)"
																		: "transparent",
																	display: "flex",
																	alignItems: "center",
																	justifyContent: "center",
																}}
															>
																{isEnabled && (
																	<svg
																		style={{
																			width: "12px",
																			height: "12px",
																			color: "white",
																		}}
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={3}
																			d="M5 13l4 4L19 7"
																		/>
																	</svg>
																)}
															</div>
														</div>
													</button>
												);
											})}
										</div>
										{formData.enabledProviders.length === 0 && (
											<p style={{ fontSize: "13px", color: "var(--danger)", marginTop: "8px" }}>
												⚠️ Select at least one OAuth provider
											</p>
										)}
									</div>

									<div>
										<label className="form-label" style={{ marginBottom: "8px" }}>
											Redirect URIs <span style={{ color: "var(--danger)" }}>*</span>
										</label>
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: "8px",
												marginBottom: "12px",
											}}
										>
											{formData.redirectUris.map((uri, index) => (
												<div key={`redirectUri-${index}`} style={{ display: "flex", gap: "8px" }}>
													<input
														type="url"
														placeholder="e.g., http://localhost:3000/callback"
														value={uri}
														onChange={(e) =>
															handleArrayFieldChange(
																"redirectUris",
																formData.redirectUris.indexOf(uri),
																e.target.value,
															)
														}
														className="form-control"
													/>
													{formData.redirectUris.length > 1 && (
														<button
															type="button"
															onClick={() => removeArrayField("redirectUris", formData.redirectUris.indexOf(uri))}
															className="btn btn-ghost btn-sm"
															style={{ color: "var(--danger)" }}
														>
															<svg
																style={{ width: "16px", height: "16px" }}
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M6 18L18 6M6 6l12 12"
																/>
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
											<svg
												style={{ width: "16px", height: "16px" }}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 4v16m8-8H4"
												/>
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
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: "8px",
												marginBottom: "12px",
											}}
										>
											{formData.allowedHosts.map((host, index) => (
												<div key={`allowedHost-${index}`} style={{ display: "flex", gap: "8px" }}>
													<input
														type="text"
														placeholder="e.g., localhost:3000, example.com"
														value={host}
														onChange={(e) =>
															handleArrayFieldChange(
																"allowedHosts",
																formData.allowedHosts.indexOf(host),
																e.target.value,
															)
														}
														className="form-control"
													/>
													{formData.allowedHosts.length > 1 && (
														<button
															type="button"
															onClick={() => removeArrayField("allowedHosts", formData.allowedHosts.indexOf(host))}
															className="btn btn-ghost btn-sm"
															style={{ color: "var(--danger)" }}
														>
															<svg
																style={{ width: "16px", height: "16px" }}
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M6 18L18 6M6 6l12 12"
																/>
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
											<svg
												style={{ width: "16px", height: "16px" }}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 4v16m8-8H4"
												/>
											</svg>
											Add Allowed Host
										</button>
										<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
											Domains from which requests to your app will be accepted
										</p>
									</div>

									<div
										style={{
											display: "flex",
											gap: "12px",
											justifyContent: "space-between",
											marginTop: "32px",
										}}
									>
										<button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
											Back
										</button>
										<button
											type="button"
											onClick={() => setStep(3)}
											className="btn btn-primary"
											disabled={
												formData.redirectUris.filter((uri) => uri.trim()).length === 0 ||
												formData.enabledProviders.length === 0
											}
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
										<label
											htmlFor="sessionTtlDays"
											className="form-label"
											style={{ marginBottom: "8px" }}
										>
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

									{/* Summary Section */}
									<div
										style={{
											padding: "16px",
											borderRadius: "12px",
											background: "var(--surface-secondary)",
											border: "1px solid var(--border-primary)",
										}}
									>
										<h3
											style={{
												fontSize: "14px",
												fontWeight: "600",
												marginBottom: "12px",
												color: "var(--text-primary)",
											}}
										>
											Configuration Summary
										</h3>
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: "8px",
												fontSize: "13px",
											}}
										>
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<span style={{ color: "var(--text-tertiary)" }}>App Name:</span>
												<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>
													{formData.name}
												</span>
											</div>
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<span style={{ color: "var(--text-tertiary)" }}>OAuth Providers:</span>
												<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>
													{formData.enabledProviders.length > 0
														? formData.enabledProviders
																.map(
																	(id) =>
																		AVAILABLE_PROVIDERS.find((p) => p.id === id)
																			?.name,
																)
																.join(", ")
														: "None"}
												</span>
											</div>
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<span style={{ color: "var(--text-tertiary)" }}>Redirect URIs:</span>
												<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>
													{formData.redirectUris.filter((uri) => uri.trim()).length}
												</span>
											</div>
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<span style={{ color: "var(--text-tertiary)" }}>Session TTL:</span>
												<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>
													{formData.sessionTtlDays} days
												</span>
											</div>
										</div>
									</div>

									<div
										style={{
											display: "flex",
											gap: "12px",
											justifyContent: "flex-end",
											marginTop: "32px",
										}}
									>
										<button type="button" onClick={() => setStep(2)} className="btn btn-secondary">
											Back
										</button>
										<button type="button" onClick={() => setStep(4)} className="btn btn-primary">
											Next
										</button>
									</div>

									{createAppMutation.isError && (
										<div className="alert alert-danger">
											<span>Error creating app. Please try again.</span>
										</div>
									)}
								</div>
							)}

							{/* Step 4: Licensing & Payments */}
							{step === 4 && (
								<div className="space-y-6">
									<div>
										<label
											className="form-label"
											style={{
												display: "flex",
												alignItems: "center",
												gap: "12px",
												cursor: "pointer",
												marginBottom: "12px",
											}}
										>
											<input
												type="checkbox"
												checked={formData.requiresLicensing}
												onChange={(e) =>
													setFormData({ ...formData, requiresLicensing: e.target.checked })
												}
												style={{ width: "18px", height: "18px", cursor: "pointer" }}
											/>
											<span style={{ fontWeight: "600", fontSize: "15px" }}>
												Enable Licensing & Payments
											</span>
										</label>
										<p
											style={{
												fontSize: "13px",
												color: "var(--text-tertiary)",
												marginLeft: "30px",
											}}
										>
											Add subscription plans and payment processing. Disable if your app only
											needs user management.
										</p>
									</div>

									{formData.requiresLicensing && (
										<div
											style={{
												padding: "20px",
												borderRadius: "12px",
												background: "var(--surface-secondary)",
												border: "1px solid var(--border-primary)",
											}}
										>
											<h3
												style={{
													fontSize: "14px",
													fontWeight: "600",
													marginBottom: "16px",
													color: "var(--text-primary)",
												}}
											>
												Default License Plan
											</h3>
											<p
												style={{
													fontSize: "13px",
													color: "var(--text-tertiary)",
													marginBottom: "20px",
												}}
											>
												This plan will be automatically assigned to new users upon signup.
											</p>

											<div className="space-y-4">
												<div>
													<label htmlFor="planName" className="form-label">
														Plan Name <span style={{ color: "var(--danger)" }}>*</span>
													</label>
													<input
														type="text"
														id="planName"
														value={formData.defaultLicensePlan.name}
														onChange={(e) =>
															setFormData({
																...formData,
																defaultLicensePlan: {
																	...formData.defaultLicensePlan,
																	name: e.target.value,
																},
															})
														}
														className="form-control"
														placeholder="e.g., Free Plan, Starter, Basic"
														required={formData.requiresLicensing}
													/>
												</div>

												<div>
													<label htmlFor="planDescription" className="form-label">
														Description
													</label>
													<textarea
														id="planDescription"
														value={formData.defaultLicensePlan.description || ""}
														onChange={(e) =>
															setFormData({
																...formData,
																defaultLicensePlan: {
																	...formData.defaultLicensePlan,
																	description: e.target.value,
																},
															})
														}
														className="form-control"
														rows={3}
														placeholder="Brief description of what's included in this plan"
													/>
												</div>

												<div
													style={{
														display: "grid",
														gridTemplateColumns: "1fr 1fr",
														gap: "16px",
													}}
												>
													<div>
														<label htmlFor="planPrice" className="form-label">
															Price <span style={{ color: "var(--danger)" }}>*</span>
														</label>
														<input
															type="number"
															id="planPrice"
															min="0"
															step="0.01"
															value={formData.defaultLicensePlan.price}
															onChange={(e) =>
																setFormData({
																	...formData,
																	defaultLicensePlan: {
																		...formData.defaultLicensePlan,
																		price: parseFloat(e.target.value) || 0,
																	},
																})
															}
															className="form-control"
															required={formData.requiresLicensing}
														/>
													</div>

													<div>
														<label htmlFor="planCurrency" className="form-label">
															Currency <span style={{ color: "var(--danger)" }}>*</span>
														</label>
														<input
															type="text"
															id="planCurrency"
															value={formData.defaultLicensePlan.currency}
															onChange={(e) =>
																setFormData({
																	...formData,
																	defaultLicensePlan: {
																		...formData.defaultLicensePlan,
																		currency: e.target.value.toUpperCase(),
																	},
																})
															}
															className="form-control"
															placeholder="USD"
															maxLength={3}
															required={formData.requiresLicensing}
														/>
													</div>
												</div>

												<div
													style={{
														display: "grid",
														gridTemplateColumns: "1fr 1fr",
														gap: "16px",
													}}
												>
													<div>
														<label htmlFor="billingPeriod" className="form-label">
															Billing Period{" "}
															<span style={{ color: "var(--danger)" }}>*</span>
														</label>
														<select
															id="billingPeriod"
															value={formData.defaultLicensePlan.billing_period}
															onChange={(e) =>
																setFormData({
																	...formData,
																	defaultLicensePlan: {
																		...formData.defaultLicensePlan,
																		billing_period: e.target.value as any,
																	},
																})
															}
															className="form-control"
															required={formData.requiresLicensing}
														>
															<option value="none">No Billing Required</option>
															<option value="lifetime">
																Lifetime (One-time Payment)
															</option>
															<option value="monthly">Monthly Subscription</option>
															<option value="yearly">Yearly Subscription</option>
														</select>
													</div>

													<div>
														<label htmlFor="trialDays" className="form-label">
															Trial Days
														</label>
														<input
															type="number"
															id="trialDays"
															min="0"
															value={formData.defaultLicensePlan.trial_days}
															onChange={(e) =>
																setFormData({
																	...formData,
																	defaultLicensePlan: {
																		...formData.defaultLicensePlan,
																		trial_days: parseInt(e.target.value, 10) || 0,
																	},
																})
															}
															className="form-control"
														/>
													</div>
												</div>
											</div>
										</div>
									)}

									<div
										style={{
											display: "flex",
											gap: "12px",
											justifyContent: "space-between",
											marginTop: "32px",
										}}
									>
										<button type="button" onClick={() => setStep(3)} className="btn btn-secondary">
											Back
										</button>
										<button
											type="submit"
											disabled={createAppMutation.isPending}
											className="btn btn-primary"
										>
											{createAppMutation.isPending ? (
												<span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<div
														className="spinner"
														style={{ width: "16px", height: "16px" }}
													/>
													Creating...
												</span>
											) : (
												"Create App"
											)}
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

				{/* Right Column - Preview */}
				<div>
					<div style={{ position: "sticky", top: "20px" }}>
						<div className="card" style={{ padding: "24px", background: "var(--surface-secondary)" }}>
							<h2
								style={{
									fontSize: "16px",
									fontWeight: "600",
									marginBottom: "20px",
									color: "var(--text-primary)",
								}}
							>
								Login Preview
							</h2>
							<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "24px" }}>
								This is what users will see when they login to your app
							</p>

							{/* Mock Login Card */}
							<div
								style={{
									background: "var(--content-bg)",
									borderRadius: "16px",
									padding: "40px 32px",
									border: "1px solid var(--border-primary)",
									textAlign: "center",
								}}
							>
								{/* App Icon */}
								<div
									style={{
										width: "56px",
										height: "56px",
										borderRadius: "16px",
										background: "linear-gradient(135deg, var(--primary-light), #ddd6fe)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										margin: "0 auto 20px",
									}}
								>
									<svg
										style={{ width: "28px", height: "28px", color: "var(--primary)" }}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
										/>
									</svg>
								</div>

								{/* App Name & Description */}
								<h3
									style={{
										fontSize: "20px",
										fontWeight: "700",
										color: "var(--text-primary)",
										marginBottom: "8px",
									}}
								>
									{formData.name || "My Application"}
								</h3>
								{formData.description && (
									<p
										style={{
											fontSize: "13px",
											color: "var(--text-secondary)",
											marginBottom: "24px",
											lineHeight: "1.5",
										}}
									>
										{formData.description}
									</p>
								)}

								{/* OAuth Provider Buttons */}
								{formData.enabledProviders.length > 0 ? (
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "12px",
											marginTop: "24px",
										}}
									>
										{formData.enabledProviders.map((providerId) => {
											const provider = AVAILABLE_PROVIDERS.find((p) => p.id === providerId);
											if (!provider) return null;

											return (
												<button
													key={provider.id}
													type="button"
													disabled
													style={{
														width: "100%",
														padding: "12px 16px",
														borderRadius: "8px",
														border: "1px solid var(--border-primary)",
														background: "var(--surface-secondary)",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														gap: "12px",
														fontSize: "14px",
														fontWeight: "600",
														color: "var(--text-primary)",
														cursor: "default",
														transition: "all 0.2s ease",
													}}
												>
													<div
														style={{
															width: "20px",
															height: "20px",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
														}}
													>
														{provider.icon}
													</div>
													Continue with {provider.name}
												</button>
											);
										})}
									</div>
								) : (
									<div
										style={{
											padding: "24px",
											background: "var(--surface-secondary)",
											borderRadius: "8px",
											border: "1px dashed var(--border-primary)",
											marginTop: "24px",
										}}
									>
										<p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: 0 }}>
											No OAuth providers enabled
										</p>
									</div>
								)}

								{/* Footer Text */}
								<p
									style={{
										fontSize: "11px",
										color: "var(--text-tertiary)",
										marginTop: "24px",
										lineHeight: "1.5",
									}}
								>
									By continuing, you agree to the Terms of Service and Privacy Policy
								</p>
							</div>

							{/* Info Note */}
							<div
								style={{
									marginTop: "20px",
									padding: "12px",
									background: "var(--primary-light)",
									border: "1px solid var(--primary)",
									borderRadius: "8px",
									display: "flex",
									gap: "8px",
									alignItems: "flex-start",
								}}
							>
								<svg
									style={{
										width: "16px",
										height: "16px",
										color: "var(--primary)",
										flexShrink: 0,
										marginTop: "2px",
									}}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<p
									style={{
										fontSize: "12px",
										color: "var(--text-secondary)",
										margin: 0,
										lineHeight: "1.5",
									}}
								>
									This preview shows the login screen with your app's branding and selected OAuth
									providers
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
