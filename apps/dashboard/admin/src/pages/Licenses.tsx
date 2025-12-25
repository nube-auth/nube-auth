import { useLicenses } from "../hooks/api";

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
				<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
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
					<p className="stat-value text-green-600">
						{licenses?.filter((l) => l.status === "active" || l.active).length || 0}
					</p>
				</div>
				<div className="stat-card">
					<p className="stat-label">Expired</p>
					<p className="stat-value text-gray-400">
						{licenses?.filter((l) => l.status === "expired" || !l.active).length || 0}
					</p>
				</div>
			</div>

			{/* Licenses Table */}
			<div className="card">
				<div className="card-header">
					<h2 className="font-semibold text-gray-900">All Licenses</h2>
					<p className="text-sm text-gray-500 mt-0.5">Your registered license keys and their status</p>
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
									const isActive = license.status === "active" || license.active;
									const expiryDate = license.validUntil || license.expires_at;
									const isExpired = expiryDate && new Date(expiryDate) < new Date();
									
									return (
										<tr key={license.id}>
											<td>
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
														<svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
														</svg>
													</div>
													<span className="code-inline">{license.id}</span>
												</div>
											</td>
											<td>
												<span className="text-gray-600">{license.appId || "—"}</span>
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
											<td className="text-gray-500">
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
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
							</svg>
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
