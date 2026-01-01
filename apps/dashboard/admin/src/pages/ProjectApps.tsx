import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProject, useProjectApps } from "../hooks/api";

type ViewMode = "grid" | "table";

export function ProjectAppsPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: apps, isLoading: appsLoading } = useProjectApps(projectId || "");
	const [viewMode, setViewMode] = useState<ViewMode>("table");

	if (projectLoading || appsLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project) {
		return <div className="error-state">Project not found</div>;
	}

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div style={{ marginBottom: "24px" }}>
				<div
					style={{
						display: "flex",
						gap: "8px",
						alignItems: "center",
						fontSize: "13px",
						color: "var(--text-tertiary)",
					}}
				>
					<Link to="/projects" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						Projects
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}`}
						style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
					>
						{project.name}
					</Link>
					<span>›</span>
					<span style={{ color: "var(--text-primary)" }}>Apps</span>
				</div>
			</div>

			{/* Page Header */}
			<div
				style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}
			>
				<div>
					<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Applications</h1>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
						{apps?.length || 0} {apps?.length === 1 ? "app" : "apps"} in {project.name}
					</p>
				</div>
				<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
					{/* View Mode Toggle */}
					<div
						style={{
							display: "flex",
							gap: "4px",
							padding: "4px",
							background: "var(--surface-secondary)",
							borderRadius: "8px",
						}}
					>
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							style={{
								padding: "8px 12px",
								background: viewMode === "grid" ? "var(--content-bg)" : "transparent",
								border: "none",
								borderRadius: "6px",
								cursor: "pointer",
								color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-tertiary)",
								transition: "all 0.2s ease",
							}}
						>
							<svg
								style={{ width: "18px", height: "18px" }}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
								/>
							</svg>
						</button>
						<button
							type="button"
							onClick={() => setViewMode("table")}
							style={{
								padding: "8px 12px",
								background: viewMode === "table" ? "var(--content-bg)" : "transparent",
								border: "none",
								borderRadius: "6px",
								cursor: "pointer",
								color: viewMode === "table" ? "var(--text-primary)" : "var(--text-tertiary)",
								transition: "all 0.2s ease",
							}}
						>
							<svg
								style={{ width: "18px", height: "18px" }}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6h16M4 10h16M4 14h16M4 18h16"
								/>
							</svg>
						</button>
					</div>

					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/new`)}
						className="btn btn-primary"
					>
						+ New App
					</button>
				</div>
			</div>

			{/* Apps Content */}
			{!apps || apps.length === 0 ? (
				<div className="card" style={{ padding: "64px 24px", textAlign: "center" }}>
					<div style={{ fontSize: "64px", marginBottom: "16px" }}>📱</div>
					<h2
						style={{
							fontSize: "20px",
							fontWeight: "600",
							marginBottom: "12px",
							color: "var(--text-primary)",
						}}
					>
						No apps yet
					</h2>
					<p
						style={{
							fontSize: "14px",
							color: "var(--text-tertiary)",
							marginBottom: "24px",
							maxWidth: "400px",
							margin: "0 auto 24px",
						}}
					>
						Get started by creating your first application in this project
					</p>
					<button
						type="button"
						onClick={() => navigate(`/projects/${projectId}/apps/new`)}
						className="btn btn-primary"
					>
						Create First App
					</button>
				</div>
			) : viewMode === "grid" ? (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
						gap: "20px",
					}}
				>
					{apps.map((app) => (
						<div
							key={app.id}
							className="card"
							style={{
								padding: "24px",
								cursor: "pointer",
								transition: "all 0.2s ease",
								border: "1px solid var(--card-border)",
							}}
							onClick={() => navigate(`/projects/${projectId}/apps/${app.id}`)}
							onMouseEnter={(e) => {
								e.currentTarget.style.borderColor = "var(--primary)";
								e.currentTarget.style.transform = "translateY(-2px)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = "var(--card-border)";
								e.currentTarget.style.transform = "translateY(0)";
							}}
						>
							<div
								style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}
							>
								<div
									style={{
										width: "48px",
										height: "48px",
										borderRadius: "12px",
										background: "linear-gradient(135deg, var(--primary-light), #ddd6fe)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										flexShrink: 0,
									}}
								>
									<svg
										style={{ width: "24px", height: "24px", color: "var(--primary)" }}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
										/>
									</svg>
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<h3
										style={{
											fontSize: "16px",
											fontWeight: "600",
											marginBottom: "4px",
											color: "var(--text-primary)",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{app.name}
									</h3>
									<p
										style={{
											fontSize: "13px",
											color: "var(--text-tertiary)",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{app.slug}
									</p>
								</div>
							</div>

							{app.description && (
								<p
									style={{
										fontSize: "14px",
										color: "var(--text-secondary)",
										marginBottom: "16px",
										lineHeight: "1.5",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
										overflow: "hidden",
									}}
								>
									{app.description}
								</p>
							)}

							<div
								style={{
									display: "flex",
									gap: "16px",
									paddingTop: "16px",
									borderTop: "1px solid var(--border-primary)",
									fontSize: "13px",
								}}
							>
								<div>
									<span style={{ color: "var(--text-tertiary)" }}>Users: </span>
									<span style={{ color: "var(--text-primary)", fontWeight: "600" }}>0</span>
								</div>
								<div>
									<span style={{ color: "var(--text-tertiary)" }}>Licenses: </span>
									<span style={{ color: "var(--text-primary)", fontWeight: "600" }}>0</span>
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="card" style={{ padding: "0", overflow: "hidden" }}>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr
								style={{
									borderBottom: "1px solid var(--border-primary)",
									background: "var(--surface-secondary)",
								}}
							>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Application
								</th>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Users
								</th>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Licenses
								</th>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Created
								</th>
								<th
									style={{
										padding: "14px 16px",
										textAlign: "right",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-tertiary)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{apps.map((app) => (
								<tr
									key={app.id}
									style={{ borderBottom: "1px solid var(--border-primary)", cursor: "pointer" }}
									onClick={() => navigate(`/projects/${projectId}/apps/${app.id}`)}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = "var(--surface-secondary)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = "transparent";
									}}
								>
									<td style={{ padding: "14px 16px" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
											<div
												style={{
													width: "40px",
													height: "40px",
													borderRadius: "8px",
													background:
														"linear-gradient(135deg, var(--primary-light), #ddd6fe)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													flexShrink: 0,
												}}
											>
												<svg
													style={{ width: "20px", height: "20px", color: "var(--primary)" }}
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
													/>
												</svg>
											</div>
											<div>
												<div
													style={{
														fontSize: "14px",
														fontWeight: "500",
														color: "var(--text-primary)",
													}}
												>
													{app.name}
												</div>
												<div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
													{app.slug}
												</div>
											</div>
										</div>
									</td>
									<td
										style={{
											padding: "14px 16px",
											fontSize: "14px",
											color: "var(--text-secondary)",
										}}
									>
										0
									</td>
									<td
										style={{
											padding: "14px 16px",
											fontSize: "14px",
											color: "var(--text-secondary)",
										}}
									>
										0
									</td>
									<td
										style={{
											padding: "14px 16px",
											fontSize: "14px",
											color: "var(--text-secondary)",
										}}
									>
										{new Date(app.createdAt).toLocaleDateString()}
									</td>
									<td style={{ padding: "14px 16px", textAlign: "right" }}>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												navigate(`/projects/${projectId}/apps/${app.id}/settings`);
											}}
											className="btn btn-secondary-outline btn-sm"
										>
											Settings
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
