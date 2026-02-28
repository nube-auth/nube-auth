import { useLicenses } from "../hooks/api";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Heading,
	Text,
	Card,
	CardBody,
	Chip,
	Table,
	TableContainer,
	TableHeader,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
	EmptyState,
} from "@proofa/components";

export function LicensesPage() {
	const { data: licenses, isLoading, error } = useLicenses();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Spinner />
			</div>
		);
	}

	if (error) {
		return (
			<Alert variant="danger">
				<Icon icon={IconType.AlertCircle} size={20} bold className="text-danger" />
				Error loading licenses. Please try again.
			</Alert>
		);
	}

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="page-header">
				<div>
					<Heading level={1} size="lg">Licenses</Heading>
					<Text className="text-text-secondary mt-2">View and manage your license keys</Text>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<div className="stat-card">
					<p className="stat-label">Total Licenses</p>
					<p className="stat-value">{licenses?.length || 0}</p>
				</div>
				<div className="stat-card">
					<p className="stat-label">Active</p>
					<p className="stat-value text-success">
						{licenses?.filter((l) => l.status === "active").length || 0}
					</p>
				</div>
				<div className="stat-card">
					<p className="stat-label">Expired</p>
					<p className="stat-value text-text-tertiary">
						{licenses?.filter((l) => l.status !== "active").length || 0}
					</p>
				</div>
			</div>

			{/* Licenses Table */}
			<Card>
					<CardBody>
						<div className="mb-6">
							<Heading level={2} size="md" className="mb-1">All Licenses</Heading>
							<Text className="text-text-secondary">Your registered license keys and their status</Text>
						</div>

						{licenses && licenses.length > 0 ? (
							<TableContainer>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>License ID</TableHead>
											<TableHead>App</TableHead>
											<TableHead>Plan</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Valid Until</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
								{licenses.map((license) => {
									const isActive = license.status === "active" || license.status !== "expired";
									const expiryDate = license.validUntil;
									const isExpired = expiryDate && new Date(expiryDate) < new Date();

									return (
										<TableRow key={license.id} className="hover:bg-accent transition-colors">
											<TableCell>
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 bg-warning-bg rounded-lg flex items-center justify-center">
														<Icon icon={IconType.Ticket} size={16} className="text-warning" />
												</div>
												<Text className="font-mono text-sm">{license.id}</Text>
											</div>
											</TableCell>
											<TableCell>
												<Text className="text-text-secondary">{license.appId || "—"}</Text>
											</TableCell>
											<TableCell>
											<Chip variant="info" size="sm" className="capitalize">
												{license.plan || "Standard"}
											</Chip>
											</TableCell>
											<TableCell>
												{isExpired ? (
													<Chip variant="danger" size="sm">Expired</Chip>
												) : isActive ? (
													<Chip variant="success" size="sm">Active</Chip>
												) : (
													<Chip variant="warning" size="sm">Inactive</Chip>
												)}
											</TableCell>
											<TableCell>
											<Text className="text-text-secondary">
												{expiryDate
													? new Date(expiryDate).toLocaleDateString("en-US", {
															year: "numeric",
															month: "short",
															day: "numeric",
														})
													: "—"}
											</Text>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
				) : (
					<EmptyState
						title="No licenses found"
						description="You don't have any licenses yet. Licenses are created when you set up billing for your apps."
					/>
				)}
			</CardBody>
		</Card>
	</div>
);
}
