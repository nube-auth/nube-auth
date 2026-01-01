import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import { useProject, useProjectPaymentConfig, useSaveProjectPaymentConfig } from "../hooks/api";

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

export default function ProjectPaymentSettingsPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const { showToast } = useToast();

	const { data: project, isLoading: projectLoading } = useProject(projectId!);
	const { data: paymentConfig, isLoading: configLoading } = useProjectPaymentConfig(projectId!);
	const saveConfigMutation = useSaveProjectPaymentConfig(projectId!);

	const [selectedProvider, setSelectedProvider] = useState<Provider>("lemonsqueezy");
	const [testMode, setTestMode] = useState(true);
	const [configName, setConfigName] = useState("");
	const [configSlug, setConfigSlug] = useState("");
	const [configForm, setConfigForm] = useState<LemonSqueezyConfig | DodoConfig | StripeConfig>({
		storeId: "",
		apiKey: "",
	});
	const [isEditMode, setIsEditMode] = useState(false);

	const isLoading = projectLoading || configLoading;
	const isConfigured = paymentConfig?.configured;

	// Load existing configuration when available
	useEffect(() => {
		if (paymentConfig?.configured) {
			setSelectedProvider(paymentConfig.provider as Provider);
			setTestMode(paymentConfig.testMode || false);
			setConfigName(paymentConfig.name || "");
			setConfigSlug(paymentConfig.slug || "");
			// Don't load encrypted config values for security
			setIsEditMode(false);
		}
	}, [paymentConfig]);

	const handleProviderChange = (provider: Provider) => {
		setSelectedProvider(provider);
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

	const handleEdit = () => {
		setIsEditMode(true);
		// Reset form to empty values when editing
		handleProviderChange(selectedProvider);
	};

	const handleCancel = () => {
		setIsEditMode(false);
		handleProviderChange(selectedProvider);
	};

	const handleSave = async () => {
		// Validate name and slug
		if (!configName.trim()) {
			showToast("Please enter a configuration name", "error");
			return;
		}

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
				name: configName,
				slug: configSlug || configName.toLowerCase().replace(/\s+/g, "-"),
				provider: selectedProvider,
				testMode,
				config: configForm,
			});
			showToast("Payment configuration saved successfully", "success");
			setIsEditMode(false);
		} catch (error: any) {
			showToast(error.message || "Failed to save payment configuration", "error");
		}
	};

	if (isLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	return (
		<div className="page">
			<div
				style={{
					marginBottom: "32px",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
				}}
			>
				<div>
					<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Payment Settings</h1>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
						Configure payment provider for <strong>{project?.name}</strong>
					</p>
				</div>
				{isConfigured && !isEditMode && (
					<button type="button" onClick={handleEdit} className="btn btn-primary">
						Edit Configuration
					</button>
				)}
			</div>

			{isConfigured && !isEditMode ? (
				<div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
					<div
						className="alert alert-success"
						style={{ marginBottom: "24px", display: "flex", alignItems: "center" }}
					>
						<svg fill="currentColor" viewBox="0 0 20 20" style={{ width: "20px", height: "20px" }}>
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clipRule="evenodd"
							/>
						</svg>
						<div>
							<strong>Payment provider configured: {paymentConfig.provider}</strong>
							<br />
							<small>Mode: {paymentConfig.testMode ? "Test" : "Production"}</small>
						</div>
					</div>

					<div style={{ display: "grid", gap: "16px" }}>
						<div className="form-group">
							<label className="form-label">Configuration Name</label>
							<div
								style={{
									padding: "8px 12px",
									background: "var(--card-bg)",
									border: "1px solid var(--border)",
									borderRadius: "4px",
								}}
							>
								{paymentConfig.name || "Unnamed Configuration"}
							</div>
						</div>

						{paymentConfig.slug && (
							<div className="form-group">
								<label className="form-label">Slug</label>
								<div
									style={{
										padding: "8px 12px",
										background: "var(--card-bg)",
										border: "1px solid var(--border)",
										borderRadius: "4px",
										fontFamily: "monospace",
										fontSize: "13px",
									}}
								>
									{paymentConfig.slug}
								</div>
							</div>
						)}

						<div className="form-group">
							<label className="form-label">Provider</label>
							<div
								style={{
									padding: "8px 12px",
									background: "var(--card-bg)",
									border: "1px solid var(--border)",
									borderRadius: "4px",
								}}
							>
								{paymentConfig.provider === "lemonsqueezy" && "🍋 Lemon Squeezy"}
								{paymentConfig.provider === "dodo" && "🦤 Dodo Payments"}
								{paymentConfig.provider === "stripe" && "💳 Stripe"}
							</div>
						</div>

						<div className="form-group">
							<label className="form-label">Mode</label>
							<div
								style={{
									padding: "8px 12px",
									background: "var(--card-bg)",
									border: "1px solid var(--border)",
									borderRadius: "4px",
								}}
							>
								{paymentConfig.testMode ? "Test Mode" : "Production Mode"}
							</div>
						</div>

						<div
							style={{
								marginTop: "8px",
								padding: "12px",
								background: "var(--warning-bg)",
								border: "1px solid var(--warning)",
								borderRadius: "4px",
								fontSize: "13px",
								color: "var(--warning)",
							}}
						>
							⚠️ For security reasons, credentials are encrypted and cannot be viewed. Click "Edit
							Configuration" to update them.
						</div>
					</div>
				</div>
			) : (
				<div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
					<div className="form-group">
						<label className="form-label">Configuration Name *</label>
						<input
							type="text"
							value={configName}
							onChange={(e) => setConfigName(e.target.value)}
							placeholder="e.g., My Store Payments"
							className="form-control"
						/>
						<small
							style={{
								fontSize: "12px",
								color: "var(--text-tertiary)",
								marginTop: "4px",
								display: "block",
							}}
						>
							A friendly name to identify this payment configuration
						</small>
					</div>

					<div className="form-group">
						<label className="form-label">Slug (optional)</label>
						<input
							type="text"
							value={configSlug}
							onChange={(e) => setConfigSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
							placeholder="my-store-payments"
							className="form-control"
							style={{ fontFamily: "monospace", fontSize: "13px" }}
						/>
						<small
							style={{
								fontSize: "12px",
								color: "var(--text-tertiary)",
								marginTop: "4px",
								display: "block",
							}}
						>
							URL-friendly identifier (auto-generated from name if not provided)
						</small>
					</div>

					<div className="form-group">
						<label className="form-label">Payment Provider</label>
						<Select
							value={selectedProvider}
							onChange={(value) => handleProviderChange(value as Provider)}
							options={[
								{ value: "lemonsqueezy", label: "🍋 Lemon Squeezy - Merchant of Record" },
								{ value: "dodo", label: "🦤 Dodo Payments - Indian Payment Gateway" },
								{ value: "stripe", label: "💳 Stripe - Global Payments" },
							]}
							disabled={isConfigured && !isEditMode}
						/>
					</div>

					<div className="form-group" style={{ marginTop: "16px" }}>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								cursor: "pointer",
								marginBottom: "0",
							}}
						>
							<input
								type="checkbox"
								checked={testMode}
								onChange={(e) => setTestMode(e.target.checked)}
								style={{ width: "16px", height: "16px", cursor: "pointer" }}
							/>
							<span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
								Test Mode
							</span>
						</label>
					</div>

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
								/>
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
								/>
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
								/>
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
								/>
							</div>
						</div>
					)}

					<div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
						{isEditMode && (
							<button
								type="button"
								onClick={handleCancel}
								disabled={saveConfigMutation.isPending}
								className="btn"
								style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
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
								: isEditMode
									? "Update Configuration"
									: "Save Configuration"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
