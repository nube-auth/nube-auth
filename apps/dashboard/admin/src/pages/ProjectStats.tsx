import { Link, useParams } from "react-router-dom";
import { useProject, useProjectStats } from "../hooks/api";

export function ProjectStatsPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: stats, isLoading: statsLoading } = useProjectStats(projectId || "");

	if (projectLoading || statsLoading) {
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
					<span style={{ color: "var(--text-primary)" }}>Statistics</span>
				</div>
			</div>

			{/* Page Header */}
			<div style={{ marginBottom: "32px" }}>
				<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Project Statistics</h1>
				<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
					View detailed analytics and insights for {project.name}
				</p>
			</div>

			{/* Stats Cards */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
					gap: "20px",
					marginBottom: "32px",
				}}
			>
				<div className="card" style={{ padding: "20px" }}>
					<div
						style={{
							fontSize: "13px",
							color: "var(--text-tertiary)",
							marginBottom: "8px",
							fontWeight: "600",
							textTransform: "uppercase",
							letterSpacing: "0.5px",
						}}
					>
						Total Apps
					</div>
					<div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
						{stats?.totalApps || 0}
					</div>
				</div>

				<div className="card" style={{ padding: "20px" }}>
					<div
						style={{
							fontSize: "13px",
							color: "var(--text-tertiary)",
							marginBottom: "8px",
							fontWeight: "600",
							textTransform: "uppercase",
							letterSpacing: "0.5px",
						}}
					>
						Total Users
					</div>
					<div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
						{stats?.totalUsers || 0}
					</div>
				</div>

				<div className="card" style={{ padding: "20px" }}>
					<div
						style={{
							fontSize: "13px",
							color: "var(--text-tertiary)",
							marginBottom: "8px",
							fontWeight: "600",
							textTransform: "uppercase",
							letterSpacing: "0.5px",
						}}
					>
						Active Licenses
					</div>
					<div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
						{stats?.activeLicenses || 0}
					</div>
				</div>

				<div className="card" style={{ padding: "20px" }}>
					<div
						style={{
							fontSize: "13px",
							color: "var(--text-tertiary)",
							marginBottom: "8px",
							fontWeight: "600",
							textTransform: "uppercase",
							letterSpacing: "0.5px",
						}}
					>
						Monthly Revenue
					</div>
					<div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
						${(stats?.totalRevenue || 0).toFixed(2)}
					</div>
				</div>
			</div>

			{/* Coming Soon Section */}
			<div className="card" style={{ padding: "48px", textAlign: "center" }}>
				<div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
				<h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
					Advanced Analytics Coming Soon
				</h2>
				<p style={{ fontSize: "14px", color: "var(--text-tertiary)", maxWidth: "480px", margin: "0 auto" }}>
					We're working on detailed charts, user growth trends, retention analytics, and more. Stay tuned for
					updates!
				</p>
			</div>
		</div>
	);
}
