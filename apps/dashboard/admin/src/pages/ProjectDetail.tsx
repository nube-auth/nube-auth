import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { getIconById } from "../components/IconPicker";
import {
	AlertCircleIcon,
	ArrowRight01Icon,
	Folder01Icon,
	Copy01Icon,
	CheckmarkCircle02Icon,
	DashboardSquare02Icon,
	UserMultiple02Icon,
	Key01Icon,
	DollarCircleIcon,
	Add01Icon,
	Layers01Icon,
} from "@hugeicons/core-free-icons";
import { useProject, useProjectApps, useProjectMembers, useProjectStats } from "../hooks/api";

export function ProjectDetailPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: apps, isLoading: appsLoading } = useProjectApps(projectId || "");
	const { data: members, isLoading: membersLoading } = useProjectMembers(projectId || "");
	const { data: stats, isLoading: statsLoading } = useProjectStats(projectId || "");
	const [copied, setCopied] = useState(false);

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (projectLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project) {
		return (
			<div className="alert alert-danger">
				<Icon icon={AlertCircleIcon} size={20} className="text-danger" />
				<span>Project not found</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Project Header Card */}
			<div className="card p-6">
				<div className="flex items-start gap-5">
					<div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-light to-purple-200">
						<Icon icon={Folder01Icon} size={28} className="text-primary" />
					</div>
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-1">
							<h1 className="text-24px font-bold text-text-primary">
								{project.name}
							</h1>
							<span className="badge badge-success">Active</span>
						</div>
						{project.slug && (
							<p className="text-text-secondary mb-3">{project.slug}</p>
						)}
						<div className="flex items-center gap-3">
							<code className="code-block">
								{project.id}
							</code>
							<button
								type="button"
								onClick={() => copyToClipboard(project.id)}
								className="btn btn-ghost btn-sm"
							>
								{copied ? (
									<>
										<Icon icon={CheckmarkCircle02Icon} size={14} className="text-success" />
										Copied!
									</>
								) : (
									<>
										<Icon icon={Copy01Icon} size={14} className="text-text-primary" />
										Copy ID
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="stats-grid grid-cols-4">
				<div className="stat-card">
					<div className="stat-card-header">
						<div className="stat-icon blue">
							<Icon icon={Layers01Icon} size={20} className="text-current" />
						</div>
					</div>
					<div className="stat-value">{statsLoading ? "—" : stats?.totalApps || 0}</div>
					<div className="stat-label">Applications</div>
				</div>
				<div className="stat-card">
					<div className="stat-card-header">
						<div className="stat-icon purple">
							<Icon icon={UserMultiple02Icon} size={20} className="text-current" />
						</div>
					</div>
					<div className="stat-value">{statsLoading ? "—" : stats?.totalUsers || 0}</div>
					<div className="stat-label">Total Users</div>
				</div>
				<div className="stat-card">
					<div className="stat-card-header">
						<div className="stat-icon green">
							<Icon icon={Key01Icon} size={20} className="text-current" />
						</div>
					</div>
					<div className="stat-value">{statsLoading ? "—" : stats?.activeLicenses || 0}</div>
					<div className="stat-label">Active Licenses</div>
					{!statsLoading && stats && (
						<div className="text-11px text-text-tertiary mt-1">
							{stats.totalLicenses} total
						</div>
					)}
				</div>
				<div className="stat-card">
					<div className="stat-card-header">
						<div className="stat-icon orange">
							<Icon icon={DollarCircleIcon} size={20} className="text-current" />
						</div>
					</div>
					<div className="stat-value">${statsLoading ? "—" : (stats?.totalRevenue || 0).toFixed(2)}</div>
					<div className="stat-label">Revenue</div>
				</div>
			</div>

			{/* Applications Section */}
			<div className="card">
				<div className="card-header">
					<div>
						<h2 className="card-title">Applications</h2>
						<p className="card-desc">Apps registered under this project</p>
					</div>
					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/new`)}
						className="btn btn-primary"
					>
						<Icon icon={Add01Icon} size={16} />
						New App
					</button>
				</div>

				{appsLoading ? (
					<div className="loading">
						<div className="spinner" />
					</div>
				) : apps && apps.length > 0 ? (
					<div className="table-container">
						<table>
							<thead>
								<tr>
									<th>Name</th>
									<th>App ID</th>
									<th>Session TTL</th>
									<th>Status</th>
									<th className="w-8"></th>
								</tr>
							</thead>
							<tbody>
								{apps.map((app) => (
									<tr
										key={app.id}
										className="cursor-pointer"
										onClick={() => navigate(`/projects/${projectId}/apps/${app.id}`)}
									>
										<td>
											<div className="flex items-center gap-3">
												<div className="w-9 h-9 bg-surface-secondary rounded-md flex items-center justify-center">
													<Icon icon={getIconById(app.icon || "application")} size={18} className="text-primary" />
												</div>
												<span className="font-medium text-text-primary">
													{app.name}
												</span>
											</div>
										</td>
										<td>
											<code className="px-2 py-1 bg-content-bg rounded-sm font-mono text-11px">
												{app.id}
											</code>
										</td>
										<td>
											<span className="text-text-secondary">
												{app.sessionTtlDays || 30} days
											</span>
										</td>
										<td>
											<span className="badge badge-success">Active</span>
										</td>
										<td className="text-right pr-4">
											<Icon icon={ArrowRight01Icon} size={18} className="text-purple-600" />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="empty-state py-12 px-6">
						<div className="empty-state-icon">
							<Icon icon={DashboardSquare02Icon} size={28} className="text-text-tertiary" />
						</div>
						<h3 className="empty-state-title">No applications yet</h3>
						<p className="empty-state-desc">Create your first app to start managing authentication.</p>
						<button
							type="button"
							onClick={() => navigate(`/projects/${projectId}/apps/new`)}
							className="btn btn-primary"
						>
							<Icon icon={Add01Icon} size={16} />
							Create App
						</button>
					</div>
				)}
			</div>

			{/* Members Section */}
			<div className="card">
				<div className="card-header">
					<div>
						<h2 className="card-title">Team Members</h2>
						<p className="card-desc">People with access to this project</p>
					</div>
				</div>

				{membersLoading ? (
					<div className="loading">
						<div className="spinner" />
					</div>
				) : members && members.length > 0 ? (
					<div className="table-container">
						<table>
							<thead>
								<tr>
									<th>User</th>
									<th>User Id</th>
									<th>Role</th>
									<th>Joined</th>
								</tr>
							</thead>
							<tbody>
								{members.map((member) => (
									<tr key={member.id}>
										<td>
											<div className="flex items-center gap-3">
												<div className="avatar avatar-sm">
													{member.name?.charAt(0).toUpperCase() || "?"}
												</div>
												<span className="font-medium text-text-primary">
													{member.name}
												</span>
											</div>
										</td>
										<td>
											<code className="code-block">
												{member.userId}
											</code>
										</td>
										<td>
											<span
												className={`badge ${member.role === "owner" ? "badge-info" : "badge-success"}`}
											>
												{member.role}
											</span>
										</td>
										<td className="text-text-secondary">
											{new Date(member.createdAt).toLocaleDateString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="empty-state py-8 px-8">
						<p className="text-text-secondary">No team members found</p>
					</div>
				)}
			</div>
		</div>
	);
}
