import { useState } from "react";
import { useBillingPurchases, useBillingRefunds, useCreateRefund } from "../hooks/api";
import { useToast } from "../components/Toast";
import { Heading, Text, Card, CardBody, Button, Alert, Chip, Label, Input, EmptyState, DataTable, DataTableRow, TableHeader, TableHead, TableBody, TableCell } from "@proofa/components";
import { Select } from "../components/Select";

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
			<Chip variant={badgeVariants[status] || "warning"} size="sm">
				{icons[status] || "⏱"} {status.charAt(0).toUpperCase() + status.slice(1)}
			</Chip>
		);
	};

	const handleProviderBadge = (provider: string) => {
		const variant = provider === "lemon_squeezy" ? "success" : "info";
		return (
			<Chip variant={variant} size="sm">
				{provider === "lemon_squeezy" ? "LemonSqueezy" : "Paddle"}
			</Chip>
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
							<div className="space-y-1.5 mb-5">
								<Label className="font-medium mb-2 block text-sm">
									Purchase <span className="text-danger">*</span>
								</Label>
								<Select
									value={refundForm.purchase_id}
									onChange={(value) => setRefundForm({ ...refundForm, purchase_id: value })}
									placeholder="Select a purchase..."
									options={[
										...(purchasesQuery.data?.data?.map((purchase) => ({
											value: purchase.id,
											label: `${purchase.app?.name || "Unnamed App"} - ${formatCurrency(purchase.amount, purchase.currency)} (${purchase.provider})`,
										})) || []),
									]}
								/>
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

							<div className="space-y-1.5 mb-5">
								<Label className="font-medium mb-2 block text-sm">
									Refund Amount <span className="text-danger">*</span>
								</Label>
								<Input
									type="number"
									value={refundForm.amount}
									onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
									placeholder="0.00"
									step="0.01"
									min="0"
									required
								/>
								<div className="text-xs text-text-tertiary mt-1.5">
									Partial refunds are supported. Enter the amount to refund.
								</div>
							</div>

							<div className="space-y-1.5 mb-5">
								<Label className="font-medium mb-2 block text-sm">
									Reason <span className="text-danger">*</span>
								</Label>
								<Select
									value={refundForm.reason}
									onChange={(value) => setRefundForm({ ...refundForm, reason: value })}
									placeholder="Select a reason..."
									options={[
										{ value: "customer_request", label: "Customer Request" },
										{ value: "product_defect", label: "Product Defect" },
										{ value: "duplicate_purchase", label: "Duplicate Purchase" },
										{ value: "service_issue", label: "Service Issue" },
										{ value: "user_error", label: "User Error" },
										{ value: "other", label: "Other" },
									]}
								/>
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
					<div className="space-y-1.5">
						<Label className="text-xs mb-1.5">
							Provider
						</Label>
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

					<div className="space-y-1.5">
						<Label className="text-xs mb-1.5">
							Status
						</Label>
						<Select
							value={filters.status}
							onChange={(value) => setFilters({ ...filters, status: value, offset: 0 })}
							placeholder="All Statuses"
							options={[
								{ value: "", label: "All Statuses" },
								{ value: "completed", label: "Completed" },
								{ value: "pending", label: "Pending" },
								{ value: "processing", label: "Processing" },
								{ value: "failed", label: "Failed" },
							]}
						/>
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs mb-1.5">
							Start Date
						</Label>
						<Input
							type="date"
							value={filters.start_date}
							onChange={(e) => setFilters({ ...filters, start_date: e.target.value, offset: 0 })}
						/>
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs mb-1.5">
							End Date
						</Label>
						<Input
							type="date"
							value={filters.end_date}
							onChange={(e) => setFilters({ ...filters, end_date: e.target.value, offset: 0 })}
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
					variant="outline" size="sm"
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
				<DataTable>
							<TableHeader>
								<tr>
									<TableHead>Status</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Provider</TableHead>
									<TableHead>Reason</TableHead>
									<TableHead>Created</TableHead>
									<TableHead>App</TableHead>
								</tr>
							</TableHeader>
							<TableBody>
								{refundsQuery.data.refunds.map((refund) => (
										<DataTableRow key={refund.id}>
										<TableCell>{handleStatusBadge(refund.status)}</TableCell>
										<TableCell className="text-sm font-semibold text-text-primary">
											{formatCurrency(refund.amount, refund.currency)}
										</TableCell>
										<TableCell>{handleProviderBadge(refund.provider)}</TableCell>
										<TableCell className="text-sm text-text-secondary capitalize">
											{refund.reason?.replace(/_/g, " ") || "—"}
										</TableCell>
										<TableCell className="text-sm text-text-secondary">
											{new Date(refund.created_at).toLocaleDateString()}
										</TableCell>
										<TableCell className="text-sm text-text-secondary">
											{refund.purchase?.app?.name || "—"}
										</TableCell>
									</DataTableRow>
								))}
							</TableBody>
				</DataTable>
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
							variant="outline" size="sm"
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
							variant="outline" size="sm"
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
