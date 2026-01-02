import { Link, useParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import { useApp, useAvailablePaymentProviders, useProject, useSelectPaymentProvider } from "../hooks/api";

export default function AppPaymentSettingsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { showToast } = useToast();

	const { data: app, isLoading: appLoading, error: appError } = useApp(projectId!, appId!);
	const { data: project, isLoading: projectLoading } = useProject(projectId!);
	const { data: availableProviders = [], isLoading: loadingProviders } = useAvailablePaymentProviders(appId!);

	const selectProviderMutation = useSelectPaymentProvider(appId!);

	const handleSelectProvider = async (providerId: number) => {
		try {
			await selectProviderMutation.mutateAsync(providerId);
			showToast("Payment provider updated successfully", "success");
		} catch (_error) {
			showToast("Failed to update payment provider", "error");
		}
	};

	const getProviderIcon = (provider: string) => {
		switch (provider.toLowerCase()) {
			case "stripe":
				return (
					<svg style={{ width: "24px", height: "24px" }} viewBox="0 0 24 24">
						<path
							fill="#635BFF"
							d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"
						/>
					</svg>
				);
			case "lemonsqueezy":
				return <span style={{ fontSize: "24px" }}>🍋</span>;
			case "dodo":
				return <span style={{ fontSize: "24px" }}>🦤</span>;
			default:
				return <span style={{ fontSize: "24px" }}>💳</span>;
		}
	};

	const getEnvironmentBadge = (environment: string) => {
		const isProduction = environment === "production";
		return (
			<span
				style={{
					padding: "4px 10px",
					borderRadius: "6px",
					fontSize: "11px",
					fontWeight: "600",
					background: isProduction ? "var(--success-light)" : "var(--warning-light)",
					color: isProduction ? "var(--success)" : "var(--warning)",
					textTransform: "uppercase",
				}}
			>
				{environment}
			</span>
		);
	};

	if (appLoading || projectLoading || loadingProviders) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (appError || !app) {
		return <div className="error-state">App not found</div>;
	}

	const selectedProviderId = app.selectedPaymentProviderId;

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div style={{ marginBottom: "24px" }}>
				<div
					style={{
						display: "flex",
						gap: "8px",
						alignItems: "center",
						fontSize: "13px",
						color: "var(--text-tertiary)",
					}}
				>
					<Link to="/projects" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						Projects
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}`}
						style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
					>
						{project?.name}
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}/apps`}
						style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
					>
						Apps
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}/apps/${appId}`}
						style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
					>
						{app.name}
					</Link>
					<span>›</span>
					<span style={{ color: "var(--text-primary)" }}>Payment</span>
				</div>
			</div>

			{/* Page Header */}
			<div style={{ marginBottom: "32px" }}>
				<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Payment Provider</h1>
				<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
					Select one payment provider for {app.name}. Providers are configured at the project level.
				</p>
			</div>

			{/* Info Banner */}
			<div
				style={{
					padding: "16px",
					background: "var(--primary-light)",
					border: "1px solid var(--primary)",
					borderRadius: "12px",
					marginBottom: "24px",
					display: "flex",
					gap: "12px",
				}}
			>
				<svg
					style={{ width: "20px", height: "20px", color: "var(--primary)", flexShrink: 0 }}
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
				<div>
					<p style={{ fontSize: "14px", fontWeight: "600", color: "var(--primary)", marginBottom: "4px" }}>
						Project-Level Configuration
					</p>
					<p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
						Payment providers are configured at the project level. To add or modify providers, visit{" "}
						<Link
							to={`/projects/${projectId}/payment-providers`}
							style={{ color: "var(--primary)", fontWeight: "600" }}
						>
							Project Payment Providers
						</Link>
						.
					</p>
				</div>
			</div>

			{/* Providers List */}
			{!availableProviders || availableProviders.length === 0 ? (
				<div className="card" style={{ padding: "64px 24px", textAlign: "center" }}>
					<div style={{ fontSize: "64px", marginBottom: "16px" }}>💳</div>
					<h2
						style={{
							fontSize: "20px",
							fontWeight: "600",
							marginBottom: "12px",
							color: "var(--text-primary)",
						}}
					>
						No payment providers configured
					</h2>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "24px" }}>
						Configure payment providers at the project level to enable payments for this app.
					</p>
					<Link
						to={`/projects/${projectId}/payment-providers`}
						className="btn btn-primary"
						style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
					>
						<svg
							style={{ width: "16px", height: "16px" }}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Configure Payment Providers
					</Link>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					{availableProviders.map((provider) => {
						const isSelected = provider.id === selectedProviderId;
						const isLoading = selectProviderMutation.isPending;

						return (
							<div
								key={provider.id}
								className="card"
								style={{
									padding: "24px",
									border: `2px solid ${isSelected ? "var(--primary)" : "var(--card-border)"}`,
									background: isSelected ? "var(--primary-light)" : "var(--card-bg)",
									transition: "all 0.2s ease",
									cursor: "pointer",
									opacity: isLoading ? 0.6 : 1,
								}}
								onClick={() => !isLoading && handleSelectProvider(provider.id)}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
									{/* Checkbox at the start */}
									<div
										style={{
											width: "20px",
											height: "20px",
											borderRadius: "4px",
											border: isSelected ? "2px solid var(--primary)" : "2px solid rgba(255, 255, 255, 0.3)",
											background: isSelected ? "var(--primary)" : "transparent",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											transition: "all 0.2s ease",
										}}
									>
										{isSelected && (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												style={{ width: "14px", height: "14px" }}
												viewBox="0 0 24 24"
												fill="none"
												stroke="white"
												strokeWidth="4"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<polyline points="20 6 9 17 4 12" />
											</svg>
										)}
									</div>

									{/* Provider Icon */}
									<div
										style={{
											width: "48px",
											height: "48px",
											borderRadius: "12px",
											background: "var(--content-bg)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
										}}
									>
										{getProviderIcon(provider.provider)}
									</div>

									{/* Provider Info */}
									<div style={{ flex: 1 }}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "12px",
												marginBottom: "6px",
											}}
										>
											<h3
												style={{
													fontSize: "16px",
													fontWeight: "600",
													color: "var(--text-primary)",
													margin: 0,
													textTransform: "capitalize",
												}}
											>
												{provider.name || provider.provider}
											</h3>
											{getEnvironmentBadge(provider.environment)}
											{isSelected && (
												<span
													style={{
														padding: "4px 10px",
														borderRadius: "6px",
														fontSize: "11px",
														fontWeight: "600",
														background: "var(--primary)",
														color: "white",
														textTransform: "uppercase",
													}}
												>
													Active
												</span>
											)}
										</div>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "16px",
												fontSize: "13px",
												color: "var(--text-secondary)",
											}}
										>
											<span>Provider: {provider.provider}</span>
											{provider.slug && <span>Slug: {provider.slug}</span>}
											{provider.createdBy && (
												<span>Configured by: {provider.createdBy.name}</span>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Help Section */}
			{availableProviders && availableProviders.length > 0 && (
				<div
					style={{
						marginTop: "32px",
						padding: "20px",
						background: "var(--content-bg)",
						borderRadius: "12px",
						border: "1px solid var(--border-primary)",
					}}
				>
					<h3
						style={{
							fontSize: "14px",
							fontWeight: "600",
							marginBottom: "12px",
							color: "var(--text-primary)",
						}}
					>
						Need to add or modify payment providers?
					</h3>
					<p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
						Payment providers are managed at the project level. Visit the Payment Providers page to add new
						providers or update existing ones.
					</p>
					<Link
						to={`/projects/${projectId}/payment-providers`}
						className="btn btn-secondary"
						style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
					>
						<svg
							style={{ width: "16px", height: "16px" }}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						Manage Payment Providers
					</Link>
				</div>
			)}
		</div>
	);
}
