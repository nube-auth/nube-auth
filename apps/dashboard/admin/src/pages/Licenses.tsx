import { useLicenses } from "../hooks/api";
import {Icon, IconType} from "@proofa/components";;
import { AlertCircleIcon, LicenseIcon, TicketIcon } from "@hugeicons/core-free-icons";

export function LicensesPage() {
	const { data: licenses, isLoading, error } = useLicenses();

	if (isLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="alert alert-danger">
				<Icon icon={AlertCircleIcon} size={20} bold className="text-danger" />
				<span>Error loading licenses. Please try again.</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="page-header">
				<div>
					<h1 className="page-title">Licenses</h1>
					<p className="page-description">View and manage your license keys</p>
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
			<div className="card">
				<div className="card-header">
					<h2 className="font-semibold text-text-primary">All Licenses</h2>
					<p className="text-sm text-text-secondary mt-0.5">Your registered license keys and their status</p>
				</div>

				{licenses && licenses.length > 0 ? (
					<div className="table-container border-0">
						<table>
							<thead>
								<tr>
									<th>License ID</th>
									<th>App</th>
									<th>Plan</th>
									<th>Status</th>
									<th>Valid Until</th>
								</tr>
							</thead>
							<tbody>
								{licenses.map((license) => {
									const isActive = license.status === "active" || license.status !== "expired";
									const expiryDate = license.validUntil;
									const isExpired = expiryDate && new Date(expiryDate) < new Date();

									return (
										<tr key={license.id}>
											<td>
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 bg-warning-bg rounded-lg flex items-center justify-center">
														<Icon icon={TicketIcon} size={16} className="text-warning" />
													</div>
													<span className="code-inline">{license.id}</span>
												</div>
											</td>
											<td>
												<span className="text-text-secondary">{license.appId || "—"}</span>
											</td>
											<td>
												<span className="badge badge-info capitalize">
													{license.plan || "Standard"}
												</span>
											</td>
											<td>
												{isExpired ? (
													<span className="badge badge-danger">Expired</span>
												) : isActive ? (
													<span className="badge badge-success">Active</span>
												) : (
													<span className="badge badge-warning">Inactive</span>
												)}
											</td>
											<td className="text-text-secondary">
												{expiryDate
													? new Date(expiryDate).toLocaleDateString("en-US", {
															year: "numeric",
															month: "short",
															day: "numeric",
														})
													: "—"}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				) : (
					<div className="empty-state">
						<div className="empty-state-icon">
							<Icon icon={LicenseIcon} size={40} className="text-text-tertiary" />
						</div>
						<h3 className="empty-state-title">No licenses found</h3>
						<p className="empty-state-description">
							You don't have any licenses yet. Licenses are created when you set up billing for your apps.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
