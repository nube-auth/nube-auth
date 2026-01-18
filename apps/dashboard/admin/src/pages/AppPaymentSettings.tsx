import { Link, useParams } from "react-router-dom";
import { Icon, IconType } from "@proofa/components";
import { AlertCircleIcon, Add01Icon, Tick02Icon, Settings01Icon } from "@hugeicons/core-free-icons";
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
				return <Icon icon={IconType.Stripe} size={24} />;
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
				<Icon icon={AlertCircleIcon} size={20} className="text-primary flex-shrink-0" />
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
						<Icon icon={Add01Icon} size={16} />
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
										className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-200 ${isSelected ? "border-primary bg-primary" : "border-card-border bg-transparent"}`}
									>
										{isSelected && <Icon icon={Tick02Icon} size={14} className="text-white" />}
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
						<Icon icon={Settings01Icon} size={16} />
						Manage Payment Providers
					</Link>
				</div>
			)}
		</div>
	);
}
