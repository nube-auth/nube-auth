import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp, useProject, useAppStats } from "../hooks/api";

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
			<nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
				<button
					onClick={() => navigate(`/projects/${projectId}`)}
					style={{
						background: "none",
						border: "none",
						color: "var(--primary)",
						cursor: "pointer",
						textDecoration: "underline",
					}}
				>
					{project.name}
				</button>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<button
					onClick={() => navigate(`/projects/${projectId}`)}
					style={{
						background: "none",
						border: "none",
						color: "var(--text-secondary)",
						cursor: "pointer",
						textDecoration: "underline",
					}}
				>
					Apps
				</button>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>{app.name}</span>
			</nav>

			{/* App Header Card */}
			<div className="card" style={{ padding: "24px" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
					<div style={{ flex: 1 }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
							<h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
								{app.name}
							</h1>
							<span style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "5px",
								padding: "4px 10px",
								borderRadius: "12px",
								background: app.isActive ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
								color: app.isActive ? "var(--success)" : "var(--danger)",
								fontSize: "12px",
								fontWeight: "600",
							}}>
								<span style={{
									width: "6px",
									height: "6px",
									borderRadius: "50%",
									background: "currentColor",
								}} />
								{app.isActive ? "Active" : "Inactive"}
							</span>
						</div>
						<p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "0 0 16px 0" }}>
							{app.description || "No description provided"}
						</p>
						<div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>ID:</span>
								<code style={{ 
									background: "var(--surface-secondary)", 
									padding: "3px 8px", 
									borderRadius: "4px", 
									fontFamily: "monospace", 
									fontSize: "11px",
									color: "var(--text-primary)",
								}}>
									{app.id}
								</code>
								<button
									onClick={copyPublicId}
									style={{
										background: "none",
										border: "none",
										cursor: "pointer",
										color: "var(--primary)",
										fontSize: "11px",
										fontWeight: "500",
										padding: "0",
									}}
								>
									{copied ? "✓ Copied" : "Copy"}
								</button>
							</div>
							<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
								Created {new Date(app.createdAt).toLocaleDateString()}
							</div>
							<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
								Updated {new Date(app.updatedAt).toLocaleDateString()}
							</div>
						</div>
					</div>
					<button
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}/settings`)}
						className="btn btn-secondary"
						style={{ flexShrink: 0 }}
					>
						<svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						Settings
					</button>
				</div>
			</div>

		{/* Stats Grid */}
				<div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "24px" }}>
					<div className="stat-card">
						<div className="stat-card-header">
							<div className="stat-icon purple">
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
						</div>
						<div className="stat-value">{statsLoading ? "—" : stats?.activeLicenses || 0}</div>
						<div className="stat-label">Active Licenses</div>
						{!statsLoading && stats && (
							<div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
								{stats.totalLicenses} total
							</div>
						)}
					</div>
					<div className="stat-card">
						<div className="stat-card-header">
							<div className="stat-icon blue">
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
						</div>
						<div className="stat-value">${statsLoading ? "—" : (stats?.totalRevenue || 0).toFixed(2)}</div>
						<div className="stat-label">Revenue</div>
					</div>
				</div>

				{/* Quick Actions */}
				<div>
					<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "var(--text-primary)" }}>
						Quick Actions
					</h3>
					<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
						<button
							type="button"
							onClick={() => navigate(`/projects/${projectId}/apps/${appId}/users`)}
							style={{
								background: "var(--card-bg)",
								border: "1px solid var(--border-secondary)",
								borderRadius: "12px",
								padding: "20px",
								cursor: "pointer",
								transition: "all 0.2s ease",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "12px",
								textAlign: "center",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.borderColor = "var(--primary)";
								e.currentTarget.style.transform = "translateY(-2px)";
								e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = "var(--border-secondary)";
								e.currentTarget.style.transform = "translateY(0)";
								e.currentTarget.style.boxShadow = "none";
							}}
						>
					<div style={{
								width: "48px",
								height: "48px",
								borderRadius: "12px",
								background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))",
								display: "flex",
						alignItems: "center",
								justifyContent: "center",
							}}>
								<svg style={{ width: "24px", height: "24px", color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
								</svg>
							</div>
							<div>
								<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
									Manage Users
								</div>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
									View & invite
								</div>
							</div>
						</button>

					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/${appId}/licenses`)}
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--border-secondary)",
					borderRadius: "12px",
							padding: "20px",
							cursor: "pointer",
							transition: "all 0.2s ease",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "12px",
							textAlign: "center",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = "var(--primary)";
							e.currentTarget.style.transform = "translateY(-2px)";
							e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.borderColor = "var(--border-secondary)";
							e.currentTarget.style.transform = "translateY(0)";
							e.currentTarget.style.boxShadow = "none";
						}}
					>
						<div style={{
							width: "48px",
							height: "48px",
							borderRadius: "12px",
							background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}>
							<svg style={{ width: "24px", height: "24px", color: "var(--success)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
							</svg>
						</div>
						<div>
							<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
								Licenses
							</div>
							<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
								Plans & billing
							</div>
						</div>
					</button>

						<button
							type="button"
							onClick={() => navigate(`/projects/${projectId}/apps/${appId}/settings`)}
							style={{
								background: "var(--card-bg)",
								border: "1px solid var(--border-secondary)",
								borderRadius: "12px",
								padding: "20px",
								cursor: "pointer",
								transition: "all 0.2s ease",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "12px",
								textAlign: "center",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.borderColor = "var(--primary)";
								e.currentTarget.style.transform = "translateY(-2px)";
								e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = "var(--border-secondary)";
								e.currentTarget.style.transform = "translateY(0)";
								e.currentTarget.style.boxShadow = "none";
							}}
						>
							<div style={{
								width: "48px",
								height: "48px",
								borderRadius: "12px",
								background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
								<svg style={{ width: "24px", height: "24px", color: "rgb(59, 130, 246)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							</div>
							<div>
								<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
									Settings
								</div>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
									Auth & config
								</div>
							</div>
						</button>

						<button
							type="button"
							onClick={() => navigate(`/projects/${projectId}/apps/${appId}/api-keys`)}
							style={{
								background: "var(--card-bg)",
								border: "1px solid var(--border-secondary)",
								borderRadius: "12px",
								padding: "20px",
								cursor: "pointer",
								transition: "all 0.2s ease",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "12px",
								textAlign: "center",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.borderColor = "var(--primary)";
								e.currentTarget.style.transform = "translateY(-2px)";
								e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = "var(--border-secondary)";
								e.currentTarget.style.transform = "translateY(0)";
								e.currentTarget.style.boxShadow = "none";
							}}
						>
							<div style={{
								width: "48px",
								height: "48px",
								borderRadius: "12px",
								background: "linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(251, 146, 60, 0.05))",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
								<svg style={{ width: "24px", height: "24px", color: "rgb(251, 146, 60)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
								</svg>
							</div>
							<div>
								<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
									API Keys
								</div>
								<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
									Integration
								</div>
							</div>
						</button>
					</div>
				</div>
	</div>
);
}
