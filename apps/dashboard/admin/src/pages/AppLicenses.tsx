import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
	IconBox,
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
	Checkbox,
} from "@proofa/components";

import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import { useApp, useAppUsers, useProject } from "../hooks/api";
import { pingpong } from "../lib/pingpong";

interface Plan {
	id: string;
	name: string;
	slug: string;
	description?: string;
	monthlyPrice?: number;
	yearlyPrice?: number;
	oneTimePrice?: number;
	durationDays?: number | null;
	trialEnabled: boolean;
	trialDays?: number;
	features: string[];
	status: string;
	displayOrder: number;
}

export function AppLicensesPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const queryClient = useQueryClient();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const { data, isLoading: usersLoading } = useAppUsers(projectId || "", appId || "");

	const [showPlansSection, setShowPlansSection] = useState(false);
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [changingLicense, setChangingLicense] = useState<any>(null);
	const [newPlan, setNewPlan] = useState("");
	const [isUpdating, setIsUpdating] = useState(false);
	const { showToast } = useToast();

	const statusIcons = {
		all: IconType.Grid,
		active: IconType.Check,
		suspended: IconType.Shield,
		trial: IconType.Clock,
	} as const;

	// Plans state
	const [plans, setPlans] = useState<Plan[]>([]);
	const [plansLoading, setPlansLoading] = useState(false);
	const [showPlanModal, setShowPlanModal] = useState(false);
	const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
	const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);

	// Plan form state
	const [planForm, setPlanForm] = useState({
		name: "",
		slug: "",
		description: "",
		monthlyPrice: "",
		yearlyPrice: "",
		oneTimePrice: "",
		durationDays: null as number | null,
		trialEnabled: false,
		trialDays: "",
		features: [] as string[],
		displayOrder: 0,
	});
	const [featureInput, setFeatureInput] = useState("");
	const [planError, setPlanError] = useState<string | null>(null);

	const users = data?.users || [];

	// Calculate stats
	const activeLicenses = users.filter((u) => u.status === "active").length;
	const freeUsers = users.filter((u) => u.plan === "free" && u.status === "active").length;
	const paidUsers = users.filter((u) => u.plan !== "free" && u.status === "active").length;

	// Fetch plans
	const fetchPlans = useCallback(async () => {
		setPlansLoading(true);
		try {
			const response = await pingpong(
				`${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/plans`,
				{
					credentials: "include",
				},
			);

			if (!response.ok) {
				throw new Error("Failed to fetch plans");
			}

			const data = await response.json();
			setPlans(data.plans || []);
		} catch (err) {
			console.error("Failed to fetch plans:", err);
		} finally {
			setPlansLoading(false);
		}
	}, [projectId, appId]);

	// Fetch plans when section is expanded
	useEffect(() => {
		if (showPlansSection && projectId && appId) {
			fetchPlans();
		}
	}, [showPlansSection, projectId, appId, fetchPlans]);

	// Open create plan modal
	const handleCreatePlan = () => {
		setEditingPlan(null);
		setPlanForm({
			name: "",
			slug: "",
			description: "",
			monthlyPrice: "",
			yearlyPrice: "",
			oneTimePrice: "",
			durationDays: null,
			trialEnabled: false,
			trialDays: "",
			features: [],
			displayOrder: 0,
		});
		setFeatureInput("");
		setPlanError(null);
		setShowPlanModal(true);
	};

	// Open edit plan modal
	const handleEditPlan = (plan: Plan) => {
		setEditingPlan(plan);
		setPlanForm({
			name: plan.name,
			slug: plan.slug,
			description: plan.description || "",
			monthlyPrice: plan.monthlyPrice ? (plan.monthlyPrice / 100).toString() : "",
			yearlyPrice: plan.yearlyPrice ? (plan.yearlyPrice / 100).toString() : "",
			oneTimePrice: plan.oneTimePrice ? (plan.oneTimePrice / 100).toString() : "",
			durationDays: plan.durationDays || null,
			trialEnabled: plan.trialEnabled,
			trialDays: plan.trialDays?.toString() || "",
			features: [...plan.features],
			displayOrder: plan.displayOrder,
		});
		setFeatureInput("");
		setPlanError(null);
		setShowPlanModal(true);
	};

	// Save plan (create or update)
	const handleSavePlan = async () => {
		setPlanError(null);

		// Validation
		if (!planForm.name.trim()) {
			setPlanError("Plan name is required");
			return;
		}

		if (!planForm.slug.trim()) {
			setPlanError("Plan slug is required");
			return;
		}

		setIsUpdating(true);

		try {
			const payload = {
				name: planForm.name,
				slug: planForm.slug,
				description: planForm.description || null,
				monthly_price: planForm.monthlyPrice ? Math.round(parseFloat(planForm.monthlyPrice) * 100) : null,
				yearly_price: planForm.yearlyPrice ? Math.round(parseFloat(planForm.yearlyPrice) * 100) : null,
				one_time_price: planForm.oneTimePrice ? Math.round(parseFloat(planForm.oneTimePrice) * 100) : null,
				duration_days: planForm.durationDays || null,
				trial_enabled: planForm.trialEnabled,
				trial_days: planForm.trialDays ? parseInt(planForm.trialDays, 10) : null,
				features: planForm.features,
				display_order: planForm.displayOrder,
			};

			const url = editingPlan
				? `${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/plans/${editingPlan.id}`
				: `${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/plans`;

			const response = await pingpong(url, {
				method: editingPlan ? "PATCH" : "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to save plan");
			}

			// Refresh plans list
			await fetchPlans();

			// Close modal
			setShowPlanModal(false);
		} catch (err) {
			setPlanError(err instanceof Error ? err.message : "Failed to save plan");
		} finally {
			setIsUpdating(false);
		}
	};

	// Delete plan
	const handleDeletePlan = async () => {
		if (!deletingPlan) return;

		setIsUpdating(true);

		try {
			const response = await pingpong(
				`${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/plans/${deletingPlan.id}`,
				{
					method: "DELETE",
					credentials: "include",
				},
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete plan");
			}

			// Refresh plans list
			await fetchPlans();

			// Close dialog
			setDeletingPlan(null);
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Failed to delete plan", "error");
		} finally {
			setIsUpdating(false);
		}
	};

	// Add feature to list
	const handleAddFeature = () => {
		if (featureInput.trim()) {
			setPlanForm({
				...planForm,
				features: [...planForm.features, featureInput.trim()],
			});
			setFeatureInput("");
		}
	};

	// Remove feature from list
	const handleRemoveFeature = (index: number) => {
		setPlanForm({
			...planForm,
			features: planForm.features.filter((_, i) => i !== index),
		});
	};

	// Filter licenses
	const filteredLicenses = users.filter((user) => {
		const matchesSearch =
			user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus = filterStatus === "all" || user.status === filterStatus;

		return matchesSearch && matchesStatus;
	});

	// Handler for changing plan
	const handleChangePlan = async () => {
		if (!changingLicense || !newPlan) return;

		setIsUpdating(true);

		try {
			const response = await pingpong(
				`${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/users/${changingLicense.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({
						license_plan: newPlan,
					}),
				},
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to update license plan");
			}

			// Refresh users list
			queryClient.invalidateQueries({ queryKey: ["appUsers", projectId, appId] });

			// Close modal
			setChangingLicense(null);
			setNewPlan("");
		} catch (err) {
			console.error("Failed to update license plan:", err);
			showToast(err instanceof Error ? err.message : "Failed to update license plan", "error");
		} finally {
			setIsUpdating(false);
		}
	};

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
			{/* Breadcrumb */}
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
						<BreadcrumbButton active>Licenses</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Page Header */}
			<div>
				<Heading level={1} size="lg">Licenses</Heading>
				<Text className="text-muted-foreground mt-1">Manage user licenses and pricing plans for {app.name}</Text>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-4 gap-4">
				{[
					{ label: "Active Licenses", value: activeLicenses, icon: IconType.Key, variant: "primary-subtle" as const },
					{ label: "Free Plan", value: freeUsers, icon: IconType.UserMultiple, variant: "success-subtle" as const },
					{ label: "Paid Plans", value: paidUsers, icon: IconType.DollarCircle, variant: "warning-subtle" as const },
					{ label: "Monthly Revenue", value: "$0", icon: IconType.ArrowDown, variant: "info-subtle" as const },
				].map((stat) => (
					<Card key={stat.label}>
						<CardBody className="flex items-center gap-4">
							<IconBox variant={stat.variant} size="lg">
								<Icon icon={stat.icon} size={22} />
							</IconBox>
							<div>
								<Text className="text-muted-foreground text-sm">{stat.label}</Text>
								<Heading level={3} size="lg">{stat.value}</Heading>
							</div>
						</CardBody>
					</Card>
				))}
			</div>

			{/* Plans Section */}
			<Card>
				<button
					type="button"
					onClick={() => setShowPlansSection(!showPlansSection)}
					className="w-full px-6 py-4 flex items-center justify-between bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-muted/30 rounded-t-xl"
				>
					<div className="flex items-center gap-3">
						<IconBox variant="primary-subtle" size="md">
							<Icon icon={IconType.Key} size={18} />
						</IconBox>
						<div className="text-left">
							<Heading level={3} size="sm">Pricing Plans</Heading>
							<Text className="text-muted-foreground text-sm">Configure plans and pricing for your app</Text>
						</div>
					</div>
					<Icon
						icon={IconType.ArrowDown}
						size={20}
						className={`text-muted-foreground transition-transform duration-200 ${showPlansSection ? "rotate-180" : ""}`}
					/>
				</button>

				{showPlansSection && (
					<CardBody className="border-t border-card-border">
						{/* Create Plan Button */}
						<div className="flex justify-end mb-4">
							<Button size="sm" onClick={handleCreatePlan}>
								<Icon icon={IconType.Add} size={16} />
								Create Plan
							</Button>
						</div>

						{/* Plans List */}
						{plansLoading ? (
							<div className="flex items-center justify-center py-10">
								<Spinner />
							</div>
						) : plans.length === 0 ? (
							<EmptyState
								icon={IconType.AlertCircle}
								title="No plans yet"
								description="Create your first pricing plan to get started"
							/>
						) : (
							<div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 items-stretch">
								{plans.map((plan) => (
									<Card key={plan.id} className="flex flex-col h-full">
										<CardBody className="flex flex-col flex-1">
											<div className="flex justify-between items-start mb-3">
												<div>
													<Heading level={4} size="sm">{plan.name}</Heading>
													<Text className="text-muted-foreground text-xs mt-0.5">{plan.slug}</Text>
												</div>
												<Chip
													variant={plan.status === "active" ? "success" : "default"}
													size="sm"
												>
													{plan.status}
												</Chip>
											</div>

											{plan.description && (
												<Text className="text-muted-foreground text-sm mb-3 leading-relaxed">
													{plan.description}
												</Text>
											)}

											<div className="mb-3">
												{plan.monthlyPrice && (
													<div className="text-sm text-foreground mb-1">
														<span className="font-semibold">
															${(plan.monthlyPrice / 100).toFixed(2)}
														</span>
														<span className="text-xs text-muted-foreground">/month</span>
													</div>
												)}
												{plan.yearlyPrice && (
													<div className="text-sm text-foreground mb-1">
														<span className="font-semibold">
															${(plan.yearlyPrice / 100).toFixed(2)}
														</span>
														<span className="text-xs text-muted-foreground">/year</span>
													</div>
												)}
												{plan.oneTimePrice && (
													<div className="text-sm text-foreground mb-1">
														<span className="font-semibold">
															${(plan.oneTimePrice / 100).toFixed(2)}
														</span>
														<span className="text-xs text-muted-foreground"> one-time</span>
													</div>
												)}
												{!plan.monthlyPrice && !plan.yearlyPrice && !plan.oneTimePrice && (
													<Text className="text-sm font-semibold">Free</Text>
												)}
												{plan.trialEnabled && plan.trialDays && (
													<Text className="text-xs text-primary mt-1">
														{plan.trialDays} day free trial
													</Text>
												)}
											</div>

											{plan.features.length > 0 && (
												<div className="mb-4">
													<Text className="text-xs font-semibold text-muted-foreground mb-2">
														Features:
													</Text>
													<ul className="m-0 pl-5 text-xs text-muted-foreground">
														{plan.features.slice(0, 3).map((feature) => (
															<li key={feature} className="mb-1">{feature}</li>
														))}
														{plan.features.length > 3 && (
															<li className="text-muted-foreground/60">
																+{plan.features.length - 3} more
															</li>
														)}
													</ul>
												</div>
											)}

											<div className="flex gap-2 pt-3 border-t border-card-border mt-auto">
												<Button
													variant="secondary"
													size="sm"
													className="flex-1"
													onClick={() => handleEditPlan(plan)}
												>
													Edit
												</Button>
												<Button
													variant="danger"
													size="sm"
													className="flex-1"
													onClick={() => setDeletingPlan(plan)}
												>
													Delete
												</Button>
											</div>
										</CardBody>
									</Card>
								))}
							</div>
						)}
					</CardBody>
				)}
			</Card>

			{/* Licenses Table */}
			<Card>
				<CardBody className="border-b border-card-border">
					<Heading level={2} size="sm">Active Licenses</Heading>
					<Text className="text-muted-foreground text-sm mt-1">View and manage user licenses</Text>
				</CardBody>

				{/* Filters */}
				<div className="px-6 py-4 border-b border-card-border flex items-center gap-3">
					<div className="w-full max-w-[400px]">
						<Input
							type="text"
							placeholder="Search by name or email..."
							value={searchQuery}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
						/>
					</div>

					{/* Custom Status Dropdown */}
					<div className="relative min-w-[160px]">
						<button
							type="button"
							onClick={() => setShowStatusDropdown(!showStatusDropdown)}
							className={`flex w-full items-center justify-between gap-2 rounded-[10px] border bg-bg-surface px-3 py-2.5 text-14px text-text-primary transition-all focus:outline-none ${showStatusDropdown ? "border-primary" : "border-border hover:border-primary/70"}`}
						>
							<span className="flex items-center gap-2">
								<Icon icon={IconType.Filter} size={16} className="text-text-tertiary" />
								{filterStatus === "all" ? "All Status" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
							</span>
							<Icon
								icon={showStatusDropdown ? IconType.ArrowUp : IconType.ArrowDown}
								size={14}
								className="text-text-tertiary"
							/>
						</button>

						{showStatusDropdown && (
							<>
								<div className="fixed inset-0 z-[999]" onClick={() => setShowStatusDropdown(false)} />
								<div className="absolute top-[calc(100%+6px)] left-0 right-0 z-[1000] overflow-hidden rounded-[10px] border border-border bg-bg-surface shadow-xl">
									{[
										{ value: "all", label: "All Status" },
										{ value: "active", label: "Active" },
										{ value: "suspended", label: "Suspended" },
										{ value: "trial", label: "Trial" },
									].map((option) => (
										<button
											key={option.value}
											type="button"
											onClick={() => {
												setFilterStatus(option.value);
												setShowStatusDropdown(false);
											}}
											className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-14px transition-all ${filterStatus === option.value ? "bg-primary/10 text-primary" : "text-text-primary hover:bg-surface/50"} ${option.value !== "trial" ? "border-b border-border/60" : ""}`}
										>
											<Icon icon={statusIcons[option.value as keyof typeof statusIcons]} size={16} className="flex-shrink-0" />
											<span className={filterStatus === option.value ? "font-semibold" : "font-normal"}>{option.label}</span>
											{filterStatus === option.value && (
												<Icon icon={IconType.Check} size={16} className="ml-auto text-primary" />
											)}
										</button>
									))}
								</div>
							</>
						)}
					</div>
				</div>

				{/* Table */}
				{!usersLoading && filteredLicenses.length > 0 ? (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>User</TableHead>
									<TableHead>Email</TableHead>
									<TableHead className="text-center">Plan</TableHead>
									<TableHead className="text-center">Status</TableHead>
									<TableHead className="text-center">Valid Until</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredLicenses.map((user) => (
									<TableRow key={user.id}>
										<TableCell>
											<div className="flex items-center gap-2.5">
												<div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
													{user.name
														? user.name.charAt(0).toUpperCase()
														: user.email.charAt(0).toUpperCase()}
												</div>
												<Text className="font-medium">
													{user.name || "—"}
												</Text>
											</div>
										</TableCell>
										<TableCell>
											<Text className="text-muted-foreground text-sm">{user.email}</Text>
										</TableCell>
										<TableCell className="text-center">
											<Chip
												variant={user.plan === "free" ? "default" : "primary"}
												size="sm"
											>
												{user.plan || "free"}
											</Chip>
										</TableCell>
										<TableCell className="text-center">
											<Chip
												variant={user.status === "active" ? "success" : "danger"}
												size="sm"
											>
												{user.status}
											</Chip>
										</TableCell>
										<TableCell className="text-center">
											<Text className="text-muted-foreground text-sm">
												{user.licenseValidUntil
													? new Date(user.licenseValidUntil).toLocaleDateString()
													: "—"}
											</Text>
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="secondary"
												size="sm"
												onClick={() => {
													setChangingLicense(user);
													setNewPlan(user.plan || "free");
												}}
											>
												Change Plan
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : (
					<EmptyState
						icon={IconType.AlertCircle}
						title="No licenses found"
						description={
							searchQuery || filterStatus !== "all"
								? "Try adjusting your filters"
								: "Licenses will appear here when users sign up"
						}
					/>
				)}
			</Card>

			{/* Change Plan Modal */}
			{changingLicense && (
				<Dialog open={!!changingLicense} onOpenChange={(open: boolean) => !open && setChangingLicense(null)}>
					<DialogPopup>
						<DialogHeader>
							<DialogTitle>Change License Plan</DialogTitle>
							<Text className="text-muted-foreground mt-2">
								Update license plan for {changingLicense.name || changingLicense.email}
							</Text>
						</DialogHeader>

						<DialogBody>
							<Label className="font-semibold">New Plan</Label>
							<Select
								value={newPlan}
								onChange={(value) => setNewPlan(value)}
								options={[
									{ value: "free", label: "Free" },
									{ value: "trial", label: "Trial" },
									{ value: "pro", label: "Pro" },
									{ value: "enterprise", label: "Enterprise" },
								]}
								disabled={isUpdating}
							/>
						</DialogBody>

						<DialogFooter>
							<Button variant="secondary" onClick={() => setChangingLicense(null)} disabled={isUpdating}>
								Cancel
							</Button>
							<Button
								variant="primary"
								onClick={handleChangePlan}
								disabled={isUpdating || newPlan === changingLicense.plan}
							>
								{isUpdating ? "Saving..." : "Save Changes"}
							</Button>
						</DialogFooter>
					</DialogPopup>
				</Dialog>
			)}

			{/* Plan Create/Edit Modal */}
			{showPlanModal && (
				<Dialog open={showPlanModal} onOpenChange={(open: boolean) => !open && !isUpdating && setShowPlanModal(false)}>
					<DialogPopup className="!w-[800px] max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
							<Text className="text-muted-foreground mt-2">
								{editingPlan ? "Update plan details and pricing" : "Create a new pricing plan for your app"}
							</Text>
						</DialogHeader>

						<DialogBody>
							{planError && (
								<Alert variant="danger" className="mb-4">
									<Icon icon={IconType.AlertCircle} size={20} />
									<span>{planError}</span>
								</Alert>
							)}

						<form
							onSubmit={(e) => {
								e.preventDefault();
								handleSavePlan();
							}}
						>
							{/* Plan Name */}
							<div className="mb-5">
								<Label className="font-semibold mb-2">
									Plan Name <span className="text-danger">*</span>
								</Label>
								<Input
									type="text"
									value={planForm.name}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanForm({ ...planForm, name: e.target.value })}
									disabled={isUpdating}
									placeholder="e.g., Pro Plan"
									required
								/>
							</div>

							{/* Plan Slug */}
							<div className="mb-5">
								<Label className="font-semibold mb-2">
									Plan Slug <span className="text-danger">*</span>
								</Label>
								<Input
									type="text"
									value={planForm.slug}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setPlanForm({
											...planForm,
											slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
										})
									}
									disabled={isUpdating || !!editingPlan}
									placeholder="e.g., pro"
									required
									className={editingPlan ? "opacity-60" : ""}
								/>
								{editingPlan && (
									<Text className="text-xs text-muted-foreground mt-1.5">
										Slug cannot be changed after creation
									</Text>
								)}
							</div>

							{/* Description */}
							<div className="mb-5">
								<Label className="font-semibold mb-2">Description</Label>
								<Textarea
									value={planForm.description}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPlanForm({ ...planForm, description: e.target.value })}
									disabled={isUpdating}
									placeholder="Brief description of this plan..."
									rows={3}
								/>
							</div>

							{/* Pricing */}
							<div className="grid grid-cols-3 gap-3 mb-5">
								<div>
									<Label className="font-semibold mb-2">Monthly Price ($)</Label>
									<Input
										type="number"
										step="0.01"
										min="0"
										value={planForm.monthlyPrice}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanForm({ ...planForm, monthlyPrice: e.target.value })}
										disabled={isUpdating}
										placeholder="9.99"
									/>
								</div>
								<div>
									<Label className="font-semibold mb-2">Yearly Price ($)</Label>
									<Input
										type="number"
										step="0.01"
										min="0"
										value={planForm.yearlyPrice}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanForm({ ...planForm, yearlyPrice: e.target.value })}
										disabled={isUpdating}
										placeholder="99.99"
									/>
								</div>
								<div>
									<Label className="font-semibold mb-2">One-Time Price ($)</Label>
									<Input
										type="number"
										step="0.01"
										min="0"
										value={planForm.oneTimePrice}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanForm({ ...planForm, oneTimePrice: e.target.value })}
										disabled={isUpdating}
										placeholder="499.99"
									/>
								</div>
							</div>

							{/* Duration */}
							<div className="mb-5">
								<Label className="font-semibold mb-2">License Duration (Days)</Label>
								<Input
									type="number"
									min="1"
									value={planForm.durationDays || ""}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setPlanForm({
											...planForm,
											durationDays: e.target.value ? parseInt(e.target.value, 10) : null,
										})
									}
									disabled={isUpdating}
									placeholder="e.g., 30, 365 (leave empty for lifetime)"
								/>
								<Text className="text-xs text-muted-foreground mt-1.5">
									How long the license is valid after activation. Leave empty for lifetime access.
								</Text>
							</div>

							{/* Trial */}
							<div className="mb-5">
								<label className="inline-flex items-center gap-2 cursor-pointer">
									<Checkbox
										checked={planForm.trialEnabled}
										onCheckedChange={(checked: boolean) => setPlanForm({ ...planForm, trialEnabled: checked })}
										disabled={isUpdating}
									/>
									<span>Enable Free Trial</span>
								</label>
								{planForm.trialEnabled && (
									<div className="mt-3 ml-7">
										<Label className="font-semibold mb-2">Trial Duration (days)</Label>
										<Input
											type="number"
											min="1"
											value={planForm.trialDays}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanForm({ ...planForm, trialDays: e.target.value })}
											disabled={isUpdating}
											placeholder="14"
											className="w-[120px]"
										/>
									</div>
								)}
							</div>

							{/* Features */}
							<div className="mb-6">
								<Label className="font-semibold mb-2">Features</Label>
								<div className="flex gap-2 mb-3">
									<Input
										type="text"
										value={featureInput}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeatureInput(e.target.value)}
										onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleAddFeature();
											}
										}}
										disabled={isUpdating}
										placeholder="Add a feature..."
										className="flex-1"
									/>
									<Button
										type="button"
										variant="secondary"
										onClick={handleAddFeature}
										disabled={isUpdating || !featureInput.trim()}
									>
										Add
									</Button>
								</div>
								{planForm.features.length > 0 && (
									<div className="flex flex-col gap-2">
										{planForm.features.map((feature, index) => (
											<div
												key={`feature-${index}`}
												className="flex items-center justify-between py-2 px-3 bg-muted/30 border border-card-border rounded-md text-sm text-foreground"
											>
												<span>{feature}</span>
												<button
													type="button"
													onClick={() => handleRemoveFeature(index)}
													disabled={isUpdating}
													className="bg-transparent border-none text-danger cursor-pointer p-1"
												>
													<Icon icon={IconType.Delete} size={16} className="text-danger" />
												</button>
											</div>
										))}
									</div>
								)}
							</div>
						</form>
						</DialogBody>

						<DialogFooter>
							<Button variant="secondary" onClick={() => setShowPlanModal(false)} disabled={isUpdating}>
								Cancel
							</Button>
							<Button variant="primary" disabled={isUpdating} onClick={(e) => {
								e.preventDefault();
								handleSavePlan();
							}}>
								{isUpdating ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
							</Button>
						</DialogFooter>
					</DialogPopup>
				</Dialog>
			)}

			{/* Delete Plan Confirmation Dialog */}
			{deletingPlan && (
				<Dialog open={!!deletingPlan} onOpenChange={(open: boolean) => !open && !isUpdating && setDeletingPlan(null)}>
					<DialogPopup>
						<DialogHeader>
							<IconBox variant="danger-subtle" size="lg" className="mb-4">
								<Icon icon={IconType.AlertCircle} size={24} />
							</IconBox>
							<DialogTitle>Delete Plan?</DialogTitle>
							<Text className="text-muted-foreground mt-2 mb-3">
								Are you sure you want to delete the <strong>{deletingPlan.name}</strong> plan? This
								action cannot be undone.
							</Text>
							<Text className="text-muted-foreground text-sm">
								Note: Plans with active licenses cannot be deleted.
							</Text>
						</DialogHeader>

						<DialogFooter>
							<Button variant="secondary" onClick={() => setDeletingPlan(null)} disabled={isUpdating}>
								Cancel
							</Button>
							<Button variant="danger" onClick={handleDeletePlan} disabled={isUpdating}>
								{isUpdating ? "Deleting..." : "Delete Plan"}
							</Button>
						</DialogFooter>
					</DialogPopup>
				</Dialog>
			)}
		</div>
	);
}
