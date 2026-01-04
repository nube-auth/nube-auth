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
		const styles: Record<string, { bg: string; color: string; icon: string }> = {
			success: { bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e", icon: "✓" },
			failed: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", icon: "✗" },
			processing: { bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", icon: "⟳" },
			not_started: { bg: "rgba(107, 114, 128, 0.1)", color: "#6b7280", icon: "○" },
		};
		const style = styles[status] || styles["not_started"];
		return (
			<span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", background: style!.bg, color: style!.color, borderRadius: "12px", fontSize: "12px", fontWeight: "500" }}>
				<span>{style!.icon}</span>
				<span style={{ textTransform: "capitalize" }}>{status.replace("_", " ")}</span>
			</span>
		);
	};

	const handleProviderBadge = (provider: string) => {
		const colors: Record<string, { bg: string; color: string }> = {
			lemon_squeezy: { bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e" },
			paddle: { bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" },
		};
		const color = colors[provider] || { bg: "#f3f4f6", color: "#6b7280" };
		return (
			<span style={{ display: "inline-block", padding: "4px 10px", background: color.bg, color: color.color, borderRadius: "12px", fontSize: "12px", fontWeight: "500", textTransform: "capitalize" }}>
				{provider === "lemon_squeezy" ? "LemonSqueezy" : "Paddle"}
			</span>
		);
	};

	if (activeTab === "detail" && selectedWebhook && detailQuery.data) {
		const webhook = detailQuery.data;
		return (
			<div>
				<div style={{ marginBottom: "24px" }}>
					<button onClick={() => setActiveTab("logs")} style={{ color: "var(--primary)", cursor: "pointer", background: "none", border: "none", fontSize: "14px", fontWeight: "500" }}>
						← Back to Logs
					</button>
				</div>

				<div className="card">
					<div style={{ padding: "24px" }}>
						<h2 style={{ marginTop: 0, marginBottom: "24px" }}>Webhook Details</h2>

						{/* Header Info */}
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
							<div>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>ID</div>
								<code style={{ fontSize: "13px", color: "var(--text-primary)", fontFamily: "monospace" }}>{webhook.id}</code>
							</div>
							<div>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Provider</div>
								<div>{handleProviderBadge(webhook.provider)}</div>
							</div>
							<div>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Status</div>
								<div>{handleStatusBadge(webhook.status)}</div>
							</div>
						</div>

						{/* Event Info */}
						<div style={{ padding: "16px", backgroundColor: "var(--surface-secondary)", borderRadius: "8px", marginBottom: "24px" }}>
							<h4 style={{ marginTop: 0, marginBottom: "12px", fontSize: "14px" }}>Event Information</h4>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
								<div>
									<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Event Type</div>
									<code style={{ fontSize: "13px", color: "var(--text-primary)", fontFamily: "monospace", textTransform: "uppercase" }}>{webhook.event_type}</code>
								</div>
								<div>
									<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Event ID</div>
									<code style={{ fontSize: "13px", color: "var(--text-primary)", fontFamily: "monospace" }}>{webhook.event_id}</code>
								</div>
							</div>
						</div>

						{/* Timing Info */}
						<div style={{ padding: "16px", backgroundColor: "var(--surface-secondary)", borderRadius: "8px", marginBottom: "24px" }}>
							<h4 style={{ marginTop: 0, marginBottom: "12px", fontSize: "14px" }}>Processing Timeline</h4>
							<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
								<div>
									<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Received At</div>
									<div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{new Date(webhook.received_at).toLocaleString()}</div>
								</div>
								<div>
									<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Processing Started</div>
									<div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
										{webhook.processing_started_at ? new Date(webhook.processing_started_at).toLocaleString() : "—"}
									</div>
								</div>
								<div>
									<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Completed</div>
									<div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
										{webhook.processing_completed_at ? new Date(webhook.processing_completed_at).toLocaleString() : "—"}
									</div>
								</div>
								<div>
									<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Duration</div>
									<div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "600" }}>
										{webhook.processing_duration_ms ? `${webhook.processing_duration_ms}ms` : "—"}
									</div>
								</div>
							</div>
						</div>

						{/* Retry Info */}
						<div style={{ padding: "16px", backgroundColor: "var(--surface-secondary)", borderRadius: "8px", marginBottom: "24px" }}>
							<h4 style={{ marginTop: 0, marginBottom: "12px", fontSize: "14px" }}>Retry Information</h4>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
								<div>
									<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Retry Count</div>
									<div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "600" }}>{webhook.retry_count}</div>
								</div>
								<div>
									<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Last Retry</div>
									<div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
										{webhook.last_retry_at ? new Date(webhook.last_retry_at).toLocaleString() : "Never"}
									</div>
								</div>
							</div>
						</div>

						{/* Network Info */}
						<div style={{ padding: "16px", backgroundColor: "var(--surface-secondary)", borderRadius: "8px", marginBottom: "24px" }}>
							<h4 style={{ marginTop: 0, marginBottom: "12px", fontSize: "14px" }}>Network Information</h4>
							<div>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>IP Address</div>
								<code style={{ fontSize: "13px", color: "var(--text-primary)", fontFamily: "monospace" }}>{webhook.ip_address}</code>
							</div>
						</div>

						{/* Request Headers */}
						<div style={{ padding: "16px", backgroundColor: "var(--surface-secondary)", borderRadius: "8px", marginBottom: "24px" }}>
							<h4 style={{ marginTop: 0, marginBottom: "12px", fontSize: "14px" }}>Request Headers</h4>
							<div style={{ maxHeight: "300px", overflowY: "auto", background: "var(--bg-primary)", borderRadius: "4px", padding: "12px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary)" }}>
								{Object.entries(webhook.request_headers || {}).map(([key, value]) => (
									<div key={key} style={{ marginBottom: "4px" }}>
										<span style={{ color: "var(--primary)", fontWeight: "600" }}>{key}:</span> <span style={{ color: "var(--text-secondary)" }}>{String(value)}</span>
									</div>
								))}
							</div>
						</div>

						{/* Request Body */}
						<div style={{ padding: "16px", backgroundColor: "var(--surface-secondary)", borderRadius: "8px", marginBottom: "24px" }}>
							<h4 style={{ marginTop: 0, marginBottom: "12px", fontSize: "14px" }}>Request Body</h4>
							<div style={{ maxHeight: "400px", overflowY: "auto", background: "var(--bg-primary)", borderRadius: "4px", padding: "12px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary)" }}>
								<pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
									{JSON.stringify(webhook.request_body, null, 2)}
								</pre>
							</div>
						</div>

						{/* Signature */}
						<div style={{ padding: "16px", backgroundColor: "var(--surface-secondary)", borderRadius: "8px", marginBottom: "24px" }}>
							<h4 style={{ marginTop: 0, marginBottom: "12px", fontSize: "14px" }}>Signature</h4>
							<div style={{ maxHeight: "200px", overflowY: "auto", background: "var(--bg-primary)", borderRadius: "4px", padding: "12px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary)", wordBreak: "break-all" }}>
								{webhook.signature}
							</div>
						</div>

						{/* Error Section (if failed) */}
						{webhook.status === "failed" && webhook.error_message && (
							<div style={{ padding: "16px", backgroundColor: "rgba(239, 68, 68, 0.1)", borderLeft: "3px solid #ef4444", borderRadius: "8px", marginBottom: "24px" }}>
								<h4 style={{ marginTop: 0, marginBottom: "12px", fontSize: "14px", color: "#ef4444" }}>Error Information</h4>
								<div style={{ marginBottom: "12px" }}>
									<div style={{ fontSize: "12px", color: "#dc2626", marginBottom: "4px", fontWeight: "600" }}>Error Message</div>
									<code style={{ fontSize: "13px", color: "#dc2626", display: "block", background: "rgba(239, 68, 68, 0.05)", padding: "8px", borderRadius: "4px" }}>
										{webhook.error_message}
									</code>
								</div>
								{webhook.error_stack && (
									<div>
										<div style={{ fontSize: "12px", color: "#dc2626", marginBottom: "4px", fontWeight: "600" }}>Stack Trace</div>
										<div style={{ maxHeight: "200px", overflowY: "auto", background: "rgba(239, 68, 68, 0.05)", borderRadius: "4px", padding: "12px", fontFamily: "monospace", fontSize: "11px", color: "#dc2626" }}>
											<pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{webhook.error_stack}</pre>
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
			<div style={{ marginBottom: "24px" }}>
				<h1 style={{ margin: 0, marginBottom: "8px" }}>Webhook Monitoring</h1>
				<p style={{ margin: 0, color: "var(--text-secondary)" }}>Monitor webhook deliveries and troubleshoot integration issues</p>
			</div>

			{/* Filters */}
			<div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
				<h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "16px" }}>Filters</h3>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
						gap: "16px",
						marginBottom: "16px",
					}}
				>
					<div className="form-group" style={{ margin: 0 }}>
						<label htmlFor="provider" style={{ fontSize: "12px", marginBottom: "6px" }}>
							Provider
						</label>
						<select
							id="provider"
							value={filters.provider}
							onChange={(e) => setFilters({ ...filters, provider: e.target.value, offset: 0 })}
							style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "14px" }}
						>
							<option value="">All Providers</option>
							<option value="lemon_squeezy">LemonSqueezy</option>
							<option value="paddle">Paddle</option>
						</select>
					</div>

					<div className="form-group" style={{ margin: 0 }}>
						<label htmlFor="status" style={{ fontSize: "12px", marginBottom: "6px" }}>
							Status
						</label>
						<select
							id="status"
							value={filters.status}
							onChange={(e) => setFilters({ ...filters, status: e.target.value, offset: 0 })}
							style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "14px" }}
						>
							<option value="">All Statuses</option>
							<option value="success">Success</option>
							<option value="failed">Failed</option>
							<option value="processing">Processing</option>
							<option value="not_started">Not Started</option>
						</select>
					</div>

					<div className="form-group" style={{ margin: 0 }}>
						<label htmlFor="startDate" style={{ fontSize: "12px", marginBottom: "6px" }}>
							Start Date
						</label>
						<input
							type="date"
							id="startDate"
							value={filters.start_date}
							onChange={(e) => setFilters({ ...filters, start_date: e.target.value, offset: 0 })}
							style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "14px" }}
						/>
					</div>

					<div className="form-group" style={{ margin: 0 }}>
						<label htmlFor="endDate" style={{ fontSize: "12px", marginBottom: "6px" }}>
							End Date
						</label>
						<input
							type="date"
							id="endDate"
							value={filters.end_date}
							onChange={(e) => setFilters({ ...filters, end_date: e.target.value, offset: 0 })}
							style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "14px" }}
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
				<div className="card" style={{ padding: "64px 24px", textAlign: "center" }}>
					<div style={{ fontSize: "64px", marginBottom: "16px" }}>🪝</div>
					<h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px", color: "var(--text-primary)" }}>
						No webhooks found
					</h2>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>
						Webhooks will appear here as payment providers send events to your webhook endpoints
					</p>
				</div>
			) : (
				<div className="card" style={{ padding: "0", overflow: "hidden" }}>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr style={{ borderBottom: "1px solid var(--border-primary)", background: "var(--surface-secondary)" }}>
								<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									Status
								</th>
								<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									Event Type
								</th>
								<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									Provider
								</th>
								<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									Received
								</th>
								<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									Duration
								</th>
								<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									Retries
								</th>
								<th style={{ padding: "14px 16px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{webhooksQuery.data.webhooks.map((webhook) => (
								<tr key={webhook.id} style={{ borderBottom: "1px solid var(--border-primary)" }}>
									<td style={{ padding: "14px 16px" }}>{handleStatusBadge(webhook.status)}</td>
									<td style={{ padding: "14px 16px", fontSize: "13px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
										{webhook.event_type}
									</td>
									<td style={{ padding: "14px 16px" }}>{handleProviderBadge(webhook.provider)}</td>
									<td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
										{new Date(webhook.received_at).toLocaleString()}
									</td>
									<td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>
										{webhook.processing_duration_ms ? `${webhook.processing_duration_ms}ms` : "—"}
									</td>
									<td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>
										{webhook.retry_count}
									</td>
									<td style={{ padding: "14px 16px", textAlign: "right" }}>
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
			{webhooksQuery.data && webhooksQuery.data.pagination && (
				<div style={{ marginTop: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
						Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, webhooksQuery.data.pagination.total)} of{" "}
						{webhooksQuery.data.pagination.total}
					</div>
					<div style={{ display: "flex", gap: "8px" }}>
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
