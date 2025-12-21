import { useLogout, useSessions } from '../hooks/api';

export function SessionsPage() {
	const { data: sessions, isLoading } = useSessions();
	const { mutate: logout, isPending } = useLogout();

	if (isLoading) {
		return <div className="p-4">Loading...</div>;
	}

	return (
		<div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-2xl mx-auto">
				<h1 className="text-2xl font-bold mb-6">Active Sessions</h1>

				<div className="bg-white rounded-lg shadow overflow-hidden">
					{sessions && sessions.length > 0 ? (
						<table className="w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
										Created
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
										Expires
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
										Status
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{sessions.map((session) => (
									<tr key={session.id}>
										<td className="px-6 py-4 text-sm text-gray-900">
											{new Date(session.createdAt).toLocaleString()}
										</td>
										<td className="px-6 py-4 text-sm text-gray-900">
											{new Date(session.expiresAt).toLocaleString()}
										</td>
										<td className="px-6 py-4 text-sm">
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium ${
													session.isCurrent
														? 'bg-green-100 text-green-800'
														: 'bg-gray-100 text-gray-800'
												}`}
											>
												{session.isCurrent ? 'Current' : 'Active'}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<div className="p-6 text-center text-gray-500">No active sessions</div>
					)}
				</div>

				<div className="mt-6">
					<button
						type="button"
						onClick={() => logout()}
						disabled={isPending}
						className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
					>
						{isPending ? 'Logging out...' : 'Logout from All Sessions'}
					</button>
				</div>
			</div>
		</div>
	);
}
