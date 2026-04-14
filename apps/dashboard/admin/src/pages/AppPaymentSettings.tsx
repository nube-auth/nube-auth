import { Link, useNavigate, useParams } from "react-router-dom";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Text,
	Heading,
	Card,
	CardBody,
	Button,
	Chip,
	EmptyState,
	Breadcrumb,
	BreadcrumbSeparator,
} from "@nube-auth/components";
import { useToast } from "../components/Toast";
import { useApp, useProject, useProjectPaymentProviders, useSelectDefaultProjectProvider } from "../hooks/api";

export default function AppPaymentSettingsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
	const { showToast } = useToast();

	const { data: app, isLoading: appLoading, error: appError } = useApp(projectId!, appId!);
	const { data: project, isLoading: projectLoading } = useProject(projectId!);
	const { data: availableProviders = [], isLoading: loadingProviders } = useProjectPaymentProviders(projectId!);
	const selectedProvider = availableProviders.find((provider) => provider.isDefault) || null;

	const selectProviderMutation = useSelectDefaultProjectProvider(projectId!);

	const handleSelectProvider = async (providerPublicId: string) => {
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
			<Chip variant={isProduction ? "success" : "warning"} size="sm">
				{environment}
			</Chip>
		);
	};

	if (appLoading || projectLoading || loadingProviders) {
		return (
			<div className="flex justify-center items-center py-12">
				<Spinner />
			</div>
		);
	}

	if (appError || !app) {
		return <Alert variant="danger">App not found</Alert>;
	}

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div className="mb-6">
				<Breadcrumb>
					<Link to="/projects">
						Projects
					</Link>
					/
					<Link to={`/projects/${projectId}`}>
						{project?.name}
					</Link>
					/
					<Link to={`/projects/${projectId}/apps`}>
						Apps
					</Link>
					/
					<Link to={`/projects/${projectId}/apps/${appId}`}>
						{app?.name || "App"}
					</Link>
					/
					<Text>Payment</Text>
				</Breadcrumb>
			</div>

			{/* Page Header */}
			<div className="mb-8">
				<Heading level={1} size="lg">Payment Provider</Heading>
				<Text className="text-text-secondary">
					Select one payment provider for {app.name}. Providers are configured at the project level.
				</Text>
			</div>

			{/* Info Banner */}
			<Alert variant="info" className="mb-6">
				<div className="flex gap-3">
					<Icon icon={IconType.AlertCircle} size={20} className="text-primary shrink-0" />
					<div>
						<Text className="mb-1 font-semibold text-primary">Project-Level Configuration</Text>
						<Text className="text-text-secondary">
							Payment providers are configured at the project level. To add or modify providers, visit{" "}
							<Link to={`/projects/${projectId}/payment-providers`} className="font-semibold text-primary hover:text-primary-dark">
								Project Payment Providers
							</Link>
							.
						</Text>
					</div>
				</div>
			</Alert>

			{/* Providers List */}
			{!availableProviders || availableProviders.length === 0 ? (
				<EmptyState
					
					title="No payment providers configured"
					description="Configure payment providers at the project level to enable payments for this app."
				>
					<Button variant="primary" onClick={() => navigate(`/projects/${projectId}/payment-providers`)}>
						<Icon icon={IconType.Add} size={16} />
						Configure Payment Providers
					</Button>
				</EmptyState>
			) : (
				<div className="flex flex-col gap-4">
					{selectedProvider && (
						<Card>
							<CardBody className="p-4">
								<div className="flex items-center gap-3">
									<Icon icon={IconType.CheckCircle} size={18} className="text-success" />
									<div>
										<Text className="font-medium text-text-primary">Selected Configuration</Text>
										<Text className="text-sm text-text-secondary">
											{selectedProvider.name || `${selectedProvider.provider} (${selectedProvider.environment})`}
										</Text>
									</div>
								</div>
							</CardBody>
						</Card>
					)}

					{availableProviders.map((provider) => {
						const isSelected = provider.id === selectedProvider?.id;
						const isLoading = selectProviderMutation.isPending;

						return (
							<div
								key={provider.id}
								className={`card cursor-pointer border-2 transition-all duration-200 ${isSelected ? "border-[var(--primary)] bg-[var(--primary-light)]" : "border-[var(--card-border)] bg-[var(--card-bg)]"} ${isLoading ? "opacity-60" : ""}`}
								onClick={() => !isLoading && handleSelectProvider(provider.id)}
							>
								<div className="flex items-center gap-4 p-4">
									{/* Checkbox at the start */}
									<div
										className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-200 ${isSelected ? "border-primary bg-primary" : "border-card-border bg-transparent"}`}
									>
										{isSelected && <Icon icon={IconType.Check} size={14} className="text-white" />}
									</div>

									{/* Provider Icon */}
									<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-content-bg">
										{getProviderIcon(provider.provider)}
									</div>

									{/* Provider Info */}
									<div className="flex-1 min-w-0">
										<div className="mb-1 flex items-center gap-2 flex-wrap">
											<h3 className="m-0 text-sm font-semibold text-text-primary">
												{provider.name || provider.provider}
											</h3>
											{getEnvironmentBadge(provider.environment)}
											{isSelected && (
												<Chip variant="success" size="sm">
													Active
												</Chip>
											)}
										</div>
										<div className="flex items-center gap-3 text-xs text-text-secondary">
											<span className="capitalize">{provider.provider}</span>
											{provider.name && provider.name !== provider.provider && (
												<>
													<span>·</span>
													<span>{provider.name}</span>
												</>
											)}
											{provider.slug && (
												<>
													<span>·</span>
													<span>{provider.slug}</span>
												</>
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
				<Card className="mt-8">
					<CardBody className="p-5">
						<Heading level={3} size="sm" className="mb-3">
							Need to add or modify payment providers?
						</Heading>
						<Text className="mb-4 text-text-secondary">
							Payment providers are managed at the project level. Visit the Payment Providers page to add new providers or update existing ones.
						</Text>
						<Button variant="secondary" onClick={() => navigate(`/projects/${projectId}/payment-providers`)}>
							<Icon icon={IconType.Settings01} size={16} />
							Manage Payment Providers
						</Button>
					</CardBody>
				</Card>
			)}
		</div>
	);
}
