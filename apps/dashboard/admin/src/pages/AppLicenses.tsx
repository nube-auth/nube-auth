import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Heading,
	Text,
	Button,
	Card,
	CardBody,
	DataTable,
	DataTableRow,
	EmptyState,
	Dialog,
	DialogPopup,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter,
	Input,
	Textarea,
	Label,
	Chip,
	IconBox,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
	TableHeader,
	TableBody,
	TableHead,
	TableCell,
	Checkbox,
	Tabs,
	TabsList,
	TabsItem,
	TabsPanel,
} from "@nube-auth/components";

import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import { useApp, useProject } from "../hooks/api";
import {
	useV2Plans,
	useCreateV2Plan,
	useUpdateV2Plan,
	useDeleteV2Plan,
	useV2Prices,
	useCreateV2Price,
	useSyncPrice,
	useV2Licenses,
	useV2LicenseSummary,
	useGrantV2License,
	useUpdateV2License,
	useRevokeV2License,
	useV2LicenseHistory,
	type V2Plan,
	type V2Price,
	type V2License,
} from "../hooks/api";

export function AppLicensesPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const { showToast } = useToast();

	const [activeTab, setActiveTab] = useState<string>("plans");

	if (projectLoading || appLoading) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<Spinner />
			</div>
		);
	}

	if (!project || !app) {
		return (
			<Alert variant="danger">
				<Icon icon={IconType.AlertCircle} size={20} />
				<span>Project or App not found</span>
			</Alert>
		);
	}

	return (
		<div className="space-y-6">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>{project.name}</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}/apps/${appId}`} />}>{app.name}</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton active>Licenses & Plans</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div>
				<Heading level={1} size="lg">Licenses & Plans</Heading>
				<Text className="text-muted-foreground mt-1">Manage plans, pricing, and user licenses for {app.name}</Text>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsItem value="plans">
						<Icon icon={IconType.Key} size={16} />
						Plans & Prices
					</TabsItem>
					<TabsItem value="licenses">
						<Icon icon={IconType.License} size={16} />
						Licenses
					</TabsItem>
				</TabsList>

				<TabsPanel value="plans" className="mt-6">
					<PlansTab appId={appId!} showToast={showToast} />
				</TabsPanel>

				<TabsPanel value="licenses" className="mt-6">
					<LicensesTab appId={appId!} showToast={showToast} />
				</TabsPanel>
			</Tabs>
		</div>
	);
}

// ===========================================================================
// Plans & Prices Tab
// ===========================================================================

function PlansTab({ appId, showToast }: { appId: string; showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void }) {
	const { data, isLoading } = useV2Plans(appId);
	const createPlan = useCreateV2Plan(appId);
	const updatePlan = useUpdateV2Plan(appId);
	const deletePlan = useDeleteV2Plan(appId);

	const [showPlanModal, setShowPlanModal] = useState(false);
	const [editingPlan, setEditingPlan] = useState<V2Plan | null>(null);
	const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
	const [planForm, setPlanForm] = useState({
		name: "",
		slug: "",
		description: "",
		features: [] as string[],
		trialDays: "",
		displayOrder: 0,
		isDefault: false,
	});
	const [featureInput, setFeatureInput] = useState("");
	const [saving, setSaving] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<V2Plan | null>(null);

	const plans = data?.plans ?? [];

	const openCreate = () => {
		setEditingPlan(null);
		setPlanForm({ name: "", slug: "", description: "", features: [], trialDays: "", displayOrder: 0, isDefault: false });
		setFeatureInput("");
		setShowPlanModal(true);
	};

	const openEdit = (plan: V2Plan) => {
		setEditingPlan(plan);
		setPlanForm({
			name: plan.name,
			slug: plan.slug,
			description: plan.description || "",
			features: [...plan.features],
			trialDays: plan.trialDays?.toString() || "",
			displayOrder: plan.displayOrder,
			isDefault: plan.isDefault,
		});
		setFeatureInput("");
		setShowPlanModal(true);
	};

	const handleSave = async () => {
		if (!planForm.name.trim() || !planForm.slug.trim()) {
			showToast("Name and slug are required", "error");
			return;
		}
		setSaving(true);
		try {
			const payload = {
				name: planForm.name,
				slug: planForm.slug,
				description: planForm.description || null,
				features: planForm.features,
				trialDays: planForm.trialDays ? parseInt(planForm.trialDays, 10) : null,
				displayOrder: planForm.displayOrder,
				isDefault: planForm.isDefault,
			};
			if (editingPlan) {
				await updatePlan.mutateAsync({ planId: editingPlan.planId, data: payload });
				showToast("Plan updated", "success");
			} else {
				await createPlan.mutateAsync(payload);
				showToast("Plan created", "success");
			}
			setShowPlanModal(false);
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to save plan", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (plan: V2Plan) => {
		try {
			await deletePlan.mutateAsync(plan.planId);
			showToast("Plan deleted", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to delete plan", "error");
		}
	};

	if (isLoading) {
		return <div className="flex justify-center py-12"><Spinner /></div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<Text className="text-muted-foreground">{plans.length} plan{plans.length !== 1 ? "s" : ""}</Text>
				<Button size="sm" onClick={openCreate}>
					<Icon icon={IconType.Add} size={16} />
					Create Plan
				</Button>
			</div>

			{plans.length === 0 ? (
				<EmptyState
					icon={IconType.Key}
					title="No plans yet"
					description="Create your first plan to define capabilities for your app"
				/>
			) : (
				<div className="space-y-4">
					{plans.map((plan) => (
						<Card key={plan.planId}>
							<CardBody>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<Heading level={4} size="sm">{plan.name}</Heading>
											<Chip variant={plan.isActive ? "success" : "default"} size="sm">
												{plan.isActive ? "active" : "inactive"}
											</Chip>
											{plan.isDefault && (
												<Chip variant="info" size="sm">default</Chip>
											)}
										</div>
										<Text className="text-muted-foreground text-xs mb-1">{plan.slug}</Text>
										<div className="flex items-center gap-1.5 mb-2">
											<code className="text-xs font-mono text-muted-foreground bg-bg-subtle px-1.5 py-0.5 rounded">{plan.planId}</code>
											<button
												type="button"
												className="text-muted-foreground hover:text-text-primary"
												title="Copy plan ID"
												onClick={() => {
													navigator.clipboard.writeText(plan.planId);
													showToast("Plan ID copied", "info");
												}}
											>
												<Icon icon={IconType.Copy} size={12} />
											</button>
										</div>
										{plan.description && (
											<Text className="text-muted-foreground text-sm mb-2">{plan.description}</Text>
										)}
										{plan.features.length > 0 && (
											<div className="flex flex-wrap gap-1.5 mb-2">
												{plan.features.map((f) => (
													<Chip key={f} size="sm" variant="default">{f}</Chip>
												))}
											</div>
										)}
										{plan.trialDays && (
											<Text className="text-xs text-muted-foreground">
												{plan.trialDays}-day trial
											</Text>
										)}
									</div>
									<div className="flex gap-2">
										<Button size="sm" variant="outline" onClick={() => setExpandedPlan(expandedPlan === plan.planId ? null : plan.planId)}>
											<Icon icon={IconType.DollarCircle} size={14} />
											Prices
										</Button>
										<Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
											<Icon icon={IconType.Edit} size={14} />
										</Button>
										<Button size="sm" variant="danger" onClick={() => setDeleteTarget(plan)}>
											<Icon icon={IconType.Delete} size={14} />
										</Button>
									</div>
								</div>

								{expandedPlan === plan.planId && (
									<div className="mt-4 pt-4 border-t border-card-border">
										<PricesSection appId={appId} plan={plan} showToast={showToast} />
									</div>
								)}
							</CardBody>
						</Card>
					))}
				</div>
			)}

			{/* Create/Edit Plan Modal */}
			<Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
				<DialogPopup>
					<DialogHeader>
						<DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
					</DialogHeader>
					<DialogBody className="space-y-4">
						<div>
							<Label>Name</Label>
							<Input
								value={planForm.name}
								onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
								placeholder="Pro Plan"
							/>
						</div>
						<div>
							<Label>Slug</Label>
							<Input
								value={planForm.slug}
								onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
								placeholder="pro"
							/>
						</div>
						<div>
							<Label>Description</Label>
							<Textarea
								value={planForm.description}
								onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
								placeholder="Full access to all features"
							/>
						</div>
						<div>
							<Label>Trial Days</Label>
							<Input
								type="number"
								value={planForm.trialDays}
								onChange={(e) => setPlanForm({ ...planForm, trialDays: e.target.value })}
								placeholder="14"
							/>
						</div>
						<div>
							<Label>Display Order</Label>
							<Input
								type="number"
								value={planForm.displayOrder.toString()}
								onChange={(e) => setPlanForm({ ...planForm, displayOrder: parseInt(e.target.value, 10) || 0 })}
							/>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								checked={planForm.isDefault}
								onCheckedChange={(checked) => setPlanForm({ ...planForm, isDefault: !!checked })}
							/>
							<Label>Default plan (assigned to new users)</Label>
						</div>
						<div>
							<Label>Features</Label>
							<div className="flex gap-2 mb-2">
								<Input
									value={featureInput}
									onChange={(e) => setFeatureInput(e.target.value)}
									placeholder="e.g. unlimited_projects"
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											if (featureInput.trim()) {
												setPlanForm({ ...planForm, features: [...planForm.features, featureInput.trim()] });
												setFeatureInput("");
											}
										}
									}}
								/>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										if (featureInput.trim()) {
											setPlanForm({ ...planForm, features: [...planForm.features, featureInput.trim()] });
											setFeatureInput("");
										}
									}}
								>
									Add
								</Button>
							</div>
							<div className="flex flex-wrap gap-1.5">
								{planForm.features.map((f, i) => (
									<span key={`${f}-${i}`} className="inline-flex items-center gap-1">
										<Chip size="sm">{f}</Chip>
										<button
											type="button"
											className="text-muted-foreground hover:text-text-primary text-xs"
											onClick={() =>
												setPlanForm({ ...planForm, features: planForm.features.filter((_, idx) => idx !== i) })
											}
										>
											×
										</button>
									</span>
								))}
							</div>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowPlanModal(false)}>Cancel</Button>
						<Button onClick={handleSave} disabled={saving}>
							{saving ? <Spinner /> : editingPlan ? "Update" : "Create"}
						</Button>
					</DialogFooter>
				</DialogPopup>
			</Dialog>

			<ConfirmModal
				isOpen={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => handleDelete(deleteTarget!)}
				title="Delete Plan"
				message={`Are you sure you want to delete plan "${deleteTarget?.name}"? This cannot be undone.`}
				confirmText="Delete"
				variant="danger"
			/>
		</div>
	);
}

// ===========================================================================
// Prices Section (nested under a plan)
// ===========================================================================

function PricesSection({ appId, plan, showToast }: { appId: string; plan: V2Plan; showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void }) {
	const { data, isLoading } = useV2Prices(appId, plan.planId);
	const createPrice = useCreateV2Price(appId, plan.planId);
	const syncPrice = useSyncPrice(appId, plan.planId);
	const [syncingPriceId, setSyncingPriceId] = useState<string | null>(null);

	const handleSync = async (priceId: string) => {
		setSyncingPriceId(priceId);
		try {
			await syncPrice.mutateAsync(priceId);
			showToast("Sync job enqueued — price will update shortly", "info");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to enqueue sync", "error");
		} finally {
			setSyncingPriceId(null);
		}
	};

	const [showModal, setShowModal] = useState(false);
	const [form, setForm] = useState({
		billingType: "recurring",
		interval: "month",
		intervalCount: "1",
		amountCents: "",
		currency: "usd",
	});
	const [saving, setSaving] = useState(false);

	const prices = data?.prices ?? [];

	const handleCreate = async () => {
		if (!form.amountCents) {
			showToast("Amount is required", "error");
			return;
		}
		setSaving(true);
		try {
			await createPrice.mutateAsync({
				billingType: form.billingType,
				interval: form.billingType === "recurring" ? form.interval : null,
				intervalCount: form.billingType === "recurring" ? parseInt(form.intervalCount, 10) : null,
				amountCents: parseInt(form.amountCents, 10),
				currency: form.currency,
			});
			showToast("Price created", "success");
			setShowModal(false);
			setForm({ billingType: "recurring", interval: "month", intervalCount: "1", amountCents: "", currency: "usd" });
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to create price", "error");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div>
			<div className="flex justify-between items-center mb-3">
				<Text className="text-sm font-medium">Prices for {plan.name}</Text>
				<Button size="sm" variant="outline" onClick={() => setShowModal(true)}>
					<Icon icon={IconType.Add} size={14} />
					Add Price
				</Button>
			</div>

			{isLoading ? (
				<Spinner />
			) : prices.length === 0 ? (
				<Text className="text-muted-foreground text-sm py-4">No prices yet. Add a price to enable purchases.</Text>
			) : (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
					{prices.map((price) => {
						const isSynced = !!price.externalProvider;
						const isSyncing = syncingPriceId === price.priceId;
						return (
							<div key={price.priceId} className="p-3 rounded-lg border border-card-border bg-bg-muted">
								<div className="flex items-center gap-2 mb-1">
									<Text className="font-semibold">
										${(price.amountCents / 100).toFixed(2)}
									</Text>
									{price.interval && (
										<Text className="text-muted-foreground text-xs">/{price.interval}</Text>
									)}
								</div>
								<div className="flex flex-wrap gap-1.5 mb-1.5">
									<Chip size="sm" variant="default">{price.billingType}</Chip>
									<Chip size="sm" variant={price.isActive ? "success" : "default"}>
										{price.isActive ? "active" : "inactive"}
									</Chip>
								</div>
								<Text className="text-muted-foreground text-xs">{price.currency.toUpperCase()}</Text>
								<div className="flex items-center gap-1 mt-1.5 min-w-0">
									<code className="text-xs font-mono text-muted-foreground bg-bg-subtle px-1.5 py-0.5 rounded truncate flex-1 min-w-0">{price.priceId}</code>
									<button
										type="button"
										className="text-muted-foreground hover:text-text-primary shrink-0"
										title="Copy price ID"
										onClick={() => {
											navigator.clipboard.writeText(price.priceId);
											showToast("Price ID copied", "info");
										}}
									>
										<Icon icon={IconType.Copy} size={12} />
									</button>
								</div>
								{/* Provider sync status */}
								<div className="flex items-center justify-between mt-2.5 pt-2 border-t border-card-border">
									<div className="flex items-center gap-1.5">
										<span
											className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSynced ? "bg-green-500" : "bg-yellow-500"}`}
										/>
										<Text className="text-xs text-muted-foreground">
											{isSynced ? price.externalProvider : "Not synced"}
										</Text>
									</div>
									<button
										type="button"
										className="text-xs text-muted-foreground hover:text-text-primary disabled:opacity-40 flex items-center gap-1"
										title="Sync to payment provider"
										disabled={isSyncing}
										onClick={() => handleSync(price.priceId)}
									>
										{isSyncing ? (
											<Spinner className="size-3" />
										) : (
											<Icon icon={IconType.Refresh} size={12} />
										)}
										Sync
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<Dialog open={showModal} onOpenChange={setShowModal}>
				<DialogPopup>
					<DialogHeader>
						<DialogTitle>Add Price</DialogTitle>
					</DialogHeader>
					<DialogBody className="space-y-4">
						<div>
							<Label>Billing Type</Label>
							<Select
								value={form.billingType}
								onChange={(v) => setForm({ ...form, billingType: v })}
								options={[
									{ value: "recurring", label: "Recurring" },
									{ value: "one_time", label: "One Time" },
									{ value: "lifetime", label: "Lifetime" },
								]}
							/>
						</div>
						{form.billingType === "recurring" && (
							<>
								<div>
									<Label>Interval</Label>
									<Select
										value={form.interval}
										onChange={(v) => setForm({ ...form, interval: v })}
										options={[
											{ value: "month", label: "Monthly" },
											{ value: "year", label: "Yearly" },
										]}
									/>
								</div>
								<div>
									<Label>Interval Count</Label>
									<Input
										type="number"
										value={form.intervalCount}
										onChange={(e) => setForm({ ...form, intervalCount: e.target.value })}
										placeholder="1"
									/>
								</div>
							</>
						)}
						<div>
							<Label>Amount (cents)</Label>
							<Input
								type="number"
								value={form.amountCents}
								onChange={(e) => setForm({ ...form, amountCents: e.target.value })}
								placeholder="999"
							/>
							{form.amountCents && (
								<Text className="text-xs text-muted-foreground mt-1">
									= ${(parseInt(form.amountCents, 10) / 100).toFixed(2)}
								</Text>
							)}
						</div>
						<div>
							<Label>Currency</Label>
							<Input
								value={form.currency}
								onChange={(e) => setForm({ ...form, currency: e.target.value })}
								placeholder="usd"
							/>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
						<Button onClick={handleCreate} disabled={saving}>
							{saving ? <Spinner /> : "Create Price"}
						</Button>
					</DialogFooter>
				</DialogPopup>
			</Dialog>
		</div>
	);
}

// ===========================================================================
// Licenses Tab
// ===========================================================================

function LicensesTab({ appId, showToast }: { appId: string; showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void }) {
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [sourceFilter, setSourceFilter] = useState<string>("");

	const { data: licensesData, isLoading } = useV2Licenses(appId, {
		status: statusFilter || undefined,
		source: sourceFilter || undefined,
	});
	const { data: summary } = useV2LicenseSummary(appId);
	const grantLicense = useGrantV2License(appId);
	const updateLicense = useUpdateV2License(appId);
	const revokeLicense = useRevokeV2License(appId);
	const { data: plansData } = useV2Plans(appId);

	const [showGrantModal, setShowGrantModal] = useState(false);
	const [grantForm, setGrantForm] = useState({
		userId: "",
		planId: "",
		priceId: "",
		maxActivations: "",
		note: "",
	});
	const [saving, setSaving] = useState(false);
	const [viewingHistory, setViewingHistory] = useState<string | null>(null);
	const [revokeTarget, setRevokeTarget] = useState<V2License | null>(null);

	const licenses = licensesData?.licenses ?? [];
	const plans = plansData?.plans ?? [];

	const handleGrant = async () => {
		if (!grantForm.userId || !grantForm.planId) {
			showToast("User ID and Plan are required", "error");
			return;
		}
		setSaving(true);
		try {
			await grantLicense.mutateAsync({
				userId: grantForm.userId,
				planId: grantForm.planId,
				priceId: grantForm.priceId || undefined,
				maxActivations: grantForm.maxActivations ? parseInt(grantForm.maxActivations, 10) : undefined,
				note: grantForm.note || undefined,
			});
			showToast("License granted", "success");
			setShowGrantModal(false);
			setGrantForm({ userId: "", planId: "", priceId: "", maxActivations: "", note: "" });
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to grant license", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleRevoke = async (license: V2License) => {
		try {
			await revokeLicense.mutateAsync(license.licenseId);
			showToast("License revoked", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to revoke", "error");
		}
	};

	if (isLoading) {
		return <div className="flex justify-center py-12"><Spinner /></div>;
	}

	return (
		<div className="space-y-6">
			{/* Summary Stats */}
			{summary && (
				<div className="grid grid-cols-4 gap-4">
					{Object.entries(summary.statusCounts).map(([status, count]) => (
						<Card key={status}>
							<CardBody className="flex items-center gap-3">
								<IconBox
									variant={status === "active" ? "success-subtle" : status === "suspended" ? "danger-subtle" : "secondary-subtle"}
									size="md"
								>
									<Icon icon={status === "active" ? IconType.Check : status === "suspended" ? IconType.Shield : IconType.Clock} size={18} />
								</IconBox>
								<div>
									<Text className="text-muted-foreground text-xs capitalize">{status}</Text>
									<Heading level={4} size="sm">{count}</Heading>
								</div>
							</CardBody>
						</Card>
					))}
				</div>
			)}

			{/* Filters & Actions */}
			<div className="flex items-center gap-3">
				<Select
					value={statusFilter}
					onChange={setStatusFilter}
					options={[
						{ value: "", label: "All statuses" },
						{ value: "active", label: "Active" },
						{ value: "suspended", label: "Suspended" },
						{ value: "expired", label: "Expired" },
						{ value: "revoked", label: "Revoked" },
						{ value: "trial", label: "Trial" },
					]}
				/>
				<Select
					value={sourceFilter}
					onChange={setSourceFilter}
					options={[
						{ value: "", label: "All sources" },
						{ value: "admin_grant", label: "Admin Grant" },
						{ value: "purchase", label: "Purchase" },
						{ value: "system", label: "System" },
					]}
				/>
				<div className="flex-1" />
				<Button size="sm" onClick={() => setShowGrantModal(true)}>
					<Icon icon={IconType.Add} size={16} />
					Grant License
				</Button>
			</div>

			{/* Licenses Table */}
			{licenses.length === 0 ? (
				<EmptyState
					icon={IconType.License}
					title="No licenses"
					description="No licenses match the current filters"
				/>
			) : (
				<DataTable>
						<TableHeader>
							<tr>
								<TableHead>User</TableHead>
								<TableHead>Plan</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Source</TableHead>
								<TableHead>Valid Until</TableHead>
								<TableHead>Activations</TableHead>
								<TableHead>Actions</TableHead>
							</tr>
						</TableHeader>
						<TableBody>
							{licenses.map((lic) => (
								<DataTableRow key={lic.licenseId}>
									<TableCell>
										<div>
											<Text className="text-sm font-medium">{lic.userName || lic.userEmail || "—"}</Text>
											{lic.userEmail && lic.userName && (
												<Text className="text-xs text-muted-foreground">{lic.userEmail}</Text>
											)}
											<div className="flex items-center gap-1 mt-0.5">
												<code className="text-xs font-mono text-muted-foreground">{lic.licenseId}</code>
												<button
													type="button"
													className="text-muted-foreground hover:text-text-primary"
													title="Copy license ID"
													onClick={() => {
														navigator.clipboard.writeText(lic.licenseId);
														showToast("License ID copied", "info");
													}}
												>
													<Icon icon={IconType.Copy} size={11} />
												</button>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<Text className="text-sm">{lic.plan?.name || "—"}</Text>
									</TableCell>
									<TableCell>
										<Chip
											variant={lic.status === "active" ? "success" : lic.status === "suspended" ? "danger" : lic.status === "trial" ? "info" : "default"}
											size="sm"
										>
											{lic.status}
										</Chip>
									</TableCell>
									<TableCell>
										<Chip size="sm" variant="default">{lic.source}</Chip>
									</TableCell>
									<TableCell>
										<Text className="text-sm text-muted-foreground">
											{lic.validUntil ? new Date(lic.validUntil).toLocaleDateString() : "—"}
										</Text>
									</TableCell>
									<TableCell>
										<Text className="text-sm">
											{lic.activationsCount ?? 0}{lic.maxActivations ? ` / ${lic.maxActivations}` : ""}
										</Text>
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button size="sm" variant="outline" onClick={() => setViewingHistory(lic.licenseId)}>
												<Icon icon={IconType.Clock} size={14} />
											</Button>
											<Button size="sm" variant="danger" onClick={() => setRevokeTarget(lic)}>
												<Icon icon={IconType.Delete} size={14} />
											</Button>
										</div>
									</TableCell>
								</DataTableRow>
							))}
						</TableBody>
				</DataTable>
			)}

			{/* Grant License Modal */}
			<Dialog open={showGrantModal} onOpenChange={setShowGrantModal}>
				<DialogPopup>
					<DialogHeader>
						<DialogTitle>Grant License</DialogTitle>
					</DialogHeader>
					<DialogBody className="space-y-4">
						<div>
							<Label>User ID (public)</Label>
							<Input
								value={grantForm.userId}
								onChange={(e) => setGrantForm({ ...grantForm, userId: e.target.value })}
								placeholder="USR0..."
							/>
						</div>
						<div>
							<Label>Plan</Label>
							<Select
								value={grantForm.planId}
								onChange={(v) => setGrantForm({ ...grantForm, planId: v })}
								options={[
									{ value: "", label: "Select plan..." },
									...plans.map((p) => ({ value: p.planId, label: p.name })),
								]}
							/>
						</div>
						<div>
							<Label>Max Activations (optional)</Label>
							<Input
								type="number"
								value={grantForm.maxActivations}
								onChange={(e) => setGrantForm({ ...grantForm, maxActivations: e.target.value })}
								placeholder="5"
							/>
						</div>
						<div>
							<Label>Note (optional)</Label>
							<Input
								value={grantForm.note}
								onChange={(e) => setGrantForm({ ...grantForm, note: e.target.value })}
								placeholder="Granted for beta testing"
							/>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowGrantModal(false)}>Cancel</Button>
						<Button onClick={handleGrant} disabled={saving}>
							{saving ? <Spinner /> : "Grant License"}
						</Button>
					</DialogFooter>
				</DialogPopup>
			</Dialog>

			{/* License History Modal */}
			{viewingHistory && (
				<LicenseHistoryModal
					appId={appId}
					licenseId={viewingHistory}
					onClose={() => setViewingHistory(null)}
				/>
			)}

			<ConfirmModal
				isOpen={!!revokeTarget}
				onClose={() => setRevokeTarget(null)}
				onConfirm={() => handleRevoke(revokeTarget!)}
				title="Revoke License"
				message={`Are you sure you want to revoke the license for ${revokeTarget?.userEmail || revokeTarget?.userId}?`}
				confirmText="Revoke"
				variant="danger"
			/>
		</div>
	);
}

// ===========================================================================
// License History Modal
// ===========================================================================

function LicenseHistoryModal({ appId, licenseId, onClose }: { appId: string; licenseId: string; onClose: () => void }) {
	const { data, isLoading } = useV2LicenseHistory(appId, licenseId);
	const history = data?.history ?? [];

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>License History</DialogTitle>
				</DialogHeader>
				<DialogBody>
					{isLoading ? (
						<div className="flex justify-center py-8"><Spinner /></div>
					) : history.length === 0 ? (
						<Text className="text-muted-foreground text-center py-8">No history entries</Text>
					) : (
						<div className="space-y-3 max-h-96 overflow-y-auto">
							{history.map((entry) => (
								<div key={entry.historyId} className="p-3 rounded-lg border border-card-border">
									<div className="flex items-center justify-between mb-1">
										<Chip size="sm" variant="default">{entry.changeType}</Chip>
										<Text className="text-xs text-muted-foreground">
											{new Date(entry.createdAt).toLocaleString()}
										</Text>
									</div>
									{entry.oldValue && (
										<Text className="text-xs text-muted-foreground">From: {typeof entry.oldValue === "object" ? JSON.stringify(entry.oldValue) : entry.oldValue}</Text>
									)}
									{entry.newValue && (
										<Text className="text-xs text-muted-foreground">To: {typeof entry.newValue === "object" ? JSON.stringify(entry.newValue) : entry.newValue}</Text>
									)}
									{entry.reason && (
										<Text className="text-xs text-muted-foreground mt-1">{entry.reason}</Text>
									)}
									{entry.notes && (
										<Text className="text-xs text-muted-foreground italic">{entry.notes}</Text>
									)}
								</div>
							))}
						</div>
					)}
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>Close</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}
