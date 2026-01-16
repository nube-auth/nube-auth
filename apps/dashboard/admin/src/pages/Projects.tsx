import { useState } from "react";
import { Link } from "react-router-dom";
import { useCreateProject, useProjects } from "../hooks/api";

type ViewMode = "grid" | "table";

export function ProjectsPage() {
	const { data: projects, isLoading, error } = useProjects();
	const createProjectMutation = useCreateProject();
	const [showForm, setShowForm] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>("table");
	const [formData, setFormData] = useState({ name: "", slug: "", description: "" });

	const generateSlug = (name: string) => {
		return name
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.substring(0, 50);
	};

	const handleNameChange = (name: string) => {
		setFormData({
			...formData,
			name,
			slug: generateSlug(name),
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createProjectMutation.mutate(formData, {
			onSuccess: () => {
				setFormData({ name: "", slug: "", description: "" });
				setShowForm(false);
			},
		});
	};

	if (isLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="alert alert-danger">
				<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span>Error loading projects. Please try again.</span>
			</div>
		);
	}

	const hasProjects = projects && projects.length > 0;

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="page-header">
				<div>
					<h1 className="page-title">Projects</h1>
					<p className="page-description">Manage your authentication projects</p>
				</div>
				<div className="flex gap-3 items-center">
					{hasProjects && (
						<div
							className="flex bg-surface-secondary rounded-lg p-1 gap-1"
						>
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								className={`px-3 py-1.5 border-none rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-13px font-medium ${
									viewMode === "grid" ? "bg-bg-primary text-text-primary" : "bg-transparent text-text-secondary"
								}`}
							>
								<svg
									className="w-3.5 h-3.5"
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
								Grid
							</button>
							<button
								type="button"
								onClick={() => setViewMode("table")}
								className={`px-3 py-1.5 border-none rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-13px font-medium ${
									viewMode === "table" ? "bg-bg-primary text-text-primary" : "bg-transparent text-text-secondary"
								}`}
							>
								<svg
									className="w-3.5 h-3.5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
									/>
								</svg>
								Table
							</button>
						</div>
					)}
					<button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						New Project
					</button>
				</div>
			</div>

			{/* Create Project Modal/Form */}
			{showForm && (
				<div className="modal-overlay" onClick={() => setShowForm(false)}>
					<div className="modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Create New Project</h3>
							<button type="button" className="modal-close" onClick={() => setShowForm(false)}>
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
						<form onSubmit={handleSubmit}>
							<div className="modal-body">
								<div className="form-group">
									<label htmlFor="projectName">Project Name *</label>
									<input
										type="text"
										id="projectName"
										placeholder="My Awesome Project"
										required
										value={formData.name}
										onChange={(e) => handleNameChange(e.target.value)}
									/>
								</div>
								<div className="form-group">
									<label htmlFor="projectSlug">Project Slug *</label>
									<input
										type="text"
										id="projectSlug"
										placeholder="my-awesome-project"
										required
										value={formData.slug}
										onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
									/>
									<p className="text-12px text-text-tertiary mt-1.5">
										Auto-generated from project name. Use only letters, numbers, and hyphens.
									</p>
								</div>
								<div className="form-group">
									<label htmlFor="projectDescription">Description (optional)</label>
									<textarea
										id="projectDescription"
										placeholder="What is this project about?"
										value={formData.description}
										onChange={(e) => setFormData({ ...formData, description: e.target.value })}
										rows={3}
									/>
								</div>
							</div>
							<div className="modal-footer">
								<button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
									Cancel
								</button>
								<button
									type="submit"
									className="btn btn-primary"
									disabled={createProjectMutation.isPending}
								>
									{createProjectMutation.isPending ? "Creating..." : "Create Project"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Empty State */}
			{!hasProjects && (
				<div
					className="flex flex-col items-center justify-center py-20 px-5 text-center"
				>
					<div
						className="w-30 h-30 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-6"
					>
						<svg
							className="w-14 h-14 text-primary"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
							/>
						</svg>
					</div>
					<h2
						className="text-24px font-bold text-text-primary mb-3"
					>
						Welcome to Proofa!
					</h2>
					<p
						className="text-15px text-text-secondary max-w-120 mb-8 leading-relaxed"
					>
						Get started by creating your first project. Projects help you organize your applications and
						manage authentication across your services.
					</p>
					<button
						type="button"
						onClick={() => setShowForm(true)}
						className="btn btn-primary py-3 px-6 text-15px"
					>
						<svg
							className="w-4.5 h-4.5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Create Your First Project
					</button>
					<div
						className="mt-12 flex gap-8 text-text-tertiary text-13px"
					>
						<div className="flex items-center gap-2">
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
							<span>Quick Setup</span>
						</div>
						<div className="flex items-center gap-2">
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
								/>
							</svg>
							<span>Secure by Default</span>
						</div>
						<div className="flex items-center gap-2">
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
								/>
							</svg>
							<span>Production Ready</span>
						</div>
					</div>
				</div>
			)}

			{/* Grid View */}
			{hasProjects && viewMode === "grid" && (
				<div
					className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5"
				>
					{projects.map((project) => (
						<Link
							key={project.id}
							to={`/projects/${project.id}`}
							className="block bg-card-bg border border-border-secondary rounded-xl p-5 no-underline transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-lg"
						>
							{/* Header */}
							<div
								className="flex items-center justify-between mb-3"
							>
								<div className="flex items-center gap-2.5">
									<div
										className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center text-white text-14px font-semibold"
									>
										{project.name.charAt(0).toUpperCase()}
									</div>
									<div>
										<h3
											className="text-16px font-semibold text-text-primary mb-0.5"
										>
											{project.name}
										</h3>
										{project.slug && (
											<p className="text-12px text-text-tertiary">
												{project.slug}
											</p>
										)}
									</div>
								</div>
								<span
									className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded text-11px font-medium"
								>
									<span
										className="w-1.5 h-1.5 bg-current rounded-full"
									/>
									Active
								</span>
							</div>

							{/* Stats Grid */}
							<div
								className="grid grid-cols-3 gap-3 mt-4 p-3 bg-surface-secondary rounded-lg"
							>
								<div className="text-center">
									<div
										className="text-20px font-bold text-text-primary mb-0.5"
									>
										{project.totalApps || 0}
									</div>
									<div className="text-11px text-text-tertiary">Apps</div>
								</div>
								<div className="text-center">
									<div
										className="text-20px font-bold text-text-primary mb-0.5"
									>
										{project.totalUsers || 0}
									</div>
									<div className="text-11px text-text-tertiary">Users</div>
								</div>
								<div className="text-center">
									<div
										className="text-20px font-bold text-text-primary mb-0.5"
									>
										{project.activeLicenses || 0}
									</div>
									<div className="text-11px text-text-tertiary">Licenses</div>
								</div>
							</div>

							{/* Footer */}
							<div
								className="flex items-center justify-between mt-3 pt-3 border-t border-border-secondary"
							>
								<div className="flex items-center gap-1.5">
									<svg
										className="w-3.5 h-3.5 text-success"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span className="text-14px font-semibold text-success">
										${(project.totalRevenue || 0).toFixed(2)}
									</span>
								</div>
								<span
									className="text-11px text-text-tertiary font-mono"
								>
									{project.id.substring(0, 8)}
								</span>
							</div>
						</Link>
					))}
				</div>
			)}

			{/* Table View */}
			{hasProjects && viewMode === "table" && (
				<div className="card p-0 overflow-hidden">
					<table className="w-full border-collapse">
						<thead>
							<tr
								className="bg-surface-secondary border-b border-border-secondary"
							>
								<th
									className="px-4 py-3 text-left text-12px font-semibold text-text-secondary uppercase"
								>
									Name
								</th>
								<th
									className="px-4 py-3 text-center text-12px font-semibold text-text-secondary uppercase"
								>
									Apps
								</th>
								<th
									className="px-4 py-3 text-center text-12px font-semibold text-text-secondary uppercase"
								>
									Users
								</th>
								<th
									className="px-4 py-3 text-center text-12px font-semibold text-text-secondary uppercase"
								>
									Licenses
								</th>
								<th
									className="px-4 py-3 text-right text-12px font-semibold text-text-secondary uppercase"
								>
									Revenue
								</th>
								<th
									className="px-4 py-3 text-center text-12px font-semibold text-text-secondary uppercase"
								>
									Status
								</th>
								<th className="px-4 py-3 w-12"></th>
							</tr>
						</thead>
						<tbody>
							{projects.map((project) => (
								<tr
									key={project.id}
									className="border-b border-border-secondary transition-colors cursor-pointer hover:bg-surface-hover"
									onClick={() => (window.location.href = `/projects/${project.id}`)}
								>
									<td className="p-4">
										<div className="flex items-center gap-3">
											<div
												className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-md flex items-center justify-center text-white text-13px font-semibold flex-shrink-0"
											>
												{project.name.charAt(0).toUpperCase()}
											</div>
											<div>
												<div
													className="text-14px font-medium text-text-primary mb-0.5"
												>
													{project.name}
												</div>
												{project.slug && (
													<div className="text-12px text-text-tertiary">
														{project.slug}
													</div>
												)}
											</div>
										</div>
									</td>
									<td className="p-4 text-center">
										<span
											className="text-15px font-semibold text-text-primary"
										>
											{project.totalApps || 0}
										</span>
									</td>
									<td className="p-4 text-center">
										<span
											className="text-15px font-semibold text-text-primary"
										>
											{project.totalUsers || 0}
										</span>
									</td>
									<td className="p-4 text-center">
										<span
											className="text-15px font-semibold text-text-primary"
										>
											{project.activeLicenses || 0}
											<span
												className="text-13px text-text-tertiary font-normal ml-0.5"
											>
												/ {project.totalLicenses || 0}
											</span>
										</span>
									</td>
									<td className="p-4 text-right">
										<span className="text-15px font-semibold text-success">
											${(project.totalRevenue || 0).toFixed(2)}
										</span>
									</td>
									<td className="p-4 text-center">
										<span
											className="inline-flex items-center gap-1 px-2.5 py-1 bg-success/10 text-success rounded-xl text-12px font-medium"
										>
											<span
												className="w-1.5 h-1.5 bg-current rounded-full"
											/>
											Active
										</span>
									</td>
									<td className="p-4 text-center">
										<svg
											className="w-4 h-4 text-text-tertiary"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 5l7 7-7 7"
											/>
										</svg>
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
