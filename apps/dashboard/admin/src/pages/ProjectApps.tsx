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
			<div className="mb-6">
				<div className="breadcrumbs">
					<Link to="/projects" className="breadcrumb-item">
						Projects
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}`}
						className="breadcrumb-item"
					>
						{project.name}
					</Link>
					<span>›</span>
					<span className="breadcrumb-current">Apps</span>
				</div>
			</div>

			{/* Page Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-24px font-bold mb-2">Applications</h1>
					<p className="text-14px text-text-tertiary">
						{apps?.length || 0} {apps?.length === 1 ? "app" : "apps"} in {project.name}
					</p>
				</div>
				<div className="flex gap-3 items-center">
					{/* View Mode Toggle */}
					<div className="flex gap-1 p-1 bg-bg-muted rounded-lg">
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={`px-3 py-2 border-none rounded-md cursor-pointer transition-all ${
								viewMode === "grid" ? "bg-bg-surface text-text-primary" : "bg-transparent text-text-tertiary"
							}`}
						>
							<svg
								className="w-4.5 h-4.5"
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
							className={`px-3 py-2 border-none rounded-md cursor-pointer transition-all ${
								viewMode === "table" ? "bg-bg-surface text-text-primary" : "bg-transparent text-text-tertiary"
							}`}
						>
							<svg
								className="w-4.5 h-4.5"
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
				<div className="card py-16 px-6 text-center">
					<div className="text-6xl mb-4">📱</div>
					<h2 className="text-20px font-semibold mb-3 text-text-primary">
						No apps yet
					</h2>
					<p className="text-14px text-text-tertiary mb-6 max-w-sm mx-auto">
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
				<div className="grid gap-5 grid-cols-auto-fill-320">
					{apps.map((app) => (
						<div
							key={app.id}
							className="card p-6 cursor-pointer transition-all border border-border"
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
							<div className="flex items-start gap-4 mb-4">
								<div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-light to-purple-200">
									<svg className="w-6 h-6 text-primary"
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
							<div className="flex-1 min-w-0">
								<h3 className="text-16px font-semibold mb-1 text-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
										{app.name}
									</h3>
									<p className="text-13px text-text-tertiary overflow-hidden text-ellipsis whitespace-nowrap">
										{app.slug}
									</p>
								</div>
							</div>

							{app.description && (
								<p className="text-14px text-text-secondary mb-4 leading-1.5 line-clamp-2">
									{app.description}
								</p>
							)}

							<div className="flex gap-4 pt-4 border-t border-border text-13px">
								<div>
									<span className="text-text-tertiary">Users: </span>
									<span className="text-text-primary font-semibold">0</span>
								</div>
								<div>
									<span className="text-text-tertiary">Licenses: </span>
									<span className="text-text-primary font-semibold">0</span>
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="card p-0 overflow-hidden">
					<table className="w-full border-collapse">
						<thead>
							<tr className="border-b border-border bg-bg-muted">
								<th className="px-4 py-3.5 text-left text-12px font-semibold text-text-tertiary uppercase tracking-wider">
									Application
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-semibold text-text-tertiary uppercase tracking-wider">
									Users
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-semibold text-text-tertiary uppercase tracking-wide">
									Licenses
								</th>
								<th className="px-4 py-3.5 text-left text-12px font-semibold text-text-tertiary uppercase tracking-wide">
									Created
								</th>
								<th className="px-4 py-3.5 text-right text-12px font-semibold text-text-tertiary uppercase tracking-wide">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{apps.map((app) => (
								<tr
									key={app.id}
									className="border-b border-border cursor-pointer hover:bg-bg-hover"
									onClick={() => navigate(`/projects/${projectId}/apps/${app.id}`)}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = "var(--surface-secondary)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = "transparent";
									}}
								>
								<td className="px-4 py-3.5">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-light to-purple-200">
												<svg
												className="w-5 h-5 text-primary"
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
												<div className="text-14px font-medium text-text-primary">
													{app.name}
												</div>
											<div className="text-13px text-text-secondary">
													{app.slug}
												</div>
											</div>
										</div>
									</td>
									<td className="px-4 py-3.5 text-14px text-text-secondary">
										0
									</td>
									<td className="px-4 py-3.5 text-14px text-text-secondary">
										0
									</td>
									<td className="px-4 py-3.5 text-14px text-text-secondary">
										{new Date(app.createdAt).toLocaleDateString()}
									</td>
									<td className="px-4 py-3.5 text-right">
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
