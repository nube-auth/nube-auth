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
	EmptyState,
	Dialog,
	DialogPopup,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter,
	Input,
	Label,
	Chip,
	Checkbox,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
	Select,
	SelectTrigger,
	SelectValue,
	SelectPopup,
	SelectList,
	SelectItem,
} from "@nube-auth/components";
import { useToast } from "../components/Toast";
import { useApp, useProject } from "../hooks/api";
import {
	useAppWebhooks,
	useWebhookHealth,
	useOutboundWebhookLogs,
	useCreateWebhook,
	useUpdateWebhook,
	useDeleteWebhook,
	useRotateWebhookSecret,
	useSendTestEvent,
	type AppWebhook,
} from "../hooks/api";
import { PageLoader } from "../components/PageLoader";
import { ConfirmModal } from "../components/ConfirmModal";

// All supported event names
const SUPPORTED_EVENTS = [
	"user.registered",
	"user.updated",
	"user.deleted",
	"session.created",
	"session.revoked",
	"session.expired",
	"session.all_revoked",
	"license.created",
	"license.upgraded",
	"license.downgraded",
	"license.canceled",
	"license.expired",
	"license.renewed",
	"license.reactivated",
	"license.trial_started",
	"license.trial_ended",
	"plan.created",
	"plan.updated",
	"plan.deleted",
	"oauth.connected",
	"oauth.disconnected",
];

// Group events by category for the multi-select UI
const EVENT_GROUPS: { label: string; events: string[] }[] = [
	{
		label: "User",
		events: ["user.registered", "user.updated", "user.deleted"],
	},
	{
		label: "Session",
		events: ["session.created", "session.revoked", "session.expired", "session.all_revoked"],
	},
	{
		label: "License",
		events: [
			"license.created",
			"license.upgraded",
			"license.downgraded",
			"license.canceled",
			"license.expired",
			"license.renewed",
			"license.reactivated",
			"license.trial_started",
			"license.trial_ended",
		],
	},
	{
		label: "Plan",
		events: ["plan.created", "plan.updated", "plan.deleted"],
	},
	{
		label: "OAuth",
		events: ["oauth.connected", "oauth.disconnected"],
	},
];

function statusChipVariant(status: string): "success" | "danger" | "warning" | "default" {
	if (status === "success") return "success";
	if (status === "failed") return "danger";
	return "warning";
}

// ─── Secret Display Modal ─────────────────────────────────────────────────────

function SecretModal({ secret, onClose }: { secret: string; onClose: () => void }) {
	const [copied, setCopied] = useState(false);
	const handleCopy = async () => {
		await navigator.clipboard.writeText(secret);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};
	return (
		<Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>Signing Secret</DialogTitle>
				</DialogHeader>
				<DialogBody className="space-y-4">
					<Alert variant="warning">
						This secret will not be shown again. Copy it now and store it securely.
					</Alert>
					<div className="relative">
						<Input readOnly value={secret} className="font-mono pr-24 text-xs" />
						<Button
							variant="secondary"
							size="sm"
							className="absolute right-2 top-1/2 -translate-y-1/2"
							onClick={handleCopy}
						>
							{copied ? "Copied!" : "Copy"}
						</Button>
					</div>
					<Text className="text-sm text-muted">
						Use this secret to verify the <code>X-Nube-Signature</code> header on incoming webhook requests.
					</Text>
				</DialogBody>
				<DialogFooter>
					<Button onClick={onClose}>Done</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}

// ─── Event Selector ───────────────────────────────────────────────────────────

function EventSelector({
	selected,
	onChange,
}: {
	selected: string[];
	onChange: (events: string[]) => void;
}) {
	const allSelected = SUPPORTED_EVENTS.every((e) => selected.includes(e));

	const toggleAll = () => {
		onChange(allSelected ? [] : [...SUPPORTED_EVENTS]);
	};

	const toggle = (event: string) => {
		onChange(selected.includes(event) ? selected.filter((e) => e !== event) : [...selected, event]);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Checkbox checked={allSelected} onCheckedChange={toggleAll} />
				<Label className="text-sm font-medium cursor-pointer" onClick={toggleAll}>
					All events
				</Label>
			</div>
			{EVENT_GROUPS.map((group) => (
				<div key={group.label} className="space-y-1.5">
					<Text className="text-xs font-semibold text-muted uppercase tracking-wider">{group.label}</Text>
					<div className="grid grid-cols-2 gap-1.5 pl-2">
						{group.events.map((event) => (
							<div key={event} className="flex items-center gap-2">
								<Checkbox
									checked={selected.includes(event)}
									onCheckedChange={() => toggle(event)}
									id={`event-${event}`}
								/>
								<label htmlFor={`event-${event}`} className="text-xs font-mono cursor-pointer">
									{event}
								</label>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

// ─── Logs Panel ───────────────────────────────────────────────────────────────

function WebhookLogsPanel({ appId, webhook }: { appId: string; webhook: AppWebhook }) {
	const { data, isLoading } = useOutboundWebhookLogs(appId, webhook.webhookId);

	if (isLoading) return <Spinner className="size-4" />;
	if (!data || data.logs.length === 0) {
		return <Text className="text-muted text-sm">No delivery logs yet.</Text>;
	}

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Event</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>HTTP</TableHead>
						<TableHead>Duration</TableHead>
						<TableHead>Attempt</TableHead>
						<TableHead>Delivered</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.logs.map((log) => (
						<TableRow key={log.logId}>
							<TableCell>
								<code className="text-xs">{log.event}</code>
							</TableCell>
							<TableCell>
								<Chip variant={statusChipVariant(log.status)} size="sm">
									{log.status}
								</Chip>
							</TableCell>
							<TableCell className="text-sm">{log.responseStatus ?? "—"}</TableCell>
							<TableCell className="text-sm">{log.durationMs != null ? `${log.durationMs}ms` : "—"}</TableCell>
							<TableCell className="text-sm">{log.attempt}</TableCell>
							<TableCell className="text-sm text-muted">
								{new Date(log.createdAt).toLocaleString()}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AppWebhooksPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { showToast } = useToast();

	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const { data: webhooksData, isLoading: webhooksLoading } = useAppWebhooks(appId || "");
	const { data: healthData } = useWebhookHealth(appId || "");

	const createWebhook = useCreateWebhook(appId || "");
	const updateWebhook = useUpdateWebhook(appId || "");
	const deleteWebhook = useDeleteWebhook(appId || "");
	const rotateSecret = useRotateWebhookSecret(appId || "");
	const sendTestEvent = useSendTestEvent(appId || "");

	// Modal state
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingWebhook, setEditingWebhook] = useState<AppWebhook | null>(null);
	const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
	const [deactivateTarget, setDeactivateTarget] = useState<AppWebhook | null>(null);
	const [rotateTarget, setRotateTarget] = useState<AppWebhook | null>(null);
	const [shownSecret, setShownSecret] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	// Test event state
	const [testTarget, setTestTarget] = useState<AppWebhook | null>(null);
	const [testEvent, setTestEvent] = useState(SUPPORTED_EVENTS[0]);
	const [testResult, setTestResult] = useState<{ success: boolean; responseStatus: number | null; durationMs: number } | null>(null);
	const [testing, setTesting] = useState(false);

	// Form state (shared for create/edit)
	const [form, setForm] = useState({ url: "", events: [] as string[], description: "" });

	const openCreate = () => {
		setForm({ url: "", events: [], description: "" });
		setEditingWebhook(null);
		setShowCreateModal(true);
	};

	const openEdit = (wh: AppWebhook) => {
		setForm({ url: wh.url, events: wh.events, description: wh.description ?? "" });
		setEditingWebhook(wh);
		setShowCreateModal(true);
	};

	const handleSave = async () => {
		if (!form.url) return showToast("URL is required", "error");
		if (form.events.length === 0) return showToast("Select at least one event", "error");

		setSaving(true);
		try {
			if (editingWebhook) {
				await updateWebhook.mutateAsync({
					webhookId: editingWebhook.webhookId,
					url: form.url,
					events: form.events,
					description: form.description || null,
				});
				showToast("Webhook updated", "success");
			} else {
				const created = await createWebhook.mutateAsync({
					url: form.url,
					events: form.events,
					description: form.description || undefined,
				});
				setShownSecret(created.secret || null);
				showToast("Webhook registered", "success");
			}
			setShowCreateModal(false);
		} catch {
			showToast("Failed to save webhook", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleToggleActive = async (wh: AppWebhook) => {
		try {
			await updateWebhook.mutateAsync({ webhookId: wh.webhookId, isActive: !wh.isActive });
			showToast(wh.isActive ? "Webhook disabled" : "Webhook enabled", "success");
		} catch {
			showToast("Failed to update webhook", "error");
		}
	};

	const handleDelete = async () => {
		if (!deactivateTarget) return;
		try {
			await deleteWebhook.mutateAsync(deactivateTarget.webhookId);
			showToast("Webhook removed", "success");
		} catch {
			showToast("Failed to remove webhook", "error");
		} finally {
			setDeactivateTarget(null);
		}
	};

	const handleRotateSecret = async () => {
		if (!rotateTarget) return;
		try {
			const result = await rotateSecret.mutateAsync(rotateTarget.webhookId);
			setShownSecret(result.secret);
			showToast("Secret rotated", "success");
		} catch {
			showToast("Failed to rotate secret", "error");
		} finally {
			setRotateTarget(null);
		}
	};

	const openTestModal = (wh: AppWebhook) => {
		setTestTarget(wh);
		setTestEvent(SUPPORTED_EVENTS[0]);
		setTestResult(null);
	};

	const handleSendTest = async () => {
		if (!testTarget) return;
		setTesting(true);
		setTestResult(null);
		try {
			const result = await sendTestEvent.mutateAsync({ webhookId: testTarget.webhookId, event: testEvent });
			setTestResult({ success: result.success, responseStatus: result.responseStatus, durationMs: result.durationMs });
		} catch {
			setTestResult({ success: false, responseStatus: null, durationMs: 0 });
		} finally {
			setTesting(false);
		}
	};

	if (projectLoading || appLoading) return <PageLoader />;
	if (!project || !app) return <Alert variant="danger">Project or App not found</Alert>;

	const health = healthData?.health;
	const webhooks = webhooksData?.webhooks ?? [];

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
				</BreadcrumbItem>
				<BreadcrumbItem>
					<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>{project.name}</BreadcrumbButton>
				</BreadcrumbItem>
				<BreadcrumbItem>
					<BreadcrumbButton render={<Link to={`/projects/${projectId}/apps/${appId}`} />}>{app.name}</BreadcrumbButton>
				</BreadcrumbItem>
				<BreadcrumbItem>Webhooks</BreadcrumbItem>
			</BreadcrumbList>

			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<Heading level={2}>Webhooks</Heading>
					<Text className="text-muted">
						Register HTTPS endpoints to receive real-time event notifications from {app.name}.
					</Text>
				</div>
				<Button variant="primary" onClick={openCreate}>
					<Icon icon={IconType.Add} />
					Add Endpoint
				</Button>
			</div>

			{/* Health Summary */}
			{health && (
				<div className="grid grid-cols-4 gap-4">
					{(
						[
			{ label: "Total Deliveries", value: health.total, icon: IconType.Flash },
						{ label: "Successful", value: health.success, icon: IconType.Check },
						{ label: "Failed", value: health.failed, icon: IconType.Alert },
							{
								label: "Success Rate",
								value: health.successRate != null ? `${health.successRate}%` : "—",
								icon: IconType.ChartColumn,
							},
						] as const
					).map(({ label, value, icon }) => (
						<Card key={label}>
							<CardBody className="flex items-center gap-3">
								<div className="p-2 rounded-lg bg-primary/10">
									<Icon icon={icon} className="text-primary" size={18} />
								</div>
								<div>
									<p className="text-2xl font-bold">{value}</p>
									<p className="text-xs text-muted">{label} (7d)</p>
								</div>
							</CardBody>
						</Card>
					))}
				</div>
			)}

			{/* Webhooks list */}
			<Card>
				<CardBody className="p-0">
					{webhooksLoading ? (
						<div className="flex justify-center p-8">
							<Spinner />
						</div>
					) : webhooks.length === 0 ? (
						<div className="p-8">
							<EmptyState
								icon="CloudUpload"
								title="No webhooks registered"
								description="Add an HTTPS endpoint to start receiving event notifications."
								action={
									<Button variant="primary" onClick={openCreate}>
										<Icon icon={IconType.Add} />
										Add Endpoint
									</Button>
								}
							/>
						</div>
					) : (
						<div className="divide-y divide-border">
							{webhooks.map((wh) => (
								<div key={wh.webhookId} className="p-4 space-y-3">
									{/* Endpoint row */}
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<code className="text-sm font-mono break-all">{wh.url}</code>
												<Chip variant={wh.isActive ? "success" : "default"} size="sm">
													{wh.isActive ? "Active" : "Inactive"}
												</Chip>
											</div>
											{wh.description && (
												<Text className="text-xs text-muted mt-0.5">{wh.description}</Text>
											)}
											<div className="flex flex-wrap gap-1 mt-2">
												{wh.events.slice(0, 8).map((e) => (
													<Chip key={e} size="sm" variant="default">
														<code className="text-xs">{e}</code>
													</Chip>
												))}
												{wh.events.length > 8 && (
													<Chip size="sm" variant="default">+{wh.events.length - 8} more</Chip>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<Button variant="secondary" size="sm" onClick={() => openEdit(wh)}>
												Edit
											</Button>
											<Button
												variant="secondary"
												size="sm"
												onClick={() => handleToggleActive(wh)}
											>
												{wh.isActive ? "Disable" : "Enable"}
											</Button>
											<Button
												variant="secondary"
												size="sm"
												onClick={() => setRotateTarget(wh)}
											>
												<Icon icon={IconType.Refresh} size={14} />
												Rotate Secret
											</Button>
											<Button
												variant="secondary"
												size="sm"
												onClick={() => openTestModal(wh)}
											>
												<Icon icon={IconType.Flash} size={14} />
												Send Test
											</Button>
											<Button
												variant="danger"
												size="sm"
												onClick={() => setDeactivateTarget(wh)}
											>
												Remove
											</Button>
										</div>
									</div>

									{/* Delivery logs toggle */}
									<div>
										<button
											type="button"
											className="text-xs text-primary hover:underline"
											onClick={() =>
												setExpandedLogs(expandedLogs === wh.webhookId ? null : wh.webhookId)
											}
										>
											{expandedLogs === wh.webhookId ? "Hide delivery logs" : "View delivery logs"}
										</button>
										{expandedLogs === wh.webhookId && (
											<div className="mt-3">
												<WebhookLogsPanel appId={appId || ""} webhook={wh} />
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</CardBody>
			</Card>

			{/* Create / Edit Modal */}
			{showCreateModal && (
				<Dialog open onOpenChange={(open) => { if (!open) setShowCreateModal(false); }}>
					<DialogPopup className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>{editingWebhook ? "Edit Webhook Endpoint" : "Register Webhook Endpoint"}</DialogTitle>
						</DialogHeader>
						<DialogBody className="space-y-5">
							<div className="space-y-1.5">
								<Label htmlFor="webhook-url">Endpoint URL</Label>
								<Input
									id="webhook-url"
									type="url"
									placeholder="https://example.com/webhooks/nube-auth"
									value={form.url}
									onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="webhook-description">Description (optional)</Label>
								<Input
									id="webhook-description"
									placeholder="e.g. Production webhook handler"
									value={form.description}
									onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
								/>
							</div>
							<div className="space-y-2">
								<Label>Events to send</Label>
								<div className="border border-border rounded-lg p-3 max-h-72 overflow-y-auto">
									<EventSelector
										selected={form.events}
										onChange={(events) => setForm((f) => ({ ...f, events }))}
									/>
								</div>
								{form.events.length > 0 && (
									<Text className="text-xs text-muted">
										{form.events.length} event{form.events.length !== 1 ? "s" : ""} selected
									</Text>
								)}
							</div>
						</DialogBody>
						<DialogFooter>
							<Button variant="secondary" onClick={() => setShowCreateModal(false)}>
								Cancel
							</Button>
							<Button variant="primary" onClick={handleSave} disabled={saving}>
								{saving ? <Spinner className="size-4" /> : null}
								{editingWebhook ? "Save Changes" : "Register Endpoint"}
							</Button>
						</DialogFooter>
					</DialogPopup>
				</Dialog>
			)}

			{/* Secret display modal */}
			{shownSecret && <SecretModal secret={shownSecret} onClose={() => setShownSecret(null)} />}

			{/* Confirm remove */}
			{deactivateTarget && (
				<ConfirmModal
					isOpen
					title="Remove Webhook"
					message={`Remove the webhook endpoint for ${deactivateTarget.url}? This will stop all deliveries immediately.`}
					confirmText="Remove"
					variant="danger"
					onConfirm={handleDelete}
					onClose={() => setDeactivateTarget(null)}
				/>
			)}

			{/* Confirm rotate secret */}
			{rotateTarget && (
				<ConfirmModal
					isOpen
					title="Rotate Signing Secret"
					message="A new signing secret will be generated. You must update your webhook handler immediately — the old secret becomes invalid right away."
					confirmText="Rotate Secret"
					variant="warning"
					onConfirm={handleRotateSecret}
					onClose={() => setRotateTarget(null)}
				/>
			)}

			{/* Test event dialog */}
			{testTarget && (
				<Dialog open onOpenChange={(open) => { if (!open) setTestTarget(null); }}>
					<DialogPopup>
						<DialogHeader>
							<DialogTitle>Send Test Event</DialogTitle>
						</DialogHeader>
						<DialogBody className="space-y-4">
							<Text className="text-sm text-muted">
								Send a sample payload to{" "}
								<code className="text-xs">{testTarget.url}</code> immediately,
								by-passing the delivery queue so you get instant feedback.
							</Text>
							<div className="space-y-1.5">
								<Label htmlFor="test-event-select">Event type</Label>
								<Select value={testEvent} onValueChange={(v) => setTestEvent(v as string)}>
									<SelectTrigger id="test-event-select">
										<SelectValue placeholder="Choose event" />
									</SelectTrigger>
									<SelectPopup>
										<SelectList>
											{SUPPORTED_EVENTS.map((e) => (
												<SelectItem key={e} value={e}>
													<code className="text-xs">{e}</code>
												</SelectItem>
											))}
										</SelectList>
									</SelectPopup>
								</Select>
							</div>
							{testResult && (
								<div className="rounded-lg border border-border p-3 space-y-1">
									<div className="flex items-center gap-2">
										<Chip variant={testResult.success ? "success" : "danger"} size="sm">
											{testResult.success ? "Delivered" : "Failed"}
										</Chip>
										{testResult.responseStatus != null && (
											<Text className="text-xs text-muted">HTTP {testResult.responseStatus}</Text>
										)}
										<Text className="text-xs text-muted">{testResult.durationMs}ms</Text>
									</div>
									{!testResult.success && (
										<Text className="text-xs text-muted">
											Check the delivery logs for more details.
										</Text>
									)}
								</div>
							)}
						</DialogBody>
						<DialogFooter>
							<Button variant="secondary" onClick={() => setTestTarget(null)}>
								Close
							</Button>
							<Button variant="primary" onClick={handleSendTest} disabled={testing}>
								{testing ? <Spinner className="size-4" /> : <Icon icon={IconType.Flash} size={14} />}
								Send Test Event
							</Button>
						</DialogFooter>
					</DialogPopup>
				</Dialog>
			)}
		</div>
	);
}
