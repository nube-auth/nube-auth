import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useApp, useProject, useAppUsers, useRenewLicense } from "../hooks/api";
import { InviteUserModal } from "../components/InviteUserModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

export function AppUsersPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const queryClient = useQueryClient();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const { data, isLoading: usersLoading } = useAppUsers(projectId || "", appId || "");
	const renewLicenseMutation = useRenewLicense(projectId || "", appId || "");
	
	const [searchQuery, setSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [editingUser, setEditingUser] = useState<any>(null);
	const [editLicensePlan, setEditLicensePlan] = useState<number | null>(null);
	const [plans, setPlans] = useState<any[]>([]);
	const [plansLoading, setPlansLoading] = useState(false);
	const [editLicenseStatus, setEditLicenseStatus] = useState("");
	const [isUpdating, setIsUpdating] = useState(false);
	const [updateError, setUpdateError] = useState<string | null>(null);
	const [userToRenew, setUserToRenew] = useState<{ id: string; name: string; email: string } | null>(null);
	const { showToast } = useToast();

	const users = data?.users || [];

	// Fetch plans when editing user
	useEffect(() => {
		if (editingUser && projectId && appId) {
			fetchPlans();
		}
	}, [editingUser, projectId, appId]);

	const fetchPlans = async () => {
		setPlansLoading(true);
		try {
			const response = await fetch(
				`${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/plans`,
				{
					method: "GET",
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
	};

	// Filter users based on search and status
	const filteredUsers = users.filter((user) => {
		const matchesSearch = 
			user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email.toLowerCase().includes(searchQuery.toLowerCase());
		
		const matchesStatus = 
			filterStatus === "all" || 
			user.status === filterStatus;

		return matchesSearch && matchesStatus;
	});

	// Handler for Suspend/Activate toggle
	const handleSuspendToggle = async (userId: string, currentStatus: string) => {
		const newStatus = currentStatus === "active" ? "suspended" : "active";
		
		try {
			const response = await fetch(
				`${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/users/${userId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({
						license_status: newStatus,
					}),
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to update user status");
			}

			// Refresh users list
			queryClient.invalidateQueries({ queryKey: ["appUsers", projectId, appId] });
		} catch (err) {
			console.error("Failed to update user status:", err);
			showToast(err instanceof Error ? err.message : "Failed to update user status", "error");
		}
	};

	// Handler for Edit modal save
	const handleEditSave = async () => {
		if (!editingUser) return;

		setIsUpdating(true);
		setUpdateError(null);

		try {
			const response = await fetch(
				`${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/users/${editingUser.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({
						plan_id: editLicensePlan,
						license_status: editLicenseStatus,
					}),
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to update user");
			}

			// Refresh users list
			queryClient.invalidateQueries({ queryKey: ["appUsers", projectId, appId] });
			
			// Close modal
			setEditingUser(null);
			setEditLicensePlan(null);
			setEditLicenseStatus("");
		} catch (err) {
			console.error("Failed to update user:", err);
			setUpdateError(err instanceof Error ? err.message : "Failed to update user");
		} finally {
			setIsUpdating(false);
		}
	};

	// Handler for opening Edit modal (initialize form values)
	const handleOpenEditModal = (user: any) => {
		setEditingUser(user);
		setEditLicensePlan(user.plan_id || null);
		setEditLicenseStatus(user.status || "active");
		setUpdateError(null);
	};

	const handleRenewLicense = async () => {
		if (!userToRenew) return;

		try {
			const result = await renewLicenseMutation.mutateAsync(userToRenew.id);
			showToast(result.message, "success");
			setUserToRenew(null);
		} catch (error: unknown) {
			if (error && typeof error === "object" && "message" in error) {
				showToast(`Failed to renew license: ${(error as { message: string }).message}`, "error");
			} else {
				showToast("Failed to renew license", "error");
			}
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
				<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>Users</span>
			</nav>

			{/* Page Header */}
			<div className="page-header">
				<div>
					<h1 className="page-title">Users</h1>
					<p className="page-description">Manage users and their licenses for {app.name}</p>
				</div>
			<button
				type="button"
				className="btn btn-primary"
				onClick={() => setShowInviteModal(true)}
			>
				<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
				</svg>
				Invite User
			</button>
			</div>

			{/* Filters */}
			<div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
				<div style={{ flex: 1, maxWidth: "400px" }}>
					<div style={{ position: "relative" }}>
						<svg 
							style={{ 
								position: "absolute", 
								left: "12px", 
								top: "50%", 
								transform: "translateY(-50%)", 
								width: "16px", 
								height: "16px", 
								color: "var(--text-tertiary)",
								pointerEvents: "none",
							}} 
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input
							type="text"
							placeholder="Search by name or email..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							style={{
								width: "100%",
								padding: "10px 12px 10px 40px",
								border: "1px solid var(--border-primary)",
								borderRadius: "10px",
								background: "var(--card-bg)",
								color: "var(--text-primary)",
								fontSize: "14px",
								transition: "all 0.2s ease",
								outline: "none",
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = "var(--primary)";
								e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = "var(--border-primary)";
								e.currentTarget.style.boxShadow = "none";
							}}
						/>
					</div>
				</div>

				{/* Custom Status Dropdown */}
				<div style={{ position: "relative", minWidth: "160px" }}>
					<button
						type="button"
						onClick={() => setShowStatusDropdown(!showStatusDropdown)}
						style={{
							width: "100%",
							padding: "10px 12px",
							border: "1px solid var(--border-primary)",
							borderRadius: "10px",
							background: "var(--card-bg)",
							color: "var(--text-primary)",
							fontSize: "14px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "8px",
							transition: "all 0.2s ease",
							outline: "none",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = "var(--primary-light)";
						}}
						onMouseLeave={(e) => {
							if (!showStatusDropdown) {
								e.currentTarget.style.borderColor = "var(--border-primary)";
							}
						}}
					>
						<span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<svg style={{ width: "16px", height: "16px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
							</svg>
							{filterStatus === "all" ? "All Status" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
						</span>
						<svg 
							style={{ 
								width: "14px", 
								height: "14px", 
								color: "var(--text-tertiary)",
								transition: "transform 0.2s ease",
								transform: showStatusDropdown ? "rotate(180deg)" : "rotate(0deg)",
							}} 
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{/* Dropdown Menu */}
					{showStatusDropdown && (
						<>
							{/* Backdrop */}
							<div 
								style={{
									position: "fixed",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									zIndex: 999,
								}}
								onClick={() => setShowStatusDropdown(false)}
							/>
							
							{/* Dropdown */}
							<div style={{
								position: "absolute",
								top: "calc(100% + 6px)",
								left: 0,
								right: 0,
								background: "var(--card-bg)",
								border: "1px solid var(--border-primary)",
								borderRadius: "10px",
								boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
								zIndex: 1000,
								overflow: "hidden",
							}}>
								{[
									{ value: "all", label: "All Status", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
									{ value: "active", label: "Active", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
									{ value: "suspended", label: "Suspended", icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
									{ value: "trial", label: "Trial", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
								].map((option) => (
									<button
										key={option.value}
										type="button"
										onClick={() => {
											setFilterStatus(option.value);
											setShowStatusDropdown(false);
										}}
										style={{
											width: "100%",
											padding: "10px 12px",
											background: filterStatus === option.value ? "rgba(139, 92, 246, 0.1)" : "transparent",
											border: "none",
											borderBottom: "1px solid var(--border-secondary)",
											color: filterStatus === option.value ? "var(--primary)" : "var(--text-primary)",
											fontSize: "14px",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											gap: "10px",
											transition: "all 0.15s ease",
											textAlign: "left",
										}}
										onMouseEnter={(e) => {
											if (filterStatus !== option.value) {
												e.currentTarget.style.background = "var(--surface-hover)";
											}
										}}
										onMouseLeave={(e) => {
											if (filterStatus !== option.value) {
												e.currentTarget.style.background = "transparent";
											}
										}}
									>
										<svg style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
										</svg>
										<span style={{ fontWeight: filterStatus === option.value ? "600" : "400" }}>
											{option.label}
										</span>
										{filterStatus === option.value && (
											<svg style={{ width: "16px", height: "16px", marginLeft: "auto", color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
											</svg>
										)}
									</button>
								))}
							</div>
						</>
					)}
				</div>
			</div>

			{/* Empty State */}
			{!usersLoading && filteredUsers.length === 0 && users.length === 0 && (
				<div style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					padding: "80px 20px",
					textAlign: "center",
				}}>
					<div style={{
						width: "100px",
						height: "100px",
						background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))",
						borderRadius: "50%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						marginBottom: "24px",
					}}>
						<svg style={{ width: "48px", height: "48px", color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
					</div>
					<h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
						No users yet
					</h2>
					<p style={{ fontSize: "14px", color: "var(--text-secondary)", maxWidth: "400px", marginBottom: "24px" }}>
						Users will appear here after they sign up for your app. You can also invite users to get started.
					</p>
					<button
						type="button"
						onClick={() => alert("Invite user functionality coming soon!")}
						className="btn btn-primary"
					>
						<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
						</svg>
						Invite Your First User
					</button>
				</div>
			)}

			{/* No Search Results */}
			{!usersLoading && filteredUsers.length === 0 && users.length > 0 && (
				<div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
					<p>No users found matching your search criteria.</p>
				</div>
			)}

			{/* Users Table */}
			{!usersLoading && filteredUsers.length > 0 && (
				<div className="card" style={{ padding: "0", overflow: "hidden" }}>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr style={{ background: "var(--surface-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>
								<th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>
									User
								</th>
								<th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>
									Plan
								</th>
								<th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>
									Status
								</th>
								<th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>
									Joined
								</th>
								<th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>
									License Valid Until
								</th>
								<th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredUsers.map((user) => (
								<tr
									key={user.id}
									style={{
										borderBottom: "1px solid var(--border-secondary)",
									}}
								>
									<td style={{ padding: "16px" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
											<div style={{
												width: "40px",
												height: "40px",
												background: "linear-gradient(135deg, var(--primary), rgba(139, 92, 246, 0.7))",
												borderRadius: "50%",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "white",
												fontSize: "14px",
												fontWeight: "600",
												flexShrink: 0,
											}}>
												{(user.name || user.email).charAt(0).toUpperCase()}
											</div>
											<div>
												<div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)", marginBottom: "2px" }}>
													{user.name || "Anonymous"}
													{user.primaryEmailVerified && (
														<svg style={{ width: "14px", height: "14px", color: "var(--primary)", marginLeft: "4px", display: "inline" }} fill="currentColor" viewBox="0 0 20 20">
															<path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
														</svg>
													)}
												</div>
												<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{user.email}</div>
											</div>
										</div>
									</td>
									<td style={{ padding: "16px", textAlign: "center" }}>
										<span style={{
											display: "inline-block",
											padding: "4px 12px",
											background: user.plan === "pro" ? "rgba(139, 92, 246, 0.1)" : "rgba(156, 163, 175, 0.1)",
											color: user.plan === "pro" ? "var(--primary)" : "var(--text-tertiary)",
											borderRadius: "12px",
											fontSize: "12px",
											fontWeight: "600",
											textTransform: "capitalize",
										}}>
											{user.plan}
										</span>
									</td>
									<td style={{ padding: "16px", textAlign: "center" }}>
										<span style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "4px",
											padding: "4px 10px",
											background: user.status === "active" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
											color: user.status === "active" ? "var(--success)" : "var(--danger)",
											borderRadius: "12px",
											fontSize: "12px",
											fontWeight: "500",
											textTransform: "capitalize",
										}}>
											<span style={{ width: "6px", height: "6px", background: "currentColor", borderRadius: "50%" }} />
											{user.status}
										</span>
									</td>
									<td style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)" }}>
										{new Date(user.createdAt * 1000).toLocaleDateString()}
									</td>
									<td style={{ padding: "16px", textAlign: "center", fontSize: "13px" }}>
										{user.licenseValidUntil ? (
											(() => {
												const now = Math.floor(Date.now() / 1000);
												const daysUntilExpiry = Math.floor((user.licenseValidUntil - now) / (24 * 60 * 60));
												const isExpired = daysUntilExpiry < 0;
												const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
												
												return (
													<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
														<span style={{ 
															color: isExpired ? "var(--danger)" : isExpiringSoon ? "var(--warning)" : "var(--text-secondary)"
														}}>
															{new Date(user.licenseValidUntil * 1000).toLocaleDateString()}
														</span>
														{isExpired && (
															<span style={{
																padding: "2px 6px",
																background: "rgba(239, 68, 68, 0.1)",
																border: "1px solid rgba(239, 68, 68, 0.2)",
																borderRadius: "4px",
																color: "var(--danger)",
																fontSize: "11px",
																fontWeight: "600",
															}}>
																EXPIRED
															</span>
														)}
														{isExpiringSoon && !isExpired && (
															<span style={{
																padding: "2px 6px",
																background: "rgba(245, 158, 11, 0.1)",
																border: "1px solid rgba(245, 158, 11, 0.2)",
																borderRadius: "4px",
																color: "var(--warning)",
																fontSize: "11px",
																fontWeight: "600",
															}}>
																{daysUntilExpiry}d left
															</span>
														)}
													</div>
												);
											})()
										) : (
											<span style={{ color: "var(--text-tertiary)" }}>Lifetime</span>
										)}
									</td>
									<td style={{ padding: "16px", textAlign: "right" }}>
										<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
											{/* Quick Suspend/Activate Toggle */}
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													handleSuspendToggle(user.id, user.status);
												}}
												style={{
													padding: "6px 10px",
													background: user.status === "active" ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
													border: user.status === "active" ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(34, 197, 94, 0.2)",
													borderRadius: "6px",
													color: user.status === "active" ? "var(--danger)" : "var(--success)",
													fontSize: "13px",
													fontWeight: "500",
													cursor: "pointer",
													display: "inline-flex",
													alignItems: "center",
													gap: "4px",
													transition: "all 0.15s ease",
												}}
												onMouseEnter={(e) => {
													if (user.status === "active") {
														e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
														e.currentTarget.style.borderColor = "var(--danger)";
													} else {
														e.currentTarget.style.background = "rgba(34, 197, 94, 0.15)";
														e.currentTarget.style.borderColor = "var(--success)";
													}
												}}
												onMouseLeave={(e) => {
													if (user.status === "active") {
														e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
														e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)";
													} else {
														e.currentTarget.style.background = "rgba(34, 197, 94, 0.1)";
														e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.2)";
													}
												}}
											>
												{user.status === "active" ? (
													<>
														<svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														Suspend
													</>
												) : (
													<>
														<svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														Activate
													</>
												)}
											</button>

											{/* Renew License Button */}
											{user.licenseValidUntil && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														setUserToRenew({ id: user.id, name: user.name || "", email: user.email });
													}}
													style={{
														padding: "6px 10px",
														background: "rgba(139, 92, 246, 0.1)",
														border: "1px solid rgba(139, 92, 246, 0.2)",
														borderRadius: "6px",
														color: "var(--primary)",
														fontSize: "13px",
														fontWeight: "500",
														cursor: "pointer",
														display: "inline-flex",
														alignItems: "center",
														gap: "4px",
														transition: "all 0.15s ease",
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.background = "rgba(139, 92, 246, 0.15)";
														e.currentTarget.style.borderColor = "var(--primary)";
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
														e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.2)";
													}}
												>
													<svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
													</svg>
													Renew
												</button>
											)}

											{/* Edit Button */}
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													handleOpenEditModal(user);
												}}
												style={{
													padding: "6px 12px",
													background: "var(--surface-secondary)",
													border: "1px solid var(--border-primary)",
													borderRadius: "6px",
													color: "var(--text-primary)",
													fontSize: "13px",
													fontWeight: "500",
													cursor: "pointer",
													display: "inline-flex",
													alignItems: "center",
													gap: "4px",
													transition: "all 0.15s ease",
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.background = "var(--surface-hover)";
													e.currentTarget.style.borderColor = "var(--primary)";
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.background = "var(--surface-secondary)";
													e.currentTarget.style.borderColor = "var(--border-primary)";
												}}
											>
												<svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
												Edit
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Invite User Modal */}
			<InviteUserModal
				isOpen={showInviteModal}
				onClose={() => setShowInviteModal(false)}
				onSuccess={() => {
					// Invalidate the users query to refetch the list
					queryClient.invalidateQueries({ queryKey: ["projects", projectId, "apps", appId, "users"] });
				}}
				projectId={projectId || ""}
				appId={appId || ""}
			/>

			{/* Edit User Modal */}
			{editingUser && (
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
					onClick={() => setEditingUser(null)}
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
							Edit User License
						</h2>
						<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
							Update license plan and status for {editingUser.name || editingUser.email}
						</p>

						{/* Error Message */}
						{updateError && (
							<div
								style={{
									background: "rgba(239, 68, 68, 0.1)",
									border: "1px solid var(--danger)",
									borderRadius: "8px",
									padding: "12px 16px",
									marginBottom: "20px",
									display: "flex",
									alignItems: "center",
									gap: "12px",
								}}
							>
								<svg style={{ width: "20px", height: "20px", color: "var(--danger)", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<p style={{ fontSize: "14px", color: "var(--danger)", margin: 0 }}>
									{updateError}
								</p>
							</div>
						)}

						{/* Edit form content */}
						<div style={{ marginBottom: "24px" }}>
							<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
								License Plan
							</label>
							<select
								value={editLicensePlan || ""}
								onChange={(e) => setEditLicensePlan(Number(e.target.value))}
								disabled={isUpdating || plansLoading}
								style={{
									width: "100%",
									padding: "10px 12px",
									border: "1px solid var(--border-primary)",
									borderRadius: "8px",
									background: "var(--content-bg)",
									color: "var(--text-primary)",
									fontSize: "14px",
									cursor: isUpdating || plansLoading ? "not-allowed" : "pointer",
									opacity: isUpdating || plansLoading ? 0.6 : 1,
								}}
							>
								{plansLoading ? (
									<option value="">Loading plans...</option>
								) : plans.length === 0 ? (
									<option value="">No plans available</option>
								) : (
									plans.map((plan) => (
										<option key={plan.id} value={plan.id}>
											{plan.name}
											{plan.monthlyPrice !== null && plan.monthlyPrice > 0
												? ` ($${(plan.monthlyPrice / 100).toFixed(2)}/mo)`
												: plan.yearlyPrice !== null && plan.yearlyPrice > 0
													? ` ($${(plan.yearlyPrice / 100).toFixed(2)}/yr)`
													: " (Free)"}
										</option>
									))
								)}
							</select>
						</div>

						<div style={{ marginBottom: "24px" }}>
							<label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
								Status
							</label>
							<select
								value={editLicenseStatus}
								onChange={(e) => setEditLicenseStatus(e.target.value)}
								disabled={isUpdating}
								style={{
									width: "100%",
									padding: "10px 12px",
									border: "1px solid var(--border-primary)",
									borderRadius: "8px",
									background: "var(--content-bg)",
									color: "var(--text-primary)",
									fontSize: "14px",
									cursor: isUpdating ? "not-allowed" : "pointer",
									opacity: isUpdating ? 0.6 : 1,
								}}
							>
								<option value="active">Active</option>
								<option value="suspended">Suspended</option>
								<option value="trial">Trial</option>
							</select>
						</div>

						<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
							<button
								type="button"
								onClick={() => {
									setEditingUser(null);
									setUpdateError(null);
								}}
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
								onClick={handleEditSave}
								disabled={isUpdating}
								className="btn btn-primary"
								style={{
									opacity: isUpdating ? 0.6 : 1,
									cursor: isUpdating ? "not-allowed" : "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								{isUpdating && (
									<svg
										style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										/>
									</svg>
								)}
								{isUpdating ? "Saving..." : "Save Changes"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Renew License Confirmation Modal */}
			<ConfirmModal
				isOpen={!!userToRenew}
				onClose={() => setUserToRenew(null)}
				onConfirm={handleRenewLicense}
				title="Renew License"
				message={`Renew the license for ${userToRenew?.name || userToRenew?.email}? This will extend their access based on the plan duration.`}
				confirmText="Renew License"
				variant="info"
				isLoading={renewLicenseMutation.isPending}
			/>
		</div>
	);
}
