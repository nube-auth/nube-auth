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
	Checkbox,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "@nube-auth/components";

import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import { useApp, useProject } from "../hooks/api";
import {
	useV2Promotions,
	useCreateV2Promotion,
	useUpdateV2Promotion,
	useDeactivateV2Promotion,
	useCreateV2PromoCode,
	useDeactivateV2PromoCode,
	type V2Promotion,
	type V2PromoCode,
} from "../hooks/api";

export function AppPromotionsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const { showToast } = useToast();

	const { data, isLoading } = useV2Promotions(appId || "");
	const createPromotion = useCreateV2Promotion(appId || "");
	const updatePromotion = useUpdateV2Promotion(appId || "");
	const deactivatePromotion = useDeactivateV2Promotion(appId || "");
	const createCode = useCreateV2PromoCode(appId || "");
	const deactivateCode = useDeactivateV2PromoCode(appId || "");

	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingPromo, setEditingPromo] = useState<V2Promotion | null>(null);
	const [expandedPromo, setExpandedPromo] = useState<string | null>(null);
	const [showCodeModal, setShowCodeModal] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [deactivateTarget, setDeactivateTarget] = useState<V2Promotion | null>(null);

	const [form, setForm] = useState({
		name: "",
		description: "",
		discountType: "percent",
		discountValue: "",
		maxRedemptions: "",
		startsAt: "",
		endsAt: "",
		isNewCustomersOnly: false,
	});

	const [codeForm, setCodeForm] = useState({
		code: "",
		maxUses: "",
	});

	const promotions = data?.promotions ?? [];

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

	const openCreate = () => {
		setEditingPromo(null);
		setForm({ name: "", description: "", discountType: "percent", discountValue: "", maxRedemptions: "", startsAt: "", endsAt: "", isNewCustomersOnly: false });
		setShowCreateModal(true);
	};

	const openEdit = (promo: V2Promotion) => {
		setEditingPromo(promo);
		setForm({
			name: promo.name,
			description: promo.description || "",
			discountType: promo.discountType,
			discountValue: promo.discountValue.toString(),
			maxRedemptions: promo.maxRedemptions?.toString() || "",
			startsAt: promo.startsAt ? promo.startsAt.slice(0, 16) : "",
			endsAt: promo.endsAt ? promo.endsAt.slice(0, 16) : "",
			isNewCustomersOnly: promo.isNewCustomersOnly,
		});
		setShowCreateModal(true);
	};

	const handleSave = async () => {
		if (!form.name.trim() || !form.discountValue) {
			showToast("Name and discount value are required", "error");
			return;
		}
		setSaving(true);
		try {
			const payload = {
				name: form.name,
				description: form.description || null,
				discountType: form.discountType,
				discountValue: parseFloat(form.discountValue),
				maxRedemptions: form.maxRedemptions ? parseInt(form.maxRedemptions, 10) : null,
				startsAt: form.startsAt || null,
				endsAt: form.endsAt || null,
				isNewCustomersOnly: form.isNewCustomersOnly,
			};
			if (editingPromo) {
				await updatePromotion.mutateAsync({ promoId: editingPromo.promotionId, data: payload });
				showToast("Promotion updated", "success");
			} else {
				await createPromotion.mutateAsync(payload);
				showToast("Promotion created", "success");
			}
			setShowCreateModal(false);
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to save promotion", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDeactivate = async (promo: V2Promotion) => {
		try {
			await deactivatePromotion.mutateAsync(promo.promotionId);
			showToast("Promotion deactivated", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to deactivate", "error");
		}
	};

	const handleCreateCode = async () => {
		if (!showCodeModal || !codeForm.code.trim()) {
			showToast("Code is required", "error");
			return;
		}
		setSaving(true);
		try {
			await createCode.mutateAsync({
				promoId: showCodeModal,
				data: {
					code: codeForm.code.toUpperCase(),
					maxUses: codeForm.maxUses ? parseInt(codeForm.maxUses, 10) : undefined,
				},
			});
			showToast("Code created", "success");
			setShowCodeModal(null);
			setCodeForm({ code: "", maxUses: "" });
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to create code", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDeactivateCode = async (promoId: string, codeId: string) => {
		try {
			await deactivateCode.mutateAsync({ promoId, codeId });
			showToast("Code deactivated", "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to deactivate code", "error");
		}
	};

	const discountDisplay = (promo: V2Promotion) => {
		if (promo.discountType === "percent") return `${promo.discountValue}% off`;
		return `$${(promo.discountValue / 100).toFixed(2)} off`;
	};

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
						<BreadcrumbButton active>Promotions</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex justify-between items-start">
				<div>
					<Heading level={1} size="lg">Promotions</Heading>
					<Text className="text-muted-foreground mt-1">Manage discounts and promo codes for {app.name}</Text>
				</div>
				<Button onClick={openCreate}>
					<Icon icon={IconType.Add} size={16} />
					Create Promotion
				</Button>
			</div>

			{/* Promotions List */}
			{isLoading ? (
				<div className="flex justify-center py-12"><Spinner /></div>
			) : promotions.length === 0 ? (
				<EmptyState
				icon={IconType.Ticket}
					title="No promotions yet"
					description="Create your first promotion to offer discounts to customers"
				/>
			) : (
				<div className="space-y-4">
					{promotions.map((promo) => (
						<Card key={promo.promotionId}>
							<CardBody>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<Heading level={4} size="sm">{promo.name}</Heading>
											<Chip variant={promo.isActive ? "success" : "default"} size="sm">
												{promo.isActive ? "active" : "inactive"}
											</Chip>
											<Chip variant="info" size="sm">{discountDisplay(promo)}</Chip>
										</div>
										{promo.description && (
											<Text className="text-muted-foreground text-sm mb-2">{promo.description}</Text>
										)}
										<div className="flex gap-4 text-xs text-muted-foreground">
											{promo.startsAt && (
												<span>Starts: {new Date(promo.startsAt).toLocaleDateString()}</span>
											)}
											{promo.endsAt && (
												<span>Expires: {new Date(promo.endsAt).toLocaleDateString()}</span>
											)}
											{promo.maxRedemptions && (
												<span>Max redemptions: {promo.maxRedemptions}</span>
											)}
											<span>{promo.isNewCustomersOnly ? "New customers only" : "All customers"}</span>
										</div>
									</div>
									<div className="flex gap-2">
										<Button size="sm" variant="outline" onClick={() => setExpandedPromo(expandedPromo === promo.promotionId ? null : promo.promotionId)}>
											<Icon icon={IconType.Ticket} size={14} />
											Codes
										</Button>
										<Button size="sm" variant="outline" onClick={() => openEdit(promo)}>
											<Icon icon={IconType.Edit} size={14} />
										</Button>
										{promo.isActive && (
											<Button size="sm" variant="danger" onClick={() => setDeactivateTarget(promo)}>
												<Icon icon={IconType.Cancel} size={14} />
											</Button>
										)}
									</div>
								</div>

								{/* Expanded Codes Section */}
								{expandedPromo === promo.promotionId && (
									<div className="mt-4 pt-4 border-t border-card-border">
										<div className="flex justify-between items-center mb-3">
											<Text className="text-sm font-medium">Promo Codes</Text>
											<Button size="sm" variant="outline" onClick={() => setShowCodeModal(promo.promotionId)}>
												<Icon icon={IconType.Add} size={14} />
												Add Code
											</Button>
										</div>

										{promo.codes && promo.codes.length > 0 ? (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Code</TableHead>
														<TableHead>Status</TableHead>
														<TableHead>Uses / Max</TableHead>
														<TableHead>Actions</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{promo.codes.map((code: V2PromoCode) => (
														<TableRow key={code.codeId}>
															<TableCell>
																<Text className="text-sm font-mono font-medium">{code.code}</Text>
															</TableCell>
															<TableCell>
																<Chip variant={code.isActive ? "success" : "default"} size="sm">
																	{code.isActive ? "active" : "inactive"}
																</Chip>
															</TableCell>
															<TableCell>
																<Text className="text-sm">
																	{code.currentUses ?? 0}{code.maxUses ? ` / ${code.maxUses}` : ""}
																</Text>
															</TableCell>
															<TableCell>
																{code.isActive && (
																	<Button
																		size="sm"
																		variant="danger"
																		onClick={() => handleDeactivateCode(promo.promotionId, code.codeId)}
																	>
																		Deactivate
																	</Button>
																)}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										) : (
											<Text className="text-muted-foreground text-sm py-4">No codes yet</Text>
										)}
									</div>
								)}
							</CardBody>
						</Card>
					))}
				</div>
			)}

			{/* Create/Edit Promotion Modal */}
			<Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
				<DialogPopup>
					<DialogHeader>
						<DialogTitle>{editingPromo ? "Edit Promotion" : "Create Promotion"}</DialogTitle>
					</DialogHeader>
					<DialogBody className="space-y-4">
						<div>
							<Label>Name</Label>
							<Input
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								placeholder="Summer Sale"
							/>
						</div>
						<div>
							<Label>Description</Label>
							<Textarea
								value={form.description}
								onChange={(e) => setForm({ ...form, description: e.target.value })}
								placeholder="20% off all annual plans"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label>Discount Type</Label>
								<Select
									value={form.discountType}
									onChange={(v) => setForm({ ...form, discountType: v })}
									options={[
										{ value: "percent", label: "Percentage" },
										{ value: "fixed", label: "Fixed Amount (cents)" },
									]}
								/>
							</div>
							<div>
								<Label>Discount Value</Label>
								<Input
									type="number"
									value={form.discountValue}
									onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
									placeholder={form.discountType === "percent" ? "20" : "500"}
								/>
								{form.discountValue && form.discountType === "percent" && (
									<Text className="text-xs text-muted-foreground mt-1">{form.discountValue}% off</Text>
								)}
								{form.discountValue && form.discountType === "fixed" && (
									<Text className="text-xs text-muted-foreground mt-1">
										= ${(parseInt(form.discountValue, 10) / 100).toFixed(2)} off
									</Text>
								)}
							</div>
						</div>
						<div>
							<Label>Max Redemptions (optional)</Label>
							<Input
								type="number"
								value={form.maxRedemptions}
								onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
								placeholder="100"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label>Starts At</Label>
								<Input
									type="datetime-local"
									value={form.startsAt}
									onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
								/>
							</div>
							<div>
								<Label>Ends At</Label>
								<Input
									type="datetime-local"
									value={form.endsAt}
									onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
								/>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								checked={form.isNewCustomersOnly}
								onCheckedChange={(checked) => setForm({ ...form, isNewCustomersOnly: !!checked })}
							/>
							<Label>New customers only</Label>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
						<Button onClick={handleSave} disabled={saving}>
							{saving ? <Spinner /> : editingPromo ? "Update" : "Create"}
						</Button>
					</DialogFooter>
				</DialogPopup>
			</Dialog>

			{/* Create Code Modal */}
			<Dialog open={!!showCodeModal} onOpenChange={() => { setShowCodeModal(null); setCodeForm({ code: "", maxUses: "" }); }}>
				<DialogPopup>
					<DialogHeader>
						<DialogTitle>Create Promo Code</DialogTitle>
					</DialogHeader>
					<DialogBody className="space-y-4">
						<div>
							<Label>Code</Label>
							<Input
								value={codeForm.code}
								onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
								placeholder="SUMMER20"
								className="font-mono"
							/>
						</div>
						<div>
							<Label>Max Uses (optional)</Label>
							<Input
								type="number"
								value={codeForm.maxUses}
								onChange={(e) => setCodeForm({ ...codeForm, maxUses: e.target.value })}
								placeholder="100"
							/>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button variant="outline" onClick={() => { setShowCodeModal(null); setCodeForm({ code: "", maxUses: "" }); }}>
							Cancel
						</Button>
						<Button onClick={handleCreateCode} disabled={saving}>
							{saving ? <Spinner /> : "Create Code"}
						</Button>
					</DialogFooter>
				</DialogPopup>
			</Dialog>
			<ConfirmModal
				isOpen={!!deactivateTarget}
				onClose={() => setDeactivateTarget(null)}
				onConfirm={() => handleDeactivate(deactivateTarget!)}
				title="Deactivate Promotion"
				message={`Are you sure you want to deactivate promotion "${deactivateTarget?.name}"?`}
				confirmText="Deactivate"
				variant="warning"
			/>
		</div>
	);
}
