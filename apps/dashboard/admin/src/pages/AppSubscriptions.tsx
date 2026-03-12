import { useState } from "react";
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
	DataTable,
	DataTableRow,
	EmptyState,
	Dialog,
	DialogPopup,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter,
	Chip,
	IconBox,
	Label,
	Input,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
	TableHeader,
	TableBody,
	TableHead,
	TableCell,
} from "@nube-auth/components";

import { PageLoader } from "../components/PageLoader";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import { useApp, useProject } from "../hooks/api";
import {
	useV2Subscriptions,
	useV2SubscriptionAction,
	type V2Subscription,
} from "../hooks/api";

export function AppSubscriptionsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const { showToast } = useToast();

	const [statusFilter, setStatusFilter] = useState<string>("");
	const { data, isLoading } = useV2Subscriptions(appId || "", {
		status: statusFilter || undefined,
	});
	const subscriptionAction = useV2SubscriptionAction(appId || "");

	const [actionModal, setActionModal] = useState<{ sub: V2Subscription; action: string } | null>(null);
	const [reason, setReason] = useState("");
	const [acting, setActing] = useState(false);

	const subscriptions = data?.subscriptions ?? [];

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

	const statusCounts: Record<string, number> = {};
	for (const sub of subscriptions) {
		statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
	}

	const handleAction = async () => {
		if (!actionModal) return;
		setActing(true);
		try {
			await subscriptionAction.mutateAsync({
				subId: actionModal.sub.subscriptionId,
				action: actionModal.action,
				note: reason || undefined,
			});
			showToast(`Subscription ${actionModal.action}ed`, "success");
			setActionModal(null);
			setReason("");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Action failed", "error");
		} finally {
			setActing(false);
		}
	};

	const getStatusChipVariant = (status: string) => {
		switch (status) {
			case "active": return "success";
			case "canceled": return "danger";
			case "past_due": return "warning";
			case "trialing": return "info";
			case "paused": return "default";
			default: return "default";
		}
	};

	const getAvailableActions = (sub: V2Subscription) => {
		const actions: { action: string; label: string; variant: "outline" | "danger" }[] = [];
		if (sub.status === "active" || sub.status === "trialing") {
			actions.push({ action: "pause", label: "Pause", variant: "outline" });
			actions.push({ action: "cancel", label: "Cancel", variant: "danger" });
		}
		if (sub.status === "paused") {
			actions.push({ action: "resume", label: "Resume", variant: "outline" });
			actions.push({ action: "cancel", label: "Cancel", variant: "danger" });
		}
		return actions;
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
						<BreadcrumbButton active>Subscriptions</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div>
				<Heading level={1} size="lg">Subscriptions</Heading>
				<Text className="text-muted-foreground mt-1">Manage recurring subscriptions for {app.name}</Text>
			</div>

			{/* Summary */}
			{Object.keys(statusCounts).length > 0 && (
				<div className="grid grid-cols-4 gap-4">
					{Object.entries(statusCounts).map(([status, count]) => (
						<Card key={status}>
							<CardBody className="flex items-center gap-3">
								<IconBox
									variant={status === "active" ? "success-subtle" : status === "canceled" ? "danger-subtle" : "secondary-subtle"}
									size="md"
								>
									<Icon icon={status === "active" ? IconType.Check : status === "canceled" ? IconType.Cancel : IconType.Clock} size={18} />
								</IconBox>
								<div>
									<Text className="text-muted-foreground text-xs capitalize">{status.replace("_", " ")}</Text>
									<Heading level={4} size="sm">{count}</Heading>
								</div>
							</CardBody>
						</Card>
					))}
				</div>
			)}

			{/* Filter */}
			<div className="flex items-center gap-3">
				<Select
					value={statusFilter}
					onChange={setStatusFilter}
					options={[
						{ value: "", label: "All statuses" },
						{ value: "active", label: "Active" },
						{ value: "trialing", label: "Trialing" },
						{ value: "past_due", label: "Past Due" },
						{ value: "paused", label: "Paused" },
						{ value: "canceled", label: "Canceled" },
					]}
				/>
				<div className="flex-1" />
				<Text className="text-muted-foreground text-sm">
					{subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""}
				</Text>
			</div>

			{/* Table */}
			{isLoading ? (
				<div className="flex justify-center py-12"><Spinner /></div>
			) : subscriptions.length === 0 ? (
				<EmptyState
				icon={IconType.DollarCircle}
					title="No subscriptions"
					description="No subscriptions match the current filters"
				/>
			) : (
				<DataTable>
					<TableHeader>
						<tr>
								<TableHead>User</TableHead>
								<TableHead>Plan</TableHead>
								<TableHead>Price</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Current Period</TableHead>
								<TableHead>Actions</TableHead>
						</tr>
					</TableHeader>
						<TableBody>
							{subscriptions.map((sub) => (
								<DataTableRow key={sub.subscriptionId}>
									<TableCell>
										<div>
											<Text className="text-sm font-medium">{sub.userName || sub.userEmail || "—"}</Text>
											{sub.userEmail && sub.userName && (
												<Text className="text-xs text-muted-foreground">{sub.userEmail}</Text>
											)}
										</div>
									</TableCell>
									<TableCell>
										<Text className="text-sm">{sub.plan?.name || "—"}</Text>
									</TableCell>
									<TableCell>
										{sub.price ? (
											<Text className="text-sm">
												${(sub.price.amountCents / 100).toFixed(2)}/{sub.price.interval || "once"}
											</Text>
										) : (
											<Text className="text-sm text-muted-foreground">—</Text>
										)}
									</TableCell>
									<TableCell>
										<Chip variant={getStatusChipVariant(sub.status)} size="sm">
											{sub.status.replace("_", " ")}
										</Chip>
									</TableCell>
									<TableCell>
										<div>
											<Text className="text-xs text-muted-foreground">
												{sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : "—"}
											</Text>
											{sub.currentPeriodEnd && (
												<Text className="text-xs text-muted-foreground">
													→ {new Date(sub.currentPeriodEnd).toLocaleDateString()}
												</Text>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											{getAvailableActions(sub).map((act) => (
												<Button
													key={act.action}
													size="sm"
													variant={act.variant}
													onClick={() => setActionModal({ sub, action: act.action })}
												>
													{act.label}
												</Button>
											))}
										</div>
									</TableCell>
								</DataTableRow>
							))}
						</TableBody>
			</DataTable>
			)}

			{/* Action Confirmation Modal */}
			<Dialog open={!!actionModal} onOpenChange={() => { setActionModal(null); setReason(""); }}>
				<DialogPopup>
					<DialogHeader>
						<DialogTitle className="capitalize">
							{actionModal?.action} Subscription
						</DialogTitle>
					</DialogHeader>
					<DialogBody className="space-y-4">
						<Text>
							Are you sure you want to {actionModal?.action} the subscription for{" "}
							<strong>{actionModal?.sub.userName || actionModal?.sub.userEmail || actionModal?.sub.subscriptionId}</strong>?
						</Text>
						<div>
							<Label className="block text-sm font-medium mb-1">Reason (optional)</Label>
							<Input
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="Enter reason..."
							/>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button variant="outline" onClick={() => { setActionModal(null); setReason(""); }}>
							Cancel
						</Button>
						<Button
							variant={actionModal?.action === "cancel" ? "danger" : "primary"}
							onClick={handleAction}
							disabled={acting}
						>
							{acting ? <Spinner /> : `Confirm ${actionModal?.action}`}
						</Button>
					</DialogFooter>
				</DialogPopup>
			</Dialog>
		</div>
	);
}
