import { useState } from "react";
import { useBillingPurchases, useBillingRefunds, useCreateRefund } from "../hooks/api";
import { useToast } from "../components/Toast";
import { Heading, Text, Card, CardBody, Button, Alert, Badge, Label, Input, Select as SeliaSelect, EmptyState, Table, TableContainer, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@proofa/components";

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
		if (Number.isNaN(amount) || amount <= 0) {
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
		const badgeVariants: Record<string, "success" | "warning" | "info" | "danger"> = {
			completed: "success",
			pending: "warning",
			processing: "info",
			failed: "danger",
		};
		const icons: Record<string, string> = {
			completed: "✓",
			pending: "⏱",
			processing: "⟳",
			failed: "✗",
		};
		return (
			<Badge variant={badgeVariants[status] || "warning"}>
				{icons[status] || "⏱"} {status.charAt(0).toUpperCase() + status.slice(1)}
			</Badge>
		);
	};

	const handleProviderBadge = (provider: string) => {
		const variant = provider === "lemon_squeezy" ? "success" : "info";
		return (
			<Badge variant={variant}>
				{provider === "lemon_squeezy" ? "LemonSqueezy" : "Paddle"}
			</Badge>
		);
	};

	const formatCurrency = (amount: number, currency = "USD") => {
		return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
	};

	if (activeTab === "create") {
		return (
			<div>
				<div className="mb-6">
					<Button onClick={() => setActiveTab("refunds")} className="text-primary cursor-pointer bg-transparent border-none text-sm font-medium">
						← Back to Refunds
					</Button>
				</div>

				<Card><CardBody className="max-w-[600px]">
					<div className="p-6">
					<Heading level={2} size="lg" className="mb-6">Create Refund</Heading>

						<form onSubmit={handleCreateRefund}>
							<div className="form-group mb-5">
								<label htmlFor="purchase_id" className="font-medium mb-2 block text-sm">
									Purchase <span className="text-danger">*</span>
								</label>
								<select
									id="purchase_id"
									value={refundForm.purchase_id}
									onChange={(e) => setRefundForm({ ...refundForm, purchase_id: e.target.value })}
									required
									className="w-full px-2.5 py-2.5 rounded-md border border-border-color text-sm"
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
								<div className="p-4 bg-surface-secondary rounded-lg mb-5">
									<Heading level={4} size="sm" className="mb-3">Purchase Details</Heading>
									{(() => {
										const purchase = purchasesQuery.data.data.find((p) => p.id === refundForm.purchase_id);
										if (!purchase) return null;
										return (
											<div className="text-sm text-text-secondary">
												<div className="mb-2">
													<strong>App:</strong> {purchase.app?.name || "—"}
												</div>
												<div className="mb-2">
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

							<div className="form-group mb-5">
								<label htmlFor="amount" className="font-medium mb-2 block text-sm">
									Refund Amount <span className="text-danger">*</span>
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
									className="w-full px-2.5 py-2.5 rounded-md border border-border-color text-sm"
								/>
								<div className="text-xs text-text-tertiary mt-1.5">
									Partial refunds are supported. Enter the amount to refund.
								</div>
							</div>

							<div className="form-group mb-5">
								<label htmlFor="reason" className="font-medium mb-2 block text-sm">
									Reason <span className="text-danger">*</span>
								</label>
								<select
									id="reason"
									value={refundForm.reason}
									onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
									required
									className="w-full px-2.5 py-2.5 rounded-md border border-border-color text-sm"
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

							<Alert variant="info" className="mb-6">
								<div className="text-info leading-relaxed">
									<strong>ℹ️ Note:</strong> Refund processing may take 24-48 hours depending on the payment provider.
								</div>
							</Alert>

							<div className="flex gap-2 justify-end">
								<Button type="button" onClick={() => setActiveTab("refunds")} variant="secondary">
									Cancel
								</Button>
								<Button type="submit" variant="primary" disabled={createRefundMutation.isPending}>
									{createRefundMutation.isPending ? "Processing..." : "Create Refund"}
								</Button>
							</div>
						</form>
					</div>
				</CardBody>
			</Card>
</div>
		);
	}

	return (
		<div>
			<div className="mb-6 flex justify-between items-center">
				<div>
					<Heading level={1} size="lg">Refund Processing</Heading>
					<Text className="m-0 text-text-secondary">Create and manage customer refunds</Text>
				</div>
				<Button onClick={() => setActiveTab("create")} variant="primary">
					+ Create Refund
				</Button>
			</div>

			{/* Filters */}
			<Card><CardBody className="mb-6 p-6">
				<Heading level={3} size="md" className="mb-4">Filters</Heading>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
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
							<option value="completed">Completed</option>
							<option value="pending">Pending</option>
							<option value="processing">Processing</option>
							<option value="failed">Failed</option>
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

				<Button
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
				</Button>
			</CardBody></Card>

			{/* Refunds Table */}
			{!refundsQuery.data || refundsQuery.data.refunds.length === 0 ? (
				<Card><CardBody className="py-16 px-6 text-center">
					<div className="text-6xl mb-4">💰</div>
					<Heading level={2} size="lg" className="mb-3">
						No refunds yet
					</Heading>
					<Text className="text-sm text-text-tertiary mb-6 max-w-[400px] mx-auto">
						Start by creating a refund for a customer purchase
					</Text>
					<Button onClick={() => setActiveTab("create")} variant="primary">
						+ Create Refund
					</Button>
				</CardBody></Card>
			) : (
				<Card><CardBody className="p-0 overflow-hidden">
					<table className="w-full border-collapse">
						<thead>
							<tr className="border-b border-border-primary bg-surface-secondary">
								<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
									Amount
								</th>
								<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
									Provider
								</th>
								<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
									Reason
								</th>
								<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
									Created
								</th>
								<th className="px-4 py-3.5 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
									App
								</th>
							</tr>
						</thead>
						<tbody>
							{refundsQuery.data.refunds.map((refund) => (
								<tr key={refund.id} className="border-b border-border-primary">
									<td className="px-4 py-3.5">{handleStatusBadge(refund.status)}</td>
									<td className="px-4 py-3.5 text-sm font-semibold text-text-primary">
										{formatCurrency(refund.amount, refund.currency)}
									</td>
									<td className="px-4 py-3.5">{handleProviderBadge(refund.provider)}</td>
									<td className="px-4 py-3.5 text-sm text-text-secondary capitalize">
										{refund.reason?.replace(/_/g, " ") || "—"}
									</td>
									<td className="px-4 py-3.5 text-sm text-text-secondary">
										{new Date(refund.created_at).toLocaleDateString()}
									</td>
									<td className="px-4 py-3.5 text-sm text-text-secondary">
										{refund.purchase?.app?.name || "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</CardBody></Card>
			)}

			{/* Pagination */}
			{refundsQuery.data?.pagination && (
				<div className="mt-6 flex items-center justify-between">
					<div className="text-sm text-text-secondary">
						Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, refundsQuery.data.pagination.total)} of{" "}
						{refundsQuery.data.pagination.total}
					</div>
					<div className="flex gap-2">
						<Button
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
						</Button>
						<Button
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
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

export default RefundProcessingPage;
