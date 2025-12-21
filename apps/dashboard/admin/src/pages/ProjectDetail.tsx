import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateApp, useProject, useProjectApps, useProjectMembers } from '../hooks/api';

export function ProjectDetailPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || '');
	const { data: apps, isLoading: appsLoading } = useProjectApps(projectId || '');
	const { data: members, isLoading: membersLoading } = useProjectMembers(projectId || '');
	const createAppMutation = useCreateApp(projectId || '');
	const [showAppForm, setShowAppForm] = useState(false);
	const [appName, setAppName] = useState('');

	const handleCreateApp = (e: React.FormEvent) => {
		e.preventDefault();
		createAppMutation.mutate(
			{ name: appName },
			{
				onSuccess: () => {
					setAppName('');
					setShowAppForm(false);
				},
			},
		);
	};

	if (projectLoading) return <div className="p-4">Loading project...</div>;
	if (!project) return <div className="p-4 text-red-600">Project not found</div>;

	return (
		<div className="py-4 space-y-6">
			<button type="button" onClick={() => navigate('/projects')} className="text-blue-600 hover:underline">
				← Back to Projects
			</button>

			<div className="bg-white p-6 rounded-lg border">
				<h1 className="text-3xl font-bold">{project.name}</h1>
				<p className="text-gray-600 mt-2">{project.description}</p>
				<p className="text-gray-500 text-sm mt-4">ID: {project.public_id}</p>
			</div>

			{/* Apps Section */}
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<h2 className="text-2xl font-bold">Applications</h2>
					<button
						type="button"
						onClick={() => setShowAppForm(!showAppForm)}
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
					>
						{showAppForm ? 'Cancel' : 'New App'}
					</button>
				</div>

				{showAppForm && (
					<form onSubmit={handleCreateApp} className="bg-white p-4 rounded-lg border space-y-4">
						<div>
							<label htmlFor="appName" className="block text-sm font-medium mb-1">
								App Name
							</label>
							<input
								type="text"
								id="appName"
								required
								value={appName}
								onChange={(e) => setAppName(e.target.value)}
								className="w-full"
							/>
						</div>
						<button
							type="submit"
							disabled={createAppMutation.isPending}
							className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
						>
							{createAppMutation.isPending ? 'Creating...' : 'Create App'}
						</button>
					</form>
				)}

				{appsLoading ? (
					<div className="text-gray-600">Loading apps...</div>
				) : (
					<div className="bg-white rounded-lg overflow-hidden border">
						<table>
							<thead>
								<tr className="bg-gray-50">
									<th>Name</th>
									<th>ID</th>
									<th>Session TTL</th>
								</tr>
							</thead>
							<tbody>
								{apps?.map((app) => (
									<tr key={app.id}>
										<td className="font-medium">{app.name}</td>
										<td className="text-sm font-mono">{app.public_id}</td>
										<td className="text-sm">{app.app_session_ttl_days} days</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Members Section */}
			<div className="space-y-4">
				<h2 className="text-2xl font-bold">Members</h2>
				{membersLoading ? (
					<div className="text-gray-600">Loading members...</div>
				) : (
					<div className="bg-white rounded-lg overflow-hidden border">
						<table>
							<thead>
								<tr className="bg-gray-50">
									<th>User ID</th>
									<th>Role</th>
									<th>Joined</th>
								</tr>
							</thead>
							<tbody>
								{members?.map((member) => (
									<tr key={member.id}>
										<td className="text-sm font-mono">{member.user_id}</td>
										<td className="text-sm capitalize">{member.role}</td>
										<td className="text-sm text-gray-600">
											{new Date(member.created_at).toLocaleDateString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
