import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import {
	useCreatePaymentProvider,
	useDeletePaymentProvider,
	useProject,
	useProjectPaymentProviders,
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
}

interface StripeConfig {
	publishableKey: string;
	secretKey: string;
	webhookSecret: string;
}

type ProviderConfig = LemonSqueezyConfig | DodoConfig | StripeConfig;

interface PaymentProviderItem {
	id: string;
	name: string | null;
	slug: string | null;
	provider: string;
	environment: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export default function ProjectPaymentProvidersPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const { showToast } = useToast();

	const { data: project, isLoading: projectLoading } = useProject(projectId!);
	const { data: providers, isLoading: providersLoading, refetch } = useProjectPaymentProviders(projectId!);
	const createMutation = useCreatePaymentProvider();
	const updateMutation = useUpdatePaymentProvider();
	const deleteMutation = useDeletePaymentProvider();

	const [showForm, setShowForm] = useState(false);
	const [editingProvider, setEditingProvider] = useState<PaymentProviderItem | null>(null);

	const [formData, setFormData] = useState({
		name: "",
		slug: "",
		provider: "stripe" as Provider,
		environment: "test" as Environment,
		config: {} as ProviderConfig,
	});

	const isLoading = projectLoading || providersLoading;

	const handleCreate = () => {
		setEditingProvider(null);
		setFormData({
			name: "",
			slug: "",
			provider: "stripe",
			environment: "test",
			config: { publishableKey: "", secretKey: "", webhookSecret: "" },
		});
		setShowForm(true);
	};

	const handleEdit = (provider: PaymentProviderItem) => {
		setEditingProvider(provider);
		setFormData({
			name: provider.name || "",
			slug: provider.slug || "",
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
			name: "",
			slug: "",
			provider: "stripe",
			environment: "test",
			config: getEmptyConfig("stripe"),
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.name.trim()) {
			showToast("Provider name is required", "error");
			return;
		}

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
						name: formData.name,
						slug: formData.slug,
						credentials: formData.config as unknown as Record<string, string>,
						environment: formData.environment,
						isActive: true,
					},
				});
				showToast("Provider updated successfully", "success");
			} else {
				await createMutation.mutateAsync({
					projectId: projectId!,
					data: {
						name: formData.name,
						slug: formData.slug,
						entityType: "project",
						projectId: projectId!,
						provider: formData.provider,
						environment: formData.environment,
						credentials: formData.config as unknown as Record<string, string>,
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
				return { apiKey: "", webhookSecret: "" };
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
					<span style={{ color: "var(--text-primary)" }}>Payment Providers</span>
				</div>
			</div>

			{/* Page Header */}
			<div
				style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}
			>
				<div>
					<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Payment Providers</h1>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
						{providers?.length || 0} {providers?.length === 1 ? "provider" : "providers"} configured
					</p>
				</div>
				<button type="button" onClick={handleCreate} className="btn btn-primary">
					+ Add Provider
				</button>
			</div>

			{/* Modal Form */}
			{showForm && (
				<div className="modal-overlay" onClick={handleCancel}>
					<div className="modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>{editingProvider ? "Edit Payment Provider" : "Add Payment Provider"}</h3>
							<button type="button" className="modal-close" onClick={handleCancel}>
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
						<form onSubmit={handleSubmit}>
							<div className="modal-body">
								<div className="form-group">
									<label htmlFor="name">Provider Name</label>
									<input
										type="text"
										id="name"
										value={formData.name}
										onChange={(e) => setFormData({ ...formData, name: e.target.value })}
										placeholder="e.g., Production Stripe, Test Payment"
										required
									/>
								</div>

								<div className="form-group">
									<label htmlFor="slug">Slug (optional)</label>
									<input
										type="text"
										id="slug"
										value={formData.slug}
										onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
										placeholder="Auto-generated from name if not provided"
									/>
								</div>

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
							<div className="modal-footer">
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

			{/* Table Content */}
			{!providers || providers.length === 0 ? (
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
						No payment providers yet
					</h2>
					<p
						style={{
							fontSize: "14px",
							color: "var(--text-tertiary)",
							marginBottom: "24px",
							maxWidth: "400px",
							margin: "0 auto 24px",
						}}
					>
						Get started by adding your first payment provider to accept payments
					</p>
					<button type="button" onClick={handleCreate} className="btn btn-primary">
						Add Your First Provider
					</button>
				</div>
			) : (
				<div className="card" style={{ padding: "0", overflow: "hidden" }}>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr
								style={{
									borderBottom: "1px solid var(--border-primary)",
									background: "var(--surface-secondary)",
								}}
							>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Name
								</th>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Slug
								</th>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Provider
								</th>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Environment
								</th>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Status
								</th>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Created
								</th>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "right",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{providers.map((provider) => (
								<tr
									key={provider.id}
									style={{ borderBottom: "1px solid var(--border-primary)" }}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = "var(--surface-secondary)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = "transparent";
									}}
								>
									<td
										style={{
											padding: "14px 16px",
											fontSize: "14px",
											fontWeight: "500",
											color: "var(--text-primary)",
										}}
									>
										{provider.name || "Unnamed"}
									</td>
									<td
										style={{
											padding: "14px 16px",
											fontSize: "13px",
											fontFamily: "monospace",
											color: "var(--text-secondary)",
										}}
									>
										{provider.slug || "—"}
									</td>
									<td style={{ padding: "14px 16px" }}>
										<span
											style={{
												display: "inline-block",
												padding: "4px 10px",
												background: "var(--primary-light)",
												color: "var(--primary)",
												borderRadius: "12px",
												fontSize: "12px",
												fontWeight: "500",
												textTransform: "capitalize",
											}}
										>
											{provider.provider}
										</span>
									</td>
									<td style={{ padding: "14px 16px" }}>
										<span
											style={{
												display: "inline-block",
												padding: "4px 10px",
												background:
													provider.environment === "production"
														? "rgba(34, 197, 94, 0.1)"
														: "rgba(251, 191, 36, 0.1)",
												color:
													provider.environment === "production"
														? "var(--success)"
														: "#f59e0b",
												borderRadius: "12px",
												fontSize: "12px",
												fontWeight: "500",
												textTransform: "capitalize",
											}}
										>
											{provider.environment}
										</span>
									</td>
									<td style={{ padding: "14px 16px" }}>
										<span
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: "4px",
												padding: "4px 10px",
												background: provider.isActive
													? "rgba(34, 197, 94, 0.1)"
													: "var(--surface-secondary)",
												color: provider.isActive ? "var(--success)" : "var(--text-tertiary)",
												borderRadius: "12px",
												fontSize: "12px",
												fontWeight: "500",
											}}
										>
											<span
												style={{
													width: "6px",
													height: "6px",
													background: "currentColor",
													borderRadius: "50%",
												}}
											/>
											{provider.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									<td
										style={{
											padding: "14px 16px",
											fontSize: "14px",
											color: "var(--text-secondary)",
										}}
									>
										{new Date(provider.createdAt).toLocaleDateString()}
									</td>
									<td style={{ padding: "14px 16px", textAlign: "right" }}>
										<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
											<button
												type="button"
												onClick={() => handleEdit(provider)}
												className="btn btn-secondary-outline btn-sm"
											>
												Edit
											</button>
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
