import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {Icon, IconType} from "@proofa/components";;
import { Cancel01Icon } from "@hugeicons/core-free-icons";
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
							<label htmlFor="storeId">Store ID</label>
							<input
								type="text"
								id="storeId"
								value={config.storeId || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, storeId: e.target.value } })
								}
								required
							/>
						</div>
						<div className="form-group">
							<label htmlFor="apiKey">API Key</label>
							<input
								type="password"
								id="apiKey"
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
							<label htmlFor="apiKey">API Key</label>
							<input
								type="password"
								id="apiKey"
								value={config.apiKey || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, apiKey: e.target.value } })
								}
								required
							/>
						</div>
						<div className="form-group">
							<label htmlFor="webhookSecret">Webhook Secret</label>
							<input
								type="password"
								id="webhookSecret"
								value={config.webhookSecret || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, webhookSecret: e.target.value } })
								}
								required
							/>
						</div>
						<div className="form-group">
							<label htmlFor="publicKey">Public Key (optional)</label>
							<input
								type="text"
								id="publicKey"
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
							<label htmlFor="publishableKey">Publishable Key</label>
							<input
								type="text"
								id="publishableKey"
								value={config.publishableKey || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, publishableKey: e.target.value } })
								}
								required
							/>
						</div>
						<div className="form-group">
							<label htmlFor="secretKey">Secret Key</label>
							<input
								type="password"
								id="secretKey"
								value={config.secretKey || ""}
								onChange={(e) =>
									setFormData({ ...formData, config: { ...config, secretKey: e.target.value } })
								}
								required
							/>
						</div>
						<div className="form-group">
							<label htmlFor="webhookSecret">Webhook Secret</label>
							<input
								type="password"
								id="webhookSecret"
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
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div className="mb-6">
				<div className="flex gap-2 items-center text-13px text-text-tertiary">
					<Link to="/projects" className="text-text-tertiary no-underline">
						Projects
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}`}
						className="text-text-tertiary no-underline"
					>
						{project?.name}
					</Link>
					<span>›</span>
					<span className="text-text-primary">Payment Providers</span>
				</div>
			</div>

			{/* Page Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-24px font-700 mb-2">Payment Providers</h1>
					<p className="text-14px text-text-tertiary">
						{providers?.length || 0} {providers?.length === 1 ? "provider" : "providers"} configured
					</p>
				</div>
				<button type="button" onClick={handleCreate} className="btn btn-primary">
					+ Add Provider
				</button>
			</div>

			{/* Modal Form */}
			{showForm && (
				<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10001] p-8 pl-[292px]" onClick={handleCancel}>
					<div className="bg-card-bg border border-card-border rounded-xl w-full max-w-500px max-h-[calc(100vh-64px)] overflow-y-auto shadow-lg" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between p-4 px-5 border-b border-card-border">
							<h3 className="text-18px font-600 text-text-primary m-0">{editingProvider ? "Edit Payment Provider" : "Add Payment Provider"}</h3>
							<button type="button" className="w-8 h-8 flex items-center justify-center border-none bg-transparent text-text-secondary cursor-pointer rounded-md transition-all hover:bg-surface-secondary hover:text-text-primary" onClick={handleCancel}>
								<Icon icon={Cancel01Icon} size={20} />
							</button>
						</div>
						<form onSubmit={handleSubmit}>
							<div className="p-5 text-text-primary">
								<div className="form-row">
									<div className="form-group">
										<label htmlFor="provider">Provider</label>
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
										<label htmlFor="environment">Environment</label>
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
									<div className="alert alert-warning">
										<strong>Security Note:</strong> Credentials are encrypted and cannot be viewed.
										You must re-enter them to update.
									</div>
								)}
							</div>
							<div className="flex items-center justify-end gap-3 p-4 px-5 border-t border-card-border">
								<button type="button" className="btn btn-secondary" onClick={handleCancel}>
									Cancel
								</button>
								<button
									type="submit"
									className="btn btn-primary"
									disabled={createMutation.isPending || updateMutation.isPending}
								>
									{editingProvider ? "Update Provider" : "Create Provider"}
								</button>
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
							<button type="button" className="w-8 h-8 flex items-center justify-center border-none bg-transparent text-text-secondary cursor-pointer rounded-md transition-all hover:bg-surface-secondary hover:text-text-primary" onClick={() => setDetailProvider(null)}>
							<Icon icon={Cancel01Icon} size={20} />
							</button>
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
											<span 
												className={`inline-block px-2.5 py-1 rounded-3 text-12px font-500 capitalize ${
													detailProvider.environment === "production" 
														? "bg-success-bg text-success" 
														: "bg-warning-bg text-warning"
												}`}
											>
												{detailProvider.environment}
											</span>
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
										<span 
											className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-3 text-12px font-500 ${
												detailProvider.isActive 
													? "bg-success-bg text-success" 
													: "bg-bg-secondary text-text-tertiary"
											}`}
										>
											<span className="w-1.5 h-1.5 bg-current rounded-full" />
											{detailProvider.isActive ? "Active" : "Inactive"}
										</span>
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
							<button type="button" className="btn btn-secondary" onClick={() => setDetailProvider(null)}>
								Close
							</button>
							<button type="button" onClick={() => { handleEdit(detailProvider); setDetailProvider(null); }} className="btn btn-primary">
								Edit Provider
							</button>
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
					<button type="button" onClick={handleCreate} className="btn btn-primary">
						Add Your First Provider
					</button>
				</div>
			) : (
				<div className="card p-0 overflow-hidden">
					<table className="w-full border-collapse">
						<thead>
							<tr className="border-b border-border bg-surface-secondary">
								<th className="px-4 py-3.5 text-left text-12px font-600 text-text-tertiary uppercase tracking-wider">
									Provider
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-600 text-text-tertiary uppercase tracking-wider">
									Environment
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-600 text-text-tertiary uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-600 text-text-tertiary uppercase tracking-wide">
									Default
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-600 text-text-tertiary uppercase tracking-wider">
									Created
								</th>
								<th className="px-4 py-3.5 text-right text-12px font-600 text-text-tertiary uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{providers.map((provider) => (
								<tr
									key={provider.id}
									className="border-b border-border hover:bg-surface-secondary cursor-pointer"
								>
									<td className="px-4 py-3.5">
										<span className="inline-block px-2.5 py-1 bg-primary-light text-primary rounded-3 text-12px font-500 capitalize">
											{provider.provider}
										</span>
									</td>
									<td className="px-4 py-3.5">
										<span 
											className={`inline-block px-2.5 py-1 rounded-3 text-12px font-500 capitalize ${
												provider.environment === "production"
													? "bg-success-bg text-success"
													: "bg-warning-bg text-warning"
											}`}
										>
											{provider.environment}
										</span>
									</td>
									<td className="px-4 py-3.5">
										<span
										className={`badge ${provider.isActive ? "badge-success" : "badge-gray"}`}
										>
											<span className="w-6px h-6px bg-current rounded-full" />
											{provider.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-4 py-3.5">
										{provider.isDefault ? (
										<span className="badge badge-info">
												Default
											</span>
										) : (
											<span className="text-text-tertiary text-12px">—</span>
										)}
									</td>
									<td className="px-4 py-3.5 text-14px text-text-secondary">
										{new Date(provider.createdAt).toLocaleDateString()}
									</td>
									<td className="px-4 py-3.5 text-right">
										<div className="flex gap-2 justify-end">
											<button
												type="button"
												onClick={() => setDetailProvider(provider)}
												className="btn btn-secondary-outline btn-sm"
											>
												View
											</button>
											<button
												type="button"
												onClick={() => handleEdit(provider)}
												className="btn btn-secondary-outline btn-sm"
											>
												Edit
											</button>
											{!provider.isDefault && provider.isActive && (
												<button
													type="button"
													onClick={async () => {
														try {
															await selectDefaultMutation.mutateAsync(provider.id);
															showToast("Set as default", "success");
															refetch();
														} catch (err: any) {
															showToast(err?.message || "Failed to set default", "error");
														}
													}}
													className="btn btn-primary-outline btn-sm"
													disabled={selectDefaultMutation.isPending}
												>
													Make Default
												</button>
											)}
											<button
												type="button"
												onClick={() => handleDelete(provider.id)}
												disabled={deleteMutation.isPending}
												className="btn btn-danger-outline btn-sm"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
