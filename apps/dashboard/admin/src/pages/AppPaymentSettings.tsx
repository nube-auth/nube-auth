import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
		} catch (error: any) {
			showToast(error.message || "Failed to save payment configuration", "error");
		}
	};

	const handleRemoveOverride = () => {
		setShowRemoveModal(true);
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
				<h1 className="text-2xl font-semibold text-gray-900">App Payment Settings</h1>
				<p className="text-sm text-gray-600 mt-1">
					Configure payment provider for <span className="font-semibold text-gray-900">{app?.name}</span>
				</p>
			</div>

			{/* Current Status */}
			{isConfigured && (
				<div className={`mb-6 p-4 border rounded-lg ${
					isUsingProjectConfig ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"
				}`}>
					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2">
								<svg className={`w-5 h-5 ${isUsingProjectConfig ? "text-blue-600" : "text-green-600"}`} fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clipRule="evenodd"
									/>
								</svg>
								<span className={`text-sm font-medium ${isUsingProjectConfig ? "text-blue-800" : "text-green-800"}`}>
									{isUsingProjectConfig ? "Using Project Configuration" : "Using App-Specific Configuration"}
								</span>
							</div>
							<p className={`text-xs mt-1 ml-7 ${isUsingProjectConfig ? "text-blue-700" : "text-green-700"}`}>
								Provider: <span className="font-semibold capitalize">{paymentConfig.provider}</span> • 
								Mode: {paymentConfig.testMode ? "Test" : "Production"}
							</p>
							{isUsingProjectConfig && (
								<p className="text-xs text-blue-600 mt-1 ml-7">
									💡 You can override this configuration for this app specifically
								</p>
							)}
						</div>
						{isUsingAppConfig && (
							<button
								type="button"
								onClick={handleRemoveOverride}
								disabled={deleteConfigMutation.isPending}
								className="text-xs px-3 py-1 text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-md font-medium disabled:opacity-50"
							>
								{deleteConfigMutation.isPending ? "Removing..." : "Remove Override"}
							</button>
						)}
					</div>
				</div>
			)}

			{/* No Config Warning */}
			{!isConfigured && (
				<div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<div className="flex items-center gap-2">
						<svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
							<path
								fillRule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clipRule="evenodd"
							/>
						</svg>
						<span className="text-sm font-medium text-yellow-800">
							No payment configuration found
						</span>
					</div>
					<p className="text-xs text-yellow-700 mt-1 ml-7">
						Configure payment at the project level or set up an app-specific configuration below.
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
					{saveConfigMutation.isPending ? "Saving..." : isUsingAppConfig ? "Update Configuration" : "Save App Override"}
				</button>
			</div>

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
