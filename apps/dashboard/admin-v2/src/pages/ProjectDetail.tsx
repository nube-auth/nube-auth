import { useParams, Link } from "react-router-dom";
import { Button, Spinner, Alert } from "@proofa/components";
import { useProject, useProjectStats } from "@/hooks/useProjects";

export default function ProjectDetail() {
	const { projectId } = useParams<{ projectId: string }>();
	const { data: project, isLoading, error } = useProject(projectId);
	const { data: stats } = useProjectStats(projectId);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="p-6">
				<Alert variant="danger">
					Failed to load project: {error instanceof Error ? error.message : "Not found"}
				</Alert>
			</div>
		);
	}

	return (
		<div className="p-6">
			{/* Header */}
			<div className="mb-6">
				<div className="flex items-center gap-2 text-sm text-text-muted mb-2">
					<Link to="/projects" className="hover:text-primary">
						Projects
					</Link>
					<span>/</span>
					<span className="text-text-primary">{project.name}</span>
				</div>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
						<p className="text-text-muted mt-1">/{project.slug}</p>
					</div>
					<Button variant="secondary">Edit Project</Button>
				</div>
			</div>

			{/* Description */}
			{project.description && (
				<div className="bg-card-bg border border-card-border rounded-lg p-4 mb-6">
					<p className="text-text-primary">{project.description}</p>
				</div>
			)}

			{/* Stats Grid */}
			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<div className="bg-card-bg border border-card-border rounded-lg p-4">
						<div className="text-2xl font-bold text-text-primary">{stats.totalApps}</div>
						<div className="text-sm text-text-muted mt-1">Total Apps</div>
					</div>
					<div className="bg-card-bg border border-card-border rounded-lg p-4">
						<div className="text-2xl font-bold text-text-primary">{stats.totalUsers}</div>
						<div className="text-sm text-text-muted mt-1">Total Users</div>
					</div>
					<div className="bg-card-bg border border-card-border rounded-lg p-4">
						<div className="text-2xl font-bold text-text-primary">
							{stats.activeLicenses}/{stats.totalLicenses}
						</div>
						<div className="text-sm text-text-muted mt-1">Active Licenses</div>
					</div>
					<div className="bg-card-bg border border-card-border rounded-lg p-4">
						<div className="text-2xl font-bold text-text-primary">
							${stats.totalRevenue.toFixed(2)}
						</div>
						<div className="text-sm text-text-muted mt-1">Total Revenue</div>
					</div>
				</div>
			)}

			{/* Apps Section */}
			<div className="bg-card-bg border border-card-border rounded-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-text-primary">Applications</h2>
					<Button variant="primary">Create App</Button>
				</div>

				<div className="text-center py-8">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-bg-muted rounded-full mb-4">
						<svg
							className="w-8 h-8 text-text-muted"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-text-primary mb-2">
						No applications yet
					</h3>
					<p className="text-text-muted text-sm mb-4">
						Create your first app to get started with authentication and licensing
					</p>
					<Button variant="primary">Create Your First App</Button>
				</div>
			</div>

			{/* Metadata */}
			<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-card-bg border border-card-border rounded-lg p-4">
					<div className="text-sm text-text-muted mb-1">Project ID</div>
					<div className="font-mono text-sm text-text-primary">{project.id}</div>
				</div>
				{project.createdAt && (
					<div className="bg-card-bg border border-card-border rounded-lg p-4">
						<div className="text-sm text-text-muted mb-1">Created</div>
						<div className="text-sm text-text-primary">
							{new Date(project.createdAt).toLocaleDateString("en-US", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
