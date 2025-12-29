import { useState } from "react";
import { useParams } from "react-router-dom";
import { useProject, useProjectPaymentConfig, useSaveProjectPaymentConfig } from "../hooks/api";
import { useToast } from "../components/Toast";

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
	const [configForm, setConfigForm] = useState<LemonSqueezyConfig | DodoConfig | StripeConfig>({
		storeId: "",
		apiKey: "",
	});

	const isLoading = projectLoading || configLoading;
	const isConfigured = paymentConfig?.configured;

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

	const handleSave = async () => {
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
			showToast("Payment configuration saved successfully", "success");
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
			<div style={{ marginBottom: "32px" }}>
				<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Payment Settings</h1>
				<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
					Configure payment provider for <strong>{project?.name}</strong>
				</p>
			</div>

			{isConfigured && (
				<div className="alert alert-success" style={{ marginBottom: "24px" }}>
					<svg fill="currentColor" viewBox="0 0 20 20" style={{ width: "20px", height: "20px" }}>
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
					</svg>
					<div>
						<strong>Payment provider configured: {paymentConfig.provider}</strong>
						<br />
						<small>Mode: {paymentConfig.testMode ? "Test" : "Production"}</small>
					</div>
				</div>
			)}

			<div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
				<div className="form-group">
					<label className="form-label">Payment Provider</label>
					<select
						value={selectedProvider}
						onChange={(e) => handleProviderChange(e.target.value as Provider)}
						className="form-control"
					>
						<option value="lemonsqueezy">🍋 Lemon Squeezy - Merchant of Record</option>
						<option value="dodo">🦤 Dodo Payments - Indian Payment Gateway</option>
						<option value="stripe">💳 Stripe - Global Payments</option>
					</select>
				</div>

				<div className="form-group">
					<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
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
					<button
						type="button"
						onClick={handleSave}
						disabled={saveConfigMutation.isPending}
						className="btn btn-primary"
					>
						{saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
					</button>
				</div>
			</div>
		</div>
	);
}
