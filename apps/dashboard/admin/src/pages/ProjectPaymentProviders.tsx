import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
	Icon,
	IconType,
	Spinner,
	Text,
	Heading,
	Card,
	 CardBody,
	Button,
	Label,
	Input,
	Textarea,
	Chip,
	Alert,
	EmptyState,
	Dialog,
	DialogPopup,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter,
	Table,
	TableContainer,
	TableHeader,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
	Breadcrumb,
	BreadcrumbSeparator,
} from "@proofa/components";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import {
	useCreatePaymentProvider,
	useDeletePaymentProvider,
	useProject,
	useProjectPaymentProviders,
	useUpdatePaymentProvider,
	useSelectDefaultProjectProvider,
} from "../hooks/api";

type Provider = "lemonsqueezy" | "dodo" | "stripe";
type Environment = "test" | "production";

interface LemonSqueezyConfig {
	storeId: string;
	apiKey: string;
}

interface DodoConfig {
	apiKey: string;
	webhookSecret: string;
	publicKey?: string;
}

interface StripeConfig {
	publishableKey: string;
	secretKey: string;
	webhookSecret: string;
}

type ProviderConfig = LemonSqueezyConfig | DodoConfig | StripeConfig;

interface PaymentProviderItem {
	id: string;
	provider: string;
	environment: string;
	isActive: boolean;
	isDefault: boolean;
	createdAt: number | string;
	updatedAt: number | string;
}

export default function ProjectPaymentProvidersPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const { showToast } = useToast();

	const { data: project, isLoading: projectLoading } = useProject(projectId!);
	const { data: providers, isLoading: providersLoading, refetch } = useProjectPaymentProviders(projectId!);
	const createMutation = useCreatePaymentProvider();
	const updateMutation = useUpdatePaymentProvider();
	const deleteMutation = useDeletePaymentProvider();
	const selectDefaultMutation = useSelectDefaultProjectProvider(projectId!);

	const [showForm, setShowForm] = useState(false);
	const [editingProvider, setEditingProvider] = useState<PaymentProviderItem | null>(null);
	const [detailProvider, setDetailProvider] = useState<PaymentProviderItem | null>(null);

	const [formData, setFormData] = useState({
		provider: "stripe" as Provider,
		environment: "test" as Environment,
		config: {} as ProviderConfig,
	});

	const isLoading = projectLoading || providersLoading;

	const handleCreate = () => {
		setEditingProvider(null);
		setFormData({
			provider: "stripe",
			environment: "test",
			config: { publishableKey: "", secretKey: "", webhookSecret: "" },
		});
		setShowForm(true);
	};

	const handleEdit = (provider: PaymentProviderItem) => {
		setEditingProvider(provider);
		setFormData({
			provider: provider.provider as Provider,
			environment: provider.environment as Environment,
			config: getEmptyConfig(provider.provider as Provider),
		});
		setShowForm(true);
	};

	const handleCancel = () => {
		setShowForm(false);
		setEditingProvider(null);
		setFormData({
			provider: "stripe",
			environment: "test",
			config: getEmptyConfig("stripe"),
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateConfig(formData.provider, formData.config)) {
			showToast("Please fill in all required fields", "error");
			return;
		}

		try {
			if (editingProvider) {
				await updateMutation.mutateAsync({
					projectId: projectId!,
					providerId: editingProvider.id,
					data: {
						credentials: (() => {
							const cfg = formData.config as any;
							const copy = { ...cfg };
							// Remove webhookSecret from credentials payload if present
							if (copy.webhookSecret) delete copy.webhookSecret;
							return copy as Record<string, string>;
						})(),
						webhookSecret: (formData.config as any).webhookSecret,
						isActive: true,
					},
				});
				showToast("Provider updated successfully", "success");
			} else {
				await createMutation.mutateAsync({
					projectId: projectId!,
					data: {
						provider: formData.provider,
						environment: formData.environment,
						credentials: (() => {
							const cfg = formData.config as any;
							const copy = { ...cfg };
							if (copy.webhookSecret) delete copy.webhookSecret;
							return copy as Record<string, string>;
						})(),
						webhookSecret: (formData.config as any).webhookSecret,
					},
				});
				showToast("Provider created successfully", "success");
			}

			refetch();
			handleCancel();
		} catch (error: any) {
			showToast(error.message || "Failed to save provider", "error");
		}
	};

	const handleDelete = async (providerId: string) => {
		if (!confirm("Are you sure you want to delete this payment provider?")) {
			return;
		}

		try {
			await deleteMutation.mutateAsync({ projectId: projectId!, providerId });
			showToast("Provider deleted successfully", "success");
			refetch();
		} catch (error: any) {
			showToast(error.message || "Failed to delete provider", "error");
		}
	};

	const getEmptyConfig = (provider: Provider): ProviderConfig => {
		switch (provider) {
			case "lemonsqueezy":
				return { storeId: "", apiKey: "" };
			case "dodo":
				return { apiKey: "", webhookSecret: "", publicKey: "" };
			case "stripe":
				return { publishableKey: "", secretKey: "", webhookSecret: "" };
			default:
				return {} as ProviderConfig;
		}
	};

	const validateConfig = (provider: Provider, config: ProviderConfig): boolean => {
		switch (provider) {
			case "lemonsqueezy": {
				const c = config as LemonSqueezyConfig;
				return !!(c.storeId && c.apiKey);
			}
			case "dodo": {
				const c = config as DodoConfig;
				return !!(c.apiKey && c.webhookSecret);
			}
			case "stripe": {
				const c = config as StripeConfig;
				return !!(c.publishableKey && c.secretKey && c.webhookSecret);
			}
			default:
				return false;
		}
	};

	const renderConfigFields = () => {
		switch (formData.provider) {
			case "lemonsqueezy": {
				const config = formData.config as LemonSqueezyConfig;
				return (
					<>
						<div className="form-group">
							<Label>Store ID</Label>
							<Input
								type="text"
								value={config.storeId || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, storeId: e.target.value } })
								}
								required
							/>
						</div>
						<div className="form-group">
							<Label>API Key</Label>
							<Input
								type="password"
								value={config.apiKey || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, apiKey: e.target.value } })
								}
								required
							/>
						</div>
					</>
				);
			}
			case "dodo": {
				const config = formData.config as DodoConfig;
				return (
					<>
						<div className="form-group">
							<Label>API Key</Label>
							<Input
								type="password"
								value={config.apiKey || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, apiKey: e.target.value } })
								}
								required
							/>
						</div>
						<div className="form-group">
							<Label>Webhook Secret</Label>
							<Input
								type="password"
								value={config.webhookSecret || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, webhookSecret: e.target.value } })
								}
								required
							/>
						</div>
						<div className="form-group">
							<Label>Public Key (optional)</Label>
							<Input
								type="text"
								value={(config as any).publicKey || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, publicKey: e.target.value } })
								}
								placeholder="Used for client-side validation"
							/>
						</div>
					</>
				);
			}
			case "stripe": {
				const config = formData.config as StripeConfig;
				return (
					<>
						<div className="form-group">
							<Label>Publishable Key</Label>
							<Input
								type="text"
								value={config.publishableKey || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, publishableKey: e.target.value } })
								}
								required
							/>
						</div>
						<div className="form-group">
							<Label>Secret Key</Label>
							<Input
								type="password"
								value={config.secretKey || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, secretKey: e.target.value } })
								}
								required
							/>
						</div>
						<div className="form-group">
							<Label>Webhook Secret</Label>
							<Input
								type="password"
								value={config.webhookSecret || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, webhookSecret: e.target.value } })
								}
								required
							/>
						</div>
					</>
				);
			}
			default:
				return null;
		}
	};

	if (isLoading) {
		return (
			<div className="flex justify-center items-center py-12">
				<Spinner />
			</div>
		);
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
					<Text>Payment Providers</Text>
				</Breadcrumb>
			</div>

			{/* Page Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<Heading level={1} size="lg">Payment Providers</Heading>
					<Text className="text-text-secondary">
						{providers?.length || 0} {providers?.length === 1 ? "provider" : "providers"} configured
					</Text>
				</div>
				<Button variant="primary" onClick={handleCreate}>
					+ Add Provider
				</Button>
			</div>

			{/* Modal Form */}
			{showForm && (
				<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10001] p-8 pl-[292px]" onClick={handleCancel}>
					<div className="bg-card-bg border border-card-border rounded-xl w-full max-w-500px max-h-[calc(100vh-64px)] overflow-y-auto shadow-lg" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between p-4 px-5 border-b border-card-border">
							<h3 className="text-18px font-600 text-text-primary m-0">{editingProvider ? "Edit Payment Provider" : "Add Payment Provider"}</h3>
							<Button variant="plain" size="sm" onClick={handleCancel}>
								<Icon icon={IconType.Cancel} size={20} />
							</Button>
						</div>
						<form onSubmit={handleSubmit}>
							<div className="p-5 text-text-primary">
								<div className="form-row">
									<div className="form-group">
										<Label>Provider</Label>
										<Select
											value={formData.provider}
											onChange={(value) => {
												const newProvider = value as Provider;
												setFormData({
													...formData,
													provider: newProvider,
													config: getEmptyConfig(newProvider),
												});
											}}
											disabled={!!editingProvider}
											options={[
												{ value: "stripe", label: "Stripe" },
												{ value: "lemonsqueezy", label: "Lemon Squeezy" },
												{ value: "dodo", label: "Dodo Payments" },
											]}
										/>
									</div>

									<div className="form-group">
										<Label>Environment</Label>
										<Select
											value={formData.environment}
											onChange={(value) =>
												setFormData({ ...formData, environment: value as Environment })
											}
											options={[
												{ value: "test", label: "Test" },
												{ value: "production", label: "Production" },
											]}
										/>
									</div>
								</div>

								{renderConfigFields()}

								{editingProvider && (
									<Alert variant="warning">
										<strong>Security Note:</strong> Credentials are encrypted and cannot be viewed.
										You must re-enter them to update.
									</Alert>
								)}
							</div>
							<div className="flex items-center justify-end gap-3 p-4 px-5 border-t border-card-border">
								<Button variant="secondary" onClick={handleCancel}>
									Cancel
								</Button>
								<Button
									variant="primary"
									type="submit"
									disabled={createMutation.isPending || updateMutation.isPending}
								>
									{editingProvider ? "Update Provider" : "Create Provider"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Detail Modal */}
			{detailProvider && (
				<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10001] p-8 pl-[292px]" onClick={() => setDetailProvider(null)}>
					<div className="bg-card-bg border border-card-border rounded-xl w-full max-w-600px max-h-[calc(100vh-64px)] overflow-y-auto shadow-lg" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between p-4 px-5 border-b border-card-border">
							<h3 className="text-18px font-600 text-text-primary m-0">Provider Details</h3>
							<Button variant="plain" size="sm" onClick={() => setDetailProvider(null)}>
							<Icon icon={IconType.Cancel} size={20} />
							</Button>
						</div>
						<div className="p-6 text-text-primary">
							{/* Provider Info */}
							<div className="mb-6">
								<h4 className="text-13px font-600 mb-3 uppercase text-text-tertiary">Provider Info</h4>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<div className="text-12px text-text-tertiary mb-1">Provider</div>
										<div className="text-14px font-500 capitalize">{detailProvider.provider}</div>
									</div>
									<div>
										<div className="text-12px text-text-tertiary mb-1">Environment</div>
										<div>
											<Chip
												variant={detailProvider.environment === "production" ? "success" : "warning"}
												size="sm"
											>
												{detailProvider.environment}
											</Chip>
										</div>
									</div>
								</div>
							</div>

							{/* Webhook URLs */}
							<div className="mb-6">
								<h4 className="text-13px font-600 mb-3 uppercase text-text-tertiary">Webhook Configuration</h4>
								<div className="bg-bg-secondary p-3 rounded-2 border border-border mb-3">
									<div className="text-12px text-text-tertiary mb-1.5">Webhook URL</div>
									<code className="block text-12px font-mono text-text-primary overflow-x-auto p-2 bg-bg-primary rounded-1">
										{`${window.location.origin.replace(/\/$/, '')}/v1/webhooks/${detailProvider.provider}/${detailProvider.id}`}
									</code>
									<div className="text-11px text-text-tertiary mt-2">
										Configure this URL in your {detailProvider.provider === "dodo" ? "Paddle" : detailProvider.provider} dashboard
									</div>
								</div>
							</div>

							{/* Status Info */}
							<div className="mb-6">
								<h4 className="text-13px font-600 mb-3 uppercase text-text-tertiary">Status</h4>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<div className="text-12px text-text-tertiary mb-1">Status</div>
										<Chip
											variant={detailProvider.isActive ? "success" : "default"}
											size="sm"
										>
											{detailProvider.isActive ? "Active" : "Inactive"}
										</Chip>
									</div>
									<div>
										<div className="text-12px text-text-tertiary mb-1">Created</div>
										<div className="text-14px font-500">{new Date(detailProvider.createdAt).toLocaleDateString()}</div>
									</div>
								</div>
							</div>

							{/* Help Text */}
							<div className="p-3 rounded-2 border-l-3 bg-info-bg border-l-info">
								<div className="text-13px font-500 mb-1 text-info">💡 Tip</div>
								<div className="text-12px text-text-secondary">
									Keep your API keys and webhook secrets secure. Never share them publicly or commit them to version control.
								</div>
							</div>
						</div>
						<div className="flex items-center justify-end gap-3 p-4 px-5 border-t border-card-border">
							<Button variant="secondary" onClick={() => setDetailProvider(null)}>
								Close
							</Button>
							<Button variant="primary" onClick={() => { handleEdit(detailProvider); setDetailProvider(null); }}>
								Edit Provider
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Table Content */}
			{!providers || providers.length === 0 ? (
				<div className="card py-16 px-6 text-center">
					<div className="text-64px mb-4">💳</div>
					<h2 className="text-20px font-600 mb-3 text-text-primary">
						No payment providers yet
					</h2>
					<p className="text-14px text-text-tertiary mb-6 max-w-400px mx-auto">
						Get started by adding your first payment provider to accept payments
					</p>
					<Button variant="primary" onClick={handleCreate}>
						Add Your First Provider
					</Button>
				</div>
			) : (
				<div className="card p-0 overflow-hidden">
					<TableContainer>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Provider</TableHead>
									<TableHead>Environment</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Default</TableHead>
									<TableHead>Created</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
							{providers.map((provider) => (
								<TableRow key={provider.id}>
									<TableCell>
										<Chip variant="primary" size="sm">
											{provider.provider}
										</Chip>
									</TableCell>
									<TableCell>
										<Chip
											variant={provider.environment === "production" ? "success" : "warning"}
											size="sm"
										>
											{provider.environment}
										</Chip>
									</TableCell>
									<TableCell>
										<Chip
											variant={provider.isActive ? "success" : "default"}
											size="sm"
										>
											{provider.isActive ? "Active" : "Inactive"}
										</Chip>
									</TableCell>
									<TableCell>
										{provider.isDefault ? (
											<Chip variant="info" size="sm">
												Default
											</Chip>
										) : (
											<span className="text-text-tertiary text-12px">—</span>
										)}
									</TableCell>
									<TableCell className="text-14px text-text-secondary">
										{new Date(provider.createdAt).toLocaleDateString()}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex gap-2 justify-end">
											<Button
												variant="outline"
												size="sm"
												onClick={() => setDetailProvider(provider)}
											>
												View
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleEdit(provider)}
											>
												Edit
											</Button>
											{!provider.isDefault && provider.isActive && (
												<Button
													variant="primary"
													size="sm"
													onClick={async () => {
														try {
															await selectDefaultMutation.mutateAsync(provider.id);
															showToast("Set as default", "success");
															refetch();
														} catch (err: any) {
															showToast(err?.message || "Failed to set default", "error");
														}
													}}
													disabled={selectDefaultMutation.isPending}
												>
													Make Default
												</Button>
											)}
											<Button
												variant="danger"
												size="sm"
												onClick={() => handleDelete(provider.id)}
												disabled={deleteMutation.isPending}
											>
												Delete
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
							</TableBody>
						</Table>
					</TableContainer>
				</div>
			)}
		</div>
	);
}
