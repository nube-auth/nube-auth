import type React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import {
	ArrowRight01Icon,
	Tick02Icon,
	Cancel01Icon,
	Add01Icon,
	Key01Icon,
	AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { GoogleLogo, GitHubLogo } from "@proofa/react";
import { useCreateApp, useProject } from "../hooks/api";

const AVAILABLE_PROVIDERS = [
	{
		id: "google",
		name: "Google",
		icon: <GoogleLogo className="w-5 h-5" />,
		color: "#4285F4",
	},
	{
		id: "github",
		name: "GitHub",
		icon: <GitHubLogo className="w-5 h-5" />,
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

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
	) => {
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
				<Icon icon={ArrowRight01Icon} size={14} className="text-text-tertiary" />
				<Link to={`/projects/${projectId}`} className="text-text-secondary no-underline">
					{project.name}
				</Link>
				<Icon icon={ArrowRight01Icon} size={14} className="text-text-tertiary" />
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
																{isEnabled && <Icon icon={Tick02Icon} size={14} className="text-white" />}
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
															<Icon icon={Cancel01Icon} size={16} className="text-danger" />
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
											<Icon icon={Add01Icon} size={16} />
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
															<Icon icon={Cancel01Icon} size={16} className="text-danger" />
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
											<Icon icon={Add01Icon} size={16} />
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
									className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-primary/10"
								>
									<Icon icon={Key01Icon} size={28} className="text-primary" />
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
								<Icon icon={AlertCircleIcon} size={16} className="text-primary shrink-0 mt-0.5" />
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
