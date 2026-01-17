import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { InviteUserModal } from "../components/InviteUserModal";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import { useApp, useAppUsers, useProject, useRenewLicense } from "../hooks/api";
import { pingpong } from "../lib/pingpong";

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

	const fetchPlans = useCallback(async () => {
		setPlansLoading(true);
		try {
			const response = await pingpong(
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
	}, [projectId, appId]);

	// Fetch plans when editing user
	useEffect(() => {
		if (editingUser && projectId && appId) {
			fetchPlans();
		}
	}, [editingUser, projectId, appId, fetchPlans]);

	// Filter users based on search and status
	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus = filterStatus === "all" || user.status === filterStatus;

		return matchesSearch && matchesStatus;
	});

	// Handler for Suspend/Activate toggle
	const handleSuspendToggle = async (userId: string, currentStatus: string) => {
		const newStatus = currentStatus === "active" ? "suspended" : "active";

		try {
			const response = await pingpong(
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
				},
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
			const response = await pingpong(
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
				},
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
			<nav className="flex items-center gap-2 text-[13px]">
				<Link to="/projects" className="no-underline text-text-secondary">
					Projects
				</Link>
				<svg className="h-3.5 w-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link to={`/projects/${projectId}`} className="no-underline text-text-secondary">
					{project.name}
				</Link>
				<svg className="h-3.5 w-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link to={`/projects/${projectId}/apps/${appId}`} className="no-underline text-text-secondary">
					{app.name}
				</Link>
				<svg className="h-3.5 w-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span className="font-medium text-text-primary">Users</span>
			</nav>

			{/* Page Header */}
			<div className="page-header">
				<div>
					<h1 className="page-title">Users</h1>
					<p className="page-description">Manage users and their licenses for {app.name}</p>
				</div>
				<button type="button" className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
						/>
					</svg>
					Invite User
				</button>
			</div>

			{/* Filters */}
			<div className="mb-5 flex items-center gap-3">
				<div className="w-full max-w-[400px]">
					<div className="relative">
						<svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input
							type="text"
							placeholder="Search by name or email..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full rounded-[10px] border border-border bg-bg-surface px-3.5 py-2.5 pl-10 text-14px text-text-primary transition-all focus:border-primary focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]"
						/>
					</div>
				</div>

				{/* Custom Status Dropdown */}
				<div className="relative min-w-[160px]">
					<button
						type="button"
						onClick={() => setShowStatusDropdown(!showStatusDropdown)}
						className={`flex w-full items-center justify-between gap-2 rounded-[10px] border bg-bg-surface px-3 py-2.5 text-14px text-text-primary transition-all focus:outline-none ${showStatusDropdown ? "border-primary" : "border-border hover:border-primary/70"}`}
					>
						<span className="flex items-center gap-2">
							<svg className="h-4 w-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
								/>
							</svg>
							{filterStatus === "all" ? "All Status" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
						</span>
						<svg
							className={`h-3.5 w-3.5 transition-transform text-text-tertiary ${showStatusDropdown ? "rotate-180" : "rotate-0"}`}
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
							<div className="fixed inset-0 z-[999]" onClick={() => setShowStatusDropdown(false)} />

							{/* Dropdown */}
							<div className="absolute top-[calc(100%+6px)] left-0 right-0 z-[1000] overflow-hidden rounded-[10px] border border-border bg-bg-surface shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
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
										className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-14px transition-all ${filterStatus === option.value ? "bg-primary/10 text-primary" : "text-text-primary hover:bg-surface/50"} ${option.value !== "trial" ? "border-b border-border/60" : ""}`}
									>
										<svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
										</svg>
										<span className={filterStatus === option.value ? "font-semibold" : "font-normal"}>{option.label}</span>
										{filterStatus === option.value && (
											<svg className="ml-auto h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
				<div className="flex flex-col items-center justify-center py-20 px-5 text-center">
					<div className="w-25 h-25 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-6">
						<svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
							/>
						</svg>
					</div>
					<h2 className="text-20px font-bold text-text-primary mb-2">
						No users yet
					</h2>
					<p className="text-14px text-text-secondary max-w-100 mb-6">
						Users will appear here after they sign up for your app. You can also invite users to get
						started.
					</p>
					<button
						type="button"
						onClick={() => alert("Invite user functionality coming soon!")}
						className="btn btn-primary"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
							/>
						</svg>
						Invite Your First User
					</button>
				</div>
			)}

			{/* No Search Results */}
			{!usersLoading && filteredUsers.length === 0 && users.length > 0 && (
				<div className="text-center py-10 px-10 text-text-secondary">
					<p>No users found matching your search criteria.</p>
				</div>
			)}

			{/* Users Table */}
			{!usersLoading && filteredUsers.length > 0 && (
				<div className="card p-0 overflow-hidden">
					<table className="w-full border-collapse table-container">
						<thead>
							<tr className="bg-surface-secondary border-b border-border-secondary">
								<th className="px-4 py-3 text-left text-12px font-semibold text-text-secondary uppercase">
									User
								</th>
								<th className="px-4 py-3 text-center text-12px font-semibold text-text-secondary uppercase">
									Plan
								</th>
								<th className="px-4 py-3 text-center text-12px font-semibold text-text-secondary uppercase">
									Status
								</th>
								<th className="px-4 py-3 text-center text-12px font-semibold text-text-secondary uppercase">
									Joined
								</th>
								<th className="px-4 py-3 text-center text-12px font-semibold text-text-secondary uppercase">
									License Valid Until
								</th>
								<th className="px-4 py-3 text-right text-12px font-semibold text-text-secondary uppercase">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredUsers.map((user) => (
								<tr
									key={user.id}
									className="border-b border-border-secondary"
								>
									<td className="px-4 py-4">
										<div className="flex items-center gap-3">
											<div className="w-40px h-40px bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-white text-14px font-semibold shrink-0">
												{(user.name || user.email).charAt(0).toUpperCase()}
											</div>
											<div>
												<div className="text-14px font-medium text-text-primary mb-2px">
													{user.name || "Anonymous"}
													{user.primaryEmailVerified && (
														<svg className="w-14px h-14px text-primary ml-4px inline"
															fill="currentColor"
															viewBox="0 0 20 20"
														>
															<path
																fillRule="evenodd"
																d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
																clipRule="evenodd"
															/>
														</svg>
													)}
												</div>
												<div className="text-12px text-text-tertiary">
													{user.email}
												</div>
											</div>
										</div>
									</td>
									<td className="px-4 py-4 text-center">
										<span
											className={`inline-block px-12px py-4px rounded-12px text-12px font-semibold capitalize ${
												user.plan === "pro"
													? "bg-purple-100 text-primary"
													: "bg-bg-muted text-text-tertiary"
											}`}
										>
											{user.plan}
										</span>
									</td>
									<td className="px-4 py-4 text-center">
										<span
											className={`inline-flex items-center gap-4px px-10px py-4px rounded-12px text-12px font-medium capitalize ${
												user.status === "active"
													? "bg-success-bg text-success"
													: "bg-danger-bg text-danger"
											}`}
										>
											<span className="w-6px h-6px bg-current rounded-full" />
											{user.status}
										</span>
									</td>
									<td className="px-4 py-4 text-center text-13px text-text-secondary">
										{new Date(user.createdAt).toLocaleDateString()}
									</td>
									<td className="px-4 py-4 text-center text-13px">
										{user.licenseValidUntil ? (
											(() => {
												const now = Math.floor(Date.now() / 1000);
												const daysUntilExpiry = Math.floor(
													(user.licenseValidUntil - now) / (24 * 60 * 60),
												);
												const isExpired = daysUntilExpiry < 0;
												const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;

												return (
														<div className="flex items-center justify-center gap-1.5">
														<span
															className={`${
																isExpired
																	? "text-danger"
																	: isExpiringSoon
																		? "text-warning"
																		: "text-text-secondary"
															}`}
														>
															{new Date(user.licenseValidUntil).toLocaleDateString()}
														</span>
														{isExpired && (
															<span className="px-6px py-2px bg-danger-bg border border-danger/30 rounded-4px text-danger text-11px font-semibold">
																EXPIRED
															</span>
														)}
														{isExpiringSoon && !isExpired && (
															<span className="px-6px py-2px bg-warning-bg border border-warning/30 rounded-4px text-warning text-11px font-semibold">
																{daysUntilExpiry}d left
															</span>
														)}
													</div>
												);
											})()
										) : (
											<span className="text-text-tertiary">Lifetime</span>
										)}
									</td>
									<td className="px-4 py-4 text-right">
										<div className="flex gap-2 justify-end items-center">
											{/* Quick Suspend/Activate Toggle */}
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													handleSuspendToggle(user.id, user.status);
												}}
												className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-13px font-medium rounded-lg border transition-all cursor-pointer ${
													user.status === "active"
														? "bg-danger/10 border-danger/20 text-danger hover:bg-danger/15 hover:border-danger"
														: "bg-success/10 border-success/20 text-success hover:bg-success/15 hover:border-success"
												}`}
											>
												{user.status === "active" ? (
													<>
														<svg
															className="w-14px h-14px"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
															/>
														</svg>
														Suspend
													</>
												) : (
													<>
														<svg
															className="w-14px h-14px"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
															/>
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
														setUserToRenew({
															id: user.id,
															name: user.name || "",
															email: user.email,
														});
													}}
													className="inline-flex items-center gap-1 px-2.5 py-1.5 text-13px font-medium rounded-lg border bg-primary/10 border-primary/20 text-primary transition-all cursor-pointer hover:bg-primary/15 hover:border-primary">
													<svg
														className="w-14px h-14px"
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
												className="inline-flex items-center gap-1 px-3 py-1.5 text-13px font-medium rounded-lg border bg-surface/60 border-border text-text-primary transition-all cursor-pointer hover:bg-surface hover:border-primary">
												<svg
													className="w-14px h-14px"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
													/>
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
					className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-1000 p-5"
					onClick={() => setEditingUser(null)}
				>
					<div
						className="bg-card-bg rounded-16px p-8 max-w-500px w-full shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="text-20px font-bold mb-2 text-text-primary">
							Edit User License
						</h2>
						<p className="text-14px text-text-secondary mb-6">
							Update license plan and status for {editingUser.name || editingUser.email}
						</p>

						{/* Error Message */}
						{updateError && (
							<div className="flex items-center gap-3 p-4 mb-5 bg-danger/10 border border-danger rounded-lg">
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
								<p className="text-14px text-danger m-0">{updateError}</p>
							</div>
						)}

						{/* Edit form content */}
						<div className="mb-6">
							<label className="block text-13px font-semibold text-text-secondary mb-2">
								License Plan
							</label>
							<Select
								value={editLicensePlan?.toString() || ""}
								onChange={(value) => setEditLicensePlan(Number(value))}
								options={
									plansLoading
										? [{ value: "", label: "Loading plans..." }]
										: plans.length === 0
											? [{ value: "", label: "No plans available" }]
											: plans.map((plan) => ({
													value: plan.id.toString(),
													label: `${plan.name}${
														plan.monthlyPrice !== null && plan.monthlyPrice > 0
															? ` ($${(plan.monthlyPrice / 100).toFixed(2)}/mo)`
															: plan.yearlyPrice !== null && plan.yearlyPrice > 0
																? ` ($${(plan.yearlyPrice / 100).toFixed(2)}/yr)`
																: " (Free)"
													}`,
												}))
								}
								disabled={isUpdating || plansLoading}
								className={`w-full px-3 py-2.5 border border-border rounded-lg bg-bg-content text-text-primary text-14px ${
									isUpdating || plansLoading ? "opacity-60" : "opacity-100"
								}`}
							/>
						</div>

						<div className="mb-6">
							<label className="block text-13px font-semibold text-text-secondary mb-2">
								Status
							</label>
							<Select
								value={editLicenseStatus}
								onChange={(value) => setEditLicenseStatus(value)}
								options={[
									{ value: "active", label: "Active" },
									{ value: "suspended", label: "Suspended" },
									{ value: "trial", label: "Trial" },
								]}
								disabled={isUpdating}
									className={`w-full px-3 py-2.5 border border-border rounded-lg bg-bg-content text-text-primary text-14px ${
										isUpdating ? "opacity-60" : "opacity-100"
									}`}
							/>
						</div>

						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={() => {
									setEditingUser(null);
									setUpdateError(null);
								}}
								disabled={isUpdating}
								className={`btn btn-secondary ${
									isUpdating ? "opacity-60 cursor-not-allowed" : "opacity-100 cursor-pointer"
								}`}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleEditSave}
								disabled={isUpdating}
								className={`btn btn-primary flex items-center gap-2 ${
									isUpdating ? "opacity-60 cursor-not-allowed" : "opacity-100 cursor-pointer"
								}`}
							>
								{isUpdating && (
									<svg
										className="w-4 h-4 animate-spin"
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
			/>
		</div>
	);
}
