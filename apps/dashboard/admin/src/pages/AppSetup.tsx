import type React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Heading,
	Text,
	Card,
	CardBody,
	Label,
	Field,
	FieldLabel,
	FieldDescription,
	Input,
	Textarea,
	Button,
	Checkbox,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
	BreadcrumbSeparator,
	Select,
	SelectTrigger,
	SelectValue,
	SelectPopup,
	SelectItem
} from "@proofa/components";
import { IconPicker } from "../components/IconPicker";
import { useCreateApp, useProject } from "../hooks/api";

const AVAILABLE_PROVIDERS = [
	{
		id: "google",
		name: "Google",
		icon: <Icon icon={IconType.Google} size={20} />,
	},
	{
		id: "github",
		name: "GitHub",
		icon: <Icon icon={IconType.GitHub} size={20} />,
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
		icon: "application",
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
			<div className="flex items-center justify-center min-h-screen">
				<Spinner />
			</div>
		);
	}

	if (!project) {
		return (
			<Alert variant="danger">Project not found</Alert>
		);
	}

	return (
		<div className="page bg-content-bg min-h-screen">
			{/* Breadcrumb */}
			<Breadcrumb className="mb-6 pt-5 px-10">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>{project.name}</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton active>Create New App</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* 2 Column Layout */}
			<div
				className="grid grid-cols-[1.4fr_1fr] gap-10 py-5 px-10 max-w-[1600px] mx-auto"
			>
				{/* Left Column - Form */}
				<div>
					<div className="mb-8">
						<Heading level={1} size="lg" className="mb-2">
							Create New Application
						</Heading>
						<Text className="text-text-secondary">
							Configure your application's authentication settings and OAuth providers.
						</Text>

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

					<Card>
						<CardBody className="p-8">
							<form onSubmit={handleSubmit} className="flex flex-col gap-8">
							{/* Step 1: Basic Information */}
							{step === 1 && (
								<div className="space-y-6">
									<Field>
										<FieldLabel htmlFor="name">
											App Name <span className="text-danger">*</span>
										</FieldLabel>
										<Input
											type="text"
											id="name"
											name="name"
											placeholder="e.g., My Web App, Mobile Client"
											required
											value={formData.name}
											onChange={handleInputChange}
										/>
										<FieldDescription>
											A friendly name to identify your application
										</FieldDescription>
									</Field>

									<Field>
										<FieldLabel htmlFor="slug">
											App Slug
										</FieldLabel>
										<Input
											type="text"
											id="slug"
											name="slug"
											placeholder="auto-generated from name if empty"
											value={formData.slug}
											onChange={handleInputChange}
										/>
										<FieldDescription>
											URL-safe identifier. Auto-generated if left empty.
										</FieldDescription>
									</Field>

									<Field>
															<Label>Project Icon</Label>
															<IconPicker
																selectedIconId={formData.icon}
																onSelect={(icon) => setFormData({ ...formData, icon })}
																label=""
															/>
														</Field>

									<Field>
										<FieldLabel htmlFor="description">
											Description
										</FieldLabel>
										<Textarea
											id="description"
											name="description"
											placeholder="What is this app for?"
											value={formData.description}
											onChange={handleInputChange}
											rows={4}
										/>
										<FieldDescription>
											Optional description of your application
										</FieldDescription>
									</Field>

									<div
										className="flex gap-3 justify-end mt-8"
									>
									<Button
										type="button"
										onClick={() => navigate(`/projects/${projectId}`)}
										variant="secondary"
									>
										Cancel
									</Button>
									<Button
										type="button"
										onClick={() => setStep(2)}
										variant="primary"
										disabled={!formData.name.trim()}
									>
										Next
									</Button>
									</div>
								</div>
							)}

							{/* Step 2: OAuth Providers & Redirect */}
							{step === 2 && (
								<div className="space-y-6">
									{/* OAuth Providers Section */}
									<Field>
										<FieldLabel>
											OAuth Providers <span className="text-danger">*</span>
										</FieldLabel>
										<FieldDescription>
											Select which OAuth providers users can use to authenticate
										</FieldDescription>

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
																{isEnabled && <Icon icon={IconType.Check} size={14} className="text-white" />}
															</div>
														</div>
													</button>
												);
											})}
										</div>
										{formData.enabledProviders.length === 0 && (
											<Text className="text-13px text-danger mt-2">
												⚠️ Select at least one OAuth provider
											</Text>
										)}
										</Field>

									<Field>
										<FieldLabel>
											Redirect URIs <span className="text-danger">*</span>
										</FieldLabel>
										<div
											className="flex flex-col gap-2 mb-3"
										>
											{formData.redirectUris.map((uri, index) => (
												<div
													key={`redirectUri-${index}`}
													className="flex gap-2"
												>
													<Input
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
													/>
													{formData.redirectUris.length > 1 && (
													<Button
														type="button"
														onClick={() =>
															removeArrayField(
																"redirectUris",
																formData.redirectUris.indexOf(uri),
															)
														}
														variant="plain"
														size="sm"
														>
															<Icon icon={IconType.Cancel} size={16} className="text-danger" />
													</Button>
													)}
												</div>
											))}
										</div>
									<Button
										type="button"
										onClick={() => addArrayField("redirectUris")}
										variant="secondary"
										size="sm"
										className="mb-3"
									>
										<Icon icon={IconType.Add} size={16} />
										Add Redirect URI
									</Button>
										<FieldDescription>
											URLs where users will be redirected after authentication
										</FieldDescription>
									</Field>

									<Field>
										<FieldLabel>
											Allowed Hosts
										</FieldLabel>
										<div
											className="flex flex-col gap-2 mb-3"
										>
											{formData.allowedHosts.map((host, index) => (
												<div
													key={`allowedHost-${index}`}
													className="flex gap-2"
												>
													<Input
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
													/>
													{formData.allowedHosts.length > 1 && (
													<Button
														type="button"
														onClick={() =>
															removeArrayField(
																"allowedHosts",
																formData.allowedHosts.indexOf(host),
															)
														}
														variant="plain"
														size="sm"
														>
															<Icon icon={IconType.Cancel} size={16} className="text-danger" />
														</Button>
													)}
												</div>
											))}
										</div>
									<Button
										type="button"
										onClick={() => addArrayField("allowedHosts")}
										variant="secondary"
										size="sm"
										className="mb-3"
									>
										<Icon icon={IconType.Add} size={16} />
										Add Allowed Host
									</Button>
										<FieldDescription>
											Domains from which requests to your app will be accepted
										</FieldDescription>
									</Field>
								<div
									className="flex gap-3 justify-between mt-8"									>
									<Button type="button" onClick={() => setStep(1)} variant="secondary">
										Back
									</Button>
									<Button
											type="button"
											onClick={() => setStep(3)}
										variant="primary"
										disabled={
											formData.redirectUris.filter((uri) => uri.trim()).length === 0 ||
											formData.enabledProviders.length === 0
										}
									>
										Next
									</Button>
									</div>
								</div>
							)}

							{/* Step 3: Advanced Settings */}
							{step === 3 && (
								<div className="space-y-6">
									<Field>
										<FieldLabel htmlFor="sessionTtlDays">
											Session TTL (days)
										</FieldLabel>
										<Input
											type="number"
											id="sessionTtlDays"
											name="sessionTtlDays"
											min="1"
											max="365"
											value={formData.sessionTtlDays}
											onChange={handleInputChange}
										/>
										<FieldDescription>
											How long user sessions remain active (1-365 days). Default: 30 days.
										</FieldDescription>
									</Field>

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
									<Button type="button" onClick={() => setStep(2)} variant="secondary">
										Back
									</Button>
									<Button type="button" onClick={() => setStep(4)} variant="primary">
										Next
									</Button>
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
									<Field>
										<FieldLabel className="flex items-center gap-3 cursor-pointer">
											<Checkbox
												checked={formData.requiresLicensing}
												onCheckedChange={(checked) =>
													setFormData({ ...formData, requiresLicensing: checked === true })
												}
											/>
											<span className="font-semibold text-15px">
												Enable Licensing & Payments
											</span>
										</FieldLabel>
										<FieldDescription className="ml-7.5">
											Add subscription plans and payment processing. Disable if your app only
											needs user management.
										</FieldDescription>
									</Field>

									{formData.requiresLicensing && (
										<div
											className="p-5 rounded-xl bg-surface-secondary border border-border-primary"
										>
											<h3
												className="text-14px font-semibold mb-4 text-text-primary"
											>
												Default License Plan
											</h3>
											<Text
												className="text-13px text-text-tertiary mb-5"
											>
												This plan will be automatically assigned to new users upon signup.
											</Text>

											<div className="space-y-4">
													<Field>
														<FieldLabel htmlFor="planName">
															Plan Name <span className="text-danger">*</span>
														</FieldLabel>
														<Input
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
															placeholder="e.g., Free Plan, Starter, Basic"
															required={formData.requiresLicensing}
														/>
													</Field>
<Field>
														<FieldLabel htmlFor="planDescription">
															Description
														</FieldLabel>
														<Textarea
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
															rows={3}
															placeholder="Brief description of what's included in this plan"
														/>
													</Field>

												<div
													className="grid grid-cols-2 gap-4"
												>
														<Field>
															<FieldLabel htmlFor="planPrice">
																Price <span className="text-danger">*</span>
															</FieldLabel>
															<Input
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
																required={formData.requiresLicensing}
															/>
														</Field>

														<Field>
															<FieldLabel htmlFor="planCurrency">
																Currency <span className="text-danger">*</span>
															</FieldLabel>
															<Input
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
																placeholder="USD"
																maxLength={3}
																required={formData.requiresLicensing}
															/>
														</Field>
												</div>

												<div
													className="grid grid-cols-2 gap-4"
												>
													<Field>
														<FieldLabel htmlFor="billingPeriod">
															Billing Period <span className="text-danger">*</span>
														</FieldLabel>
														<Select
															value={formData.defaultLicensePlan.billing_period}
															onValueChange={(value) =>
																setFormData({
																	...formData,
																	defaultLicensePlan: {
																		...formData.defaultLicensePlan,
																		billing_period: value as any,
																	},
																})
															}
														>
															<SelectTrigger>
																<SelectValue placeholder="Select billing period" />
															</SelectTrigger>
															<SelectPopup>
																<SelectItem value="none">No Billing Required</SelectItem>
																<SelectItem value="lifetime">
																	Lifetime (One-time Payment)
																</SelectItem>
																<SelectItem value="monthly">Monthly Subscription</SelectItem>
																<SelectItem value="yearly">Yearly Subscription</SelectItem>
															</SelectPopup>
														</Select>
														</Field>

														<Field>
															<FieldLabel htmlFor="trialDays">
																Trial Days
															</FieldLabel>
															<Input
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
													/>
												</Field>
											</div>
										</div>
										</div>
									)}

									<div
										className="flex gap-3 justify-between mt-8"
									>
									<Button type="button" onClick={() => setStep(3)} variant="secondary">
										Back
									</Button>
									<Button
										type="submit"
										disabled={createAppMutation.isPending}
										variant="primary"
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
										</Button>
									</div>

									{createAppMutation.isError && (
										<div className="alert alert-danger">
											<span>Error creating app. Please try again.</span>
										</div>
									)}
								</div>
							)}
						</form>
						</CardBody>
					</Card>
				</div>

				{/* Right Column - Preview */}
				<div>
					<div className="sticky top-5">
							<Card className="bg-surface-secondary">
								<CardBody>
									<Heading level={2} size="lg" className="mb-5">
										Login Preview
									</Heading>
									<Text className="text-text-tertiary mb-6">
										This is what users will see when they login to your app
									</Text>
							{/* Mock Login Card */}
							<div
								className="bg-content-bg rounded-2xl py-10 px-8 border border-border-primary text-center"
							>
								{/* App Icon */}
								<div
									className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-surface-secondary"
								>
									<Icon icon={IconType.Key} size={28} className="text-primary" />
								</div>

								{/* App Name & Description */}
								<h3
									className="text-20px font-bold text-text-primary mb-2"
								>
									{formData.name || "My Application"}
								</h3>
								{formData.description && (
									<Text
										className="text-13px text-text-secondary mb-6 leading-relaxed"
									>
										{formData.description}
									</Text>
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
										<Text className="text-13px text-text-tertiary m-0">
											No OAuth providers enabled
										</Text>
									</div>
								)}

								{/* Footer Text */}
								<Text
									className="text-11px text-text-tertiary mt-6 leading-relaxed"
								>
									By continuing, you agree to the Terms of Service and Privacy Policy
								</Text>
							</div>

							{/* Info Note */}
							<div
								className="mt-5 p-3 bg-primary-light border border-primary rounded-lg flex gap-2 items-start"
							>
								<Icon icon={IconType.AlertCircle} size={16} className="text-primary shrink-0 mt-0.5" />
								<Text
									className="text-12px text-text-secondary m-0 leading-relaxed"
								>
									This preview shows the login screen with your app's branding and selected OAuth
									providers
								</Text>
							</div>
							</CardBody>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
