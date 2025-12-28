import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
				<svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>Project not found</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
				<Link to="/projects" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
					Projects
				</Link>
				<svg style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span style={{ color: "var(--text-primary)", fontWeight: "500" }}>{project.name}</span>
			</nav>

			{/* Project Header Card */}
			<div className="card" style={{ padding: "24px" }}>
				<div style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
					<div style={{
						width: "56px",
						height: "56px",
						background: "linear-gradient(135deg, var(--primary-light), #ddd6fe)",
						borderRadius: "var(--radius-lg)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0
					}}>
						<svg style={{ width: "28px", height: "28px", color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
						</svg>
					</div>
					<div style={{ flex: 1 }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
							<h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>{project.name}</h1>
							<span className="badge badge-success">Active</span>
						</div>
						{project.slug && (
							<p style={{ color: "var(--text-secondary)", marginBottom: "12px" }}>{project.slug}</p>
						)}
						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							<code style={{
								padding: "6px 12px",
								background: "var(--content-bg)",
								borderRadius: "var(--radius)",
								fontFamily: "'JetBrains Mono', monospace",
								fontSize: "12px",
								color: "var(--text-primary)"
							}}>
								{project.id}
							</code>
							<button
								type="button"
								onClick={() => copyToClipboard(project.id)}
								className="btn btn-ghost btn-sm"
							>
								{copied ? (
									<>
										<svg style={{ width: "14px", height: "14px", color: "var(--success)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
										</svg>
										Copied!
									</>
								) : (
									<>
										<svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
										</svg>
										Copy ID
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
				<div className="stat-card">
					<div className="stat-card-header">
						<div className="stat-icon blue">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
						</div>
					</div>
					<div className="stat-value">{statsLoading ? "—" : stats?.totalApps || 0}</div>
					<div className="stat-label">Applications</div>
				</div>
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
						<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
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
									<th style={{ width: "32px" }}></th>
								</tr>
							</thead>
							<tbody>
								{apps.map((app) => (
									<tr key={app.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/projects/${projectId}/apps/${app.id}`)}>
										<td>
											<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
												<div style={{
													width: "36px",
													height: "36px",
													background: "#ede9fe",
													borderRadius: "var(--radius-md)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center"
												}}>
													<svg style={{ width: "18px", height: "18px", color: "#7c3aed" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
													</svg>
												</div>
												<span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{app.name}</span>
											</div>
										</td>
										<td>
											<code style={{
												padding: "4px 8px",
												background: "var(--content-bg)",
												borderRadius: "var(--radius-sm)",
												fontFamily: "'JetBrains Mono', monospace",
												fontSize: "11px"
											}}>{app.id}</code>
										</td>
										<td>
											<span style={{ color: "var(--text-secondary)" }}>{app.appSessionTtlDays || 28} days</span>
										</td>
										<td>
											<span className="badge badge-success">Active</span>
										</td>
										<td style={{ textAlign: "right", paddingRight: "16px" }}>
											<svg style={{ width: "16px", height: "16px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
											</svg>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="empty-state" style={{ padding: "48px 24px" }}>
						<div className="empty-state-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
						</div>
						<h3 className="empty-state-title">No applications yet</h3>
						<p className="empty-state-desc">Create your first app to start managing authentication.</p>
						<button type="button" onClick={() => navigate(`/projects/${projectId}/apps/new`)} className="btn btn-primary">
							<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
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
											<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
												<div className="avatar avatar-sm">
													{member.name?.charAt(0).toUpperCase() || "?"}
												</div>
												<span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{member.name}</span>
											</div>
										</td>
										<td>
											<code style={{
													padding: "4px 8px",
													background: "var(--content-bg)",
													borderRadius: "var(--radius-sm)",
													fontFamily: "'JetBrains Mono', monospace",
													fontSize: "11px"
												}}>{member.userId}</code>
										</td>
										<td>
											<span className={`badge ${member.role === "owner" ? "badge-info" : "badge-success"}`}>
												{member.role}
											</span>
										</td>
										<td style={{ color: "var(--text-secondary)" }}>
											{new Date(member.createdAt).toLocaleDateString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="empty-state" style={{ padding: "32px" }}>
						<p style={{ color: "var(--text-secondary)" }}>No team members found</p>
					</div>
				)}
			</div>
		</div>
	);
}
