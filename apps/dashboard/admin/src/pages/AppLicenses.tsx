import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
	const [changingLicense, setChangingLicense] = useState<any>(null);
	const [newPlan, setNewPlan] = useState("");
	const [isUpdating, setIsUpdating] = useState(false);
	const { showToast } = useToast();

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
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project || !app) {
		return (
			<div className="alert alert-danger">
				<span>Project or App not found</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav className="flex items-center gap-2 text-13px">
				<Link to="/projects" className="text-text-secondary no-underline">
					Projects
				</Link>
				<svg
					className="w-3.5 h-3.5 text-text-tertiary"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link to={`/projects/${projectId}`} className="text-text-secondary no-underline">
					{project.name}
				</Link>
				<svg
					className="w-3.5 h-3.5 text-text-tertiary"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link
					to={`/projects/${projectId}/apps/${appId}`}
					className="text-text-secondary no-underline"
				>
					{app.name}
				</Link>
				<svg
					className="w-3.5 h-3.5 text-text-tertiary"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span className="text-text-primary font-medium">Licenses</span>
			</nav>

			{/* Page Header */}
			<div className="page-header">
				<div>
					<h1 className="page-title">Licenses</h1>
					<p className="page-description">Manage user licenses and pricing plans for {app.name}</p>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
				{/* Active Licenses */}
				<div className="stat-card">
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[linear-gradient(135deg,rgba(139,92,246,0.1),rgba(139,92,246,0.05))]">
							<svg
								className="w-5 h-5 text-primary"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
								/>
							</svg>
						</div>
						<div>
							<p className="stat-label">Active Licenses</p>
							<p className="stat-value">{activeLicenses}</p>
						</div>
					</div>
				</div>

				{/* Free Plan Users */}
				<div className="stat-card">
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[linear-gradient(135deg,rgba(34,197,94,0.1),rgba(34,197,94,0.05))]">
							<svg
								className="w-5 h-5 text-success"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
						</div>
						<div>
							<p className="stat-label">Free Plan</p>
							<p className="stat-value">{freeUsers}</p>
						</div>
					</div>
				</div>

				{/* Paid Plan Users */}
				<div className="stat-card">
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[linear-gradient(135deg,rgba(234,179,8,0.1),rgba(234,179,8,0.05))]">
							<svg
								className="w-5 h-5 text-[#eab308]"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div>
							<p className="stat-label">Paid Plans</p>
							<p className="stat-value">{paidUsers}</p>
						</div>
					</div>
				</div>

				{/* Monthly Revenue */}
				<div className="stat-card">
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[linear-gradient(135deg,rgba(99,102,241,0.1),rgba(99,102,241,0.05))]">
							<svg
								className="w-5 h-5 text-[#6366f1]"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
								/>
							</svg>
						</div>
						<div>
							<p className="stat-label">Monthly Revenue</p>
							<p className="stat-value">$0</p>
						</div>
					</div>
				</div>
			</div>

			{/* Plans Section Toggle */}
			<div className="card">
				<button
					type="button"
					onClick={() => setShowPlansSection(!showPlansSection)}
					className="w-full p-4 flex items-center justify-between bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-surface-hover"
				>
					<div className="flex items-center gap-3">
						<svg
							className="w-5 h-5 text-primary"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
							/>
						</svg>
						<div className="text-left">
							<h3 className="text-16px font-semibold text-text-primary m-0">
								Pricing Plans
							</h3>
							<p className="text-13px text-text-secondary m-0">
								Configure plans and pricing for your app
							</p>
						</div>
					</div>
					<svg
						className={`w-5 h-5 text-text-tertiary transition-transform duration-200 ${showPlansSection ? "rotate-180" : "rotate-0"}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{showPlansSection && (
					<div className="p-5 border-t border-card-border">
						{/* Create Plan Button */}
						<div className="flex justify-end mb-4">
							<button
								type="button"
								onClick={handleCreatePlan}
								className="btn btn-primary btn-sm flex items-center gap-1.5"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 4v16m8-8H4"
									/>
								</svg>
								Create Plan
							</button>
						</div>

						{/* Plans List */}
						{plansLoading ? (
							<div className="text-center py-10 px-5">
								<div className="spinner mx-auto" />
							</div>
						) : plans.length === 0 ? (
							<div className="text-center py-15 px-5 text-text-secondary">
								<svg
									className="w-16 h-16 mx-auto mb-4 opacity-30"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
									/>
								</svg>
								<p className="text-14px font-medium">No plans yet</p>
								<p className="text-13px mt-2 text-text-tertiary">
									Create your first pricing plan to get started
								</p>
							</div>
						) : (
							<div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 items-stretch">
								{plans.map((plan) => (
									<div
										key={plan.id}
										className="flex flex-col bg-content-bg border border-card-border rounded-xl p-5 h-full transition-all duration-200"
									>
										<div className="flex justify-between items-start mb-3">
											<div>
												<h4 className="text-16px font-semibold text-text-primary m-0">
													{plan.name}
												</h4>
												<p className="text-12px text-text-tertiary mt-0.5">
													{plan.slug}
												</p>
											</div>
											<span
												className={`inline-block px-2 py-1 rounded-md text-11px font-semibold capitalize ${plan.status === "active" ? "bg-[rgba(34,197,94,0.1)] text-success" : "bg-[rgba(107,114,128,0.1)] text-[#6b7280]"}`}
											>
												{plan.status}
											</span>
										</div>

										{plan.description && (
											<p className="text-13px text-text-secondary mb-3 leading-relaxed">
												{plan.description}
											</p>
										)}

										<div className="mb-3">
											{plan.monthlyPrice && (
												<div className="text-14px text-text-primary mb-1">
													<span className="font-semibold">
														${(plan.monthlyPrice / 100).toFixed(2)}
													</span>
													<span className="text-12px text-text-tertiary">
														/month
													</span>
												</div>
											)}
											{plan.yearlyPrice && (
												<div className="text-14px text-text-primary mb-1">
													<span className="font-semibold">
														${(plan.yearlyPrice / 100).toFixed(2)}
													</span>
													<span className="text-12px text-text-tertiary">
														/year
													</span>
												</div>
											)}
											{plan.oneTimePrice && (
												<div className="text-14px text-text-primary mb-1">
													<span className="font-semibold">
														${(plan.oneTimePrice / 100).toFixed(2)}
													</span>
													<span className="text-12px text-text-tertiary">
														{" "}
														one-time
													</span>
												</div>
											)}
											{!plan.monthlyPrice && !plan.yearlyPrice && !plan.oneTimePrice && (
												<div className="text-14px text-text-primary mb-1">
													<span className="font-semibold">00</span>
												</div>
											)}
											{plan.trialEnabled && plan.trialDays && (
												<div className="text-12px text-primary mt-1">
													{plan.trialDays} day free trial
												</div>
											)}
										</div>

										{plan.features.length > 0 && (
											<div className="mb-4">
												<p className="text-12px font-semibold text-text-secondary mb-2">
													Features:
												</p>
												<ul className="m-0 pl-5 text-12px text-text-secondary">
													{plan.features.slice(0, 3).map((feature) => (
														<li key={feature} className="mb-1">
															{feature}
														</li>
													))}
													{plan.features.length > 3 && (
														<li className="text-text-tertiary">
															+{plan.features.length - 3} more
														</li>
													)}
												</ul>
											</div>
										)}

										<div className="flex gap-2 pt-3 border-t border-card-border mt-auto">
											<button
												type="button"
												onClick={() => handleEditPlan(plan)}
												className="btn btn-secondary-outline btn-sm flex-1"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => setDeletingPlan(plan)}
												className="btn btn-danger-outline btn-sm flex-1"
											>
												Delete
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Licenses Table */}
			<div className="card">
				<div className="p-5 border-b border-card-border">
					<h2 className="text-16px font-semibold text-text-primary mb-1">
						Active Licenses
					</h2>
					<p className="text-13px text-text-secondary">View and manage user licenses</p>
				</div>

				{/* Filters */}
				<div className="p-4 border-b border-card-border flex gap-3 flex-wrap">
					<input
						type="text"
						placeholder="Search by name or email..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-1 min-w-60 py-2 px-3 border border-border-primary rounded-lg text-14px bg-content-bg text-text-primary"
					/>
					<Select
						value={filterStatus}
						onChange={(value) => setFilterStatus(value)}
						options={[
							{ value: "all", label: "All Status" },
							{ value: "active", label: "Active" },
							{ value: "suspended", label: "Suspended" },
							{ value: "trial", label: "Trial" },
						]}
						className="py-2 px-3 border border-border-primary rounded-lg text-14px bg-content-bg text-text-primary"
					/>
				</div>

				{/* Table */}
				{!usersLoading && filteredLicenses.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="w-full border-collapse">
							<thead className="bg-surface-secondary border-b border-card-border">
								<tr>
									<th className="py-3 px-4 text-left text-12px font-semibold text-text-secondary uppercase tracking-wide">
										User
									</th>
									<th className="py-3 px-4 text-left text-12px font-semibold text-text-secondary uppercase tracking-wide">
										Email
									</th>
									<th className="py-3 px-4 text-center text-12px font-semibold text-text-secondary uppercase tracking-wide">
										Plan
									</th>
									<th className="py-3 px-4 text-center text-12px font-semibold text-text-secondary uppercase tracking-wide">
										Status
									</th>
									<th className="py-3 px-4 text-center text-12px font-semibold text-text-secondary uppercase tracking-wide">
										Valid Until
									</th>
									<th className="py-3 px-4 text-right text-12px font-semibold text-text-secondary uppercase tracking-wide">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{filteredLicenses.map((user) => (
									<tr key={user.id} className="border-b border-card-border">
										<td className="py-3.5 px-4">
											<div className="flex items-center gap-2.5">
												<div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-13px font-semibold text-primary flex-shrink-0">
													{user.name
														? user.name.charAt(0).toUpperCase()
														: user.email.charAt(0).toUpperCase()}
												</div>
												<span className="text-14px font-medium text-text-primary">
													{user.name || "—"}
												</span>
											</div>
										</td>
										<td className="py-3.5 px-4 text-13px text-text-secondary">
											{user.email}
										</td>
										<td className="py-3.5 px-4 text-center">
											<span
												className={`inline-block px-2.5 py-1 rounded-md text-12px font-semibold capitalize ${user.plan === "free" ? "bg-[rgba(107,114,128,0.1)] text-[#6b7280]" : "bg-[rgba(139,92,246,0.1)] text-primary"}`}
											>
												{user.plan || "free"}
											</span>
										</td>
										<td className="py-3.5 px-4 text-center">
											<span
												className={`inline-block px-2.5 py-1 rounded-md text-12px font-semibold capitalize ${user.status === "active" ? "bg-[rgba(34,197,94,0.1)] text-success" : "bg-[rgba(239,68,68,0.1)] text-danger"}`}
											>
												{user.status}
											</span>
										</td>
										<td className="py-3.5 px-4 text-center text-13px text-text-secondary">
											{user.licenseValidUntil
												? new Date(user.licenseValidUntil).toLocaleDateString()
												: "—"}
										</td>
										<td className="py-3.5 px-4 text-right">
											<button
												type="button"
												onClick={() => {
													setChangingLicense(user);
													setNewPlan(user.plan || "free");
												}}
												className="btn btn-secondary-outline btn-sm"
											>
												Change Plan
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="text-center py-20 px-5 text-text-secondary">
						<svg
							className="w-16 h-16 mx-auto mb-4 opacity-30"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
							/>
						</svg>
						<h3 className="text-16px font-semibold text-text-primary mb-2">
							No licenses found
						</h3>
						<p className="text-14px text-text-secondary">
							{searchQuery || filterStatus !== "all"
								? "Try adjusting your filters"
								: "Licenses will appear here when users sign up"}
						</p>
					</div>
				)}
			</div>

			{/* Change Plan Modal */}
			{changingLicense && (
				<div
					className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-1000 p-5"
					onClick={() => setChangingLicense(null)}
				>
					<div
						className="bg-card-bg rounded-2xl p-8 max-w-[500px] w-full shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="text-20px font-bold mb-2 text-text-primary">
							Change License Plan
						</h2>
						<p className="text-14px text-text-secondary mb-6">
							Update license plan for {changingLicense.name || changingLicense.email}
						</p>

						<div className="mb-6">
							<label className="block text-13px font-semibold text-text-secondary mb-2">
								New Plan
							</label>
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
								className={`w-full py-2.5 px-3 border border-border-primary rounded-lg bg-content-bg text-text-primary text-14px ${isUpdating ? "opacity-60" : ""}`}
							/>
						</div>

						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={() => setChangingLicense(null)}
								disabled={isUpdating}
								className={`btn btn-secondary ${isUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleChangePlan}
								disabled={isUpdating || newPlan === changingLicense.plan}
								className={`btn btn-primary ${isUpdating || newPlan === changingLicense.plan ? "opacity-60 cursor-not-allowed" : ""}`}
							>
								{isUpdating ? "Saving..." : "Save Changes"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Plan Create/Edit Modal */}
			{showPlanModal && (
				<div
					className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-1000 p-5"
					onClick={() => !isUpdating && setShowPlanModal(false)}
				>
					<div
						className="bg-card-bg rounded-2xl p-8 max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="text-20px font-bold mb-2 text-text-primary">
							{editingPlan ? "Edit Plan" : "Create Plan"}
						</h2>
						<p className="text-14px text-text-secondary mb-6">
							{editingPlan ? "Update plan details and pricing" : "Create a new pricing plan for your app"}
						</p>

						{planError && (
							<div className="bg-[rgba(239,68,68,0.1)] border border-danger rounded-lg py-3 px-4 mb-5 flex items-center gap-3">
								<svg
									className="w-5 h-5 text-danger flex-shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<p className="text-14px text-danger m-0">{planError}</p>
							</div>
						)}

						<form
							onSubmit={(e) => {
								e.preventDefault();
								handleSavePlan();
							}}
						>
							{/* Plan Name */}
							<div className="mb-5">
								<label className="block text-13px font-semibold text-text-secondary mb-2">
									Plan Name <span className="text-danger">*</span>
								</label>
								<input
									type="text"
									value={planForm.name}
									onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
									disabled={isUpdating}
									placeholder="e.g., Pro Plan"
									required
									className="w-full py-2.5 px-3 border border-border-primary rounded-lg bg-content-bg text-text-primary text-14px"
								/>
							</div>

							{/* Plan Slug */}
							<div className="mb-5">
								<label className="block text-13px font-semibold text-text-secondary mb-2">
									Plan Slug <span className="text-danger">*</span>
								</label>
								<input
									type="text"
									value={planForm.slug}
									onChange={(e) =>
										setPlanForm({
											...planForm,
											slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
										})
									}
									disabled={isUpdating || !!editingPlan}
									placeholder="e.g., pro"
									required
									className={`w-full py-2.5 px-3 border border-border-primary rounded-lg bg-content-bg text-text-primary text-14px ${editingPlan ? "opacity-60" : ""}`}
								/>
								{editingPlan && (
									<p className="text-12px text-text-tertiary mt-1.5">
										Slug cannot be changed after creation
									</p>
								)}
							</div>

							{/* Description */}
							<div className="mb-5">
								<label className="block text-13px font-semibold text-text-secondary mb-2">
									Description
								</label>
								<textarea
									value={planForm.description}
									onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
									disabled={isUpdating}
									placeholder="Brief description of this plan..."
									rows={3}
									className="w-full py-2.5 px-3 border border-border-primary rounded-lg bg-content-bg text-text-primary text-14px resize-y font-inherit"
								/>
							</div>

							{/* Pricing */}
							<div className="grid grid-cols-3 gap-3 mb-5">
								<div>
									<label className="block text-13px font-semibold text-text-secondary mb-2">
										Monthly Price ($)
									</label>
									<input
										type="number"
										step="0.01"
										min="0"
										value={planForm.monthlyPrice}
										onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: e.target.value })}
										disabled={isUpdating}
										placeholder="9.99"
										className="w-full py-2.5 px-3 border border-border-primary rounded-lg bg-content-bg text-text-primary text-14px"
									/>
								</div>
								<div>
									<label className="block text-13px font-semibold text-text-secondary mb-2">
										Yearly Price ($)
									</label>
									<input
										type="number"
										step="0.01"
										min="0"
										value={planForm.yearlyPrice}
										onChange={(e) => setPlanForm({ ...planForm, yearlyPrice: e.target.value })}
										disabled={isUpdating}
										placeholder="99.99"
										className="w-full py-2.5 px-3 border border-border-primary rounded-lg bg-content-bg text-text-primary text-14px"
									/>
								</div>
								<div>
									<label className="block text-13px font-semibold text-text-secondary mb-2">
										One-Time Price ($)
									</label>
									<input
										type="number"
										step="0.01"
										min="0"
										value={planForm.oneTimePrice}
										onChange={(e) => setPlanForm({ ...planForm, oneTimePrice: e.target.value })}
										disabled={isUpdating}
										placeholder="499.99"
										className="w-full py-2.5 px-3 border border-border-primary rounded-lg bg-content-bg text-text-primary text-14px"
									/>
								</div>
							</div>

							{/* Duration */}
							<div className="mb-5">
								<label className="block text-13px font-semibold text-text-secondary mb-2">
									License Duration (Days)
								</label>
								<input
									type="number"
									min="1"
									value={planForm.durationDays || ""}
									onChange={(e) =>
										setPlanForm({
											...planForm,
											durationDays: e.target.value ? parseInt(e.target.value, 10) : null,
										})
									}
									disabled={isUpdating}
									placeholder="e.g., 30, 365 (leave empty for lifetime)"
									className="w-full py-2.5 px-3 border border-border-primary rounded-lg bg-content-bg text-text-primary text-14px"
								/>
								<p className="text-12px text-text-tertiary mt-1.5">
									How long the license is valid after activation. Leave empty for lifetime access.
								</p>
							</div>

							{/* Trial */}
							<div className="mb-5">
								<label className="flex items-center gap-2.5 cursor-pointer">
									<input
										type="checkbox"
										checked={planForm.trialEnabled}
										onChange={(e) => setPlanForm({ ...planForm, trialEnabled: e.target.checked })}
										disabled={isUpdating}
										className="w-4.5 h-4.5 cursor-pointer"
									/>
									<span className="text-14px font-semibold text-text-primary">
										Enable Free Trial
									</span>
								</label>
								{planForm.trialEnabled && (
									<div className="mt-3 ml-7">
										<label className="block text-13px font-semibold text-text-secondary mb-2">
											Trial Duration (days)
										</label>
										<input
											type="number"
											min="1"
											value={planForm.trialDays}
											onChange={(e) => setPlanForm({ ...planForm, trialDays: e.target.value })}
											disabled={isUpdating}
											placeholder="14"
											className="w-[120px] py-2.5 px-3 border border-border-primary rounded-lg bg-content-bg text-text-primary text-14px"
										/>
									</div>
								)}
							</div>

							{/* Features */}
							<div className="mb-6">
								<label className="block text-13px font-semibold text-text-secondary mb-2">
									Features
								</label>
								<div className="flex gap-2 mb-3">
									<input
										type="text"
										value={featureInput}
										onChange={(e) => setFeatureInput(e.target.value)}
										onKeyPress={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleAddFeature();
											}
										}}
										disabled={isUpdating}
										placeholder="Add a feature..."
										className="flex-1 py-2.5 px-3 border border-border-primary rounded-lg bg-content-bg text-text-primary text-14px"
									/>
									<button
										type="button"
										onClick={handleAddFeature}
										disabled={isUpdating || !featureInput.trim()}
										className="btn btn-secondary"
									>
										Add
									</button>
								</div>
								{planForm.features.length > 0 && (
									<div className="flex flex-col gap-2">
										{planForm.features.map((feature, index) => (
											<div
												key={`feature-${index}`}
												className="flex items-center justify-between py-2 px-3 bg-content-bg border border-border-primary rounded-md text-14px text-text-primary"
											>
												<span>{feature}</span>
												<button
													type="button"
													onClick={() => handleRemoveFeature(index)}
													disabled={isUpdating}
													className="bg-transparent border-none text-danger cursor-pointer p-1"
												>
													<svg
														className="w-4 h-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Actions */}
							<div className="flex gap-3 justify-end">
								<button
									type="button"
									onClick={() => setShowPlanModal(false)}
									disabled={isUpdating}
									className={`btn btn-secondary ${isUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isUpdating}
									className={`btn btn-primary ${isUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
								>
									{isUpdating ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Plan Confirmation Dialog */}
			{deletingPlan && (
				<div
					className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-1000 p-5"
					onClick={() => !isUpdating && setDeletingPlan(null)}
				>
					<div
						className="bg-card-bg rounded-2xl p-8 max-w-[500px] w-full shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="mb-6">
							<div className="w-12 h-12 rounded-xl bg-[rgba(239,68,68,0.1)] flex items-center justify-center mb-4">
								<svg
									className="w-6 h-6 text-danger"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
							</div>
							<h2 className="text-20px font-bold mb-2 text-text-primary">
								Delete Plan?
							</h2>
							<p className="text-14px text-text-secondary mb-3">
								Are you sure you want to delete the <strong>{deletingPlan.name}</strong> plan? This
								action cannot be undone.
							</p>
							<p className="text-13px text-text-tertiary">
								Note: Plans with active licenses cannot be deleted.
							</p>
						</div>

						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={() => setDeletingPlan(null)}
								disabled={isUpdating}
								className={`btn btn-secondary ${isUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleDeletePlan}
								disabled={isUpdating}
								className={`btn btn-danger ${isUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
							>
								{isUpdating ? "Deleting..." : "Delete Plan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
