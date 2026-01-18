import { useState } from "react";
import { useBillingPurchases, useBillingStats, useBillingTransactions } from "../hooks/api";

export function BillingDashboardPage() {
	const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
	const [activeTab, setActiveTab] = useState<"overview" | "purchases" | "transactions">("overview");

	const statsFilters = {
		...(dateRange.start && { start_date: dateRange.start }),
		...(dateRange.end && { end_date: dateRange.end }),
	};
	const purchaseFilters = {
		limit: 10,
		offset: 0,
		...(dateRange.start && { start_date: dateRange.start }),
		...(dateRange.end && { end_date: dateRange.end }),
	};
	const transactionFilters = {
		limit: 10,
		offset: 0,
		...(dateRange.start && { start_date: dateRange.start }),
		...(dateRange.end && { end_date: dateRange.end }),
	};

	const { data: statsData, isLoading: statsLoading } = useBillingStats(
		Object.keys(statsFilters).length > 0 ? statsFilters : undefined,
	);
	const stats = statsData?.data;

	const { data: purchasesData, isLoading: purchasesLoading } = useBillingPurchases(purchaseFilters);

	const { data: transactionsData, isLoading: transactionsLoading } = useBillingTransactions(transactionFilters);

	const isLoading = statsLoading || purchasesLoading || transactionsLoading;

	const formatCurrency = (amount: number, currency: string = "USD") => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
		}).format(amount);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div className="mb-6">
				<div className="flex gap-2 items-center text-[13px] text-text-tertiary">
					<span className="text-text-primary">Billing</span>
				</div>
			</div>

			{/* Page Header */}
			<div className="mb-8 flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold mb-2">Billing Dashboard</h1>
					<p className="text-sm text-text-tertiary">Monitor payments, subscriptions, and financial metrics</p>
				</div>

				{/* Date Range Filters */}
				<div className="flex gap-3 items-center">
					<input
						type="date"
						value={dateRange.start || ""}
						onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
						className="px-3 py-2 rounded-md border border-border-color bg-bg-secondary text-text-primary text-[13px]"
					/>
					<span className="text-text-tertiary">to</span>
					<input
						type="date"
						value={dateRange.end || ""}
						onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
						className="px-3 py-2 rounded-md border border-border-color bg-bg-secondary text-text-primary text-[13px]"
					/>
					{(dateRange.start || dateRange.end) && (
						<button
							onClick={() => setDateRange({})}
							className="px-3 py-2 rounded-md border border-border-color bg-bg-secondary text-text-primary cursor-pointer text-[13px] font-medium"
						>
							Clear
						</button>
					)}
				</div>
			</div>

			{isLoading ? (
				<div className="loading">
					<div className="spinner" />
				</div>
			) : (
				<>
					{/* Key Metrics Cards */}
					<div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 mb-8">
						<div className="card p-5">
							<div className="text-xs text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
								Total Revenue
							</div>
							<div className="text-[32px] font-bold text-text-primary">
								{formatCurrency(stats?.revenue.total || 0)}
							</div>
							{stats?.transactions.total && (
								<div className="text-xs text-text-tertiary mt-2">
									{stats.transactions.total} transactions
								</div>
							)}
						</div>

						<div className="card p-5">
							<div className="text-[13px] text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
								Refunds
							</div>
							<div className="text-[32px] font-bold text-danger">
								{formatCurrency(stats?.refunds.total || 0)}
							</div>
							{stats?.refunds.percentage && (
								<div className="text-xs text-text-tertiary mt-2">
									{stats.refunds.percentage.toFixed(2)}% of revenue
								</div>
							)}
						</div>

						<div className="card p-5">
							<div className="text-[13px] text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
								Active Subscriptions
							</div>
							<div className="text-[32px] font-bold text-text-primary">
								{stats?.subscriptions.active || 0}
							</div>
						</div>

						<div className="card p-5">
							<div className="text-xs text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
								Webhook Health
							</div>
							<div className="text-[32px] font-bold text-text-primary">
								{stats?.webhooks?.success ?? 0}
							</div>
							{(stats?.webhooks?.failed ?? 0) > 0 && (
								<div className="text-xs text-danger mt-2">{stats?.webhooks?.failed} failed</div>
							)}
						</div>
					</div>

					{/* Provider Breakdown */}
					{stats?.revenue.by_provider && Object.keys(stats.revenue.by_provider).length > 0 && (
						<div className="card p-6 mb-8">
							<h2 className="text-base font-semibold mb-5">Revenue by Provider</h2>
							<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
								{Object.entries(stats.revenue.by_provider).map(([provider, amount]) => (
									<div
										key={provider}
										className="p-4 rounded-lg bg-bg-secondary border border-border-color"
									>
										<div className="text-[13px] text-text-tertiary mb-2 font-medium capitalize">
											{provider === "lemon_squeezy"
												? "LemonSqueezy"
												: provider === "paddle"
													? "Paddle"
													: provider}
										</div>
										<div className="text-[24px] font-bold text-text-primary">
											{formatCurrency(amount as number)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Transaction Type Breakdown */}
					{stats?.revenue.by_type && Object.keys(stats.revenue.by_type).length > 0 && (
						<div className="card p-6 mb-8">
							<h2 className="text-base font-semibold mb-5">Revenue by Type</h2>
							<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
								{Object.entries(stats.revenue.by_type).map(([type, amount]) => (
									<div
										key={type}
										className="p-4 rounded-lg bg-bg-secondary border border-border-color"
									>
										<div className="text-[13px] text-text-tertiary mb-2 font-medium capitalize">
											{type}
										</div>
										<div className="text-[24px] font-bold text-text-primary">
											{formatCurrency(amount as number)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Tabs */}
					<div className="mb-6 border-b border-border-color">
						<div className="flex gap-6">
							<button
								onClick={() => setActiveTab("overview")}
								className={`py-3 text-sm font-medium bg-none border-none cursor-pointer transition-colors duration-200 ${
									activeTab === "overview"
										? "text-primary border-b-2 border-primary"
										: "text-text-tertiary"
								}`}
							>
								Overview
							</button>
							<button
								onClick={() => setActiveTab("purchases")}
								className={`py-3 text-sm font-medium bg-none border-none cursor-pointer transition-colors duration-200 ${
									activeTab === "purchases"
										? "text-primary border-b-2 border-primary"
										: "text-text-tertiary"
								}`}
							>
								Purchases
							</button>
							<button
								onClick={() => setActiveTab("transactions")}
								className={`py-3 text-sm font-medium bg-none border-none cursor-pointer transition-colors duration-200 ${
									activeTab === "transactions"
										? "text-primary border-b-2 border-primary"
										: "text-text-tertiary"
								}`}
							>
								Transactions
							</button>
						</div>
					</div>

					{/* Purchases Table */}
					{activeTab === "purchases" && purchasesData && (
						<div className="card p-6">
							<h2 className="text-base font-semibold mb-5">Recent Purchases</h2>
							{purchasesData.data.length === 0 ? (
								<div className="text-center py-10 px-5 text-text-tertiary">No purchases found</div>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full border-collapse text-[13px]">
										<thead>
											<tr className="border-b border-border-color">
												<th className="text-left p-3 font-semibold">Date</th>
												<th className="text-left p-3 font-semibold">Provider</th>
												<th className="text-left p-3 font-semibold">Amount</th>
												<th className="text-left p-3 font-semibold">Status</th>
												<th className="text-left p-3 font-semibold">App</th>
											</tr>
										</thead>
										<tbody>
											{purchasesData.data.map((purchase) => (
												<tr
													key={purchase.id}
													className="border-b border-border-color bg-bg-secondary"
												>
													<td className="p-3">{formatDate(purchase.created_at)}</td>
													<td className="p-3 capitalize">
														{purchase.provider === "lemon_squeezy"
															? "LemonSqueezy"
															: "Paddle"}
													</td>
													<td className="p-3 font-medium">
														{formatCurrency(purchase.amount, purchase.currency)}
													</td>
													<td className="p-3">
														<span
															className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${
																purchase.status === "completed"
																	? "bg-success/10 text-success"
																	: purchase.status === "pending"
																		? "bg-info/10 text-info"
																		: "bg-danger/10 text-danger"
															}`}
														>
															{purchase.status}
														</span>
													</td>
													<td className="p-3">{purchase.app?.name || "—"}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
							{purchasesData.pagination && (
								<div className="mt-4 text-sm text-text-tertiary">
									Showing {purchasesData.data.length} of {purchasesData.pagination.total} purchases
									{purchasesData.pagination.hasMore && " (more available)"}
								</div>
							)}
						</div>
					)}

					{/* Transactions Table */}
					{activeTab === "transactions" && transactionsData && (
						<div className="card p-6">
							<h2 className="text-base font-semibold mb-5">Recent Transactions</h2>
							{transactionsData.data.length === 0 ? (
								<div className="text-center py-10 px-5 text-text-tertiary">No transactions found</div>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full border-collapse text-[13px]">
										<thead>
											<tr className="border-b border-border-color">
												<th className="text-left p-3 font-semibold">Date</th>
												<th className="text-left p-3 font-semibold">Type</th>
												<th className="text-left p-3 font-semibold">Provider</th>
												<th className="text-left p-3 font-semibold">Amount</th>
												<th className="text-left p-3 font-semibold">Status</th>
											</tr>
										</thead>
										<tbody>
											{transactionsData.data.map((txn) => (
												<tr
													key={txn.id}
													className="border-b border-border-color bg-bg-secondary"
												>
													<td className="p-3">{formatDate(txn.created_at)}</td>
													<td className="p-3 capitalize">{txn.type}</td>
													<td className="p-3 capitalize">
														{txn.provider === "lemon_squeezy" ? "LemonSqueezy" : "Paddle"}
													</td>
													<td className="p-3 font-medium">
														{txn.type === "refund" ? "-" : ""}
														{formatCurrency(txn.amount, txn.currency)}
													</td>
													<td className="p-3">
														<span
															className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${
																txn.status === "completed"
																	? "bg-success/10 text-success"
																	: txn.status === "pending"
																		? "bg-info/10 text-info"
																		: "bg-danger/10 text-danger"
															}`}
														>
															{txn.status}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
							{transactionsData.pagination && (
								<div className="mt-4 text-xs text-text-tertiary">
									Showing {transactionsData.data.length} of {transactionsData.pagination.total}{" "}
									transactions
									{transactionsData.pagination.hasMore && " (more available)"}
								</div>
							)}
						</div>
					)}

					{/* Overview Tab */}
					{activeTab === "overview" && (
						<div className="card p-12 text-center">
							<div className="text-[48px] mb-4">💰</div>
							<h2 className="text-xl font-semibold mb-2 text-text-primary">Billing Overview</h2>
							<p className="text-sm text-text-tertiary max-w-[480px] mx-auto">
								Monitor your payment metrics and transaction history. Use the tabs above to view
								detailed purchases and transactions from LemonSqueezy and Paddle.
							</p>
						</div>
					)}
				</>
			)}
		</div>
	);
}
