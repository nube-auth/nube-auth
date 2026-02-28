import {
	Heading,
	Text,
	Card,
	CardBody,
	Button,
	Alert,
	Chip,
	Label,
	Input,
	Table,
	TableContainer,
	TableHeader,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
} from "@proofa/components";
import { Select } from "../components/Select";
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
				<Heading level={1} size="lg">Transaction Export</Heading>
				<Text className="m-0 text-text-secondary">Export and analyze transaction history in CSV or JSON format</Text>
			</div>

			{/* Export Controls */}
			<Card><CardBody className="mb-6 p-6">
				<Heading level={3} size="md" className="mb-5">Export Settings</Heading>

				{/* Format Selection */}
				<div className="mb-6">
					<Label className="text-sm font-medium mb-3 block">
						Export Format
					</Label>
					<div className="flex gap-2">
						<Button
							variant={exportFormat === "csv" ? "primary" : "secondary"}
							size="sm"
							onClick={() => setExportFormat("csv")}
						>
							CSV (Spreadsheet)
						</Button>
						<Button
							variant={exportFormat === "json" ? "primary" : "secondary"}
							size="sm"
							onClick={() => setExportFormat("json")}
						>
							JSON (Data)
						</Button>
					</div>
				</div>

				<div className="h-px bg-border-primary mb-6" />

				{/* Filters */}
				<Heading level={4} size="sm" className="mt-0 mb-4">Filters</Heading>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
					<div>
						<Label className="text-xs mb-1.5">Transaction Type</Label>
						<Select
							value={filters.type}
							onChange={(value) => setFilters({ ...filters, type: value, offset: 0 })}
							placeholder="All Types"
							options={[
								{ value: "", label: "All Types" },
								{ value: "purchase", label: "Purchase" },
								{ value: "renewal", label: "Renewal" },
								{ value: "refund", label: "Refund" },
								{ value: "chargeback", label: "Chargeback" },
								{ value: "manual_adjustment", label: "Manual Adjustment" },
							]}
						/>
					</div>

					<div>
						<Label className="text-xs mb-1.5">Status</Label>
						<Select
							value={filters.status}
							onChange={(value) => setFilters({ ...filters, status: value, offset: 0 })}
							placeholder="All Statuses"
							options={[
								{ value: "", label: "All Statuses" },
								{ value: "pending", label: "Pending" },
								{ value: "completed", label: "Completed" },
								{ value: "failed", label: "Failed" },
							]}
						/>
					</div>

					<div>
						<Label className="text-xs mb-1.5">Provider</Label>
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
						<Label className="text-xs mb-1.5">Start Date</Label>
						<Input
							type="date"
							value={filters.start_date}
							onChange={(e) => setFilters({ ...filters, start_date: e.target.value, offset: 0 })}
						/>
					</div>

					<div>
						<Label className="text-xs mb-1.5">End Date</Label>
						<Input
							type="date"
							value={filters.end_date}
							onChange={(e) => setFilters({ ...filters, end_date: e.target.value, offset: 0 })}
						/>
					</div>
				</div>

				<div className="flex gap-2 mb-5">
					<Button
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
						variant="outline" size="sm"
					>
						Clear Filters
					</Button>
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
				<Button
					onClick={handleExport}
					disabled={isExporting || !transactionsQuery.data || transactionsQuery.data.data.length === 0}
					variant="primary" className="w-full"
				>
					{isExporting ? "Exporting..." : `↓ Export ${transactionsQuery.data?.data?.length || 0} Transactions as ${exportFormat.toUpperCase()}`}
				</Button>
			</CardBody></Card>

			{/* Preview Table */}
			<Card>
				<CardBody className="p-6 border-b border-border-primary">
					<Heading level={3} size="sm">Preview ({transactionsQuery.data?.data?.length || 0} transactions)</Heading>
				</CardBody>

				{!transactionsQuery.data || transactionsQuery.data.data.length === 0 ? (
					<div className="py-16 px-6 text-center">
						<div className="text-5xl mb-4">📊</div>
						<Heading level={2} size="md" className="mb-2">
							No transactions found
						</Heading>
						<Text className="text-sm text-text-tertiary">
							Adjust your filters to find transactions to export
						</Text>
					</div>
				) : (
					<CardBody className="p-0">
						<TableContainer>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Status</TableHead>
										<TableHead align="right">Amount</TableHead>
										<TableHead>Provider</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{transactionsQuery.data.data.slice(0, 10).map((txn) => (
										<TableRow key={txn.id}>
											<TableCell>
												<Text className="text-text-secondary whitespace-nowrap">{formatDate(txn.created_at)}</Text>
											</TableCell>
											<TableCell>
												<Chip variant="primary" size="sm" pill>{txn.type}</Chip>
											</TableCell>
											<TableCell>
												<Chip
													variant={txn.status === "completed" ? "success" : txn.status === "pending" ? "warning" : "danger"}
													size="sm"
													pill
												>
													{txn.status === "completed" && "✓ "}
													{txn.status === "pending" && "⏱ "}
													{txn.status === "failed" && "✗ "}
													{txn.status}
												</Chip>
											</TableCell>
											<TableCell align="right">
												<Text className="font-semibold text-text-primary">{formatCurrency(txn.amount, txn.currency)}</Text>
											</TableCell>
											<TableCell>
												<Chip variant={txn.provider === "lemon_squeezy" ? "success" : "info"} size="sm" pill>
													{txn.provider === "lemon_squeezy" ? "LemonSqueezy" : "Paddle"}
												</Chip>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</CardBody>
				)}

				{transactionsQuery.data && transactionsQuery.data.data.length > 10 && (
					<div className="p-4 border-t border-border-primary bg-surface-secondary text-text-tertiary text-sm text-center">
						Showing 10 of {transactionsQuery.data.data.length} transactions. Download to see all records.
					</div>
				)}
			</Card>
		</div>
	);
}

export default TransactionExportPage;
