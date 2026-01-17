import { Link, useParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import { useApp, useProject, useProjectPaymentProviders, useSelectPaymentProvider, useSelectedPaymentProvider } from "../hooks/api";

export default function AppPaymentSettingsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { showToast } = useToast();

	const { data: app, isLoading: appLoading, error: appError } = useApp(projectId!, appId!);
	const { data: project, isLoading: projectLoading } = useProject(projectId!);
	const { data: availableProviders = [], isLoading: loadingProviders } = useProjectPaymentProviders(projectId!);
	const { data: selectedProvider, isLoading: loadingSelected } = useSelectedPaymentProvider(projectId!, appId!);

	const selectProviderMutation = useSelectPaymentProvider(projectId!, appId!);

	const handleSelectProvider = async (providerPublicId: string | null) => {
		try {
			await selectProviderMutation.mutateAsync(providerPublicId);
			showToast("Payment provider updated successfully", "success");
		} catch (_error) {
			showToast("Failed to update payment provider", "error");
		}
	};

	const getProviderIcon = (provider: string) => {
		switch (provider.toLowerCase()) {
			case "stripe":
				return (
					<svg className="w-6 h-6" viewBox="0 0 24 24">
						<path
							fill="#635BFF"
							d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"
						/>
					</svg>
				);
			case "lemonsqueezy":
				return <span className="text-2xl">🍋</span>;
			case "dodo":
				return <span className="text-2xl">🦤</span>;
			default:
				return <span className="text-2xl">💳</span>;
		}
	};

	const getEnvironmentBadge = (environment: string) => {
		const isProduction = environment === "production";
		return (
			<span
				className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase ${isProduction ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text"}`}
			>
				{environment}
			</span>
		);
	};

	if (appLoading || projectLoading || loadingProviders || loadingSelected) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (appError || !app) {
		return <div className="error-state">App not found</div>;
	}

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div className="mb-6">
				<div className="flex items-center gap-2 text-xs text-text-tertiary">
					<Link to="/projects" className="text-text-tertiary no-underline hover:text-primary">
						Projects
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}`} className="text-text-tertiary no-underline hover:text-primary">
						{project?.name}
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}/apps`} className="text-text-tertiary no-underline hover:text-primary">
						Apps
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}/apps/${appId}`} className="text-text-tertiary no-underline hover:text-primary">
						{app?.name || "App"}
					</Link>
					<span>›</span>
					<span className="text-text-primary">Payment</span>
				</div>
			</div>

			{/* Page Header */}
			<div className="mb-8">
				<h1 className="mb-2 text-2xl font-bold">Payment Provider</h1>
				<p className="text-sm text-text-tertiary">
					Select one payment provider for {app.name}. Providers are configured at the project level.
				</p>
			</div>

			{/* Info Banner */}
			<div className="mb-6 flex gap-3 rounded-xl border border-primary bg-primary-light p-4">
				<svg className="h-5 w-5 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<div>
					<p className="mb-1 text-sm font-semibold text-primary">Project-Level Configuration</p>
					<p className="m-0 text-xs text-text-secondary">
						Payment providers are configured at the project level. To add or modify providers, visit{" "}
						<Link to={`/projects/${projectId}/payment-providers`} className="font-semibold text-primary hover:text-primary-dark">
							Project Payment Providers
						</Link>
						.
					</p>
				</div>
			</div>

			{/* Providers List */}
			{!availableProviders || availableProviders.length === 0 ? (
				<div className="card text-center px-6 py-16">
					<div className="mb-4 text-6xl">💳</div>
					<h2 className="mb-3 text-xl font-semibold text-text-primary">
						No payment providers configured
					</h2>
					<p className="mb-6 text-sm text-text-tertiary">
						Configure payment providers at the project level to enable payments for this app.
					</p>
					<Link to={`/projects/${projectId}/payment-providers`} className="btn btn-primary inline-flex items-center gap-2">
						<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Configure Payment Providers
					</Link>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					{availableProviders.map((provider) => {
						const isSelected = provider.id === selectedProvider?.id;
						const isLoading = selectProviderMutation.isPending;

						return (
							<div
								key={provider.id}
								className={`card cursor-pointer border-2 transition-all duration-200 ${isSelected ? "border-[var(--primary)] bg-[var(--primary-light)]" : "border-[var(--card-border)] bg-[var(--card-bg)]"} ${isLoading ? "opacity-60" : ""}`}
								onClick={() => !isLoading && handleSelectProvider(provider.id)}
							>
								<div className="flex items-center gap-5">
									{/* Checkbox at the start */}
									<div
										className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-200 ${isSelected ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[rgba(255,255,255,0.3)] bg-transparent"}`}
									>
										{isSelected && (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-3.5 w-3.5"
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
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-content-bg">
										{getProviderIcon(provider.provider)}
									</div>

									{/* Provider Info */}
									<div className="flex-1">
										<div className="mb-1.5 flex items-center gap-3">
											<h3 className="m-0 text-base font-semibold capitalize text-text-primary">
												{provider.provider}
											</h3>
											{getEnvironmentBadge(provider.environment)}
											{isSelected && (
												<span className="inline-flex items-center rounded-[6px] bg-[var(--primary)] px-[10px] py-1 text-[11px] font-semibold uppercase text-white">
													Active
												</span>
											)}
										</div>
										<div className="flex items-center gap-4 text-[13px] [color:var(--text-secondary)]">
											<span>Provider: {provider.provider}</span>
											{provider.slug && <span>Slug: {provider.slug}</span>}
											{provider.createdBy && <span>Configured by: {provider.createdBy.name}</span>}
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
				<div className="mt-8 rounded-xl border border-[color:var(--border-primary)] bg-[var(--content-bg)] p-5">
					<h3 className="mb-3 text-sm font-semibold [color:var(--text-primary)]">
						Need to add or modify payment providers?
					</h3>
					<p className="mb-4 text-[13px] [color:var(--text-secondary)]">
						Payment providers are managed at the project level. Visit the Payment Providers page to add new providers or update existing ones.
					</p>
					<Link to={`/projects/${projectId}/payment-providers`} className="btn btn-secondary inline-flex items-center gap-2">
						<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
