import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useApp, useProject, useAppUsers } from "../hooks/api";
import { useToast } from "../components/Toast";
import { Select } from "../components/Select";

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

	// Fetch plans when section is expanded
	useEffect(() => {
		if (showPlansSection && projectId && appId) {
			fetchPlans();
		}
	}, [showPlansSection, projectId, appId]);

	// Fetch plans
	const fetchPlans = async () => {
		setPlansLoading(true);
		try {
			const response = await fetch(
				`${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/plans`,
				{
					credentials: "include",
				}
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
	};

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

			const response = await fetch(url, {
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
			const response = await fetch(
				`${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/plans/${deletingPlan.id}`,
				{
					method: "DELETE",
					credentials: "include",
				}
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
			const response = await fetch(
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
				}
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
			<nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
				<Link to="/projects" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
					Projects
				</Link>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link to={`/projects/${projectId}`} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
					{project.name}
				</Link>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link to={`/projects/${projectId}/apps/${appId}`} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
					{app.name}
				</Link>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>Licenses</span>
			</nav>

			{/* Page Header */}
			<div className="page-header">
				<div>
					<h1 className="page-title">Licenses</h1>
					<p className="page-description">Manage user licenses and pricing plans for {app.name}</p>
				</div>
			</div>

			{/* Stats Cards */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
				{/* Active Licenses */}
				<div className="stat-card">
					<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
						<div style={{
							width: "40px",
							height: "40px",
							background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))",
							borderRadius: "12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}>
							<svg style={{ width: "20px", height: "20px", color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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
					<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
						<div style={{
							width: "40px",
							height: "40px",
							background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))",
							borderRadius: "12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}>
							<svg style={{ width: "20px", height: "20px", color: "var(--success)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
						<div style={{
							width: "40px",
							height: "40px",
							background: "linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05))",
							borderRadius: "12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}>
							<svg style={{ width: "20px", height: "20px", color: "#eab308" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
					<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
						<div style={{
							width: "40px",
							height: "40px",
							background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05))",
							borderRadius: "12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}>
							<svg style={{ width: "20px", height: "20px", color: "#6366f1" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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
					style={{
						width: "100%",
						padding: "16px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						background: "transparent",
						border: "none",
						cursor: "pointer",
						transition: "background 0.2s",
					}}
					onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
					onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<svg style={{ width: "20px", height: "20px", color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
						</svg>
						<div style={{ textAlign: "left" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
								Pricing Plans
							</h3>
							<p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px", margin: 0 }}>
								Configure plans and pricing for your app
							</p>
						</div>
					</div>
					<svg
						style={{
							width: "20px",
							height: "20px",
							color: "var(--text-tertiary)",
							transition: "transform 0.2s",
							transform: showPlansSection ? "rotate(180deg)" : "rotate(0deg)",
						}}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</button>

			{showPlansSection && (
				<div style={{ padding: "20px", borderTop: "1px solid var(--card-border)" }}>
					{/* Create Plan Button */}
					<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
						<button
							type="button"
							onClick={handleCreatePlan}
							className="btn btn-primary btn-sm"
							style={{ display: "flex", alignItems: "center", gap: "6px" }}
						>
							<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							Create Plan
						</button>
					</div>

					{/* Plans List */}
					{plansLoading ? (
						<div style={{ textAlign: "center", padding: "40px 20px" }}>
							<div className="spinner" style={{ margin: "0 auto" }} />
						</div>
					) : plans.length === 0 ? (
						<div style={{
							textAlign: "center",
							padding: "60px 20px",
							color: "var(--text-secondary)",
						}}>
							<svg style={{ width: "64px", height: "64px", margin: "0 auto 16px", opacity: 0.3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
							</svg>
							<p style={{ fontSize: "14px", fontWeight: "500" }}>No plans yet</p>
							<p style={{ fontSize: "13px", marginTop: "8px", color: "var(--text-tertiary)" }}>
								Create your first pricing plan to get started
							</p>
						</div>
					) : (
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px", alignItems: "stretch" }}>
							{plans.map((plan) => (
								<div
									key={plan.id}
									style={{
										display: "flex",
										flexDirection: "column",
										background: "var(--content-bg)",
										border: "1px solid var(--card-border)",
										borderRadius: "12px",
										padding: "20px",
										height: "100%",
										transition: "all 0.2s ease",
									}}
								>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
										<div>
											<h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
												{plan.name}
											</h4>
											<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
												{plan.slug}
											</p>
										</div>
										<span style={{
											display: "inline-block",
											padding: "4px 8px",
											borderRadius: "6px",
											fontSize: "11px",
											fontWeight: "600",
											textTransform: "capitalize",
											background: plan.status === "active" ? "rgba(34, 197, 94, 0.1)" : "rgba(107, 114, 128, 0.1)",
											color: plan.status === "active" ? "var(--success)" : "#6b7280",
										}}>
											{plan.status}
										</span>
									</div>

									{plan.description && (
										<p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: "1.5" }}>
											{plan.description}
										</p>
									)}

									<div style={{ marginBottom: "12px" }}>
										{plan.monthlyPrice && (
											<div style={{ fontSize: "14px", color: "var(--text-primary)", marginBottom: "4px" }}>
												<span style={{ fontWeight: "600" }}>${(plan.monthlyPrice / 100).toFixed(2)}</span>
												<span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>/month</span>
											</div>
										)}
										{plan.yearlyPrice && (
											<div style={{ fontSize: "14px", color: "var(--text-primary)", marginBottom: "4px" }}>
												<span style={{ fontWeight: "600" }}>${(plan.yearlyPrice / 100).toFixed(2)}</span>
												<span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>/year</span>
											</div>
										)}
										{plan.oneTimePrice && (
											<div style={{ fontSize: "14px", color: "var(--text-primary)", marginBottom: "4px" }}>
												<span style={{ fontWeight: "600" }}>${(plan.oneTimePrice / 100).toFixed(2)}</span>
												<span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}> one-time</span>
											</div>
										)}
										{!plan.monthlyPrice && !plan.yearlyPrice && !plan.oneTimePrice && (
											<div style={{ fontSize: "14px", color: "var(--text-primary)", marginBottom: "4px" }}>
												<span style={{ fontWeight: "600" }}>00</span>
											</div>
										)}
										{plan.trialEnabled && plan.trialDays && (
											<div style={{ fontSize: "12px", color: "var(--primary)", marginTop: "4px" }}>
												{plan.trialDays} day free trial
											</div>
										)}
									</div>

									{plan.features.length > 0 && (
										<div style={{ marginBottom: "16px" }}>
											<p style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
												Features:
											</p>
											<ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "var(--text-secondary)" }}>
												{plan.features.slice(0, 3).map((feature, i) => (
													<li key={i} style={{ marginBottom: "4px" }}>{feature}</li>
												))}
												{plan.features.length > 3 && (
													<li style={{ color: "var(--text-tertiary)" }}>
														+{plan.features.length - 3} more
													</li>
												)}
											</ul>
										</div>
									)}

									<div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--card-border)", marginTop: "auto" }}>
										<button
											type="button"
											onClick={() => handleEditPlan(plan)}
											className="btn btn-secondary-outline btn-sm"
											style={{ flex: 1 }}
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() => setDeletingPlan(plan)}
											className="btn btn-danger-outline btn-sm"
											style={{ flex: 1 }}
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
				<div style={{ padding: "20px", borderBottom: "1px solid var(--card-border)" }}>
					<h2 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
						Active Licenses
					</h2>
					<p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
						View and manage user licenses
					</p>
				</div>

				{/* Filters */}
				<div style={{ padding: "16px", borderBottom: "1px solid var(--card-border)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
					<input
						type="text"
						placeholder="Search by name or email..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						style={{
							flex: "1",
							minWidth: "240px",
							padding: "8px 12px",
							border: "1px solid var(--border-primary)",
							borderRadius: "8px",
							fontSize: "14px",
							background: "var(--content-bg)",
							color: "var(--text-primary)",
						}}
					/>
					<Select
						value={filterStatus}
						onChange={(value) => setFilterStatus(value)}
						options={[
							{ value: "all", label: "All Status" },
							{ value: "active", label: "Active" },
							{ value: "suspended", label: "Suspended" },
							{ value: "trial", label: "Trial" }
						]}
						style={{
							padding: "8px 12px",
							border: "1px solid var(--border-primary)",
							borderRadius: "8px",
							fontSize: "14px",
							background: "var(--content-bg)",
							color: "var(--text-primary)",
						}}
					/>
				</div>

				{/* Table */}
				{!usersLoading && filteredLicenses.length > 0 ? (
					<div style={{ overflowX: "auto" }}>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead style={{ background: "var(--surface-secondary)", borderBottom: "1px solid var(--card-border)" }}>
								<tr>
									<th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>User</th>
									<th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</th>
									<th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Plan</th>
									<th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
									<th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Valid Until</th>
									<th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredLicenses.map((user) => (
									<tr key={user.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
										<td style={{ padding: "14px 16px" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
												<div style={{
													width: "36px",
													height: "36px",
													borderRadius: "50%",
													background: "var(--primary-light)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontSize: "13px",
													fontWeight: "600",
													color: "var(--primary)",
													flexShrink: 0,
												}}>
													{user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
												</div>
												<span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
													{user.name || "—"}
												</span>
											</div>
										</td>
										<td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
											{user.email}
										</td>
										<td style={{ padding: "14px 16px", textAlign: "center" }}>
											<span style={{
												display: "inline-block",
												padding: "4px 10px",
												borderRadius: "6px",
											fontSize: "12px",
											fontWeight: "600",
											textTransform: "capitalize",
											background: user.plan === "free" ? "rgba(107, 114, 128, 0.1)" : "rgba(139, 92, 246, 0.1)",
											color: user.plan === "free" ? "#6b7280" : "var(--primary)",
										}}>
											{user.plan || "free"}
											</span>
										</td>
										<td style={{ padding: "14px 16px", textAlign: "center" }}>
											<span style={{
												display: "inline-block",
												padding: "4px 10px",
												borderRadius: "6px",
												fontSize: "12px",
												fontWeight: "600",
												textTransform: "capitalize",
												background: user.status === "active" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
												color: user.status === "active" ? "var(--success)" : "var(--danger)",
											}}>
												{user.status}
											</span>
										</td>
										<td style={{ padding: "14px 16px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)" }}>
											{user.licenseValidUntil
												? new Date(user.licenseValidUntil).toLocaleDateString()
												: "—"}
										</td>
										<td style={{ padding: "14px 16px", textAlign: "right" }}>
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
					<div style={{
						textAlign: "center",
						padding: "80px 20px",
						color: "var(--text-secondary)",
					}}>
						<svg style={{ width: "64px", height: "64px", margin: "0 auto 16px", opacity: 0.3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
						</svg>
						<h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
							No licenses found
						</h3>
						<p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
							{searchQuery || filterStatus !== "all" ? "Try adjusting your filters" : "Licenses will appear here when users sign up"}
						</p>
					</div>
				)}
			</div>

			{/* Change Plan Modal */}
			{changingLicense && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(0, 0, 0, 0.6)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
						padding: "20px",
					}}
					onClick={() => setChangingLicense(null)}
				>
					<div
						style={{
							background: "var(--card-bg)",
							borderRadius: "16px",
							padding: "32px",
							maxWidth: "500px",
							width: "100%",
							boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>
							Change License Plan
						</h2>
						<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
							Update license plan for {changingLicense.name || changingLicense.email}
						</p>

						<div style={{ marginBottom: "24px" }}>
							<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
								New Plan
							</label>
							<Select
								value={newPlan}
								onChange={(value) => setNewPlan(value)}
								options={[
									{ value: "free", label: "Free" },
									{ value: "trial", label: "Trial" },
									{ value: "pro", label: "Pro" },
									{ value: "enterprise", label: "Enterprise" }
								]}
								disabled={isUpdating}
								style={{
									width: "100%",
									padding: "10px 12px",
									border: "1px solid var(--border-primary)",
									borderRadius: "8px",
									background: "var(--content-bg)",
									color: "var(--text-primary)",
									fontSize: "14px",
									opacity: isUpdating ? 0.6 : 1,
								}}
							/>
						</div>

						<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
							<button
								type="button"
								onClick={() => setChangingLicense(null)}
								disabled={isUpdating}
								className="btn btn-secondary"
								style={{
									opacity: isUpdating ? 0.6 : 1,
									cursor: isUpdating ? "not-allowed" : "pointer",
								}}
							>
								Cancel
							</button>
						<button
							type="button"
							onClick={handleChangePlan}
							disabled={isUpdating || newPlan === changingLicense.plan}
							className="btn btn-primary"
							style={{
								opacity: isUpdating || newPlan === changingLicense.plan ? 0.6 : 1,
								cursor: isUpdating || newPlan === changingLicense.plan ? "not-allowed" : "pointer",
							}}
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
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(0, 0, 0, 0.6)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
						padding: "20px",
					}}
					onClick={() => !isUpdating && setShowPlanModal(false)}
				>
					<div
						style={{
							background: "var(--card-bg)",
							borderRadius: "16px",
							padding: "32px",
							maxWidth: "600px",
							width: "100%",
							maxHeight: "90vh",
							overflowY: "auto",
							boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>
							{editingPlan ? "Edit Plan" : "Create Plan"}
						</h2>
						<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
							{editingPlan ? "Update plan details and pricing" : "Create a new pricing plan for your app"}
						</p>

						{planError && (
							<div style={{
								background: "rgba(239, 68, 68, 0.1)",
								border: "1px solid var(--danger)",
								borderRadius: "8px",
								padding: "12px 16px",
								marginBottom: "20px",
								display: "flex",
								alignItems: "center",
								gap: "12px",
							}}>
								<svg style={{ width: "20px", height: "20px", color: "var(--danger)", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<p style={{ fontSize: "14px", color: "var(--danger)", margin: 0 }}>
									{planError}
								</p>
							</div>
						)}

						<form onSubmit={(e) => { e.preventDefault(); handleSavePlan(); }}>
							{/* Plan Name */}
							<div style={{ marginBottom: "20px" }}>
								<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
									Plan Name <span style={{ color: "var(--danger)" }}>*</span>
								</label>
								<input
									type="text"
									value={planForm.name}
									onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
									disabled={isUpdating}
									placeholder="e.g., Pro Plan"
									required
									style={{
										width: "100%",
										padding: "10px 12px",
										border: "1px solid var(--border-primary)",
										borderRadius: "8px",
										background: "var(--content-bg)",
										color: "var(--text-primary)",
										fontSize: "14px",
									}}
								/>
							</div>

							{/* Plan Slug */}
							<div style={{ marginBottom: "20px" }}>
								<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
									Plan Slug <span style={{ color: "var(--danger)" }}>*</span>
								</label>
								<input
									type="text"
									value={planForm.slug}
									onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
									disabled={isUpdating || !!editingPlan}
									placeholder="e.g., pro"
									required
									style={{
										width: "100%",
										padding: "10px 12px",
										border: "1px solid var(--border-primary)",
										borderRadius: "8px",
										background: "var(--content-bg)",
										color: "var(--text-primary)",
										fontSize: "14px",
										opacity: editingPlan ? 0.6 : 1,
									}}
								/>
								{editingPlan && (
									<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
										Slug cannot be changed after creation
									</p>
								)}
							</div>

							{/* Description */}
							<div style={{ marginBottom: "20px" }}>
								<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
									Description
								</label>
								<textarea
									value={planForm.description}
									onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
									disabled={isUpdating}
									placeholder="Brief description of this plan..."
									rows={3}
									style={{
										width: "100%",
										padding: "10px 12px",
										border: "1px solid var(--border-primary)",
										borderRadius: "8px",
										background: "var(--content-bg)",
										color: "var(--text-primary)",
										fontSize: "14px",
										resize: "vertical",
										fontFamily: "inherit",
									}}
								/>
							</div>

							{/* Pricing */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
								<div>
									<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
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
										style={{
											width: "100%",
											padding: "10px 12px",
											border: "1px solid var(--border-primary)",
											borderRadius: "8px",
											background: "var(--content-bg)",
											color: "var(--text-primary)",
											fontSize: "14px",
										}}
									/>
								</div>
								<div>
									<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
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
										style={{
											width: "100%",
											padding: "10px 12px",
											border: "1px solid var(--border-primary)",
											borderRadius: "8px",
											background: "var(--content-bg)",
											color: "var(--text-primary)",
											fontSize: "14px",
										}}
									/>
								</div>
								<div>
									<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
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
										style={{
											width: "100%",
											padding: "10px 12px",
											border: "1px solid var(--border-primary)",
											borderRadius: "8px",
											background: "var(--content-bg)",
											color: "var(--text-primary)",
											fontSize: "14px",
										}}
									/>
								</div>
							</div>

							{/* Duration */}
							<div style={{ marginBottom: "20px" }}>
								<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
									License Duration (Days)
								</label>
								<input
									type="number"
									min="1"
									value={planForm.durationDays || ""}
									onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value ? parseInt(e.target.value) : null })}
									disabled={isUpdating}
									placeholder="e.g., 30, 365 (leave empty for lifetime)"
									style={{
										width: "100%",
										padding: "10px 12px",
										border: "1px solid var(--border-primary)",
										borderRadius: "8px",
										background: "var(--content-bg)",
										color: "var(--text-primary)",
										fontSize: "14px",
									}}
								/>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
									How long the license is valid after activation. Leave empty for lifetime access.
								</p>
							</div>

							{/* Trial */}
							<div style={{ marginBottom: "20px" }}>
								<label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
									<input
										type="checkbox"
										checked={planForm.trialEnabled}
										onChange={(e) => setPlanForm({ ...planForm, trialEnabled: e.target.checked })}
										disabled={isUpdating}
										style={{ width: "18px", height: "18px", cursor: "pointer" }}
									/>
									<span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
										Enable Free Trial
									</span>
								</label>
								{planForm.trialEnabled && (
									<div style={{ marginTop: "12px", marginLeft: "28px" }}>
										<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
											Trial Duration (days)
										</label>
										<input
											type="number"
											min="1"
											value={planForm.trialDays}
											onChange={(e) => setPlanForm({ ...planForm, trialDays: e.target.value })}
											disabled={isUpdating}
											placeholder="14"
											style={{
												width: "120px",
												padding: "10px 12px",
												border: "1px solid var(--border-primary)",
												borderRadius: "8px",
												background: "var(--content-bg)",
												color: "var(--text-primary)",
												fontSize: "14px",
											}}
										/>
									</div>
								)}
							</div>

							{/* Features */}
							<div style={{ marginBottom: "24px" }}>
								<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
									Features
								</label>
								<div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
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
										style={{
											flex: 1,
											padding: "10px 12px",
											border: "1px solid var(--border-primary)",
											borderRadius: "8px",
											background: "var(--content-bg)",
											color: "var(--text-primary)",
											fontSize: "14px",
										}}
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
									<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
										{planForm.features.map((feature, index) => (
											<div
												key={index}
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													padding: "8px 12px",
													background: "var(--content-bg)",
													border: "1px solid var(--border-primary)",
													borderRadius: "6px",
													fontSize: "14px",
													color: "var(--text-primary)",
												}}
											>
												<span>{feature}</span>
												<button
													type="button"
													onClick={() => handleRemoveFeature(index)}
													disabled={isUpdating}
													style={{
														background: "transparent",
														border: "none",
														color: "var(--danger)",
														cursor: "pointer",
														padding: "4px",
													}}
												>
													<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Actions */}
							<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
								<button
									type="button"
									onClick={() => setShowPlanModal(false)}
									disabled={isUpdating}
									className="btn btn-secondary"
									style={{ opacity: isUpdating ? 0.6 : 1, cursor: isUpdating ? "not-allowed" : "pointer" }}
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isUpdating}
									className="btn btn-primary"
									style={{ opacity: isUpdating ? 0.6 : 1, cursor: isUpdating ? "not-allowed" : "pointer" }}
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
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(0, 0, 0, 0.6)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
						padding: "20px",
					}}
					onClick={() => !isUpdating && setDeletingPlan(null)}
				>
					<div
						style={{
							background: "var(--card-bg)",
							borderRadius: "16px",
							padding: "32px",
							maxWidth: "500px",
							width: "100%",
							boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<div style={{ marginBottom: "24px" }}>
							<div style={{
								width: "48px",
								height: "48px",
								borderRadius: "12px",
								background: "rgba(239, 68, 68, 0.1)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: "16px",
							}}>
								<svg style={{ width: "24px", height: "24px", color: "var(--danger)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
							</div>
							<h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>
								Delete Plan?
							</h2>
							<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>
								Are you sure you want to delete the <strong>{deletingPlan.name}</strong> plan? This action cannot be undone.
							</p>
							<p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
								Note: Plans with active licenses cannot be deleted.
							</p>
						</div>

						<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
							<button
								type="button"
								onClick={() => setDeletingPlan(null)}
								disabled={isUpdating}
								className="btn btn-secondary"
								style={{ opacity: isUpdating ? 0.6 : 1, cursor: isUpdating ? "not-allowed" : "pointer" }}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleDeletePlan}
								disabled={isUpdating}
								className="btn btn-danger"
								style={{ opacity: isUpdating ? 0.6 : 1, cursor: isUpdating ? "not-allowed" : "pointer" }}
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
