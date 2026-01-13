import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp, useAppStats, useProject } from "../hooks/api";

export function AppDetailPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const { data: stats, isLoading: statsLoading } = useAppStats(projectId || "", appId || "");

	const [copied, setCopied] = useState(false);

	const copyPublicId = () => {
		if (app?.id) {
			navigator.clipboard.writeText(app.id);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	if (projectLoading || appLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project) {
		return (
			<div className="alert alert-danger">
				<span>Project not found</span>
			</div>
		);
	}

	if (!app) {
		return (
			<div className="alert alert-danger">
				<span>App not found</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
		<nav className="breadcrumb">
			<button onClick={() => navigate(`/projects/${projectId}`)} className="bg-transparent border-none text-primary cursor-pointer underline p-0">
				{project.name}
			</button>
			<svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
			</svg>
			<button onClick={() => navigate(`/projects/${projectId}`)} className="bg-transparent border-none text-text-secondary cursor-pointer underline p-0">
				Apps
			</button>
			<svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
			</svg>
			<span className="breadcrumb-current">{app.name}</span>
		</nav>

			{/* App Header Card */}
		<div className="card p-6">
			<div className="flex justify-between items-start mb-5">
				<div className="flex-1">
					<div className="flex items-center gap-3 mb-2">
						<h1 className="page-title m-0">{app.name}</h1>
					</div>
					<p className="text-text-secondary text-14px m-0 mb-4">
						{app.description || "No description provided"}
					</p>
					<div className="flex items-center gap-5 flex-wrap">
						<div className="flex items-center gap-2">
							<span className="text-12px text-text-tertiary">ID:</span>
							<code className="bg-card-bg px-2 py-0.5 rounded font-mono text-11px text-text-primary">
								{app.id}
							</code>
							<button
								onClick={copyPublicId}
								className="bg-transparent border-none cursor-pointer text-primary text-11px font-medium p-0"
							>
								{copied ? "✓ Copied" : "Copy"}
							</button>
						</div>
						<div className="text-12px text-text-tertiary">
							Created {new Date(app.createdAt).toLocaleDateString()}
						</div>
						<div className="text-12px text-text-tertiary">
							Updated {new Date(app.updatedAt).toLocaleDateString()}
						</div>
					</div>
				</div>
				<button
					onClick={() => navigate(`/projects/${projectId}/apps/${appId}/settings`)}
					className="btn btn-secondary shrink-0"
				>
					<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						Settings
					</button>
				</div>
			</div>

			{/* Stats Grid */}
		<div className="stats-grid grid-cols-4 mb-6">
			<div className="stat-card">
				<div className="stat-card-header">
					<div className="stat-icon purple">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
							/>
						</svg>
					</div>
				</div>
				<div className="stat-value">{statsLoading ? "—" : stats?.totalUsers || 0}</div>
				<div className="stat-label">Total Users</div>
			</div>
			<div className="stat-card">
				<div className="stat-card-header">
					<div className="stat-icon green">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
				</div>
				<div className="stat-value">{statsLoading ? "—" : stats?.activeLicenses || 0}</div>
				<div className="stat-label">Active Licenses</div>
				{!statsLoading && stats && (
					<div className="text-11px text-text-tertiary mt-1">
						</div>
					)}
				</div>
				<div className="stat-card">
					<div className="stat-card-header">
						<div className="stat-icon blue">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
					</div>
					<div className="stat-value">{statsLoading ? "—" : stats?.totalSessions || 0}</div>
					<div className="stat-label">Active Sessions</div>
				</div>
				<div className="stat-card">
					<div className="stat-card-header">
						<div className="stat-icon orange">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
					</div>
					<div className="stat-value">${statsLoading ? "—" : (stats?.totalRevenue || 0).toFixed(2)}</div>
					<div className="stat-label">Revenue</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div>
				<h3 className="text-16px font-semibold mb-4 text-text-primary">
					Quick Actions
				</h3>
				<div className="grid grid-cols-4 gap-4">
					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}/users`)}
						className="bg-card-bg border border-border-secondary rounded-lg p-5 cursor-pointer transition-all flex flex-col items-center gap-3 text-center hover:border-primary hover:-translate-y-0.5 hover:shadow-md"
					>
						<div className="w-12 h-12 rounded-lg bg-[linear-gradient(135deg,rgba(139,92,246,0.1),rgba(139,92,246,0.05))] flex items-center justify-center">
							<svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
								/>
						</svg>
						</div>
						<div>
							<div className="text-14px font-semibold text-text-primary mb-1">
								Manage Users
							</div>
							<div className="text-12px text-text-tertiary">View & invite</div>
						</div>
					</button>

					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}/licenses`)}
						className="bg-card-bg border border-border-secondary rounded-lg p-5 cursor-pointer transition-all flex flex-col items-center gap-3 text-center hover:border-primary hover:-translate-y-0.5 hover:shadow-md"
					>
						<div className="w-12 h-12 rounded-lg bg-[linear-gradient(135deg,rgba(34,197,94,0.1),rgba(34,197,94,0.05))] flex items-center justify-center">
							<svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
								/>
							</svg>
						</div>
						<div>
							<div className="text-14px font-semibold text-text-primary mb-1">
								Licenses
							</div>
							<div className="text-12px text-text-tertiary">Plans & billing</div>
						</div>
					</button>

					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}/settings`)}
						className="bg-card-bg border border-border-secondary rounded-lg p-5 cursor-pointer transition-all flex flex-col items-center gap-3 text-center hover:border-primary hover:-translate-y-0.5 hover:shadow-md"
					>
						<div className="w-12 h-12 rounded-lg bg-[linear-gradient(135deg,rgba(59,130,246,0.1),rgba(59,130,246,0.05))] flex items-center justify-center">
							<svg className="w-6 h-6 text-[rgb(59,130,246)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</div>
						<div>
							<div className="text-14px font-semibold text-text-primary mb-1">
								Settings
							</div>
							<div className="text-12px text-text-tertiary">Auth & config</div>
						</div>
					</button>

					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}/api-keys`)}
						className="bg-card-bg border border-border-secondary rounded-lg p-5 cursor-pointer transition-all flex flex-col items-center gap-3 text-center hover:border-primary hover:-translate-y-0.5 hover:shadow-md"
					>
						<div className="w-12 h-12 rounded-lg bg-[linear-gradient(135deg,rgba(251,146,60,0.1),rgba(251,146,60,0.05))] flex items-center justify-center">
							<svg className="w-6 h-6 text-[rgb(251,146,60)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/>
							</svg>
						</div>
						<div>
							<div className="text-14px font-semibold text-text-primary mb-1">
								API Keys
							</div>
							<div className="text-12px text-text-tertiary">Integration</div>
						</div>
					</button>
				</div>
			</div>
		</div>
	);
}
