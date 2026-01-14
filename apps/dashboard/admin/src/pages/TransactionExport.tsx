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
			<div className="mb-6">
				<h1 className="m-0 mb-2">Transaction Export</h1>
				<p className="m-0 text-text-secondary">Export and analyze transaction history in CSV or JSON format</p>
			</div>

			{/* Export Controls */}
			<div className="card mb-6 p-6">
				<h3 className="mt-0 mb-5 text-base">Export Settings</h3>

				{/* Format Selection */}
				<div className="mb-6">
					<label className="text-sm font-medium mb-3 block">
						Export Format
					</label>
					<div className="flex gap-4">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								value="csv"
								checked={exportFormat === "csv"}
								onChange={(e) => setExportFormat(e.target.value as "csv")}
								className="cursor-pointer"
							/>
							<span>CSV (Spreadsheet)</span>
						</label>
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								value="json"
								checked={exportFormat === "json"}
								onChange={(e) => setExportFormat(e.target.value as "json")}
								className="cursor-pointer"
							/>
							<span>JSON (Data)</span>
						</label>
					</div>
				</div>

				<div className="h-px bg-border-primary mb-6" />

				{/* Filters */}
				<h4 className="mt-0 mb-4 text-sm">Filters</h4>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
					<div className="form-group m-0">
						<label htmlFor="type" className="text-xs mb-1.5">
							Transaction Type
						</label>
						<select
							id="type"
							value={filters.type}
							onChange={(e) => setFilters({ ...filters, type: e.target.value, offset: 0 })}
							className="w-full px-2 py-2 rounded-md border border-border-color text-sm"
						>
							<option value="">All Types</option>
							<option value="purchase">Purchase</option>
							<option value="renewal">Renewal</option>
							<option value="refund">Refund</option>
							<option value="chargeback">Chargeback</option>
							<option value="manual_adjustment">Manual Adjustment</option>
						</select>
					</div>

					<div className="form-group m-0">
						<label htmlFor="status" className="text-xs mb-1.5">
							Status
						</label>
						<select
							id="status"
							value={filters.status}
							onChange={(e) => setFilters({ ...filters, status: e.target.value, offset: 0 })}
							className="w-full px-2 py-2 rounded-md border border-border-color text-sm"
						>
							<option value="">All Statuses</option>
							<option value="pending">Pending</option>
							<option value="completed">Completed</option>
							<option value="failed">Failed</option>
						</select>
					</div>

					<div className="form-group m-0">
						<label htmlFor="provider" className="text-xs mb-1.5">
							Provider
						</label>
						<select
							id="provider"
							value={filters.provider}
							onChange={(e) => setFilters({ ...filters, provider: e.target.value, offset: 0 })}
							className="w-full px-2 py-2 rounded-md border border-border-color text-sm"
						>
							<option value="">All Providers</option>
							<option value="lemon_squeezy">LemonSqueezy</option>
							<option value="paddle">Paddle</option>
						</select>
					</div>

					<div className="form-group m-0">
						<label htmlFor="startDate" className="text-xs mb-1.5">
							Start Date
						</label>
						<input
							type="date"
							id="startDate"
							value={filters.start_date}
							onChange={(e) => setFilters({ ...filters, start_date: e.target.value, offset: 0 })}
							className="w-full px-2 py-2 rounded-md border border-border-color text-sm"
						/>
					</div>

					<div className="form-group m-0">
						<label htmlFor="endDate" className="text-xs mb-1.5">
							End Date
						</label>
						<input
							type="date"
							id="endDate"
							value={filters.end_date}
							onChange={(e) => setFilters({ ...filters, end_date: e.target.value, offset: 0 })}
							className="w-full px-2 py-2 rounded-md border border-border-color text-sm"
						/>
					</div>
				</div>

				<div className="flex gap-2 mb-5">
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

				<div className="h-px bg-border-primary mb-5" />

				{/* Export Summary */}
				{transactionsQuery.data && (
					<div className="mb-5 p-3 bg-surface-secondary rounded-md">
						<div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
							<div>
								<div className="text-xs text-text-tertiary mb-1">Total Transactions</div>
								<div className="text-lg font-semibold text-text-primary">
									{transactionsQuery.data.pagination?.total || transactionsQuery.data.data.length}
								</div>
							</div>
							<div>
								<div className="text-xs text-text-tertiary mb-1">Ready to Export</div>
								<div className="text-lg font-semibold text-text-primary">
									{transactionsQuery.data.data.length}
								</div>
							</div>
							<div>
								<div className="text-xs text-text-tertiary mb-1">Format</div>
								<div className="text-lg font-semibold text-text-primary">
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
					className="btn btn-primary w-full"
				>
					{isExporting ? "Exporting..." : `↓ Export ${transactionsQuery.data?.data?.length || 0} Transactions as ${exportFormat.toUpperCase()}`}
				</button>
			</div>

			{/* Preview Table */}
			<div className="card">
				<div className="p-6 border-b border-border-primary">
					<h3 className="mt-0 mb-0 text-base">Preview ({transactionsQuery.data?.data?.length || 0} transactions)</h3>
				</div>

				{!transactionsQuery.data || transactionsQuery.data.data.length === 0 ? (
					<div className="py-16 px-6 text-center">
						<div className="text-5xl mb-4">📊</div>
						<h2 className="text-lg font-semibold mb-2 text-text-primary">
							No transactions found
						</h2>
						<p className="text-sm text-text-tertiary">
							Adjust your filters to find transactions to export
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full border-collapse">
							<thead>
								<tr className="border-b border-border-primary bg-surface-secondary">
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
										Date
									</th>
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
										Type
									</th>
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
										Status
									</th>
									<th className="px-4 py-3.5 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
										Amount
									</th>
									<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
										Provider
									</th>
								</tr>
							</thead>
							<tbody>
								{transactionsQuery.data.data.slice(0, 10).map((txn) => (
									<tr key={txn.id} className="border-b border-border-primary">
										<td className="px-4 py-3.5 text-sm text-text-secondary whitespace-nowrap">
											{formatDate(txn.created_at)}
										</td>
										<td className="px-4 py-3.5 text-sm capitalize">
											<span className="inline-block px-2.5 py-1 bg-primary-light text-primary rounded-xl text-xs font-medium"
											>
												{txn.type}
											</span>
										</td>
										<td className="px-4 py-3.5 text-sm">
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
												<span className="capitalize">{txn.status}</span>
											</span>
										</td>
										<td className="px-4 py-3.5 text-sm font-semibold text-text-primary text-right">
											{formatCurrency(txn.amount, txn.currency)}
										</td>
										<td className="px-4 py-3.5 text-sm capitalize">
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
					<div className="p-4 border-t border-border-primary bg-surface-secondary text-text-tertiary text-sm text-center">
						Showing 10 of {transactionsQuery.data.data.length} transactions. Download to see all records.
					</div>
				)}
			</div>
		</div>
	);
}

export default TransactionExportPage;
