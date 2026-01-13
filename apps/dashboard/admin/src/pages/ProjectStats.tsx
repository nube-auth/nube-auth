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
			<div className="mb-6">
				<div className="breadcrumb">
					<Link to="/projects" className="breadcrumb-link">
						Projects
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}`}
						className="breadcrumb-link"
					>
						{project.name}
					</Link>
					<span>›</span>
					<span className="text-text-primary">Statistics</span>
				</div>
			</div>

			{/* Page Header */}
			<div className="mb-8">
				<h1 className="page-title">Project Statistics</h1>
				<p className="text-14px text-text-tertiary">
					View detailed analytics and insights for {project.name}
				</p>
			</div>

			{/* Stats Cards */}
		<div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 mb-8">
			<div className="card p-5">
				<div className="text-13px text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
					Total Apps
				</div>
				<div className="text-32px font-bold text-text-primary">
					{stats?.totalApps || 0}
				</div>
			</div>

			<div className="card p-5">
				<div className="text-13px text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
					Total Users
				</div>
				<div className="text-32px font-bold text-text-primary">
					{stats?.totalUsers || 0}
				</div>
			</div>

			<div className="card p-5">
				<div className="text-13px text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
					Active Licenses
				</div>
				<div className="text-32px font-bold text-text-primary">
					{stats?.activeLicenses || 0}
				</div>
			</div>

			<div className="card p-5">
				<div className="text-13px text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
					Monthly Revenue
				</div>
				<div className="text-32px font-bold text-text-primary">
					</div>
				</div>
			</div>

			{/* Coming Soon Section */}
		<div className="card p-12 text-center">
			<div className="text-48px mb-4">📊</div>
			<h2 className="text-20px font-semibold mb-2 text-text-primary">
				Advanced Analytics Coming Soon
			</h2>
			<p className="text-14px text-text-tertiary max-w-[480px] mx-auto">
					We're working on detailed charts, user growth trends, retention analytics, and more. Stay tuned for
					updates!
				</p>
			</div>
		</div>
	);
}
