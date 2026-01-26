import { useState } from "react";
import { useBillingPurchases, useBillingStats, useBillingTransactions } from "../hooks/api";
import {
	Badge,
	Button,
	Card,
	CardBody,
	Heading,
	Input,
	Spinner,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableHeader,
	TableRow,
	Tabs,
	TabsItem,
	TabsList,
	TabsPanel,
	Text,
} from "@proofa/components";

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
					<Heading size="lg" className="mb-2">Billing Dashboard</Heading>
					<Text className="text-text-muted">Monitor payments, subscriptions, and financial metrics</Text>
				</div>

				{/* Date Range Filters */}
				<div className="flex gap-3 items-center">
					<Input
						type="date"
						value={dateRange.start || ""}
						onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
					/>
					<Text className="text-text-muted">to</Text>
					<Input
						type="date"
						value={dateRange.end || ""}
						onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
					/>
					{(dateRange.start || dateRange.end) && (
						<Button
							variant="secondary"
							size="sm"
							onClick={() => setDateRange({})}
						>
							Clear
						</Button>
					)}
				</div>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Spinner />
				</div>
			) : (
				<>
					{/* Key Metrics Cards */}
					<div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 mb-8">
						<Card>
							<CardBody>
								<Text size="sm" className="text-text-muted mb-2 font-semibold uppercase tracking-wider">
									Total Revenue
								</Text>
								<Heading size="xl" className="mb-0">
									{formatCurrency(stats?.revenue.total || 0)}
								</Heading>
								{stats?.transactions.total && (
									<Text size="sm" className="text-text-muted mt-2">
										{stats.transactions.total} transactions
									</Text>
								)}
							</CardBody>
						</Card>

						<Card>
							<CardBody>
								<Text size="sm" className="text-text-muted mb-2 font-semibold uppercase tracking-wider">
									Refunds
								</Text>
								<Heading size="xl" className="mb-0 text-danger">
									{formatCurrency(stats?.refunds.total || 0)}
								</Heading>
								{stats?.refunds.percentage && (
									<Text size="sm" className="text-text-muted mt-2">
										{stats.refunds.percentage.toFixed(2)}% of revenue
									</Text>
								)}
							</CardBody>
						</Card>

						<Card>
							<CardBody>
								<Text size="sm" className="text-text-muted mb-2 font-semibold uppercase tracking-wider">
									Active Subscriptions
								</Text>
								<Heading size="xl" className="mb-0">
									{stats?.subscriptions.active || 0}
								</Heading>
							</CardBody>
						</Card>

						<Card>
							<CardBody>
								<Text size="sm" className="text-text-muted mb-2 font-semibold uppercase tracking-wider">
									Webhook Health
								</Text>
								<Heading size="xl" className="mb-0">
									{stats?.webhooks?.success ?? 0}
								</Heading>
								{(stats?.webhooks?.failed ?? 0) > 0 && (
									<Text size="sm" className="text-danger mt-2">
										{stats?.webhooks?.failed} failed
									</Text>
								)}
							</CardBody>
						</Card>
					</div>

					{/* Provider Breakdown */}
					{stats?.revenue.by_provider && Object.keys(stats.revenue.by_provider).length > 0 && (
						<Card className="mb-8">
							<CardBody>
								<Heading size="sm" className="mb-5">Revenue by Provider</Heading>
								<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
									{Object.entries(stats.revenue.by_provider).map(([provider, amount]) => (
										<Card key={provider} variant="subtle">
											<CardBody>
												<Text size="sm" className="text-text-muted mb-2 font-medium capitalize">
													{provider === "lemon_squeezy"
														? "LemonSqueezy"
														: provider === "paddle"
															? "Paddle"
															: provider}
												</Text>
												<Heading size="md" className="mb-0">
													{formatCurrency(amount as number)}
												</Heading>
											</CardBody>
										</Card>
									))}
								</div>
							</CardBody>
						</Card>
					)}

					{/* Transaction Type Breakdown */}
					{stats?.revenue.by_type && Object.keys(stats.revenue.by_type).length > 0 && (
						<Card className="mb-8">
							<CardBody>
								<Heading size="sm" className="mb-5">Revenue by Type</Heading>
								<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
									{Object.entries(stats.revenue.by_type).map(([type, amount]) => (
										<Card key={type} variant="subtle">
											<CardBody>
												<Text size="sm" className="text-text-muted mb-2 font-medium capitalize">
													{type}
												</Text>
												<Heading size="md" className="mb-0">
													{formatCurrency(amount as number)}
												</Heading>
											</CardBody>
										</Card>
									))}
								</div>
							</CardBody>
						</Card>
					)}

					{/* Tabs */}
					<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "overview" | "purchases" | "transactions")}>
						<TabsList className="mb-6">
							<TabsItem value="overview">Overview</TabsItem>
							<TabsItem value="purchases">Purchases</TabsItem>
							<TabsItem value="transactions">Transactions</TabsItem>
						</TabsList>

						{/* Purchases Table */}
						<TabsPanel value="purchases">
							{purchasesData && (
								<Card>
									<CardBody>
										<Heading size="sm" className="mb-5">Recent Purchases</Heading>
										{purchasesData.data.length === 0 ? (
											<Text className="text-center py-10 text-text-muted">No purchases found</Text>
										) : (
											<>
												<TableContainer>
													<Table>
														<TableHeader>
															<TableRow>
																<TableHead>Date</TableHead>
																<TableHead>Provider</TableHead>
																<TableHead>Amount</TableHead>
																<TableHead>Status</TableHead>
																<TableHead>App</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{purchasesData.data.map((purchase) => (
																<TableRow key={purchase.id}>
																	<TableCell>{formatDate(purchase.created_at)}</TableCell>
																	<TableCell className="capitalize">
																		{purchase.provider === "lemon_squeezy"
																			? "LemonSqueezy"
																			: "Paddle"}
																	</TableCell>
																	<TableCell className="font-medium">
																		{formatCurrency(purchase.amount, purchase.currency)}
																	</TableCell>
																	<TableCell>
																		<Badge
																			variant={
																				purchase.status === "completed"
																					? "success"
																					: purchase.status === "pending"
																						? "info"
																						: "danger"
																			}
																			size="sm"
																		>
																			{purchase.status}
																		</Badge>
																	</TableCell>
																	<TableCell>{purchase.app?.name || "—"}</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</TableContainer>
												{purchasesData.pagination && (
													<Text size="sm" className="mt-4 text-text-muted">
														Showing {purchasesData.data.length} of {purchasesData.pagination.total} purchases
														{purchasesData.pagination.hasMore && " (more available)"}
													</Text>
												)}
											</>
										)}
									</CardBody>
								</Card>
							)}
						</TabsPanel>

						{/* Transactions Table */}
						<TabsPanel value="transactions">
							{transactionsData && (
								<Card>
									<CardBody>
										<Heading size="sm" className="mb-5">Recent Transactions</Heading>
										{transactionsData.data.length === 0 ? (
											<Text className="text-center py-10 text-text-muted">No transactions found</Text>
										) : (
											<>
												<TableContainer>
													<Table>
														<TableHeader>
															<TableRow>
																<TableHead>Date</TableHead>
																<TableHead>Type</TableHead>
																<TableHead>Provider</TableHead>
																<TableHead>Amount</TableHead>
																<TableHead>Status</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{transactionsData.data.map((txn) => (
																<TableRow key={txn.id}>
																	<TableCell>{formatDate(txn.created_at)}</TableCell>
																	<TableCell className="capitalize">{txn.type}</TableCell>
																	<TableCell className="capitalize">
																		{txn.provider === "lemon_squeezy" ? "LemonSqueezy" : "Paddle"}
																	</TableCell>
																	<TableCell className="font-medium">
																		{txn.type === "refund" ? "-" : ""}
																		{formatCurrency(txn.amount, txn.currency)}
																	</TableCell>
																	<TableCell>
																		<Badge
																			variant={
																				txn.status === "completed"
																					? "success"
																					: txn.status === "pending"
																						? "info"
																						: "danger"
																			}
																			size="sm"
																		>
																			{txn.status}
																		</Badge>
																	</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</TableContainer>
												{transactionsData.pagination && (
													<Text size="sm" className="mt-4 text-text-muted">
														Showing {transactionsData.data.length} of {transactionsData.pagination.total} transactions
														{transactionsData.pagination.hasMore && " (more available)"}
													</Text>
												)}
											</>
										)}
									</CardBody>
								</Card>
							)}
						</TabsPanel>

						{/* Overview Tab */}
						<TabsPanel value="overview">
							<Card>
								<CardBody className="text-center py-12">
									<div className="text-5xl mb-4">💰</div>
									<Heading size="md" className="mb-2">Billing Overview</Heading>
									<Text className="text-text-muted max-w-md mx-auto">
										Monitor your payment metrics and transaction history. Use the tabs above to view
										detailed purchases and transactions from LemonSqueezy and Paddle.
									</Text>
								</CardBody>
							</Card>
						</TabsPanel>
					</Tabs>
				</>
			)}
		</div>
	);
}
