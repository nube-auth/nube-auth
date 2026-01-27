import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp, useAppStats, useProject } from "../hooks/api";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Card,
	CardBody,
	Heading,
	Text,
	Button
} from "@proofa/components";

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
			<div className="flex items-center justify-center min-h-screen">
				<Spinner />
			</div>
		);
	}

	if (!project) {
		return (
			<Alert variant="danger">
				Project not found
			</Alert>
		);
	}

	if (!app) {
		return (
			<Alert variant="danger">
				App not found
			</Alert>
		);
	}

	return (
		<div className="space-y-6">
			{/* App Header Card */}
			<Card>
				<CardBody>
					<div className="flex justify-between items-start mb-5">
						<div className="flex-1">
							<div className="flex items-center gap-3 mb-2">
								<Heading level={1} size="lg">{app.name}</Heading>
							</div>
							<Text className="text-text-secondary mb-4">
								{app.description || "No description provided"}
							</Text>
							<div className="flex items-center gap-5 flex-wrap">
								<div className="flex items-center gap-2">
									<Text className="text-text-tertiary">ID:</Text>
									<code className="bg-card-bg px-2 py-0.5 rounded font-mono text-xs text-text-primary">
										{app.id}
									</code>
									<button
										onClick={copyPublicId}
										className="bg-transparent border-none cursor-pointer text-primary text-xs font-medium p-0"
									>
										{copied ? "✓ Copied" : "Copy"}
									</button>
								</div>
								<Text className="text-text-tertiary">
									Created {new Date(app.createdAt).toLocaleDateString()}
								</Text>
								<Text className="text-text-tertiary">
									Updated {new Date(app.updatedAt).toLocaleDateString()}
								</Text>
							</div>
						</div>
						<Button
							onClick={() => navigate(`/projects/${projectId}/apps/${appId}/settings`)}
							variant="secondary"
							className="shrink-0"
						>
							<Icon icon={IconType.Settings} size={14} />
							Settings
						</Button>
					</div>
				</CardBody>
			</Card>

			{/* Stats Grid */}
		<div className="stats-grid grid-cols-4 mb-6">
			<div className="stat-card">
				<div className="stat-card-header">
					<div className="stat-icon purple">
						<Icon icon={IconType.Users} size={24} />
					</div>
				</div>
				<div className="stat-value">{statsLoading ? "—" : stats?.totalUsers || 0}</div>
				<div className="stat-label">Total Users</div>
			</div>
			<div className="stat-card">
				<div className="stat-card-header">
					<div className="stat-icon green">
						<Icon icon={IconType.CheckCircle} size={24} />
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
							<Icon icon={IconType.Flash} size={24} />
						</div>
					</div>
					<div className="stat-value">{statsLoading ? "—" : stats?.totalSessions || 0}</div>
					<div className="stat-label">Active Sessions</div>
				</div>
				<div className="stat-card">
					<div className="stat-card-header">
						<div className="stat-icon orange">
						<Icon icon={IconType.DollarCircle} size={24} />
						</div>
					</div>
					<div className="stat-value">${statsLoading ? "—" : (stats?.totalRevenue || 0).toFixed(2)}</div>
					<div className="stat-label">Revenue</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div>
				<Heading level={3} size="lg" className="mb-4">
					Quick Actions
				</Heading>
				<div className="grid grid-cols-4 gap-4">
					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}/users`)}
						className="bg-card-bg border border-border-secondary rounded-lg p-5 cursor-pointer transition-all flex flex-col items-center gap-3 text-center hover:border-primary hover:-translate-y-0.5 hover:shadow-md"
					>
				<div className="w-12 h-12 rounded-lg bg-surface-secondary flex items-center justify-center">
						<Icon icon={IconType.UserMultiple} size={24} className="text-primary" />
					</div>
					<div>
						<Text className="font-semibold text-text-primary mb-1">
							Manage Users
						</Text>
						<Text className="text-text-tertiary">View & invite</Text>
					</div>
					</button>

					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}/licenses`)}
						className="bg-card-bg border border-border-secondary rounded-lg p-5 cursor-pointer transition-all flex flex-col items-center gap-3 text-center hover:border-primary hover:-translate-y-0.5 hover:shadow-md"
					>
				<div className="w-12 h-12 rounded-lg bg-surface-secondary flex items-center justify-center">
							<Icon icon={IconType.License} size={24} className="text-success" />
						</div>
						<div>
							<Text className="font-semibold text-text-primary mb-1">
								Licenses
							</Text>
							<Text className="text-text-tertiary">Plans & billing</Text>
						</div>
					</button>

					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}/settings`)}
						className="bg-card-bg border border-border-secondary rounded-lg p-5 cursor-pointer transition-all flex flex-col items-center gap-3 text-center hover:border-primary hover:-translate-y-0.5 hover:shadow-md"
					>
				<div className="w-12 h-12 rounded-lg bg-surface-secondary flex items-center justify-center">
								<Icon icon={IconType.Settings} size={24} className="text-info" />
						</div>
						<div>
							<Text className="font-semibold text-text-primary mb-1">
								Settings
							</Text>
							<Text className="text-text-tertiary">Auth & config</Text>
						</div>
					</button>

					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}/api-keys`)}
						className="bg-card-bg border border-border-secondary rounded-lg p-5 cursor-pointer transition-all flex flex-col items-center gap-3 text-center hover:border-primary hover:-translate-y-0.5 hover:shadow-md"
					>
					<div className="w-12 h-12 rounded-lg bg-surface-secondary flex items-center justify-center">
						<Icon icon={IconType.Key} size={24} className="text-warning" />
					</div>
					<div>
						<Text className="font-semibold text-text-primary mb-1">
							API Keys
						</Text>
						<Text className="text-text-tertiary">Integration</Text>
					</div>
					</button>
				</div>
			</div>
		</div>
	);
}
