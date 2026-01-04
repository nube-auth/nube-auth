import { useState } from "react";
import { useBillingTransactions } from "../hooks/api";
import { useToast } from "../components/Toast";

export function TransactionExportPage() {
	const [filters, setFilters] = useState({
		type: "",
		status: "",
		provider: "",
		limit: 1000,
		offset: 0,
		start_date: "",
		end_date: "",
	});

	const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
	const [isExporting, setIsExporting] = useState(false);

	const { showToast } = useToast();
	const transactionsQuery = useBillingTransactions(filters);

	const formatCurrency = (amount: number, currency = "USD") => {
		return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleString();
	};

	const handleExport = async () => {
		if (!transactionsQuery.data || transactionsQuery.data.data.length === 0) {
			showToast("No transactions to export", "error");
			return;
		}

		setIsExporting(true);

		try {
			const transactions = transactionsQuery.data.data;

			if (exportFormat === "csv") {
				// Create CSV content
				const headers = [
					"ID",
					"Date",
					"Type",
					"Status",
					"Amount",
					"Currency",
					"Provider",
					"Purchase ID",
					"Created At",
				];

				const rows = transactions.map((txn) => [
					txn.id,
					formatDate(txn.created_at),
					txn.type,
					txn.status,
					txn.amount,
					txn.currency,
					txn.provider,
					txn.purchase_id,
					new Date(txn.created_at).toISOString(),
				]);

				const csvContent = [
					headers.join(","),
					...rows.map((row) =>
						row
							.map((cell) => {
								// Escape quotes and wrap in quotes if contains comma
								const stringCell = String(cell);
								if (stringCell.includes(",") || stringCell.includes('"') || stringCell.includes("\n")) {
									return `"${stringCell.replace(/"/g, '""')}"`;
								}
								return stringCell;
							})
							.join(","),
					),
				].join("\n");

				// Download CSV
				const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
				const link = document.createElement("a");
				link.href = URL.createObjectURL(blob);
				link.download = `transactions-export-${new Date().toISOString().split("T")[0]}.csv`;
				link.click();
				URL.revokeObjectURL(link.href);

				showToast(`Exported ${transactions.length} transactions as CSV`, "success");
			} else if (exportFormat === "json") {
				// Create JSON content
				const jsonContent = {
					exportedAt: new Date().toISOString(),
					totalCount: transactionsQuery.data.pagination?.total || transactions.length,
					transactionsCount: transactions.length,
					filters: {
						type: filters.type || null,
						status: filters.status || null,
						provider: filters.provider || null,
						start_date: filters.start_date || null,
						end_date: filters.end_date || null,
					},
					transactions: transactions.map((txn) => ({
						id: txn.id,
						date: new Date(txn.created_at).toISOString(),
						type: txn.type,
						status: txn.status,
						amount: txn.amount,
						currency: txn.currency,
						provider: txn.provider,
						purchase_id: txn.purchase_id,
						created_at: txn.created_at,
						updated_at: txn.updated_at,
					})),
				};

				// Download JSON
				const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: "application/json;charset=utf-8;" });
				const link = document.createElement("a");
				link.href = URL.createObjectURL(blob);
				link.download = `transactions-export-${new Date().toISOString().split("T")[0]}.json`;
				link.click();
				URL.revokeObjectURL(link.href);

				showToast(`Exported ${transactions.length} transactions as JSON`, "success");
			}
		} catch (error) {
			showToast(error instanceof Error ? error.message : "Export failed", "error");
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div>
			<div style={{ marginBottom: "24px" }}>
				<h1 style={{ margin: 0, marginBottom: "8px" }}>Transaction Export</h1>
				<p style={{ margin: 0, color: "var(--text-secondary)" }}>Export and analyze transaction history in CSV or JSON format</p>
			</div>

			{/* Export Controls */}
			<div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
				<h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "16px" }}>Export Settings</h3>

				{/* Format Selection */}
				<div style={{ marginBottom: "24px" }}>
					<label style={{ fontSize: "14px", fontWeight: "500", marginBottom: "12px", display: "block" }}>
						Export Format
					</label>
					<div style={{ display: "flex", gap: "16px" }}>
						<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
							<input
								type="radio"
								value="csv"
								checked={exportFormat === "csv"}
								onChange={(e) => setExportFormat(e.target.value as "csv")}
								style={{ cursor: "pointer" }}
							/>
							<span>CSV (Spreadsheet)</span>
						</label>
						<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
							<input
								type="radio"
								value="json"
								checked={exportFormat === "json"}
								onChange={(e) => setExportFormat(e.target.value as "json")}
								style={{ cursor: "pointer" }}
							/>
							<span>JSON (Data)</span>
						</label>
					</div>
				</div>

				<div style={{ height: "1px", backgroundColor: "var(--border-primary)", marginBottom: "24px" }} />

				{/* Filters */}
				<h4 style={{ marginTop: 0, marginBottom: "16px", fontSize: "14px" }}>Filters</h4>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
					<div className="form-group" style={{ margin: 0 }}>
						<label htmlFor="type" style={{ fontSize: "12px", marginBottom: "6px" }}>
							Transaction Type
						</label>
						<select
							id="type"
							value={filters.type}
							onChange={(e) => setFilters({ ...filters, type: e.target.value, offset: 0 })}
							style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "14px" }}
						>
							<option value="">All Types</option>
							<option value="purchase">Purchase</option>
							<option value="renewal">Renewal</option>
							<option value="refund">Refund</option>
							<option value="chargeback">Chargeback</option>
							<option value="manual_adjustment">Manual Adjustment</option>
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
							<option value="pending">Pending</option>
							<option value="completed">Completed</option>
							<option value="failed">Failed</option>
						</select>
					</div>

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

				<div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
					<button
						onClick={() =>
							setFilters({
								type: "",
								status: "",
								provider: "",
								limit: 1000,
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

				<div style={{ height: "1px", backgroundColor: "var(--border-primary)", marginBottom: "20px" }} />

				{/* Export Summary */}
				{transactionsQuery.data && (
					<div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "var(--surface-secondary)", borderRadius: "6px" }}>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
							<div>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Total Transactions</div>
								<div style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
									{transactionsQuery.data.pagination?.total || transactionsQuery.data.data.length}
								</div>
							</div>
							<div>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Ready to Export</div>
								<div style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
									{transactionsQuery.data.data.length}
								</div>
							</div>
							<div>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Format</div>
								<div style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
									{exportFormat.toUpperCase()}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Export Button */}
				<button
					onClick={handleExport}
					disabled={isExporting || !transactionsQuery.data || transactionsQuery.data.data.length === 0}
					className="btn btn-primary"
					style={{ width: "100%" }}
				>
					{isExporting ? "Exporting..." : `↓ Export ${transactionsQuery.data?.data?.length || 0} Transactions as ${exportFormat.toUpperCase()}`}
				</button>
			</div>

			{/* Preview Table */}
			<div className="card">
				<div style={{ padding: "24px", borderBottom: "1px solid var(--border-primary)" }}>
					<h3 style={{ marginTop: 0, marginBottom: 0, fontSize: "16px" }}>Preview ({transactionsQuery.data?.data?.length || 0} transactions)</h3>
				</div>

				{!transactionsQuery.data || transactionsQuery.data.data.length === 0 ? (
					<div style={{ padding: "64px 24px", textAlign: "center" }}>
						<div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
						<h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
							No transactions found
						</h2>
						<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
							Adjust your filters to find transactions to export
						</p>
					</div>
				) : (
					<div style={{ overflowX: "auto" }}>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead>
								<tr style={{ borderBottom: "1px solid var(--border-primary)", background: "var(--surface-secondary)" }}>
									<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
										Date
									</th>
									<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
										Type
									</th>
									<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
										Status
									</th>
									<th style={{ padding: "14px 16px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
										Amount
									</th>
									<th style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
										Provider
									</th>
								</tr>
							</thead>
							<tbody>
								{transactionsQuery.data.data.slice(0, 10).map((txn) => (
									<tr key={txn.id} style={{ borderBottom: "1px solid var(--border-primary)" }}>
										<td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
											{formatDate(txn.created_at)}
										</td>
										<td style={{ padding: "14px 16px", fontSize: "13px", textTransform: "capitalize" }}>
											<span
												style={{
													display: "inline-block",
													padding: "4px 10px",
													background: "var(--primary-light)",
													color: "var(--primary)",
													borderRadius: "12px",
													fontSize: "12px",
													fontWeight: "500",
												}}
											>
												{txn.type}
											</span>
										</td>
										<td style={{ padding: "14px 16px", fontSize: "13px" }}>
											<span
												style={{
													display: "inline-flex",
													alignItems: "center",
													gap: "4px",
													padding: "4px 10px",
													background:
														txn.status === "completed"
															? "rgba(34, 197, 94, 0.1)"
															: txn.status === "pending"
																? "rgba(251, 191, 36, 0.1)"
																: "rgba(239, 68, 68, 0.1)",
													color:
														txn.status === "completed"
															? "#22c55e"
															: txn.status === "pending"
																? "#f59e0b"
																: "#ef4444",
													borderRadius: "12px",
													fontSize: "12px",
													fontWeight: "500",
												}}
											>
												{txn.status === "completed" && "✓"}
												{txn.status === "pending" && "⏱"}
												{txn.status === "failed" && "✗"}
												<span style={{ textTransform: "capitalize" }}>{txn.status}</span>
											</span>
										</td>
										<td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", textAlign: "right" }}>
											{formatCurrency(txn.amount, txn.currency)}
										</td>
										<td style={{ padding: "14px 16px", fontSize: "13px", textTransform: "capitalize" }}>
											<span
												style={{
													display: "inline-block",
													padding: "4px 10px",
													background: txn.provider === "lemon_squeezy" ? "rgba(34, 197, 94, 0.1)" : "rgba(59, 130, 246, 0.1)",
													color: txn.provider === "lemon_squeezy" ? "#22c55e" : "#3b82f6",
													borderRadius: "12px",
													fontSize: "12px",
													fontWeight: "500",
												}}
											>
												{txn.provider === "lemon_squeezy" ? "LemonSqueezy" : "Paddle"}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{transactionsQuery.data && transactionsQuery.data.data.length > 10 && (
					<div style={{ padding: "16px", borderTop: "1px solid var(--border-primary)", backgroundColor: "var(--surface-secondary)", color: "var(--text-tertiary)", fontSize: "13px", textAlign: "center" }}>
						Showing 10 of {transactionsQuery.data.data.length} transactions. Download to see all records.
					</div>
				)}
			</div>
		</div>
	);
}

export default TransactionExportPage;
