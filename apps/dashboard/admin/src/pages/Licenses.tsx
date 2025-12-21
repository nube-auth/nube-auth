import { useLicenses } from "../hooks/api";

export function LicensesPage() {
	const { data: licenses, isLoading, error } = useLicenses();

	if (isLoading) return <div className="p-4">Loading licenses...</div>;
	if (error) return <div className="p-4 text-red-600">Error loading licenses</div>;

	return (
		<div className="py-4 space-y-4">
			<h1 className="text-2xl font-bold">Licenses</h1>

			<div className="bg-white rounded-lg overflow-hidden border">
				<table>
					<thead>
						<tr className="bg-gray-50">
							<th>License ID</th>
							<th>App ID</th>
							<th>Max Requests/Day</th>
							<th>Status</th>
							<th>Expires</th>
						</tr>
					</thead>
					<tbody>
						{licenses?.map((license) => (
							<tr key={license.id}>
								<td className="text-sm font-mono">{license.public_id}</td>
								<td className="text-sm font-mono">{license.app_id}</td>
								<td className="text-sm">{license.max_requests_per_day}</td>
								<td>
									<span
										className={`inline-block px-2 py-1 text-xs rounded ${
											license.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
										}`}
									>
										{license.active ? "Active" : "Inactive"}
									</span>
								</td>
								<td className="text-sm text-gray-600">
									{new Date(license.expires_at).toLocaleDateString()}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
