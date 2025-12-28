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
			showToast("Payment configuration saved successfully", "success");
		} catch (error: any) {
			showToast(error.message || "Failed to save payment configuration", "error");
		}
	};

	if (isLoading) {
		return (
			<div className="p-6">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
					<div className="h-4 bg-gray-200 rounded w-2/3"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-4xl">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold text-gray-900">Payment Settings</h1>
				<p className="text-sm text-gray-600 mt-1">
					Configure payment provider for <strong>{project?.name}</strong>
				</p>
				<p className="text-xs text-gray-500 mt-2">
					This configuration will be inherited by all apps in this project unless overridden at the app level.
				</p>
			</div>

			{/* Current Status */}
			{isConfigured && (
				<div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
					<div className="flex items-center gap-2">
						<svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clipRule="evenodd"
							/>
						</svg>
						<span className="text-sm font-medium text-green-800">
							Payment provider configured: <span className="font-semibold capitalize">{paymentConfig.provider}</span>
						</span>
					</div>
					<p className="text-xs text-green-700 mt-1 ml-7">
						Mode: {paymentConfig.testMode ? "Test" : "Production"}
					</p>
				</div>
			)}

			{/* Provider Selection */}
			<div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
				<label className="block text-sm font-medium text-gray-700 mb-2">Payment Provider</label>
				<div className="relative">
					<select
						value={selectedProvider}
						onChange={(e) => handleProviderChange(e.target.value as Provider)}
						className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white text-gray-900"
					>
						<option value="lemonsqueezy">🍋 Lemon Squeezy - Merchant of Record</option>
						<option value="dodo">🦤 Dodo Payments - Indian Payment Gateway</option>
						<option value="stripe">💳 Stripe - Global Payments</option>
					</select>
					<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
						<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</div>
				</div>
			</div>

			{/* Configuration Form */}
			<div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
				{/* Test Mode Toggle */}
				<div className="mb-4 flex items-center gap-2">
					<input
						type="checkbox"
						id="testMode"
						checked={testMode}
						onChange={(e) => setTestMode(e.target.checked)}
						className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
					/>
					<label htmlFor="testMode" className="text-sm text-gray-700 cursor-pointer">
						Test Mode {testMode && <span className="text-xs text-gray-500">(use test API keys)</span>}
					</label>
				</div>

				{/* Lemon Squeezy Fields */}
				{selectedProvider === "lemonsqueezy" && (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Store ID</label>
							<input
								type="text"
								value={(configForm as LemonSqueezyConfig).storeId}
								onChange={(e) =>
									setConfigForm({ ...configForm, storeId: e.target.value } as LemonSqueezyConfig)
								}
								placeholder="12345"
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Find this in your Lemon Squeezy dashboard under Settings → Stores
							</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
							<input
								type="password"
								value={(configForm as LemonSqueezyConfig).apiKey}
								onChange={(e) =>
									setConfigForm({ ...configForm, apiKey: e.target.value } as LemonSqueezyConfig)
								}
								placeholder="lmsq_api_..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Generate an API key in Settings → API
							</p>
						</div>
					</div>
				)}

				{/* Dodo Payments Fields */}
				{selectedProvider === "dodo" && (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
							<input
								type="password"
								value={(configForm as DodoConfig).apiKey}
								onChange={(e) =>
									setConfigForm({ ...configForm, apiKey: e.target.value } as DodoConfig)
								}
								placeholder="dodo_..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
							<input
								type="password"
								value={(configForm as DodoConfig).webhookSecret}
								onChange={(e) =>
									setConfigForm({ ...configForm, webhookSecret: e.target.value } as DodoConfig)
								}
								placeholder="whsec_..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Used to verify webhook signatures
							</p>
						</div>
					</div>
				)}

				{/* Stripe Fields */}
				{selectedProvider === "stripe" && (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Publishable Key</label>
							<input
								type="text"
								value={(configForm as StripeConfig).publishableKey}
								onChange={(e) =>
									setConfigForm({ ...configForm, publishableKey: e.target.value } as StripeConfig)
								}
								placeholder="pk_test_..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
							<input
								type="password"
								value={(configForm as StripeConfig).secretKey}
								onChange={(e) =>
									setConfigForm({ ...configForm, secretKey: e.target.value } as StripeConfig)
								}
								placeholder="sk_test_..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
							<input
								type="password"
								value={(configForm as StripeConfig).webhookSecret}
								onChange={(e) =>
									setConfigForm({ ...configForm, webhookSecret: e.target.value } as StripeConfig)
								}
								placeholder="whsec_..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
					</div>
				)}
			</div>

			{/* Save Button */}
			<div className="flex justify-end gap-3">
				<button
					type="button"
					onClick={handleSave}
					disabled={saveConfigMutation.isPending}
					className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
				>
					{saveConfigMutation.isPending ? "Saving..." : isConfigured ? "Update Configuration" : "Save Configuration"}
				</button>
			</div>
		</div>
	);
}
