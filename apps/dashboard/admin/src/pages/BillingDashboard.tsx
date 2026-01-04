import { useState } from "react";
import { useBillingPurchases, useBillingStats, useBillingTransactions } from "../hooks/api";

export function BillingDashboardPage() {
	const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
	const [activeTab, setActiveTab] = useState<"overview" | "purchases" | "transactions">("overview");

	const statsFilters = { ...(dateRange.start && { start_date: dateRange.start }), ...(dateRange.end && { end_date: dateRange.end }) };
	const purchaseFilters = { limit: 10, offset: 0, ...(dateRange.start && { start_date: dateRange.start }), ...(dateRange.end && { end_date: dateRange.end }) };
	const transactionFilters = { limit: 10, offset: 0, ...(dateRange.start && { start_date: dateRange.start }), ...(dateRange.end && { end_date: dateRange.end }) };

	const { data: statsData, isLoading: statsLoading } = useBillingStats(Object.keys(statsFilters).length > 0 ? statsFilters : undefined);
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
			<div style={{ marginBottom: "24px" }}>
				<div
					style={{
						display: "flex",
						gap: "8px",
						alignItems: "center",
						fontSize: "13px",
						color: "var(--text-tertiary)",
					}}
				>
					<span style={{ color: "var(--text-primary)" }}>Billing</span>
				</div>
			</div>

			{/* Page Header */}
			<div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<div>
					<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Billing Dashboard</h1>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
						Monitor payments, subscriptions, and financial metrics
					</p>
				</div>

				{/* Date Range Filters */}
				<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
					<input
						type="date"
						value={dateRange.start || ""}
						onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
						style={{
							padding: "8px 12px",
							borderRadius: "6px",
							border: "1px solid var(--border-color)",
							backgroundColor: "var(--bg-secondary)",
							color: "var(--text-primary)",
							fontSize: "13px",
						}}
					/>
					<span style={{ color: "var(--text-tertiary)" }}>to</span>
					<input
						type="date"
						value={dateRange.end || ""}
						onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
						style={{
							padding: "8px 12px",
							borderRadius: "6px",
							border: "1px solid var(--border-color)",
							backgroundColor: "var(--bg-secondary)",
							color: "var(--text-primary)",
							fontSize: "13px",
						}}
					/>
					{(dateRange.start || dateRange.end) && (
						<button
							onClick={() => setDateRange({})}
							style={{
								padding: "8px 12px",
								borderRadius: "6px",
								border: "1px solid var(--border-color)",
								backgroundColor: "var(--bg-secondary)",
								color: "var(--text-primary)",
								cursor: "pointer",
								fontSize: "13px",
								fontWeight: "500",
							}}
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
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
							gap: "20px",
							marginBottom: "32px",
						}}
					>
						<div className="card" style={{ padding: "20px" }}>
							<div
								style={{
									fontSize: "13px",
									color: "var(--text-tertiary)",
									marginBottom: "8px",
									fontWeight: "600",
									textTransform: "uppercase",
									letterSpacing: "0.5px",
								}}
							>
								Total Revenue
							</div>
							<div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
								{formatCurrency(stats?.revenue.total || 0)}
							</div>
							{stats?.transactions.total && (
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "8px" }}>
									{stats.transactions.total} transactions
								</div>
							)}
						</div>

						<div className="card" style={{ padding: "20px" }}>
							<div
								style={{
									fontSize: "13px",
									color: "var(--text-tertiary)",
									marginBottom: "8px",
									fontWeight: "600",
									textTransform: "uppercase",
									letterSpacing: "0.5px",
								}}
							>
								Refunds
							</div>
							<div style={{ fontSize: "32px", fontWeight: "700", color: "#ef4444" }}>
								{formatCurrency(stats?.refunds.total || 0)}
							</div>
							{stats?.refunds.percentage && (
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "8px" }}>
									{stats.refunds.percentage.toFixed(2)}% of revenue
								</div>
							)}
						</div>

						<div className="card" style={{ padding: "20px" }}>
							<div
								style={{
									fontSize: "13px",
									color: "var(--text-tertiary)",
									marginBottom: "8px",
									fontWeight: "600",
									textTransform: "uppercase",
									letterSpacing: "0.5px",
								}}
							>
								Active Subscriptions
							</div>
							<div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
								{stats?.subscriptions.active || 0}
							</div>
						</div>

						<div className="card" style={{ padding: "20px" }}>
							<div
								style={{
									fontSize: "13px",
									color: "var(--text-tertiary)",
									marginBottom: "8px",
									fontWeight: "600",
									textTransform: "uppercase",
									letterSpacing: "0.5px",
								}}
							>
								Webhook Health
							</div>
							<div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
								{(stats?.webhooks?.success ?? 0)}
							</div>
							{(stats?.webhooks?.failed ?? 0) > 0 && (
								<div style={{ fontSize: "12px", color: "#ef4444", marginTop: "8px" }}>
									{stats?.webhooks?.failed} failed
								</div>
							)}
						</div>
					</div>

					{/* Provider Breakdown */}
					{stats && stats.revenue.by_provider && Object.keys(stats.revenue.by_provider).length > 0 && (
						<div className="card" style={{ padding: "24px", marginBottom: "32px" }}>
							<h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>
								Revenue by Provider
							</h2>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
									gap: "16px",
								}}
							>
								{Object.entries(stats.revenue.by_provider).map(([provider, amount]) => (
									<div
										key={provider}
										style={{
											padding: "16px",
											borderRadius: "8px",
											backgroundColor: "var(--bg-secondary)",
											border: "1px solid var(--border-color)",
										}}
									>
										<div
											style={{
												fontSize: "13px",
												color: "var(--text-tertiary)",
												marginBottom: "8px",
												fontWeight: "500",
												textTransform: "capitalize",
											}}
										>
											{provider === "lemon_squeezy" ? "LemonSqueezy" : provider === "paddle" ? "Paddle" : provider}
										</div>
										<div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>
											{formatCurrency(amount as number)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Transaction Type Breakdown */}
					{stats && stats.revenue.by_type && Object.keys(stats.revenue.by_type).length > 0 && (
						<div className="card" style={{ padding: "24px", marginBottom: "32px" }}>
							<h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>
								Revenue by Type
							</h2>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
									gap: "16px",
								}}
							>
								{Object.entries(stats.revenue.by_type).map(([type, amount]) => (
									<div
										key={type}
										style={{
											padding: "16px",
											borderRadius: "8px",
											backgroundColor: "var(--bg-secondary)",
											border: "1px solid var(--border-color)",
										}}
									>
										<div
											style={{
												fontSize: "13px",
												color: "var(--text-tertiary)",
												marginBottom: "8px",
												fontWeight: "500",
												textTransform: "capitalize",
											}}
										>
											{type}
										</div>
										<div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>
											{formatCurrency(amount as number)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Tabs */}
					<div style={{ marginBottom: "24px", borderBottom: "1px solid var(--border-color)" }}>
						<div style={{ display: "flex", gap: "24px" }}>
							<button
								onClick={() => setActiveTab("overview")}
								style={{
									padding: "12px 0",
									fontSize: "14px",
									fontWeight: "500",
									color: activeTab === "overview" ? "var(--primary)" : "var(--text-tertiary)",
									background: "none",
									border: "none",
									borderBottom: activeTab === "overview" ? "2px solid var(--primary)" : "none",
									cursor: "pointer",
									transition: "all 0.2s",
								}}
							>
								Overview
							</button>
							<button
								onClick={() => setActiveTab("purchases")}
								style={{
									padding: "12px 0",
									fontSize: "14px",
									fontWeight: "500",
									color: activeTab === "purchases" ? "var(--primary)" : "var(--text-tertiary)",
									background: "none",
									border: "none",
									borderBottom: activeTab === "purchases" ? "2px solid var(--primary)" : "none",
									cursor: "pointer",
									transition: "all 0.2s",
								}}
							>
								Purchases
							</button>
							<button
								onClick={() => setActiveTab("transactions")}
								style={{
									padding: "12px 0",
									fontSize: "14px",
									fontWeight: "500",
									color: activeTab === "transactions" ? "var(--primary)" : "var(--text-tertiary)",
									background: "none",
									border: "none",
									borderBottom: activeTab === "transactions" ? "2px solid var(--primary)" : "none",
									cursor: "pointer",
									transition: "all 0.2s",
								}}
							>
								Transactions
							</button>
						</div>
					</div>

					{/* Purchases Table */}
					{activeTab === "purchases" && purchasesData && (
						<div className="card" style={{ padding: "24px" }}>
							<h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>Recent Purchases</h2>
							{purchasesData.data.length === 0 ? (
								<div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-tertiary)" }}>
									No purchases found
								</div>
							) : (
								<div style={{ overflowX: "auto" }}>
									<table
										style={{
											width: "100%",
											borderCollapse: "collapse",
											fontSize: "13px",
										}}
									>
										<thead>
											<tr style={{ borderBottom: "1px solid var(--border-color)" }}>
												<th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Date</th>
												<th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Provider</th>
												<th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Amount</th>
												<th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Status</th>
												<th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>App</th>
											</tr>
										</thead>
										<tbody>
											{purchasesData.data.map((purchase) => (
												<tr
													key={purchase.id}
													style={{
														borderBottom: "1px solid var(--border-color)",
														backgroundColor: "var(--bg-secondary)",
													}}
												>
													<td style={{ padding: "12px" }}>{formatDate(purchase.created_at)}</td>
													<td style={{ padding: "12px", textTransform: "capitalize" }}>
														{purchase.provider === "lemon_squeezy" ? "LemonSqueezy" : "Paddle"}
													</td>
													<td style={{ padding: "12px", fontWeight: "500" }}>
														{formatCurrency(purchase.amount, purchase.currency)}
													</td>
													<td style={{ padding: "12px" }}>
														<span
															style={{
																display: "inline-block",
																padding: "4px 8px",
																borderRadius: "4px",
																backgroundColor:
																	purchase.status === "completed"
																		? "rgba(34, 197, 94, 0.1)"
																		: purchase.status === "pending"
																			? "rgba(59, 130, 246, 0.1)"
																			: "rgba(239, 68, 68, 0.1)",
																color:
																	purchase.status === "completed"
																		? "#22c55e"
																		: purchase.status === "pending"
																			? "#3b82f6"
																			: "#ef4444",
																fontSize: "12px",
																fontWeight: "500",
																textTransform: "capitalize",
															}}
														>
															{purchase.status}
														</span>
													</td>
													<td style={{ padding: "12px" }}>{purchase.app?.name || "—"}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
							{purchasesData.pagination && (
								<div
									style={{
										marginTop: "16px",
										fontSize: "12px",
										color: "var(--text-tertiary)",
									}}
								>
									Showing {purchasesData.data.length} of {purchasesData.pagination.total} purchases
									{purchasesData.pagination.hasMore && " (more available)"}
								</div>
							)}
						</div>
					)}

					{/* Transactions Table */}
					{activeTab === "transactions" && transactionsData && (
						<div className="card" style={{ padding: "24px" }}>
							<h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>Recent Transactions</h2>
							{transactionsData.data.length === 0 ? (
								<div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-tertiary)" }}>
									No transactions found
								</div>
							) : (
								<div style={{ overflowX: "auto" }}>
									<table
										style={{
											width: "100%",
											borderCollapse: "collapse",
											fontSize: "13px",
										}}
									>
										<thead>
											<tr style={{ borderBottom: "1px solid var(--border-color)" }}>
												<th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Date</th>
												<th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Type</th>
												<th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Provider</th>
												<th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Amount</th>
												<th style={{ textAlign: "left", padding: "12px", fontWeight: "600" }}>Status</th>
											</tr>
										</thead>
										<tbody>
											{transactionsData.data.map((txn) => (
												<tr
													key={txn.id}
													style={{
														borderBottom: "1px solid var(--border-color)",
														backgroundColor: "var(--bg-secondary)",
													}}
												>
													<td style={{ padding: "12px" }}>{formatDate(txn.created_at)}</td>
													<td style={{ padding: "12px", textTransform: "capitalize" }}>{txn.type}</td>
													<td style={{ padding: "12px", textTransform: "capitalize" }}>
														{txn.provider === "lemon_squeezy" ? "LemonSqueezy" : "Paddle"}
													</td>
													<td style={{ padding: "12px", fontWeight: "500" }}>
														{txn.type === "refund" ? "-" : ""}
														{formatCurrency(txn.amount, txn.currency)}
													</td>
													<td style={{ padding: "12px" }}>
														<span
															style={{
																display: "inline-block",
																padding: "4px 8px",
																borderRadius: "4px",
																backgroundColor:
																	txn.status === "completed"
																		? "rgba(34, 197, 94, 0.1)"
																		: txn.status === "pending"
																			? "rgba(59, 130, 246, 0.1)"
																			: "rgba(239, 68, 68, 0.1)",
																color:
																	txn.status === "completed"
																		? "#22c55e"
																		: txn.status === "pending"
																			? "#3b82f6"
																			: "#ef4444",
																fontSize: "12px",
																fontWeight: "500",
																textTransform: "capitalize",
															}}
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
								<div
									style={{
										marginTop: "16px",
										fontSize: "12px",
										color: "var(--text-tertiary)",
									}}
								>
									Showing {transactionsData.data.length} of {transactionsData.pagination.total} transactions
									{transactionsData.pagination.hasMore && " (more available)"}
								</div>
							)}
						</div>
					)}

					{/* Overview Tab */}
					{activeTab === "overview" && (
						<div className="card" style={{ padding: "48px", textAlign: "center" }}>
							<div style={{ fontSize: "48px", marginBottom: "16px" }}>💰</div>
							<h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
								Billing Overview
							</h2>
							<p style={{ fontSize: "14px", color: "var(--text-tertiary)", maxWidth: "480px", margin: "0 auto" }}>
								Monitor your payment metrics and transaction history. Use the tabs above to view detailed purchases and transactions
								from LemonSqueezy and Paddle.
							</p>
						</div>
					)}
				</>
			)}
		</div>
	);
}
