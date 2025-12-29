import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useApp, useAppPaymentConfig, useSaveAppPaymentConfig, useDeleteAppPaymentConfig } from "../hooks/api";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/ConfirmModal";

type Provider = "lemonsqueezy" | "dodo" | "stripe";

interface LemonSqueezyConfig {
	storeId: string;
	apiKey: string;
}

interface DodoConfig {
	apiKey: string;
	webhookSecret: string;
}

interface StripeConfig {
	publishableKey: string;
	secretKey: string;
	webhookSecret: string;
}

const PROVIDERS = [
	{
		id: "lemonsqueezy" as Provider,
		name: "Lemon Squeezy",
		description: "Merchant of Record",
		icon: "🍋",
		color: "#FCD34D",
	},
	{
		id: "dodo" as Provider,
		name: "Dodo Payments",
		description: "Indian Payment Gateway",
		icon: "🦤",
		color: "#60A5FA",
	},
	{
		id: "stripe" as Provider,
		name: "Stripe",
		description: "Global Payments",
		icon: "💳",
		color: "#6366F1",
	},
];

export default function AppPaymentSettingsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { showToast } = useToast();

	const { data: app, isLoading: appLoading } = useApp(projectId!, appId!);
	const { data: paymentConfig, isLoading: configLoading } = useAppPaymentConfig(projectId!, appId!);
	const saveConfigMutation = useSaveAppPaymentConfig(projectId!, appId!);
	const deleteConfigMutation = useDeleteAppPaymentConfig(projectId!, appId!);

	const [selectedProvider, setSelectedProvider] = useState<Provider>("lemonsqueezy");
	const [testMode, setTestMode] = useState(true);
	const [configForm, setConfigForm] = useState<LemonSqueezyConfig | DodoConfig | StripeConfig>({
		storeId: "",
		apiKey: "",
	});
	const [showRemoveModal, setShowRemoveModal] = useState(false);
	const [isEditing, setIsEditing] = useState(false);

	const isLoading = appLoading || configLoading;
	const isConfigured = paymentConfig?.configured;
	const isUsingProjectConfig = paymentConfig?.source === "project";
	const isUsingAppConfig = paymentConfig?.source === "app";

	// Update form when config loads
	useEffect(() => {
		if (paymentConfig?.provider) {
			setSelectedProvider(paymentConfig.provider as Provider);
			setTestMode(paymentConfig.testMode || false);
		}
	}, [paymentConfig]);

	const handleProviderChange = (provider: Provider) => {
		setSelectedProvider(provider);
		// Reset form based on provider
		switch (provider) {
			case "lemonsqueezy":
				setConfigForm({ storeId: "", apiKey: "" });
				break;
			case "dodo":
				setConfigForm({ apiKey: "", webhookSecret: "" });
				break;
			case "stripe":
				setConfigForm({ publishableKey: "", secretKey: "", webhookSecret: "" });
				break;
		}
	};

	const handleSave = async () => {
		// Validate
		if (selectedProvider === "lemonsqueezy") {
			const config = configForm as LemonSqueezyConfig;
			if (!config.storeId || !config.apiKey) {
				showToast("Please fill in all fields", "error");
				return;
			}
		} else if (selectedProvider === "dodo") {
			const config = configForm as DodoConfig;
			if (!config.apiKey || !config.webhookSecret) {
				showToast("Please fill in all fields", "error");
				return;
			}
		} else if (selectedProvider === "stripe") {
			const config = configForm as StripeConfig;
			if (!config.publishableKey || !config.secretKey || !config.webhookSecret) {
				showToast("Please fill in all fields", "error");
				return;
			}
		}

		try {
			await saveConfigMutation.mutateAsync({
				provider: selectedProvider,
				testMode,
				config: configForm,
			});
			showToast("App payment configuration saved successfully", "success");
			setIsEditing(false);
		} catch (error: any) {
			showToast(error.message || "Failed to save payment configuration", "error");
		}
	};

	const handleRemoveOverride = () => {
		setShowRemoveModal(true);
	};

	const handleStartOverride = () => {
		setIsEditing(true);
		if (paymentConfig?.provider) {
			setSelectedProvider(paymentConfig.provider as Provider);
		}
	};

	if (isLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	const currentProvider = PROVIDERS.find((p) => p.id === paymentConfig?.provider);

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
						Project
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}/apps/${appId}`} style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						{app?.name || "App"}
					</Link>
					<span>›</span>
					<span style={{ color: "var(--text-primary)" }}>Payment</span>
				</div>
			</div>

			{/* Page Header */}
			<div style={{ marginBottom: "32px" }}>
				<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Payment Configuration</h1>
				<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
					Configure payment provider settings for <strong>{app?.name}</strong>
				</p>
			</div>

			{/* Current Status Card */}
			{isConfigured && (
				<div className="card" style={{ marginBottom: "24px", padding: "20px" }}>
					<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
						<div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
							<div
								style={{
									width: "40px",
									height: "40px",
									borderRadius: "8px",
									background: isUsingProjectConfig ? "var(--info-bg)" : "var(--success-bg)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "20px",
									flexShrink: 0,
								}}
							>
								{currentProvider?.icon || "💳"}
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
									<span
										className={`badge ${isUsingProjectConfig ? "badge-info" : "badge-success"}`}
										style={{ fontSize: "11px", fontWeight: "600" }}
									>
										{isUsingProjectConfig ? "Inherited" : "App Override"}
									</span>
									<span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
										{currentProvider?.name || paymentConfig?.provider}
									</span>
								</div>
								<p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
									{isUsingProjectConfig
										? "Using payment configuration from project settings"
										: "Using app-specific payment configuration"}
								</p>
								<div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--text-tertiary)" }}>
									<span>
										Mode: <strong style={{ color: "var(--text-primary)" }}>{paymentConfig.testMode ? "Test" : "Production"}</strong>
									</span>
									{isUsingProjectConfig && (
										<span style={{ color: "var(--info)" }}>
											💡 You can override this for this app
										</span>
									)}
								</div>
							</div>
						</div>
						{isUsingAppConfig && !isEditing && (
							<button
								type="button"
								onClick={handleRemoveOverride}
								disabled={deleteConfigMutation.isPending}
								className="btn btn-ghost btn-sm"
								style={{ color: "var(--danger)" }}
							>
								Remove Override
							</button>
						)}
						{isUsingProjectConfig && !isEditing && (
							<button type="button" onClick={handleStartOverride} className="btn btn-primary btn-sm">
								Override for App
							</button>
						)}
					</div>
				</div>
			)}

			{/* No Config Warning */}
			{!isConfigured && (
				<div className="alert alert-warning" style={{ marginBottom: "24px" }}>
					<svg fill="currentColor" viewBox="0 0 20 20" style={{ width: "20px", height: "20px" }}>
						<path
							fillRule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
					<div>
						<div style={{ fontWeight: "600", marginBottom: "4px" }}>No payment configuration</div>
						<div style={{ fontSize: "13px" }}>
							Configure payment at the project level or set up an app-specific configuration below.
						</div>
					</div>
				</div>
			)}

			{/* Configuration Form */}
			{(isEditing || !isConfigured) && (
				<div className="card" style={{ padding: "24px" }}>
					<div style={{ marginBottom: "24px" }}>
						<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
							{isUsingAppConfig ? "Update App Payment Configuration" : "Configure Payment Provider"}
						</h3>
						<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
							{isUsingAppConfig
								? "Update the app-specific payment settings"
								: "Set up a payment provider for this app"}
						</p>
					</div>

					{/* Provider Selection */}
					<div className="form-group">
						<label className="form-label">Payment Provider</label>
						<select
							value={selectedProvider}
							onChange={(e) => handleProviderChange(e.target.value as Provider)}
							className="form-control"
							disabled={saveConfigMutation.isPending}
						>
							{PROVIDERS.map((provider) => (
								<option key={provider.id} value={provider.id}>
									{provider.icon} {provider.name} - {provider.description}
								</option>
							))}
						</select>
					</div>

					{/* Test Mode Toggle */}
					<div className="form-group">
						<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
							<input
								type="checkbox"
								checked={testMode}
								onChange={(e) => setTestMode(e.target.checked)}
								style={{ width: "16px", height: "16px", cursor: "pointer" }}
								disabled={saveConfigMutation.isPending}
							/>
							<span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
								Test Mode
							</span>
						</label>
						<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px", marginLeft: "24px" }}>
							Use test API keys for development and testing
						</p>
					</div>

					{/* Provider-Specific Fields */}
					<div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border-primary)" }}>
						{selectedProvider === "lemonsqueezy" && (
							<div style={{ display: "grid", gap: "20px" }}>
								<div className="form-group">
									<label className="form-label">Store ID</label>
									<input
										type="text"
										value={(configForm as LemonSqueezyConfig).storeId}
										onChange={(e) =>
											setConfigForm({ ...configForm, storeId: e.target.value } as LemonSqueezyConfig)
										}
										placeholder="12345"
										className="form-control"
										disabled={saveConfigMutation.isPending}
									/>
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
										Find this in your Lemon Squeezy dashboard under Settings → Stores
									</p>
								</div>

								<div className="form-group">
									<label className="form-label">API Key</label>
									<input
										type="password"
										value={(configForm as LemonSqueezyConfig).apiKey}
										onChange={(e) =>
											setConfigForm({ ...configForm, apiKey: e.target.value } as LemonSqueezyConfig)
										}
										placeholder="lmsq_api_..."
										className="form-control"
										disabled={saveConfigMutation.isPending}
									/>
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
										Generate an API key in Settings → API
									</p>
								</div>
							</div>
						)}

						{selectedProvider === "dodo" && (
							<div style={{ display: "grid", gap: "20px" }}>
								<div className="form-group">
									<label className="form-label">API Key</label>
									<input
										type="password"
										value={(configForm as DodoConfig).apiKey}
										onChange={(e) =>
											setConfigForm({ ...configForm, apiKey: e.target.value } as DodoConfig)
										}
										placeholder="dodo_..."
										className="form-control"
										disabled={saveConfigMutation.isPending}
									/>
								</div>

								<div className="form-group">
									<label className="form-label">Webhook Secret</label>
									<input
										type="password"
										value={(configForm as DodoConfig).webhookSecret}
										onChange={(e) =>
											setConfigForm({ ...configForm, webhookSecret: e.target.value } as DodoConfig)
										}
										placeholder="whsec_..."
										className="form-control"
										disabled={saveConfigMutation.isPending}
									/>
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
										Used to verify webhook signatures
									</p>
								</div>
							</div>
						)}

						{selectedProvider === "stripe" && (
							<div style={{ display: "grid", gap: "20px" }}>
								<div className="form-group">
									<label className="form-label">Publishable Key</label>
									<input
										type="text"
										value={(configForm as StripeConfig).publishableKey}
										onChange={(e) =>
											setConfigForm({ ...configForm, publishableKey: e.target.value } as StripeConfig)
										}
										placeholder="pk_test_..."
										className="form-control"
										disabled={saveConfigMutation.isPending}
									/>
								</div>

								<div className="form-group">
									<label className="form-label">Secret Key</label>
									<input
										type="password"
										value={(configForm as StripeConfig).secretKey}
										onChange={(e) =>
											setConfigForm({ ...configForm, secretKey: e.target.value } as StripeConfig)
										}
										placeholder="sk_test_..."
										className="form-control"
										disabled={saveConfigMutation.isPending}
									/>
								</div>

								<div className="form-group">
									<label className="form-label">Webhook Secret</label>
									<input
										type="password"
										value={(configForm as StripeConfig).webhookSecret}
										onChange={(e) =>
											setConfigForm({ ...configForm, webhookSecret: e.target.value } as StripeConfig)
										}
										placeholder="whsec_..."
										className="form-control"
										disabled={saveConfigMutation.isPending}
									/>
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
										Used to verify webhook signatures
									</p>
								</div>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
						{isEditing && (
							<button
								type="button"
								onClick={() => {
									setIsEditing(false);
									// Reset form
									if (paymentConfig?.provider) {
										setSelectedProvider(paymentConfig.provider as Provider);
									}
								}}
								className="btn btn-secondary"
								disabled={saveConfigMutation.isPending}
							>
								Cancel
							</button>
						)}
						<button
							type="button"
							onClick={handleSave}
							disabled={saveConfigMutation.isPending}
							className="btn btn-primary"
						>
							{saveConfigMutation.isPending
								? "Saving..."
								: isUsingAppConfig
									? "Update Configuration"
									: "Save Configuration"}
						</button>
					</div>
				</div>
			)}

			{/* Remove Override Confirmation Modal */}
			<ConfirmModal
				isOpen={showRemoveModal}
				onClose={() => setShowRemoveModal(false)}
				onConfirm={async () => {
					try {
						await deleteConfigMutation.mutateAsync();
						showToast("App payment override removed. Now using project configuration.", "success");
						setShowRemoveModal(false);
					} catch (error: any) {
						showToast(error.message || "Failed to remove payment override", "error");
					}
				}}
				title="Remove App Payment Override?"
				message="This will remove the app-specific payment configuration and revert to using the project-level configuration."
				confirmText="Remove Override"
				variant="warning"
				isLoading={deleteConfigMutation.isPending}
			/>
		</div>
	);
}
