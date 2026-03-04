import { useState } from "react";
import { useWebhookLogs, useWebhookDetail, useRetryWebhook } from "../hooks/api";
import {
	Heading,
	Text,
	Button,
	Card,
	CardBody,
	Label,
	Input,
	Chip,
	EmptyState,
	DataTable,
	DataTableRow,
	TableHeader,
	TableHead,
	TableBody,
	TableCell,
} from "@proofa/components";
import { Select } from "../components/Select";

export function WebhookMonitoringPage() {
	const [activeTab, setActiveTab] = useState<"logs" | "detail">("logs");
	const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
	const [filters, setFilters] = useState({
		provider: "",
		status: "",
		event_type: "",
		limit: 50,
		offset: 0,
		start_date: "",
		end_date: "",
	});

	const webhooksQuery = useWebhookLogs(filters);
	const detailQuery = useWebhookDetail(selectedWebhook || "");
	const retryWebhook = useRetryWebhook();
	const [retryingWebhookId, setRetryingWebhookId] = useState<string | null>(null);

	const handleStatusBadge = (status: string) => {
		const variants: Record<string, "success" | "danger" | "info" | "default"> = {
			completed: "success",
			failed: "danger",
			signature_failed: "danger",
			processing: "info",
			picked: "info",
			not_started: "default",
			skipped: "default",
		};
		return (
			<Chip variant={variants[status] || "default"} size="sm" className="capitalize">
				{status.replace("_", " ")}
			</Chip>
		);
	};

	const handleProviderBadge = (provider: string) => {
		const variants: Record<string, "success" | "info" | "default"> = {
			dodo: "info",
			stripe: "info",
			lemon_squeezy: "success",
			paddle: "info",
		};
		return (
			<Chip variant={variants[provider] || "default"} size="sm">
				{provider === "lemon_squeezy" ? "LemonSqueezy" : provider === "dodo" ? "Dodo" : provider === "stripe" ? "Stripe" : "Paddle"}
			</Chip>
		);
	};

	const canRetryWebhook = (status: string) =>
		status === "failed" || status === "signature_failed" || status === "skipped";

	if (activeTab === "detail" && selectedWebhook && detailQuery.data) {
		const webhook = detailQuery.data;
		const isRetryable = canRetryWebhook(webhook.status);
		return (
			<div>
				<div className="mb-4 flex items-center justify-between gap-3">
					<Button variant="plain" onClick={() => setActiveTab("logs")} className="text-primary">
						← Back to Logs
					</Button>
					<div className="flex items-center gap-2">
						{isRetryable && (
							<Button
								variant="secondary"
								size="sm"
								disabled={retryWebhook.isPending && retryingWebhookId === webhook.id}
								onClick={async () => {
									setRetryingWebhookId(webhook.id);
									try {
										await retryWebhook.mutateAsync(webhook.id);
									} finally {
										setRetryingWebhookId(null);
									}
								}}
							>
								{retryWebhook.isPending && retryingWebhookId === webhook.id ? "Retrying..." : "Retry Webhook"}
							</Button>
						)}
					</div>
				</div>

				<Card>
					<CardBody>
						<div className="mb-5 flex items-center justify-between gap-3">
							<div>
								<Heading level={2} size="lg">Webhook Event</Heading>
								<Text className="text-text-secondary mt-1">
									Complete delivery trace and payload diagnostics
								</Text>
							</div>
							<div className="flex items-center gap-2">
								{handleProviderBadge(webhook.provider)}
								{handleStatusBadge(webhook.status)}
							</div>
						</div>

						<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
							<div className="rounded-lg bg-surface-secondary p-3">
								<div className="text-11px uppercase tracking-wide text-text-tertiary mb-1">Webhook ID</div>
								<code className="text-13px text-text-primary font-mono">{webhook.id}</code>
							</div>
							<div className="rounded-lg bg-surface-secondary p-3">
								<div className="text-11px uppercase tracking-wide text-text-tertiary mb-1">Event Type</div>
								<code className="text-13px text-text-primary font-mono uppercase">{webhook.event_type}</code>
							</div>
							<div className="rounded-lg bg-surface-secondary p-3">
								<div className="text-11px uppercase tracking-wide text-text-tertiary mb-1">Received</div>
								<div className="text-13px text-text-primary">{new Date(webhook.received_at).toLocaleString()}</div>
							</div>
							<div className="rounded-lg bg-surface-secondary p-3">
								<div className="text-11px uppercase tracking-wide text-text-tertiary mb-1">Duration</div>
								<div className="text-13px font-semibold text-text-primary">
									{webhook.processing_duration_ms ? `${webhook.processing_duration_ms}ms` : "—"}
								</div>
							</div>
						</div>

						{webhook.error_message && (webhook.status === "failed" || webhook.status === "signature_failed") && (
							<div className="mb-5 rounded-lg border border-danger/30 bg-danger/10 p-3">
								<div className="text-12px text-danger font-semibold mb-1">Failure Reason</div>
								<code className="text-12px text-danger font-mono wrap-break-word">{webhook.error_message}</code>
							</div>
						)}

						<div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
							<div className="xl:col-span-4 space-y-4">
								<div className="rounded-lg bg-surface-secondary p-4">
									<Heading level={4} size="sm" className="mb-3">Processing Timeline</Heading>
									<div className="space-y-2 text-13px">
										<div className="flex justify-between gap-2">
											<span className="text-text-tertiary">Started</span>
											<span className="text-text-primary text-right">{webhook.processing_started_at ? new Date(webhook.processing_started_at).toLocaleString() : "—"}</span>
										</div>
										<div className="flex justify-between gap-2">
											<span className="text-text-tertiary">Completed</span>
											<span className="text-text-primary text-right">{webhook.processing_completed_at ? new Date(webhook.processing_completed_at).toLocaleString() : "—"}</span>
										</div>
									</div>
								</div>

								<div className="rounded-lg bg-surface-secondary p-4">
									<Heading level={4} size="sm" className="mb-3">Retry State</Heading>
									<div className="space-y-2 text-13px">
										<div className="flex justify-between gap-2">
											<span className="text-text-tertiary">Retry Count</span>
											<span className="text-text-primary font-semibold">{webhook.retry_count}</span>
										</div>
										<div className="flex justify-between gap-2">
											<span className="text-text-tertiary">Last Retry</span>
											<span className="text-text-primary text-right">{webhook.last_retry_at ? new Date(webhook.last_retry_at).toLocaleString() : "Never"}</span>
										</div>
									</div>
								</div>

								<div className="rounded-lg bg-surface-secondary p-4">
									<Heading level={4} size="sm" className="mb-3">Network</Heading>
									<div className="text-12px text-text-tertiary mb-1">IP Address</div>
									<code className="text-13px text-text-primary font-mono">{webhook.ip_address || "unknown"}</code>
								</div>

								{webhook.event_id && (
									<div className="rounded-lg bg-surface-secondary p-4">
										<Heading level={4} size="sm" className="mb-3">Provider Event ID</Heading>
										<code className="text-12px text-text-primary font-mono wrap-break-word">{webhook.event_id}</code>
									</div>
								)}
							</div>

							<div className="xl:col-span-8 space-y-4">
								<div className="rounded-lg bg-surface-secondary p-4">
									<Heading level={4} size="sm" className="mb-3">Request Headers</Heading>
									<div className="max-h-64 overflow-y-auto bg-bg-primary rounded p-3 font-mono text-12px text-text-secondary">
										{Object.entries(webhook.request_headers || {}).map(([key, value]) => (
											<div key={key} className="mb-1">
												<span className="text-primary font-semibold">{key}:</span>{" "}
												<span className="text-text-secondary wrap-break-word">{String(value)}</span>
											</div>
										))}
									</div>
								</div>

								<div className="grid grid-cols-1 gap-4 w-full">
									<div className="rounded-lg bg-surface-secondary p-4">
										<Heading level={4} size="sm" className="mb-3">Signature</Heading>
										<div className="max-h-56 overflow-y-auto bg-bg-primary rounded p-3 font-mono text-11px text-text-secondary wrap-break-word">
											{webhook.signature}
										</div>
									</div>

									{webhook.error_stack && (
										<div className="rounded-lg bg-danger/10 border border-danger/30 p-4">
											<Heading level={4} size="sm" className="mb-3 text-danger">Stack Trace</Heading>
											<div className="max-h-56 overflow-y-auto bg-danger/5 rounded p-3 font-mono text-11px text-danger">
												<pre className="m-0 whitespace-pre-wrap wrap-break-word">{webhook.error_stack}</pre>
											</div>
										</div>
									)}
								</div>

								<div className="rounded-lg bg-surface-secondary p-4 w-full">
									<Heading level={4} size="sm" className="mb-3">Request Body</Heading>
									<div className="max-h-130 overflow-y-auto bg-bg-primary rounded p-3 font-mono text-12px text-text-secondary">
										<pre className="m-0 whitespace-pre-wrap wrap-break-word">
											{JSON.stringify(webhook.request_body, null, 2)}
										</pre>
									</div>
								</div>
							</div>
						</div>
					</CardBody>
				</Card>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<Heading level={1} size="lg" className="mb-2">Webhook Monitoring</Heading>
				<Text className="text-text-secondary">Monitor webhook deliveries and troubleshoot integration issues</Text>
			</div>

			{/* Filters */}
			<Card className="mb-6">
				<CardBody>
					<Heading level={3} size="md" className="mb-4">Filters</Heading>
				<div
					className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4"
				>
						<div>
							<Label>Provider</Label>
							<Select
								value={filters.provider}
								onChange={(value) => setFilters({ ...filters, provider: value, offset: 0 })}
								placeholder="All Providers"
								options={[
									{ value: "", label: "All Providers" },
									{ value: "lemon_squeezy", label: "LemonSqueezy" },
									{ value: "paddle", label: "Paddle" },
								]}
							/>
						</div>

						<div>
							<Label>Status</Label>
							<Select
								value={filters.status}
								onChange={(value) => setFilters({ ...filters, status: value, offset: 0 })}
								placeholder="All Statuses"
								options={[
									{ value: "", label: "All Statuses" },
									{ value: "completed", label: "Completed" },
									{ value: "failed", label: "Failed" },
									{ value: "signature_failed", label: "Signature Failed" },
									{ value: "processing", label: "Processing" },
									{ value: "picked", label: "Picked" },
									{ value: "skipped", label: "Skipped" },
									{ value: "not_started", label: "Not Started" },
								]}
							/>
						</div>

						<div>
							<Label>Start Date</Label>
							<Input
								type="date"
								value={filters.start_date}
								onChange={(e) => setFilters({ ...filters, start_date: e.target.value, offset: 0 })}
							/>
						</div>

						<div>
							<Label>End Date</Label>
							<Input
								type="date"
								value={filters.end_date}
								onChange={(e) => setFilters({ ...filters, end_date: e.target.value, offset: 0 })}
							/>
						</div>
				</div>

				<Button
					variant="secondary"
					size="sm"
					onClick={() =>
						setFilters({
							provider: "",
							status: "",
							event_type: "",
							limit: 50,
							offset: 0,
							start_date: "",
							end_date: "",
						})
					}
				>
					Clear Filters
				</Button>
			</CardBody>
		</Card>
			{/* Webhooks Table */}
			{!webhooksQuery.data || webhooksQuery.data.webhooks.length === 0 ? (
				<EmptyState
					
					title="No webhooks found"
					description="Webhooks will appear here as payment providers send events to your webhook endpoints"
				/>
			) : (
				<DataTable>
						<TableHeader>
							<tr>
								<TableHead>
									Status
								</TableHead>
								<TableHead>
									Event Type
								</TableHead>
								<TableHead>
									Provider
								</TableHead>
								<TableHead>
									Received
								</TableHead>
								<TableHead>
									Duration
								</TableHead>
								<TableHead>
									Retries
								</TableHead>
								<TableHead align="right">
									Actions
								</TableHead>
							
						</tr>
							</TableHeader>
							<TableBody>
								{webhooksQuery.data.webhooks.map((webhook) => (
								<DataTableRow key={webhook.id}>
										<TableCell>{handleStatusBadge(webhook.status)}</TableCell>
										<TableCell>
											<Text className="font-mono text-sm text-text-secondary">
												{webhook.event_type}
											</Text>
										</TableCell>
										<TableCell>{handleProviderBadge(webhook.provider)}</TableCell>
										<TableCell>
											<Text className="text-text-secondary">
												{new Date(webhook.received_at).toLocaleString()}
											</Text>
										</TableCell>
										<TableCell>
											<Text className="text-text-secondary font-medium">
												{webhook.processing_duration_ms ? `${webhook.processing_duration_ms}ms` : "—"}
											</Text>
										</TableCell>
										<TableCell>
											<Text className="text-text-secondary font-medium">
												{webhook.retry_count}
											</Text>
										</TableCell>
										<TableCell align="right">
											<div className="flex justify-end gap-2">
												{canRetryWebhook(webhook.status) && (
													<Button
														variant="secondary"
														size="sm"
														disabled={retryWebhook.isPending && retryingWebhookId === webhook.id}
														onClick={async () => {
															setRetryingWebhookId(webhook.id);
															try {
																await retryWebhook.mutateAsync(webhook.id);
															} finally {
																setRetryingWebhookId(null);
															}
														}}
													>
														{retryWebhook.isPending && retryingWebhookId === webhook.id ? "Retrying..." : "Retry"}
													</Button>
												)}
												<Button
													variant="secondary"
													size="sm"
													onClick={() => {
														setSelectedWebhook(webhook.id);
														setActiveTab("detail");
													}}
												>
													View
												</Button>
											</div>
										</TableCell>
									</DataTableRow>
								))}
							</TableBody>
			</DataTable>
			)}

			{/* Pagination */}
			{webhooksQuery.data?.pagination && (
				<div className="mt-6 flex items-center justify-between">
					<Text className="text-text-secondary">
						Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, webhooksQuery.data.pagination.total)} of{" "}
						{webhooksQuery.data.pagination.total}
					</Text>
					<div className="flex gap-2">
						<Button
							onClick={() =>
								setFilters({
									...filters,
									offset: Math.max(0, filters.offset - filters.limit),
								})
							}
							disabled={filters.offset === 0}
							variant="secondary"
							size="sm"
						>
							Previous
						</Button>
						<Button
							onClick={() =>
								setFilters({
									...filters,
									offset: filters.offset + filters.limit,
								})
							}
							disabled={!webhooksQuery.data.pagination.hasMore}
							variant="secondary"
							size="sm"
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

export default WebhookMonitoringPage;
