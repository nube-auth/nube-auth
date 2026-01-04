import { useState } from "react";
import { useBillingPurchases, useBillingRefunds, useCreateRefund } from "../hooks/api";
import { useToast } from "../components/Toast";

export function RefundProcessingPage() {
	const [activeTab, setActiveTab] = useState<"refunds" | "create">("refunds");
	const [filters, setFilters] = useState({
		status: "",
		provider: "",
		limit: 50,
		offset: 0,
		start_date: "",
		end_date: "",
	});

	const [refundForm, setRefundForm] = useState({
		purchase_id: "",
		amount: "",
		reason: "",
	});

	const { showToast } = useToast();
	const refundsQuery = useBillingRefunds(filters);
	const purchasesQuery = useBillingPurchases({ limit: 100 });
	const createRefundMutation = useCreateRefund();

	const handleCreateRefund = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!refundForm.purchase_id || !refundForm.amount || !refundForm.reason) {
			showToast("Please fill in all required fields", "error");
			return;
		}

		const amount = parseFloat(refundForm.amount);
		if (isNaN(amount) || amount <= 0) {
			showToast("Refund amount must be greater than 0", "error");
			return;
		}

		try {
			await createRefundMutation.mutateAsync({
				purchase_id: refundForm.purchase_id,
				amount,
				reason: refundForm.reason,
			});
			showToast("Refund created successfully", "success");
			setRefundForm({ purchase_id: "", amount: "", reason: "" });
			setActiveTab("refunds");
		} catch (error) {
			showToast(error instanceof Error ? error.message : "Failed to create refund", "error");
		}
	};

	const handleStatusBadge = (status: string) => {
		const styles: Record<string, { bg: string; color: string; icon: string }> = {
			completed: { bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e", icon: "✓" },
			pending: { bg: "rgba(251, 191, 36, 0.1)", color: "#f59e0b", icon: "⏱" },
			processing: { bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", icon: "⟳" },
			failed: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", icon: "✗" },
		};
		const style = styles[status] || styles["pending"];
		return (
			<span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", background: style!.bg, color: style!.color, borderRadius: "12px", fontSize: "12px", fontWeight: "500" }}>
				<span>{style!.icon}</span>
				<span style={{ textTransform: "capitalize" }}>{status}</span>
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

	const formatCurrency = (amount: number, currency = "USD") => {
		return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
	};

	if (activeTab === "create") {
		return (
			<div>
				<div style={{ marginBottom: "24px" }}>
					<button onClick={() => setActiveTab("refunds")} style={{ color: "var(--primary)", cursor: "pointer", background: "none", border: "none", fontSize: "14px", fontWeight: "500" }}>
						← Back to Refunds
					</button>
				</div>

				<div className="card" style={{ maxWidth: "600px" }}>
					<div style={{ padding: "24px" }}>
						<h2 style={{ marginTop: 0, marginBottom: "24px" }}>Create Refund</h2>

						<form onSubmit={handleCreateRefund}>
							<div className="form-group" style={{ marginBottom: "20px" }}>
								<label htmlFor="purchase_id" style={{ fontWeight: "500", marginBottom: "8px", display: "block", fontSize: "14px" }}>
									Purchase <span style={{ color: "var(--danger)" }}>*</span>
								</label>
								<select
									id="purchase_id"
									value={refundForm.purchase_id}
									onChange={(e) => setRefundForm({ ...refundForm, purchase_id: e.target.value })}
									required
									style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "14px" }}
								>
									<option value="">Select a purchase...</option>
									{purchasesQuery.data?.data?.map((purchase) => (
										<option key={purchase.id} value={purchase.id}>
											{purchase.app?.name || "Unnamed App"} - {formatCurrency(purchase.amount, purchase.currency)} ({purchase.provider})
										</option>
									))}
								</select>
							</div>

							{refundForm.purchase_id && purchasesQuery.data?.data && (
								<div style={{ padding: "16px", backgroundColor: "var(--surface-secondary)", borderRadius: "8px", marginBottom: "20px" }}>
									<h4 style={{ marginTop: 0, marginBottom: "12px", fontSize: "14px" }}>Purchase Details</h4>
									{(() => {
										const purchase = purchasesQuery.data.data.find((p) => p.id === refundForm.purchase_id);
										if (!purchase) return null;
										return (
											<div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
												<div style={{ marginBottom: "8px" }}>
													<strong>App:</strong> {purchase.app?.name || "—"}
												</div>
												<div style={{ marginBottom: "8px" }}>
													<strong>Amount:</strong> {formatCurrency(purchase.amount, purchase.currency)}
												</div>
												<div>
													<strong>Provider:</strong> {handleProviderBadge(purchase.provider)}
												</div>
											</div>
										);
									})()}
								</div>
							)}

							<div className="form-group" style={{ marginBottom: "20px" }}>
								<label htmlFor="amount" style={{ fontWeight: "500", marginBottom: "8px", display: "block", fontSize: "14px" }}>
									Refund Amount <span style={{ color: "var(--danger)" }}>*</span>
								</label>
								<input
									type="number"
									id="amount"
									value={refundForm.amount}
									onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
									placeholder="0.00"
									step="0.01"
									min="0"
									required
									style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "14px" }}
								/>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
									Partial refunds are supported. Enter the amount to refund.
								</div>
							</div>

							<div className="form-group" style={{ marginBottom: "20px" }}>
								<label htmlFor="reason" style={{ fontWeight: "500", marginBottom: "8px", display: "block", fontSize: "14px" }}>
									Reason <span style={{ color: "var(--danger)" }}>*</span>
								</label>
								<select
									id="reason"
									value={refundForm.reason}
									onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
									required
									style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "14px" }}
								>
									<option value="">Select a reason...</option>
									<option value="customer_request">Customer Request</option>
									<option value="product_defect">Product Defect</option>
									<option value="duplicate_purchase">Duplicate Purchase</option>
									<option value="service_issue">Service Issue</option>
									<option value="user_error">User Error</option>
									<option value="other">Other</option>
								</select>
							</div>

							<div style={{ padding: "12px", backgroundColor: "rgba(59, 130, 246, 0.1)", borderRadius: "6px", marginBottom: "24px", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
								<div style={{ fontSize: "13px", color: "#3b82f6", lineHeight: "1.5" }}>
									<strong>ℹ️ Note:</strong> Refund processing may take 24-48 hours depending on the payment provider.
								</div>
							</div>

							<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
								<button type="button" onClick={() => setActiveTab("refunds")} className="btn btn-secondary">
									Cancel
								</button>
								<button type="submit" className="btn btn-primary" disabled={createRefundMutation.isPending}>
									{createRefundMutation.isPending ? "Processing..." : "Create Refund"}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<div>
					<h1 style={{ margin: 0, marginBottom: "8px" }}>Refund Processing</h1>
					<p style={{ margin: 0, color: "var(--text-secondary)" }}>Create and manage customer refunds</p>
				</div>
				<button onClick={() => setActiveTab("create")} className="btn btn-primary">
					+ Create Refund
				</button>
			</div>

			{/* Filters */}
			<div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
				<h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "16px" }}>Filters</h3>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
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
							<option value="completed">Completed</option>
							<option value="pending">Pending</option>
							<option value="processing">Processing</option>
							<option value="failed">Failed</option>
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
							status: "",
							provider: "",
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

			{/* Refunds Table */}
			{!refundsQuery.data || refundsQuery.data.refunds.length === 0 ? (
				<div className="card" style={{ padding: "64px 24px", textAlign: "center" }}>
					<div style={{ fontSize: "64px", marginBottom: "16px" }}>💰</div>
					<h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px", color: "var(--text-primary)" }}>
						No refunds yet
					</h2>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>
						Start by creating a refund for a customer purchase
					</p>
					<button onClick={() => setActiveTab("create")} className="btn btn-primary">
						+ Create Refund
					</button>
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
									Amount
								</th>
								<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									Provider
								</th>
								<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									Reason
								</th>
								<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									Created
								</th>
								<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
									App
								</th>
							</tr>
						</thead>
						<tbody>
							{refundsQuery.data.refunds.map((refund) => (
								<tr key={refund.id} style={{ borderBottom: "1px solid var(--border-primary)" }}>
									<td style={{ padding: "14px 16px" }}>{handleStatusBadge(refund.status)}</td>
									<td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
										{formatCurrency(refund.amount, refund.currency)}
									</td>
									<td style={{ padding: "14px 16px" }}>{handleProviderBadge(refund.provider)}</td>
									<td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)", textTransform: "capitalize" }}>
										{refund.reason?.replace(/_/g, " ") || "—"}
									</td>
									<td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
										{new Date(refund.created_at).toLocaleDateString()}
									</td>
									<td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
										{refund.purchase?.app?.name || "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Pagination */}
			{refundsQuery.data && refundsQuery.data.pagination && (
				<div style={{ marginTop: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
						Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, refundsQuery.data.pagination.total)} of{" "}
						{refundsQuery.data.pagination.total}
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
							disabled={!refundsQuery.data.pagination.hasMore}
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

export default RefundProcessingPage;
