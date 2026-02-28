import { useState } from "react";
import { useWebhookLogs, useWebhookDetail } from "../hooks/api";
import {
	Heading,
	Text,
	Button,
	Card,
	CardBody,
	Label,
	Input,
	EmptyState,
	Table,
	TableContainer,
	TableHeader,
	TableHead,
	TableBody,
	TableRow,
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

	const handleStatusBadge = (status: string) => {
		const styles: Record<string, { bgClass: string; textClass: string; icon: string }> = {
			success: { bgClass: "bg-success/10", textClass: "text-success", icon: "✓" },
			failed: { bgClass: "bg-danger/10", textClass: "text-danger", icon: "✗" },
			processing: { bgClass: "bg-info/10", textClass: "text-info", icon: "⟳" },
			not_started: { bgClass: "bg-text-tertiary/10", textClass: "text-text-tertiary", icon: "○" },
		};
		const style = styles[status] || styles["not_started"];
		return (
			<span className={`inline-flex items-center gap-1 px-2.5 py-1 ${style!.bgClass} ${style!.textClass} rounded-xl text-12px font-medium`}>
				<span>{style!.icon}</span>
				<span className="capitalize">{status.replace("_", " ")}</span>
			</span>
		);
	};

	const handleProviderBadge = (provider: string) => {
		const colors: Record<string, { bgClass: string; textClass: string }> = {
			lemon_squeezy: { bgClass: "bg-success/10", textClass: "text-success" },
			paddle: { bgClass: "bg-info/10", textClass: "text-info" },
		};
		const color = colors[provider] || { bgClass: "bg-bg-muted", textClass: "text-text-tertiary" };
		return (
			<span className={`inline-block px-2.5 py-1 ${color.bgClass} ${color.textClass} rounded-xl text-12px font-medium capitalize`}>
				{provider === "lemon_squeezy" ? "LemonSqueezy" : "Paddle"}
			</span>
		);
	};

	if (activeTab === "detail" && selectedWebhook && detailQuery.data) {
		const webhook = detailQuery.data;
		return (
			<div>
				<div className="mb-6">
					<Button variant="plain" onClick={() => setActiveTab("logs")} className="text-primary">
						← Back to Logs
					</Button>
				</div>

				<Card>
					<CardBody>
						<Heading level={2} size="lg" className="mb-6">Webhook Details</Heading>

						{/* Header Info */}
						<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
							<div>
								<div className="text-12px text-text-tertiary mb-1">ID</div>
								<code className="text-13px text-text-primary font-mono">{webhook.id}</code>
							</div>
							<div>
								<div className="text-12px text-text-tertiary mb-1">Provider</div>
								<div>{handleProviderBadge(webhook.provider)}</div>
							</div>
							<div>
								<div className="text-12px text-text-tertiary mb-1">Status</div>
								<div>{handleStatusBadge(webhook.status)}</div>
							</div>
						</div>

						{/* Event Info */}
						<div className="p-4 bg-surface-secondary rounded-lg mb-6">
							<Heading level={4} size="sm" className="mb-3">Event Information</Heading>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="text-12px text-text-tertiary mb-1">Event Type</div>
									<code className="text-13px text-text-primary font-mono uppercase">{webhook.event_type}</code>
								</div>
								<div>
									<div className="text-12px text-text-tertiary mb-1">Event ID</div>
									<code className="text-13px text-text-primary font-mono">{webhook.event_id}</code>
								</div>
							</div>
						</div>

						{/* Timing Info */}
						<div className="p-4 bg-surface-secondary rounded-lg mb-6">
							<Heading level={4} size="sm" className="mb-3">Processing Timeline</Heading>
							<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
								<div>
									<div className="text-12px text-text-tertiary mb-1">Received At</div>
									<div className="text-13px text-text-primary">{new Date(webhook.received_at).toLocaleString()}</div>
								</div>
								<div>
									<div className="text-12px text-text-tertiary mb-1">Processing Started</div>
									<div className="text-13px text-text-primary">
										{webhook.processing_started_at ? new Date(webhook.processing_started_at).toLocaleString() : "—"}
									</div>
								</div>
								<div>
									<div className="text-12px text-text-tertiary mb-1">Completed</div>
									<div className="text-13px text-text-primary">
										{webhook.processing_completed_at ? new Date(webhook.processing_completed_at).toLocaleString() : "—"}
									</div>
								</div>
								<div>
									<div className="text-12px text-text-tertiary mb-1">Duration</div>
									<div className="text-13px text-text-primary font-semibold">
										{webhook.processing_duration_ms ? `${webhook.processing_duration_ms}ms` : "—"}
									</div>
								</div>
							</div>
						</div>

						{/* Retry Info */}
						<div className="p-4 bg-surface-secondary rounded-lg mb-6">
							<Heading level={4} size="sm" className="mb-3">Retry Information</Heading>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="text-12px text-text-tertiary mb-1">Retry Count</div>
									<div className="text-13px text-text-primary font-semibold">{webhook.retry_count}</div>
								</div>
								<div>
									<div className="text-12px text-text-tertiary mb-1">Last Retry</div>
									<div className="text-13px text-text-primary">
										{webhook.last_retry_at ? new Date(webhook.last_retry_at).toLocaleString() : "Never"}
									</div>
								</div>
							</div>
						</div>

						{/* Network Info */}
						<div className="p-4 bg-surface-secondary rounded-lg mb-6">
							<Heading level={4} size="sm" className="mb-3">Network Information</Heading>
							<div>
								<div className="text-12px text-text-tertiary mb-1">IP Address</div>
								<code className="text-13px text-text-primary font-mono">{webhook.ip_address}</code>
							</div>
						</div>

						{/* Request Headers */}
						<div className="p-4 bg-surface-secondary rounded-lg mb-6">
							<Heading level={4} size="sm" className="mb-3">Request Headers</Heading>
							<div className="max-h-75 overflow-y-auto bg-bg-primary rounded p-3 font-mono text-12px text-text-secondary">
								{Object.entries(webhook.request_headers || {}).map(([key, value]) => (
									<div key={key} className="mb-1">
										<span className="text-primary font-semibold">{key}:</span> <span className="text-text-secondary">{String(value)}</span>
									</div>
								))}
							</div>
						</div>

						{/* Request Body */}
						<div className="p-4 bg-surface-secondary rounded-lg mb-6">
							<Heading level={4} size="sm" className="mb-3">Request Body</Heading>
							<div className="max-h-100 overflow-y-auto bg-bg-primary rounded p-3 font-mono text-12px text-text-secondary">
								<pre className="m-0 whitespace-pre-wrap break-words">
									{JSON.stringify(webhook.request_body, null, 2)}
								</pre>
							</div>
						</div>

						{/* Signature */}
						<div className="p-4 bg-surface-secondary rounded-lg mb-6">
							<Heading level={4} size="sm" className="mb-3">Signature</Heading>
							<div className="max-h-50 overflow-y-auto bg-bg-primary rounded p-3 font-mono text-12px text-text-secondary break-all">
								{webhook.signature}
							</div>
						</div>

						{/* Error Section (if failed) */}
						{webhook.status === "failed" && webhook.error_message && (
							<div className="p-4 bg-danger/10 border-l-3 border-danger rounded-lg mb-6">
								<Heading level={4} size="sm" className="mb-3 text-danger">Error Information</Heading>
								<div className="mb-3">
									<div className="text-12px text-danger mb-1 font-semibold">Error Message</div>
									<code className="text-13px text-danger block bg-danger/5 p-2 rounded">
										{webhook.error_message}
									</code>
								</div>
								{webhook.error_stack && (
									<div>
										<div className="text-12px text-danger mb-1 font-semibold">Stack Trace</div>
										<div className="max-h-50 overflow-y-auto bg-danger/5 rounded p-3 font-mono text-11px text-danger">
											<pre className="m-0 whitespace-pre-wrap break-words">{webhook.error_stack}</pre>
										</div>
									</div>
								)}
								</div>
							)}
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
									{ value: "success", label: "Success" },
									{ value: "failed", label: "Failed" },
									{ value: "processing", label: "Processing" },
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
				<Card className="overflow-hidden">
					<CardBody className="p-0">
						<TableContainer>
							<Table>
						<TableHeader>
							<TableRow>
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
							
						</TableRow>
							</TableHeader>
							<TableBody>
								{webhooksQuery.data.webhooks.map((webhook) => (
									<TableRow key={webhook.id} className="hover:bg-accent transition-colors">
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
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</CardBody>
			</Card>
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
