import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCreateApp, useProject } from "../hooks/api";

const AVAILABLE_PROVIDERS = [
	{
		id: "google",
		name: "Google",
		icon: (
			<svg viewBox="0 0 24 24" className="w-5 h-5">
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
			<svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
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
		sessionTtlDays: 30,
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
			sessionTtlDays: formData.sessionTtlDays || 30,
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
		<div className="page bg-content-bg min-h-screen">
			{/* Breadcrumb */}
			<nav
				className="flex items-center gap-2 text-13px mb-6 pt-5 px-10"
			>
				<Link to="/projects" className="text-text-secondary no-underline">
					Projects
				</Link>
				<svg
					className="w-3.5 h-3.5 text-text-tertiary"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link to={`/projects/${projectId}`} className="text-text-secondary no-underline">
					{project.name}
				</Link>
				<svg
					className="w-3.5 h-3.5 text-text-tertiary"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span className="text-text-primary font-medium">Create New App</span>
			</nav>

			{/* 2 Column Layout */}
			<div
				className="grid grid-cols-[1.4fr_1fr] gap-10 py-5 px-10 max-w-[1600px] mx-auto"
			>
				{/* Left Column - Form */}
				<div>
					<div className="mb-8">
						<h1
							className="text-32px font-bold mb-2 text-text-primary"
						>
							Create New Application
						</h1>
						<p className="text-text-secondary text-14px">
							Configure your application's authentication settings and OAuth providers.
						</p>

						{/* Step Indicator */}
						<div className="flex gap-2 items-center mt-6">
							{[1, 2, 3, 4].map((num) => (
								<div key={num} className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setStep(num)}
										className={`w-9 h-9 rounded-full border-2 font-semibold cursor-pointer text-14px transition-all ${
											step >= num
												? "bg-primary border-primary text-white"
												: "bg-transparent border-border-secondary text-text-secondary"
										}`}
									>
										{num}
									</button>
									{num < 4 && (
										<div
											className={`w-8 h-0.5 transition-all ${
												step > num ? "bg-primary" : "bg-border-secondary"
											}`}
										/>
									)}
								</div>
							))}
						</div>
					</div>

					<div className="card p-8">
						<form onSubmit={handleSubmit} className="flex flex-col gap-8">
							{/* Step 1: Basic Information */}
							{step === 1 && (
								<div className="space-y-6">
									<div>
										<label htmlFor="name" className="form-label mb-2">
											App Name <span className="text-danger">*</span>
										</label>
										<input
											type="text"
											id="name"
											name="name"
											placeholder="e.g., My Web App, Mobile Client"
											required
											value={formData.name}
											onChange={handleInputChange}
											className="form-control mb-2"
										/>
										<p className="text-13px text-text-tertiary">
											A friendly name to identify your application
										</p>
									</div>

									<div>
										<label htmlFor="slug" className="form-label mb-2">
											App Slug
										</label>
										<input
											type="text"
											id="slug"
											name="slug"
											placeholder="auto-generated from name if empty"
											value={formData.slug}
											onChange={handleInputChange}
											className="form-control mb-2"
										/>
										<p className="text-13px text-text-tertiary">
											URL-safe identifier. Auto-generated if left empty.
										</p>
									</div>

									<div>
										<label
											htmlFor="description"
											className="form-label mb-2"
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
											className="form-control mb-2 resize-y"
										/>
										<p className="text-13px text-text-tertiary">
											Optional description of your application
										</p>
									</div>

									<div
										className="flex gap-3 justify-end mt-8"
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
											className="form-label block mb-3"
										>
											OAuth Providers <span className="text-danger">*</span>
										</label>
										<p
											className="text-13px text-text-tertiary mb-4"
										>
											Select which OAuth providers users can use to authenticate
										</p>

										<div
											className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3"
										>
											{AVAILABLE_PROVIDERS.map((provider) => {
												const isEnabled = formData.enabledProviders.includes(provider.id);
												return (
													<button
														key={provider.id}
														type="button"
														onClick={() => toggleProvider(provider.id)}
														className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-left relative ${
															isEnabled
																? "border-primary bg-primary-light"
																: "border-border-primary bg-surface-secondary hover:border-border-secondary"
														}`}
													>
														<div className="flex items-center gap-3">
															<div className="flex items-center justify-center w-8 h-8">
																{provider.icon}
															</div>
															<div className="flex-1">
																<div className="text-15px font-semibold text-text-primary mb-1">
																	{provider.name}
																</div>
																<div className="text-12px text-text-secondary">
																	Platform managed
																</div>
															</div>
															<div
																className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
																	isEnabled
																		? "border-primary bg-primary"
																		: "border-border-secondary bg-transparent"
																}`}
															>
																{isEnabled && (
																	<svg
																		className="w-3 h-3 text-white"
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
											<p className="text-13px text-danger mt-2">
												⚠️ Select at least one OAuth provider
											</p>
										)}
									</div>

									<div>
										<label className="form-label mb-2">
											Redirect URIs <span className="text-danger">*</span>
										</label>
										<div
											className="flex flex-col gap-2 mb-3"
										>
											{formData.redirectUris.map((uri, index) => (
												<div
													key={`redirectUri-${index}`}
													className="flex gap-2"
												>
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
															onClick={() =>
																removeArrayField(
																	"redirectUris",
																	formData.redirectUris.indexOf(uri),
																)
															}
															className="btn btn-ghost btn-sm text-danger"
														>
															<svg
																className="w-4 h-4"
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
											className="btn btn-secondary btn-sm mb-3"
										>
											<svg
												className="w-4 h-4"
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
										<p className="text-13px text-text-tertiary">
											URLs where users will be redirected after authentication
										</p>
									</div>

									<div>
										<label className="form-label mb-2">
											Allowed Hosts
										</label>
										<div
											className="flex flex-col gap-2 mb-3"
										>
											{formData.allowedHosts.map((host, index) => (
												<div
													key={`allowedHost-${index}`}
													className="flex gap-2"
												>
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
															onClick={() =>
																removeArrayField(
																	"allowedHosts",
																	formData.allowedHosts.indexOf(host),
																)
															}
															className="btn btn-ghost btn-sm text-danger"
														>
															<svg
																className="w-4 h-4"
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
											className="btn btn-secondary btn-sm mb-3"
										>
											<svg
												className="w-4 h-4"
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
										<p className="text-13px text-text-tertiary">
											Domains from which requests to your app will be accepted
										</p>
									</div>

									<div
										className="flex gap-3 justify-between mt-8"
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
											className="form-label mb-2"
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
											className="form-control mb-2"
										/>
										<p className="text-13px text-text-tertiary">
											How long user sessions remain active (1-365 days). Default: 30 days.
										</p>
									</div>

									{/* Summary Section */}
									<div
										className="p-4 rounded-xl bg-surface-secondary border border-border-primary"
									>
										<h3
											className="text-14px font-semibold mb-3 text-text-primary"
										>
											Configuration Summary
										</h3>
										<div
											className="flex flex-col gap-2 text-13px"
										>
											<div className="flex justify-between">
												<span className="text-text-tertiary">App Name:</span>
												<span className="text-text-primary font-medium">
													{formData.name}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-text-tertiary">OAuth Providers:</span>
												<span className="text-text-primary font-medium">
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
											<div className="flex justify-between">
												<span className="text-text-tertiary">Redirect URIs:</span>
												<span className="text-text-primary font-medium">
													{formData.redirectUris.filter((uri) => uri.trim()).length}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-text-tertiary">Session TTL:</span>
												<span className="text-text-primary font-medium">
													{formData.sessionTtlDays} days
												</span>
											</div>
										</div>
									</div>

									<div
										className="flex gap-3 justify-end mt-8"
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
											className="form-label flex items-center gap-3 cursor-pointer mb-3"
										>
											<input
												type="checkbox"
												checked={formData.requiresLicensing}
												onChange={(e) =>
													setFormData({ ...formData, requiresLicensing: e.target.checked })
												}
												className="w-4.5 h-4.5 cursor-pointer"
											/>
											<span className="font-semibold text-15px">
												Enable Licensing & Payments
											</span>
										</label>
										<p
											className="text-13px text-text-tertiary ml-7.5"
										>
											Add subscription plans and payment processing. Disable if your app only
											needs user management.
										</p>
									</div>

									{formData.requiresLicensing && (
										<div
											className="p-5 rounded-xl bg-surface-secondary border border-border-primary"
										>
											<h3
												className="text-14px font-semibold mb-4 text-text-primary"
											>
												Default License Plan
											</h3>
											<p
												className="text-13px text-text-tertiary mb-5"
											>
												This plan will be automatically assigned to new users upon signup.
											</p>

											<div className="space-y-4">
												<div>
													<label htmlFor="planName" className="form-label">
														Plan Name <span className="text-danger">*</span>
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
													className="grid grid-cols-2 gap-4"
												>
													<div>
														<label htmlFor="planPrice" className="form-label">
															Price <span className="text-danger">*</span>
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
															Currency <span className="text-danger">*</span>
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
													className="grid grid-cols-2 gap-4"
												>
													<div>
														<label htmlFor="billingPeriod" className="form-label">
															Billing Period{" "}
															<span className="text-danger">*</span>
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
										className="flex gap-3 justify-between mt-8"
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
												<span className="flex items-center gap-2">
													<div
														className="spinner w-4 h-4"
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
					<div className="sticky top-5">
						<div className="card p-6 bg-surface-secondary">
							<h2
								className="text-16px font-semibold mb-5 text-text-primary"
							>
								Login Preview
							</h2>
							<p className="text-13px text-text-tertiary mb-6">
								This is what users will see when they login to your app
							</p>

							{/* Mock Login Card */}
							<div
								className="bg-content-bg rounded-2xl py-10 px-8 border border-border-primary text-center"
							>
								{/* App Icon */}
								<div
									className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-linear-to-br from-primary-light to-[#ddd6fe]"
								>
									<svg
										className="w-7 h-7 text-primary"
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
									className="text-20px font-bold text-text-primary mb-2"
								>
									{formData.name || "My Application"}
								</h3>
								{formData.description && (
									<p
										className="text-13px text-text-secondary mb-6 leading-relaxed"
									>
										{formData.description}
									</p>
								)}

								{/* OAuth Provider Buttons */}
								{formData.enabledProviders.length > 0 ? (
									<div
										className="flex flex-col gap-3 mt-6"
									>
										{formData.enabledProviders.map((providerId) => {
											const provider = AVAILABLE_PROVIDERS.find((p) => p.id === providerId);
											if (!provider) return null;

											return (
												<button
													key={provider.id}
													type="button"
													disabled
													className="w-full py-3 px-4 rounded-lg border border-border-primary bg-surface-secondary flex items-center justify-center gap-3 text-14px font-semibold text-text-primary cursor-default transition-all duration-200"
												>
													<div
														className="w-5 h-5 flex items-center justify-center"
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
										className="p-6 bg-surface-secondary rounded-lg border border-dashed border-border-primary mt-6"
									>
										<p className="text-13px text-text-tertiary m-0">
											No OAuth providers enabled
										</p>
									</div>
								)}

								{/* Footer Text */}
								<p
									className="text-11px text-text-tertiary mt-6 leading-relaxed"
								>
									By continuing, you agree to the Terms of Service and Privacy Policy
								</p>
							</div>

							{/* Info Note */}
							<div
								className="mt-5 p-3 bg-primary-light border border-primary rounded-lg flex gap-2 items-start"
							>
								<svg
									className="w-4 h-4 text-primary shrink-0 mt-0.5"
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
									className="text-12px text-text-secondary m-0 leading-relaxed"
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
