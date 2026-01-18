import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp, useAppStats, useProject } from "../hooks/api";
import { Icon } from "../components/Icon";
import {
	ArrowRight01Icon,
	Settings02Icon,
	UserMultiple02Icon,
	CheckmarkCircle02Icon,
	FlashIcon,
	DollarCircleIcon,
	UserIcon,
	LicenseIcon,
	Key01Icon,
	Share08Icon,
	CreditCardIcon,
	PlugIcon,
} from "@hugeicons/core-free-icons";

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
					<Icon icon={Settings02Icon} size={14} />
					Settings
				</button>
				</div>
			</div>

			{/* Stats Grid */}
		<div className="stats-grid grid-cols-4 mb-6">
			<div className="stat-card">
				<div className="stat-card-header">
					<div className="stat-icon purple">
						<Icon icon={UserMultiple02Icon} size={24} />
					</div>
				</div>
				<div className="stat-value">{statsLoading ? "—" : stats?.totalUsers || 0}</div>
				<div className="stat-label">Total Users</div>
			</div>
			<div className="stat-card">
				<div className="stat-card-header">
					<div className="stat-icon green">
						<Icon icon={CheckmarkCircle02Icon} size={24} />
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
							<Icon icon={FlashIcon} size={24} />
						</div>
					</div>
					<div className="stat-value">{statsLoading ? "—" : stats?.totalSessions || 0}</div>
					<div className="stat-label">Active Sessions</div>
				</div>
				<div className="stat-card">
					<div className="stat-card-header">
						<div className="stat-icon orange">
							<Icon icon={DollarCircleIcon} size={24} />
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
				<div className="w-12 h-12 rounded-lg bg-surface-secondary flex items-center justify-center">
							<Icon icon={UserMultiple02Icon} size={24} className="text-primary" />
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
				<div className="w-12 h-12 rounded-lg bg-surface-secondary flex items-center justify-center">
							<Icon icon={LicenseIcon} size={24} className="text-success" />
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
				<div className="w-12 h-12 rounded-lg bg-surface-secondary flex items-center justify-center">
						<Icon icon={Settings02Icon} size={24} className="text-info" />
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
					<div className="w-12 h-12 rounded-lg bg-surface-secondary flex items-center justify-center">
						<Icon icon={Key01Icon} size={24} className="text-warning" />
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
