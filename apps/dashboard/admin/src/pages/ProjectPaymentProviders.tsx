import {
	Alert,
	Breadcrumb,
	BreadcrumbButton,
	BreadcrumbItem,
	BreadcrumbList,
	Button,
	Card,
	CardBody,
	Chip,
	DataTable,
	DataTableRow,
	Dialog,
	DialogBody,
	DialogFooter,
	DialogHeader,
	DialogPopup,
	DialogTitle,
	Heading,
	Input,
	Label,
	Spinner,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	Text,
} from "@nube-auth/components";
import { id as nubeId } from "@nube-auth/shared";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import config from "../config";
import {
	useCreatePaymentProvider,
	useDeletePaymentProvider,
	useProject,
	useProjectPaymentProviders,
	useSelectDefaultProjectProvider,
	useUpdatePaymentProvider,
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
	name?: string | null;
	provider: string;
	environment: string;
	isActive: boolean;
	isDefault: boolean;
	hasWebhookSecret?: boolean;
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
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	// Pre-generated CFG0 ID for Dodo creation — shown in the form so the user can register
	// the webhook URL in Dodo before saving, enabling a single-step setup.
	const [preGeneratedDodoId, setPreGeneratedDodoId] = useState<string>(() => nubeId.paymentConfig());

	const [formData, setFormData] = useState({
		provider: "stripe" as Provider,
		environment: "test" as Environment,
		name: "",
		config: {} as ProviderConfig,
	});

	const isLoading = projectLoading || providersLoading;

	const handleCreate = () => {
		setEditingProvider(null);
		setPreGeneratedDodoId(nubeId.paymentConfig()); // fresh ID for each new form session
		setFormData({
			provider: "stripe",
			environment: "test",
			name: "",
			config: { publishableKey: "", secretKey: "", webhookSecret: "" },
		});
		setShowForm(true);
	};

	const handleEdit = (provider: PaymentProviderItem) => {
		setEditingProvider(provider);
		setFormData({
			provider: provider.provider as Provider,
			environment: provider.environment as Environment,
			name: provider.name || "",
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
			name: "",
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
				const cfg = formData.config as any;
				const copy = { ...cfg };
				if (copy.webhookSecret) delete copy.webhookSecret;
				// Only send credentials if the user actually filled something in
				const hasCredentials = Object.values(copy).some((v) => typeof v === "string" && v.trim() !== "");
				await updateMutation.mutateAsync({
					projectId: projectId!,
					providerId: editingProvider.id,
					data: {
						name: formData.name || null,
						...(hasCredentials ? { credentials: copy as Record<string, string> } : {}),
						webhookSecret: (formData.config as any).webhookSecret || undefined,
						isActive: true,
					},
				});
				showToast("Provider updated successfully", "success");
			} else {
				const isDodo = formData.provider === "dodo";
				await createMutation.mutateAsync({
					projectId: projectId!,
					data: {
						provider: formData.provider,
						environment: formData.environment,
						name: formData.name || undefined,
						credentials: (() => {
							const cfg = formData.config as any;
							const copy = { ...cfg };
							if (copy.webhookSecret) delete copy.webhookSecret;
							if (copy.publicKey !== undefined && copy.publicKey === "") delete copy.publicKey;
							return copy as Record<string, string>;
						})(),
						webhookSecret: (formData.config as any).webhookSecret || undefined,
						...(isDodo ? { publicId: preGeneratedDodoId } : {}),
					},
				});
				showToast("Provider created successfully", "success");
				await refetch();
				handleCancel();
				return;
			}

			await refetch();
			handleCancel();
		} catch (error: any) {
			showToast(error.message || "Failed to save provider", "error");
		}
	};

	const handleDelete = async (providerId: string) => {
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
				// Step-2 edit: provider exists but has no webhook secret — only webhookSecret required
				if (editingProvider && !editingProvider.hasWebhookSecret) {
					return !!c.webhookSecret;
				}
				// Creation: only apiKey required; webhookSecret is added in step 2
				// Full edit: if editing an already-complete config, at least apiKey must be non-empty if provided
				return !!(editingProvider ? true : c.apiKey);
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
						<div className="space-y-1.5">
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
						<div className="space-y-1.5">
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
				const cfg = formData.config as DodoConfig;
				// Step-2 edit: provider exists but has no webhook secret yet — only ask for the secret
				const isStep2Edit = !!editingProvider && !editingProvider.hasWebhookSecret;
				return (
					<>
						{!editingProvider && (
							<div className="space-y-1.5">
								<Label>Webhook URL</Label>
								<code className="block text-11px font-mono text-text-primary overflow-x-auto p-2.5 bg-bg-secondary rounded border border-border select-all">
									{`${config.gatewayUrl.replace(/\/$/, "")}/v1/payment/webhooks/dodo/${preGeneratedDodoId}`}
								</code>
								<p className="text-12px text-muted">
									Register this URL in your Dodo dashboard first to receive a webhook secret, then
									fill in all fields below.
								</p>
							</div>
						)}
						{isStep2Edit && (
							<Alert variant="info">
								Register the webhook URL in your Dodo dashboard, then paste the webhook secret below.
								Leave API key blank to keep the existing one.
							</Alert>
						)}
						{!isStep2Edit && (
							<>
								<div className="space-y-1.5">
									<Label>API Key</Label>
									<Input
										type="password"
										value={cfg.apiKey || ""}
										onChange={(e) =>
											setFormData({ ...formData, config: { ...cfg, apiKey: e.target.value } })
										}
										required={!editingProvider}
										placeholder={editingProvider ? "Leave blank to keep existing" : ""}
									/>
								</div>
								<div className="space-y-1.5">
									<Label>
										Public Key <span className="text-muted font-400">(optional)</span>
									</Label>
									<Input
										type="text"
										value={(cfg as any).publicKey || ""}
										onChange={(e) =>
											setFormData({ ...formData, config: { ...cfg, publicKey: e.target.value } })
										}
										placeholder="Used for client-side validation"
									/>
								</div>
							</>
						)}
						<div className="space-y-1.5">
							<Label>
								Webhook Secret{" "}
								{!editingProvider && (
									<span className="text-muted font-400">
										(optional — webhooks won't be verified without this)
									</span>
								)}
							</Label>
							<Input
								type="password"
								value={cfg.webhookSecret || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...cfg, webhookSecret: e.target.value } })
								}
								required={isStep2Edit}
								placeholder={editingProvider && !isStep2Edit ? "Leave blank to keep existing" : ""}
							/>
						</div>
					</>
				);
			}
			case "stripe": {
				const config = formData.config as StripeConfig;
				return (
					<>
						<div className="space-y-1.5">
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
						<div className="space-y-1.5">
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
						<div className="space-y-1.5">
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
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>
							{project?.name}
						</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton active>Payment Providers</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Page Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<Heading level={1} size="lg">
						Payment Providers
					</Heading>
					<Text className="text-muted">
						{providers?.length || 0} {providers?.length === 1 ? "provider" : "providers"} configured
					</Text>
				</div>
				<Button variant="primary" onClick={handleCreate}>
					+ Add Provider
				</Button>
			</div>

			{/* Modal Form */}
			<Dialog
				open={showForm}
				onOpenChange={(open) => {
					if (!open) handleCancel();
				}}
			>
				<DialogPopup className="max-w-[500px] w-full">
					<DialogHeader>
						<DialogTitle>{editingProvider ? "Edit Payment Provider" : "Add Payment Provider"}</DialogTitle>
					</DialogHeader>
					<form id="provider-form" onSubmit={handleSubmit}>
						<DialogBody>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<Label>Provider</Label>
									<Select
										value={formData.provider}
										onChange={(value) => {
											const newProvider = value as Provider;
											if (newProvider === "dodo" && !editingProvider) {
												setPreGeneratedDodoId(nubeId.paymentConfig());
											}
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

								<div className="space-y-1.5">
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

							<div className="space-y-1.5">
								<Label>
									Name <span className="text-muted font-400">(optional)</span>
								</Label>
								<Input
									type="text"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									placeholder="e.g. Main Dodo account, EU Stripe"
									maxLength={100}
								/>
							</div>

							{renderConfigFields()}

							{editingProvider && (
								<Alert variant="warning">
									<strong>Security Note:</strong> Credentials are encrypted and cannot be viewed. You
									must re-enter them to update.
								</Alert>
							)}
						</DialogBody>
						<DialogFooter>
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
						</DialogFooter>
					</form>
				</DialogPopup>
			</Dialog>

			{/* Detail Modal */}
			<Dialog
				open={!!detailProvider}
				onOpenChange={(open) => {
					if (!open) setDetailProvider(null);
				}}
			>
				<DialogPopup className="max-w-[600px] w-full">
					<DialogHeader>
						<DialogTitle>Provider Details</DialogTitle>
					</DialogHeader>
					{detailProvider && (
						<>
							<DialogBody>
								{/* Provider Info */}
								<div className="mb-6">
									<Text className="text-13px font-600 mb-3 uppercase text-muted">Provider Info</Text>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<div className="text-12px text-muted mb-1">Provider</div>
											<div className="text-14px font-500 capitalize">
												{detailProvider.provider}
											</div>
										</div>
										<div>
											<div className="text-12px text-muted mb-1">Environment</div>
											<div>
												<Chip
													variant={
														detailProvider.environment === "production"
															? "success"
															: "warning"
													}
													size="sm"
												>
													{detailProvider.environment}
												</Chip>
											</div>
										</div>
										{detailProvider.name && (
											<div className="col-span-2">
												<div className="text-12px text-muted mb-1">Name</div>
												<div className="text-14px font-500">{detailProvider.name}</div>
											</div>
										)}
									</div>
								</div>

								{/* Webhook URLs */}
								<div className="mb-6">
									<Text className="text-13px font-600 mb-3 uppercase text-muted">
										Webhook Configuration
									</Text>
									{detailProvider.provider === "dodo" && !detailProvider.hasWebhookSecret && (
										<Alert variant="warning" className="mb-3">
											<strong>Step 2 required:</strong> Copy the URL below and register it in your
											Dodo dashboard. Dodo will show you a webhook secret — click{" "}
											<strong>Edit Provider</strong> to save it here.
										</Alert>
									)}
									<div className="bg-bg-secondary p-3 rounded-2 border border-border mb-3">
										<div className="text-12px text-muted mb-1.5">Webhook URL</div>
										<code className="block text-12px font-mono text-text-primary overflow-x-auto p-2 bg-bg-primary rounded-1">
											{`${config.gatewayUrl.replace(/\/$/, "")}/v1/payment/webhooks/${detailProvider.provider}/${detailProvider.id}`}
										</code>
										<div className="text-11px text-muted mt-2">
											Configure this URL in your {detailProvider.provider} dashboard
										</div>
									</div>
								</div>

								{/* Status Info */}
								<div className="mb-6">
									<Text className="text-13px font-600 mb-3 uppercase text-muted">Status</Text>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<div className="text-12px text-muted mb-1">Status</div>
											<Chip variant={detailProvider.isActive ? "success" : "default"} size="sm">
												{detailProvider.isActive ? "Active" : "Inactive"}
											</Chip>
										</div>
										<div>
											<div className="text-12px text-muted mb-1">Created</div>
											<div className="text-14px font-500">
												{new Date(detailProvider.createdAt).toLocaleDateString()}
											</div>
										</div>
									</div>
								</div>

								{/* Help Text */}
								<div className="p-3 rounded-2 border-l-3 bg-info-bg border-l-info">
									<div className="text-13px font-500 mb-1 text-info">💡 Tip</div>
									<div className="text-12px text-muted">
										Keep your API keys and webhook secrets secure. Never share them publicly or
										commit them to version control.
									</div>
								</div>
							</DialogBody>
							<DialogFooter>
								<Button variant="secondary" onClick={() => setDetailProvider(null)}>
									Close
								</Button>
								<Button
									variant="primary"
									onClick={() => {
										handleEdit(detailProvider);
										setDetailProvider(null);
									}}
								>
									Edit Provider
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogPopup>
			</Dialog>

			{/* Table Content */}
			{!providers || providers.length === 0 ? (
				<Card>
					<CardBody className="py-12 px-6 text-center">
						<div className="text-64px mb-4">💳</div>
						<h2 className="text-20px font-600 mb-3 text-text-primary">No payment providers yet</h2>
						<p className="text-14px text-muted mb-6 max-w-400px mx-auto">
							Get started by adding your first payment provider to accept payments
						</p>
						<Button variant="primary" onClick={handleCreate}>
							Add Your First Provider
						</Button>
					</CardBody>
				</Card>
			) : (
				<DataTable>
					<TableHeader>
						<tr>
							<TableHead>Provider</TableHead> <TableHead>Name</TableHead>{" "}
							<TableHead>Environment</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Default</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</tr>
					</TableHeader>
					<TableBody>
						{providers.map((provider) => (
							<DataTableRow key={provider.id}>
								<TableCell>
									<Chip variant="primary" size="sm">
										{provider.provider}
									</Chip>
								</TableCell>{" "}
								<TableCell className="text-14px text-muted">
									{provider.name || <span className="text-muted">—</span>}
								</TableCell>{" "}
								<TableCell>
									<Chip
										variant={provider.environment === "production" ? "success" : "warning"}
										size="sm"
									>
										{provider.environment}
									</Chip>
								</TableCell>
								<TableCell>
									<Chip variant={provider.isActive ? "success" : "default"} size="sm">
										{provider.isActive ? "Active" : "Inactive"}
									</Chip>
								</TableCell>
								<TableCell>
									{provider.isDefault ? (
										<Chip variant="info" size="sm">
											Default
										</Chip>
									) : (
										<span className="text-muted text-12px">—</span>
									)}
								</TableCell>
								<TableCell className="text-14px text-muted">
									{new Date(provider.createdAt).toLocaleDateString()}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex gap-2 justify-end">
										<Button variant="outline" size="sm" onClick={() => setDetailProvider(provider)}>
											View
										</Button>
										<Button variant="outline" size="sm" onClick={() => handleEdit(provider)}>
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
											className="text-danger-foreground"
											onClick={() => setDeleteTargetId(provider.id)}
											disabled={deleteMutation.isPending}
										>
											Delete
										</Button>
									</div>
								</TableCell>
							</DataTableRow>
						))}
					</TableBody>
				</DataTable>
			)}

			<ConfirmModal
				isOpen={!!deleteTargetId}
				onClose={() => setDeleteTargetId(null)}
				onConfirm={() => handleDelete(deleteTargetId!)}
				title="Delete Payment Provider"
				message="Are you sure you want to delete this payment provider? This action cannot be undone."
				confirmText="Delete"
				variant="danger"
			/>
		</div>
	);
}
