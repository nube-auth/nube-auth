import { useLicenses } from "../hooks/api";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Heading,
	Text,
	DataTable,
	DataTableHeader,
	DataTableRow,
	Chip,
	Card,
	CardBody,
	TableHeader,
	TableHead,
	TableBody,
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
				<Card>
					<CardBody className="p-4">
						<Text className="text-xs uppercase tracking-wide text-text-tertiary">Total Licenses</Text>
						<Heading level={3} size="lg" className="mt-2 mb-0">{licenses?.length || 0}</Heading>
					</CardBody>
				</Card>
				<Card>
					<CardBody className="p-4">
						<Text className="text-xs uppercase tracking-wide text-text-tertiary">Active</Text>
						<Heading level={3} size="lg" className="mt-2 mb-0 text-success">
							{licenses?.filter((l) => l.status === "active").length || 0}
						</Heading>
					</CardBody>
				</Card>
				<Card>
					<CardBody className="p-4">
						<Text className="text-xs uppercase tracking-wide text-text-tertiary">Expired</Text>
						<Heading level={3} size="lg" className="mt-2 mb-0 text-text-secondary">
							{licenses?.filter((l) => l.status !== "active").length || 0}
						</Heading>
					</CardBody>
				</Card>
			</div>

			{/* Licenses Table */}
			<DataTable
				header={
					<DataTableHeader
						title="All Licenses"
						description="Your registered license keys and their status"
					/>
				}
				isEmpty={!licenses || licenses.length === 0}
				emptyState={
					<EmptyState
						title="No licenses found"
						description="You don't have any licenses yet. Licenses are created when you set up billing for your apps."
					/>
				}
			>
				<TableHeader>
					<tr>
						<TableHead>License ID</TableHead>
						<TableHead>App</TableHead>
						<TableHead>Plan</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Valid Until</TableHead>
					</tr>
				</TableHeader>
				<TableBody>
					{licenses?.map((license) => {
						const isActive = license.status === "active" || license.status !== "expired";
						const expiryDate = license.validUntil;
						const isExpired = expiryDate && new Date(expiryDate) < new Date();

						return (
							<DataTableRow key={license.id}>
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
							</DataTableRow>
						);
					})}
				</TableBody>
			</DataTable>
	</div>
);
}
