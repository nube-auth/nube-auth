import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
	useApp,
	useAvailablePaymentProviders,
	useSelectedPaymentProvider,
	useSelectPaymentProvider,
} from "../hooks/api";
import { useToast } from "../components/Toast";

type PaymentProvider = {
	id: number;
	provider: string;
	entityType: "platform" | "project" | "app";
	entityId: number | null;
	environment: "test" | "production";
	credentials: Record<string, string>;
	webhookSecret?: string;
	isActive: boolean;
	createdAt: string;
};

const getProviderInfo = (provider: string) => {
	const info: Record<string, { name: string; description: string; icon: string; color: string }> = {
		lemonsqueezy: {
			name: "Lemon Squeezy",
			description: "Merchant of Record",
			icon: "🍋",
			color: "#FCD34D",
		},
		dodo: {
			name: "Dodo Payments",
			description: "Indian Payment Gateway",
			icon: "🦤",
			color: "#60A5FA",
		},
		stripe: {
			name: "Stripe",
			description: "Global Payments",
			icon: "💳",
			color: "#6366F1",
		},
	};
	return info[provider.toLowerCase()] || { name: provider, description: "", icon: "💳", color: "#6366F1" };
};

export default function AppPaymentSettingsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { showToast } = useToast();

	const { data: app, isLoading: appLoading } = useApp(projectId!, appId!);
	const [selectedEnvironment, setSelectedEnvironment] = useState<"test" | "production">("test");
	const { data: availableProviders = [], isLoading: loadingAvailable } = useAvailablePaymentProviders(appId!, selectedEnvironment);
	const { data: selectedProvider, isLoading: loadingSelected } = useSelectedPaymentProvider(appId!);
	const selectProviderMutation = useSelectPaymentProvider(appId!);

	const [showCreateForm, setShowCreateForm] = useState(false);

	const handleSelectProvider = async (providerId: number) => {
		try {
			await selectProviderMutation.mutateAsync(providerId);
			showToast("Payment provider selected", "success");
		} catch (error) {
			showToast("Failed to select payment provider", "error");
		}
	};

	const getSourceBadge = (entityType: string) => {
		const colors = {
			platform: { bg: "var(--primary-bg)", text: "var(--primary)" },
			project: { bg: "var(--info-bg)", text: "var(--info)" },
			app: { bg: "var(--success-bg)", text: "var(--success)" },
		};
		const color = colors[entityType as keyof typeof colors] || colors.platform;
		
		return (
			<span
				style={{
					padding: "2px 8px",
					borderRadius: "4px",
					fontSize: "11px",
					fontWeight: "600",
					background: color.bg,
					color: color.text,
					textTransform: "capitalize",
				}}
			>
				{entityType}
			</span>
		);
	};

	if (appLoading || loadingAvailable || loadingSelected) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	const providerInfo = selectedProvider ? getProviderInfo(selectedProvider.provider) : null;

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
			<div style={{ marginBottom: "32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
				<div>
					<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Payment Configuration</h1>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
						Configure payment provider for <strong>{app?.name}</strong>
					</p>
				</div>
				<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
					<select
						value={selectedEnvironment}
						onChange={(e) => setSelectedEnvironment(e.target.value as "test" | "production")}
						className="form-control"
						style={{ width: "auto", fontSize: "13px" }}
					>
						<option value="test">Test Mode</option>
						<option value="production">Production Mode</option>
					</select>
					<button
						type="button"
						onClick={() => setShowCreateForm(!showCreateForm)}
						className="btn btn-primary"
					>
						Create App Provider
					</button>
				</div>
			</div>

			{/* Selected Provider */}
			{selectedProvider && (
				<div style={{ marginBottom: "24px" }}>
					<h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
						Current Provider
					</h2>
					<div
						className="card"
						style={{
							padding: "20px",
							border: "2px solid var(--success)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							<div
								style={{
									width: "48px",
									height: "48px",
									borderRadius: "8px",
									background: providerInfo?.color || "#6366F1",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "24px",
									flexShrink: 0,
								}}
							>
								{providerInfo?.icon || "💳"}
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
									<span style={{ fontSize: "16px", fontWeight: "600" }}>
										{providerInfo?.name || selectedProvider.provider}
									</span>
									{getSourceBadge(selectedProvider.entityType)}
									<span
										style={{
											padding: "2px 8px",
											borderRadius: "4px",
											fontSize: "11px",
											fontWeight: "600",
											background: selectedProvider.environment === "test" ? "var(--warning-bg)" : "var(--success-bg)",
											color: selectedProvider.environment === "test" ? "var(--warning)" : "var(--success)",
											textTransform: "capitalize",
										}}
									>
										{selectedProvider.environment}
									</span>
								</div>
								<div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
									{providerInfo?.description}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Available Providers */}
			<div>
				<h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
					Available Providers ({selectedEnvironment})
				</h2>
				{availableProviders.length === 0 ? (
					<div className="card" style={{ padding: "32px", textAlign: "center" }}>
						<p style={{ color: "var(--text-tertiary)" }}>
							No payment providers configured for {selectedEnvironment} mode yet.
						</p>
						<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "8px" }}>
							Create an app-level provider to get started.
						</p>
					</div>
				) : (
					<div style={{ display: "grid", gap: "12px" }}>
						{availableProviders.map((provider: PaymentProvider) => {
							const info = getProviderInfo(provider.provider);
							const isSelected = selectedProvider?.id === provider.id;
							return (
								<div
									key={provider.id}
									className="card"
									style={{
										padding: "16px",
										display: "flex",
										alignItems: "center",
										gap: "12px",
										opacity: provider.isActive ? 1 : 0.5,
										border: isSelected ? "2px solid var(--success)" : undefined,
									}}
								>
									<input
										type="radio"
										name="paymentProvider"
										checked={isSelected}
										onChange={() => handleSelectProvider(provider.id)}
										disabled={!provider.isActive || selectProviderMutation.isPending}
										style={{ width: "18px", height: "18px", cursor: "pointer" }}
									/>
									<div
										style={{
											width: "40px",
											height: "40px",
											borderRadius: "8px",
											background: info.color,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: "20px",
											flexShrink: 0,
										}}
									>
										{info.icon}
									</div>
									<div style={{ flex: 1 }}>
										<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
											<span style={{ fontSize: "14px", fontWeight: "600" }}>
												{info.name}
											</span>
											{getSourceBadge(provider.entityType)}
											{!provider.isActive && (
												<span
													style={{
														padding: "2px 8px",
														borderRadius: "4px",
														fontSize: "11px",
														fontWeight: "600",
														background: "var(--warning-bg)",
														color: "var(--warning)",
													}}
												>
													Inactive
												</span>
											)}
										</div>
										<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
											{info.description}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Info Box */}
			<div className="alert alert-info" style={{ marginTop: "24px" }}>
				<svg style={{ width: "20px", height: "20px", flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
					<path
						fillRule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clipRule="evenodd"
					/>
				</svg>
				<div style={{ fontSize: "13px" }}>
					<p style={{ fontWeight: "600", marginBottom: "8px" }}>Payment Provider Selection</p>
					<ul style={{ listStyle: "disc", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
						<li>Platform providers are configured at the system level</li>
						<li>Project providers are shared across all apps in the project</li>
						<li>App providers are specific to this app only</li>
						<li>Only one payment provider can be active per app</li>
						<li>Switch between test and production mode using the dropdown</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
