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
		<div className="p-6 max-w-5xl mx-auto">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">Payment Settings</h1>
				<p className="text-base text-gray-600 mt-2">
					Configure payment provider for <span className="font-semibold text-gray-900">{project?.name}</span>
				</p>
				<p className="text-sm text-gray-500 mt-1">
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
			<div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 mb-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-6">Select Payment Provider</h2>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
					<button
						type="button"
						onClick={() => handleProviderChange("lemonsqueezy")}
						className={`group relative p-6 border-2 rounded-xl text-left transition-all duration-200 ${
							selectedProvider === "lemonsqueezy"
								? "border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-500 ring-opacity-50"
								: "border-gray-200 hover:border-indigo-300 hover:shadow-sm"
						}`}
					>
						<div className="flex items-center gap-3 mb-2">
							<span className="text-3xl">🍋</span>
							<div className="font-bold text-gray-900 text-lg">Lemon Squeezy</div>
						</div>
						<div className="text-sm text-gray-600">Merchant of Record</div>
						{selectedProvider === "lemonsqueezy" && (
							<div className="absolute top-3 right-3">
								<svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
								</svg>
							</div>
						)}
					</button>

					<button
						type="button"
						onClick={() => handleProviderChange("dodo")}
						className={`group relative p-6 border-2 rounded-xl text-left transition-all duration-200 ${
							selectedProvider === "dodo"
								? "border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-500 ring-opacity-50"
								: "border-gray-200 hover:border-indigo-300 hover:shadow-sm"
						}`}
					>
						<div className="flex items-center gap-3 mb-2">
							<span className="text-3xl">🦤</span>
							<div className="font-bold text-gray-900 text-lg">Dodo Payments</div>
						</div>
						<div className="text-sm text-gray-600">Indian Payment Gateway</div>
						{selectedProvider === "dodo" && (
							<div className="absolute top-3 right-3">
								<svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
								</svg>
							</div>
						)}
					</button>

					<button
						type="button"
						onClick={() => handleProviderChange("stripe")}
						className={`group relative p-6 border-2 rounded-xl text-left transition-all duration-200 ${
							selectedProvider === "stripe"
								? "border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-500 ring-opacity-50"
								: "border-gray-200 hover:border-indigo-300 hover:shadow-sm"
						}`}
					>
						<div className="flex items-center gap-3 mb-2">
							<span className="text-3xl">💳</span>
							<div className="font-bold text-gray-900 text-lg">Stripe</div>
						</div>
						<div className="text-sm text-gray-600">Global Payments</div>
						{selectedProvider === "stripe" && (
							<div className="absolute top-3 right-3">
								<svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
								</svg>
							</div>
						)}
					</button>
				</div>
			</div>

			{/* Configuration Form */}
			<div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 mb-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-6">Provider Configuration</h2>

				{/* Test Mode Toggle */}
				<div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
					<label className="flex items-center gap-4 cursor-pointer">
						<input
							type="checkbox"
							checked={testMode}
							onChange={(e) => setTestMode(e.target.checked)}
							className="sr-only peer"
						/>
						<div className="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-6 rtl:peer-checked:after:-translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 relative"></div>
						<div>
							<div className="text-sm font-semibold text-gray-900">Test Mode</div>
							<div className="text-xs text-gray-500 mt-0.5">
								{testMode ? "Using test API keys for development" : "Using production API keys"}
							</div>
						</div>
					</label>
				</div>

				{/* Lemon Squeezy Fields */}
				{selectedProvider === "lemonsqueezy" && (
					<div className="space-y-5">
						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">Store ID</label>
							<input
								type="text"
								value={(configForm as LemonSqueezyConfig).storeId}
								onChange={(e) =>
									setConfigForm({ ...configForm, storeId: e.target.value } as LemonSqueezyConfig)
								}
								placeholder="12345"
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
							/>
							<p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
								<svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
								</svg>
								<span>Find this in your Lemon Squeezy dashboard under Settings → Stores</span>
							</p>
						</div>

						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">API Key</label>
							<input
								type="password"
								value={(configForm as LemonSqueezyConfig).apiKey}
								onChange={(e) =>
									setConfigForm({ ...configForm, apiKey: e.target.value } as LemonSqueezyConfig)
								}
								placeholder="lmsq_api_..."
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
							/>
							<p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
								<svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
								</svg>
								<span>Generate an API key in Settings → API</span>
							</p>
						</div>
					</div>
				)}

				{/* Dodo Payments Fields */}
				{selectedProvider === "dodo" && (
					<div className="space-y-5">
						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">API Key</label>
							<input
								type="password"
								value={(configForm as DodoConfig).apiKey}
								onChange={(e) =>
									setConfigForm({ ...configForm, apiKey: e.target.value } as DodoConfig)
								}
								placeholder="dodo_..."
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
							/>
						</div>

						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">Webhook Secret</label>
							<input
								type="password"
								value={(configForm as DodoConfig).webhookSecret}
								onChange={(e) =>
									setConfigForm({ ...configForm, webhookSecret: e.target.value } as DodoConfig)
								}
								placeholder="whsec_..."
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
							/>
							<p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
								<svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
								</svg>
								<span>Used to verify webhook signatures</span>
							</p>
						</div>
					</div>
				)}

				{/* Stripe Fields */}
				{selectedProvider === "stripe" && (
					<div className="space-y-5">
						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">Publishable Key</label>
							<input
								type="text"
								value={(configForm as StripeConfig).publishableKey}
								onChange={(e) =>
									setConfigForm({ ...configForm, publishableKey: e.target.value } as StripeConfig)
								}
								placeholder="pk_test_..."
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
							/>
						</div>

						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">Secret Key</label>
							<input
								type="password"
								value={(configForm as StripeConfig).secretKey}
								onChange={(e) =>
									setConfigForm({ ...configForm, secretKey: e.target.value } as StripeConfig)
								}
								placeholder="sk_test_..."
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
							/>
						</div>

						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">Webhook Secret</label>
							<input
								type="password"
								value={(configForm as StripeConfig).webhookSecret}
								onChange={(e) =>
									setConfigForm({ ...configForm, webhookSecret: e.target.value } as StripeConfig)
								}
								placeholder="whsec_..."
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
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
					className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
				>
					{saveConfigMutation.isPending ? (
						<>
							<svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span>Saving...</span>
						</>
					) : (
						<>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
							<span>{isConfigured ? "Update Configuration" : "Save Configuration"}</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
}
