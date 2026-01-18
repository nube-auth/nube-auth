import { useState } from "react";
import { useWebhookLogs, useWebhookDetail } from "../hooks/api";

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
					<button onClick={() => setActiveTab("logs")} className="text-primary cursor-pointer bg-transparent border-none text-14px font-medium">
						← Back to Logs
					</button>
				</div>

				<div className="card">
					<div className="p-6">
						<h2 className="mt-0 mb-6">Webhook Details</h2>

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
							<h4 className="mt-0 mb-3 text-14px">Event Information</h4>
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
							<h4 className="mt-0 mb-3 text-14px">Processing Timeline</h4>
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
							<h4 className="mt-0 mb-3 text-14px">Retry Information</h4>
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
							<h4 className="mt-0 mb-3 text-14px">Network Information</h4>
							<div>
								<div className="text-12px text-text-tertiary mb-1">IP Address</div>
								<code className="text-13px text-text-primary font-mono">{webhook.ip_address}</code>
							</div>
						</div>

						{/* Request Headers */}
						<div className="p-4 bg-surface-secondary rounded-lg mb-6">
							<h4 className="mt-0 mb-3 text-14px">Request Headers</h4>
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
							<h4 className="mt-0 mb-3 text-14px">Request Body</h4>
							<div className="max-h-100 overflow-y-auto bg-bg-primary rounded p-3 font-mono text-12px text-text-secondary">
								<pre className="m-0 whitespace-pre-wrap break-words">
									{JSON.stringify(webhook.request_body, null, 2)}
								</pre>
							</div>
						</div>

						{/* Signature */}
						<div className="p-4 bg-surface-secondary rounded-lg mb-6">
							<h4 className="mt-0 mb-3 text-14px">Signature</h4>
							<div className="max-h-50 overflow-y-auto bg-bg-primary rounded p-3 font-mono text-12px text-text-secondary break-all">
								{webhook.signature}
							</div>
						</div>

						{/* Error Section (if failed) */}
						{webhook.status === "failed" && webhook.error_message && (
							<div className="p-4 bg-danger/10 border-l-3 border-danger rounded-lg mb-6">
								<h4 className="mt-0 mb-3 text-14px text-danger">Error Information</h4>
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
					</div>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h1 className="m-0 mb-2">Webhook Monitoring</h1>
				<p className="m-0 text-text-secondary">Monitor webhook deliveries and troubleshoot integration issues</p>
			</div>

			{/* Filters */}
			<div className="card mb-6 p-6">
				<h3 className="mt-0 mb-4 text-16px">Filters</h3>
				<div
					className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4"
				>
					<div className="form-group m-0">
						<label htmlFor="provider" className="text-12px mb-1.5">
							Provider
						</label>
						<select
							id="provider"
							value={filters.provider}
							onChange={(e) => setFilters({ ...filters, provider: e.target.value, offset: 0 })}
							className="w-full p-2 rounded-md border border-border-color text-14px"
						>
							<option value="">All Providers</option>
							<option value="lemon_squeezy">LemonSqueezy</option>
							<option value="paddle">Paddle</option>
						</select>
					</div>

					<div className="form-group m-0">
						<label htmlFor="status" className="text-12px mb-1.5">
							Status
						</label>
						<select
							id="status"
							value={filters.status}
							onChange={(e) => setFilters({ ...filters, status: e.target.value, offset: 0 })}
							className="w-full p-2 rounded-md border border-border-color text-14px"
						>
							<option value="">All Statuses</option>
							<option value="success">Success</option>
							<option value="failed">Failed</option>
							<option value="processing">Processing</option>
							<option value="not_started">Not Started</option>
						</select>
					</div>

					<div className="form-group m-0">
						<label htmlFor="startDate" className="text-12px mb-1.5">
							Start Date
						</label>
						<input
							type="date"
							id="startDate"
							value={filters.start_date}
							onChange={(e) => setFilters({ ...filters, start_date: e.target.value, offset: 0 })}
							className="w-full p-2 rounded-md border border-border-color text-14px"
						/>
					</div>

					<div className="form-group m-0">
						<label htmlFor="endDate" className="text-12px mb-1.5">
							End Date
						</label>
						<input
							type="date"
							id="endDate"
							value={filters.end_date}
							onChange={(e) => setFilters({ ...filters, end_date: e.target.value, offset: 0 })}
							className="w-full p-2 rounded-md border border-border-color text-14px"
						/>
					</div>
				</div>

				<button
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
					className="btn btn-secondary-outline btn-sm"
				>
					Clear Filters
				</button>
			</div>

			{/* Webhooks Table */}
			{!webhooksQuery.data || webhooksQuery.data.webhooks.length === 0 ? (
				<div className="card py-16 px-6 text-center">
					<div className="text-64px mb-4">🪝</div>
					<h2 className="text-20px font-semibold mb-3 text-text-primary">
						No webhooks found
					</h2>
					<p className="text-14px text-text-tertiary mb-6 max-w-100 mx-auto">
						Webhooks will appear here as payment providers send events to your webhook endpoints
					</p>
				</div>
			) : (
				<div className="card p-0 overflow-hidden">
					<table className="w-full border-collapse">
						<thead>
							<tr className="border-b border-border-primary bg-surface-secondary">
								<th className="px-4 py-3.5 text-left text-12px font-semibold text-text-tertiary uppercase tracking-wide">
									Status
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-semibold text-text-tertiary uppercase tracking-wide">
									Event Type
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-semibold text-text-tertiary uppercase tracking-wide">
									Provider
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-semibold text-text-tertiary uppercase tracking-wide">
									Received
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-semibold text-text-tertiary uppercase tracking-wide">
									Duration
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-semibold text-text-tertiary uppercase tracking-wide">
									Retries
								</th>
								<th className="px-4 py-3.5 text-right text-12px font-semibold text-text-tertiary uppercase tracking-wide">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{webhooksQuery.data.webhooks.map((webhook) => (
								<tr key={webhook.id} className="border-b border-border-primary">
									<td className="px-4 py-3.5">{handleStatusBadge(webhook.status)}</td>
									<td className="px-4 py-3.5 text-13px font-mono text-text-secondary">
										{webhook.event_type}
									</td>
									<td className="px-4 py-3.5">{handleProviderBadge(webhook.provider)}</td>
									<td className="px-4 py-3.5 text-13px text-text-secondary">
										{new Date(webhook.received_at).toLocaleString()}
									</td>
									<td className="px-4 py-3.5 text-13px text-text-secondary font-medium">
										{webhook.processing_duration_ms ? `${webhook.processing_duration_ms}ms` : "—"}
									</td>
									<td className="px-4 py-3.5 text-13px text-text-secondary font-medium">
										{webhook.retry_count}
									</td>
									<td className="px-4 py-3.5 text-right">
										<button
											onClick={() => {
												setSelectedWebhook(webhook.id);
												setActiveTab("detail");
											}}
											className="btn btn-secondary-outline btn-sm"
										>
											View
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Pagination */}
			{webhooksQuery.data?.pagination && (
				<div className="mt-6 flex items-center justify-between">
					<div className="text-14px text-text-secondary">
						Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, webhooksQuery.data.pagination.total)} of{" "}
						{webhooksQuery.data.pagination.total}
					</div>
					<div className="flex gap-2">
						<button
							onClick={() =>
								setFilters({
									...filters,
									offset: Math.max(0, filters.offset - filters.limit),
								})
							}
							disabled={filters.offset === 0}
							className="btn btn-secondary-outline btn-sm"
						>
							Previous
						</button>
						<button
							onClick={() =>
								setFilters({
									...filters,
									offset: filters.offset + filters.limit,
								})
							}
							disabled={!webhooksQuery.data.pagination.hasMore}
							className="btn btn-secondary-outline btn-sm"
						>
							Next
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export default WebhookMonitoringPage;
