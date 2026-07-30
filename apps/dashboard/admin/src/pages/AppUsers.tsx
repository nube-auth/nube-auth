import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { csrfHeaders } from "../lib/csrf";
import {
	Icon,
	IconType,
	Button,
	Spinner,
	Alert,
	Heading,
	Text,
	Input,
	Chip,
	Avatar,
	Card,
	CardBody,
	DataTable,
	DataTableRow,
	TableHeader,
	TableHead,
	TableBody,
	TableCell,
	Dialog,
	DialogPopup,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter,
	EmptyState,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
	Menu,
	MenuTrigger,
	MenuPopup,
	MenuItem,
	MenuSeparator,
} from "@nube-auth/components";

import { PageLoader } from "../components/PageLoader";
import { ConfirmModal } from "../components/ConfirmModal";
import { InviteUserModal } from "../components/InviteUserModal";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import config from "../config";
import { useApp, useAppUsers, useProject, useRemoveAppUser, useRenewLicense } from "../hooks/api";
import { pingpong } from "../lib/pingpong";

export function AppUsersPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const queryClient = useQueryClient();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const { data, isLoading: usersLoading } = useAppUsers(projectId || "", appId || "");
	const renewLicenseMutation = useRenewLicense(projectId || "", appId || "");
	const removeAppUserMutation = useRemoveAppUser(projectId || "", appId || "");

	const [searchQuery, setSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [editingUser, setEditingUser] = useState<any>(null);
	const [editLicensePlan, setEditLicensePlan] = useState<number | null>(null);
	const [plans, setPlans] = useState<any[]>([]);
	const [plansLoading, setPlansLoading] = useState(false);
	const [editLicenseStatus, setEditLicenseStatus] = useState("");
	const [isUpdating, setIsUpdating] = useState(false);
	const [updateError, setUpdateError] = useState<string | null>(null);
	const [userToRenew, setUserToRenew] = useState<{ id: string; name: string; email: string } | null>(null);
	const [userToRemove, setUserToRemove] = useState<{ id: string; name: string; email: string } | null>(null);
	const { showToast } = useToast();

	const users = data?.users || [];

	const fetchPlans = useCallback(async () => {
		setPlansLoading(true);
		try {
			const response = await pingpong(`${config.gatewayUrl}/v1/admin/projects/${projectId}/apps/${appId}/plans`, {
				method: "GET",
				credentials: "include",
			});

			if (!response.ok()) {
				throw new Error("Failed to fetch plans");
			}

			setPlans(response.data?.plans || []);
		} catch (err) {
			showToast("Failed to fetch plans", "error");
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
				`${config.gatewayUrl}/v1/admin/projects/${projectId}/apps/${appId}/users/${userId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						...csrfHeaders(),
					},
					credentials: "include",
					body: JSON.stringify({
						license_status: newStatus,
					}),
				},
			);

			if (!response.ok()) {
				throw new Error(response.data?.error || "Failed to update user status");
			}

			// Refresh users list
			queryClient.invalidateQueries({ queryKey: ["appUsers", projectId, appId] });
		} catch (err) {
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
				`${config.gatewayUrl}/v1/admin/projects/${projectId}/apps/${appId}/users/${editingUser.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						...csrfHeaders(),
					},
					credentials: "include",
					body: JSON.stringify({
						plan_id: editLicensePlan,
						license_status: editLicenseStatus,
					}),
				},
			);

			if (!response.ok()) {
				throw new Error(response.data?.error || "Failed to update user");
			}

			// Refresh users list
			queryClient.invalidateQueries({ queryKey: ["appUsers", projectId, appId] });

			// Close modal
			setEditingUser(null);
			setEditLicensePlan(null);
			setEditLicenseStatus("");
		} catch (err) {
			setUpdateError(err instanceof Error ? err.message : "Failed to update user");
		} finally {
			setIsUpdating(false);
		}
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

	const handleRemoveUser = async () => {
		if (!userToRemove) return;

		try {
			const result = await removeAppUserMutation.mutateAsync(userToRemove.id);
			showToast(result.message, "success");
			setUserToRemove(null);
		} catch (error: unknown) {
			if (error && typeof error === "object" && "message" in error) {
				showToast(`Failed to remove user: ${(error as { message: string }).message}`, "error");
			} else {
				showToast("Failed to remove user", "error");
			}
		}
	};

	const isAnyUserActionPending = renewLicenseMutation.isPending || removeAppUserMutation.isPending || isUpdating;

	if (projectLoading || appLoading) {
		return <PageLoader />;
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
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>
							{project.name}
						</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}/apps/${appId}`} />}>
							{app.name}
						</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton active>Users</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Page Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<Heading size="lg" className="mb-2">
						Users
					</Heading>
					<Text className="text-muted">Manage users and their licenses for {app.name}</Text>
				</div>
				<Button variant="primary" onClick={() => setShowInviteModal(true)}>
					<Icon icon={IconType.UserAdd} size={16} />
					Invite User
				</Button>
			</div>

			{/* Filters */}
			<div className="mb-5 flex items-center gap-3">
				<div className="w-full max-w-100">
					<Input
						type="text"
						placeholder="Search by name or email..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				{/* Status Filter */}
				<div className="min-w-40">
					<Select
						value={filterStatus}
						onChange={(value) => setFilterStatus(value)}
						placeholder="All Status"
						options={[
							{ value: "all", label: "All Status" },
							{ value: "active", label: "Active" },
							{ value: "suspended", label: "Suspended" },
							{ value: "trial", label: "Trial" },
						]}
					/>
				</div>
			</div>

			{/* Empty State */}
			{!usersLoading && filteredUsers.length === 0 && users.length === 0 && (
				<EmptyState
					icon={IconType.UserMultiple}
					title="No users yet"
					description="Users will appear here after they sign up for your app. You can also invite users to get started."
					action={
						<Button variant="primary" onClick={() => setShowInviteModal(true)}>
							<Icon icon={IconType.UserAdd} size={16} />
							Invite Your First User
						</Button>
					}
				/>
			)}

			{/* No Search Results */}
			{!usersLoading && filteredUsers.length === 0 && users.length > 0 && (
				<Card>
					<CardBody className="text-center py-10">
						<Text className="text-muted">No users found matching your search criteria.</Text>
					</CardBody>
				</Card>
			)}

			{/* Users Table */}
			{!usersLoading && filteredUsers.length > 0 && (
				<DataTable>
					<TableHeader>
						<tr>
							<TableHead>User</TableHead>
							<TableHead align="center">Plan</TableHead>
							<TableHead align="center">Status</TableHead>
							<TableHead align="center">Joined</TableHead>
							<TableHead align="center">License Valid Until</TableHead>
							<TableHead align="right">Actions</TableHead>
						</tr>
					</TableHeader>
					<TableBody>
						{filteredUsers.map((user) => (
							<DataTableRow key={user.id}>
								<TableCell>
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 bg-linear-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0">
											{(user.name || user.email).charAt(0).toUpperCase()}
										</div>
										<div>
											<Text className="font-medium mb-0.5">
												{user.name || "Anonymous"}
												{user.primaryEmailVerified && (
													<Icon
														icon={IconType.Check}
														size={14}
														className="text-primary ml-1 inline"
													/>
												)}
											</Text>
											<Text className="text-xs text-muted">{user.email}</Text>
										</div>
									</div>
								</TableCell>
								<TableCell align="center">
									<Chip variant={user.plan === "pro" ? "primary" : "default"} size="sm" pill>
										{user.plan}
									</Chip>
								</TableCell>
								<TableCell align="center">
									<Chip variant={user.status === "active" ? "success" : "danger"} size="sm" pill>
										{user.status}
									</Chip>
								</TableCell>
								<TableCell align="center">
									<Text className="text-muted">
										{new Date(user.createdAt * 1000).toLocaleDateString()}
									</Text>
								</TableCell>
								<TableCell align="center">
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
													<Text
														className={
															isExpired
																? "text-danger"
																: isExpiringSoon
																	? "text-warning"
																	: "text-muted"
														}
													>
														{new Date(user.licenseValidUntil * 1000).toLocaleDateString()}
													</Text>
													{isExpired && (
														<Chip variant="danger" size="sm">
															EXPIRED
														</Chip>
													)}
													{isExpiringSoon && !isExpired && (
														<Chip variant="warning" size="sm">
															{daysUntilExpiry}d left
														</Chip>
													)}
												</div>
											);
										})()
									) : (
										<Text className="text-muted">Lifetime</Text>
									)}
								</TableCell>
								<TableCell align="right">
									<div className="flex gap-2 justify-end items-center">
										<Menu>
											<MenuTrigger
												render={
													<Button
														variant="outline"
														size="sm"
														disabled={isAnyUserActionPending}
													>
														<Icon icon={IconType.Menu} size={14} /> More actions
													</Button>
												}
											/>
											<MenuPopup align="end" size="compact">
												<MenuItem
													onClick={() => {
														handleSuspendToggle(user.id, user.status);
													}}
													disabled={isAnyUserActionPending}
												>
													<Icon
														icon={
															user.status === "active" ? IconType.Shield : IconType.Check
														}
														size={14}
													/>
													{user.status === "active" ? "Suspend" : "Activate"}
												</MenuItem>

												{user.licenseValidUntil && (
													<MenuItem
														onClick={() => {
															setUserToRenew({
																id: user.id,
																name: user.name || "",
																email: user.email,
															});
														}}
														disabled={isAnyUserActionPending}
													>
														<Icon icon={IconType.Refresh} size={14} />
														Renew license
													</MenuItem>
												)}

												<MenuItem
													onClick={() => {
														setEditingUser(user);
													}}
													disabled={isAnyUserActionPending}
												>
													<Icon icon={IconType.Edit} size={14} />
													Edit
												</MenuItem>

												<MenuSeparator />

												<MenuItem
													onClick={() => {
														setUserToRemove({
															id: user.id,
															name: user.name || "",
															email: user.email,
														});
													}}
													disabled={isAnyUserActionPending}
													className="text-danger"
												>
													<Icon icon={IconType.Delete} size={14} className="text-danger" />
													Remove from app
												</MenuItem>
											</MenuPopup>
										</Menu>
									</div>
								</TableCell>
							</DataTableRow>
						))}
					</TableBody>
				</DataTable>
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
				<Dialog open={!!editingUser} onOpenChange={(open: boolean) => !open && setEditingUser(null)}>
					<DialogPopup>
						<DialogHeader>
							<DialogTitle>Edit User License</DialogTitle>
							<Text className="text-muted mt-2">
								Update license plan and status for {editingUser.name || editingUser.email}
							</Text>
						</DialogHeader>

						<DialogBody>
							{updateError && (
								<Alert variant="danger" className="mb-4">
									<Icon icon={IconType.AlertCircle} size={20} />
									<span>{updateError}</span>
								</Alert>
							)}

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-semibold text-muted mb-2">
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

								<div>
									<label className="block text-sm font-semibold text-muted mb-2">
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
							</div>
						</DialogBody>

						<DialogFooter>
							<Button
								variant="secondary"
								onClick={() => {
									setEditingUser(null);
									setUpdateError(null);
								}}
								disabled={isUpdating}
							>
								Cancel
							</Button>
							<Button variant="primary" onClick={handleEditSave} disabled={isUpdating}>
								{isUpdating && <Icon icon={IconType.Refresh} size={16} className="animate-spin" />}
								{isUpdating ? "Saving..." : "Save Changes"}
							</Button>
						</DialogFooter>
					</DialogPopup>
				</Dialog>
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

			<ConfirmModal
				isOpen={!!userToRemove}
				onClose={() => setUserToRemove(null)}
				onConfirm={handleRemoveUser}
				title="Remove User From App"
				message={`Remove ${userToRemove?.name || userToRemove?.email} from this app? Their app sessions, app license, and app membership record will be removed. Their global account will remain.`}
				confirmText="Remove User"
				variant="danger"
			/>
		</div>
	);
}
