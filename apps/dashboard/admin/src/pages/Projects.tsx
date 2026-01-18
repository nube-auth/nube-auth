import { useState } from "react";
import { Link } from "react-router-dom";
import { useCreateProject, useProjects } from "../hooks/api";
import { Icon } from "../components/Icon";
import { IconPicker, getIconById } from "../components/IconPicker";
import {
	AlertCircleIcon,
	GridViewIcon,
	Menu01Icon,
	Add01Icon,
	Cancel01Icon,
	Layers01Icon,
	FlashIcon,
	LockIcon,
	SecurityCheckIcon,
	DollarCircleIcon,
	ArrowRight01Icon,
	Tick02Icon,
} from "@hugeicons/core-free-icons";

type ViewMode = "grid" | "table";

export function ProjectsPage() {
	const { data: projects, isLoading, error } = useProjects();
	const createProjectMutation = useCreateProject();
	const [showForm, setShowForm] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>("table");
	const [formData, setFormData] = useState({ name: "", slug: "", description: "", icon: "folder" });

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
				setFormData({ name: "", slug: "", description: "", icon: "folder" });
				setShowForm(false);
			},
		});
	};

	if (isLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
				<span className="loading-text">Loading projects...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="alert-danger">
				<Icon icon={AlertCircleIcon} size={20} bold className="alert-icon" />
				<span>Error loading projects. Please try again.</span>
			</div>
		);
	}

	const hasProjects = projects && projects.length > 0;

	return (
		<>
			{/* Create Project Modal/Form */}
			{showForm && (
		<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
			<div className="bg-card-bg border border-card-border rounded-xl w-full mx-4 max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between px-6 py-4 border-b border-card-border flex-shrink-0 bg-card-bg">
						<h3 className="text-18px font-600 text-text-primary m-0">Create New Project</h3>
						<button type="button" className="btn-ghost w-8 h-8 p-0 flex items-center justify-center" onClick={() => setShowForm(false)}>
							<Icon icon={Cancel01Icon} size={20} />
						</button>
					</div>
					<form onSubmit={handleSubmit} className="flex flex-col flex-1">
						<div className="p-6 text-text-primary overflow-y-auto flex-1 bg-card-bg">
							<div className="form-group">
								<label htmlFor="projectName" className="form-label">Project Name *</label>
								<input
									type="text"
									id="projectName"
									className="form-control"
									placeholder="My Awesome Project"
									required
									value={formData.name}
									onChange={(e) => handleNameChange(e.target.value)}
								/>
							</div>
							<div className="form-group">
								<label htmlFor="projectSlug" className="form-label">Project Slug *</label>
								<input
									type="text"
									id="projectSlug"
									className="form-control"
									placeholder="my-awesome-project"
									required
									value={formData.slug}
									onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
								/>
								<p className="text-12px text-text-tertiary mt-1.5">
									Auto-generated from project name. Use only letters, numbers, and hyphens.
								</p>
							</div>
							<IconPicker
								selectedIconId={formData.icon}
								onSelect={(icon) => setFormData({ ...formData, icon })}
								label="Project Icon"
							/>
							<div className="form-group">
								<label htmlFor="projectDescription" className="form-label">Description (optional)</label>
								<textarea
									id="projectDescription"
									className="form-control resize-y"
									placeholder="What is this project about?"
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									rows={3}
								/>
							</div>
						</div>
						<div className="flex items-center justify-end gap-3 p-6 border-t border-card-border flex-shrink-0 bg-card-bg">
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

			<div className="space-y-6">
				{/* Page Header */}
				<div className="page-header">
					<div>
						<h1 className="page-title">Projects</h1>
						<p className="page-description">Manage your authentication projects</p>
					</div>
					{hasProjects && (
						<div className="flex gap-3 items-center">
							<div
								className="flex bg-card-bg border border-card-border rounded-lg p-1 gap-1"
							>
								<button
									type="button"
									onClick={() => setViewMode("grid")}
									className={`px-3 py-1.5 border-none rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-13px font-medium ${
										viewMode === "grid" ? "bg-primary text-white" : "bg-transparent text-text-secondary hover:text-text-primary"
									}`}
								>
									<Icon icon={GridViewIcon} size={14} bold={viewMode === "grid"} />
									Grid
								</button>
								<button
									type="button"
									onClick={() => setViewMode("table")}
									className={`px-3 py-1.5 border-none rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-13px font-medium ${
										viewMode === "table" ? "bg-primary text-white" : "bg-transparent text-text-secondary hover:text-text-primary"
									}`}
								>
									<Icon icon={Menu01Icon} size={14} bold={viewMode === "table"} />
									Table
								</button>
							</div>
							<button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
								<Icon icon={Add01Icon} size={16} bold />
								New Project
							</button>
						</div>
					)}
				</div>

			{/* Empty State */}
			{!hasProjects && (
				<div
					className="flex flex-col items-center justify-center py-20 px-5 text-center"
				>
					<div className="relative mb-6">
						<div
							className="w-25 h-25 rounded-full flex items-center justify-center border border-primary/25"
						>
							<Icon icon={Layers01Icon} size={44} className="text-primary" />
						</div>
						<div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-[var(--content-bg)]">
							<Icon icon={Add01Icon} size={16} className="text-white" bold />
						</div>
					</div>
					<h2
						className="text-24px font-bold text-text-primary mb-3"
					>
						Create your first project
					</h2>
					<p
						className="text-15px text-text-secondary max-w-100 mb-8 leading-relaxed"
					>
						Projects help you organize your applications and manage authentication across your services.
					</p>
					<button
						type="button"
						onClick={() => setShowForm(true)}
						className="btn btn-primary py-3 px-6 text-15px"
					>
						<Icon icon={Add01Icon} size={18} bold />
						New Project
					</button>
					<div
						className="mt-10 flex gap-8 text-text-tertiary text-13px"
					>
						<div className="flex items-center gap-2">
							<Icon icon={FlashIcon} size={16} />
							<span>Quick Setup</span>
						</div>
						<div className="flex items-center gap-2">
							<Icon icon={LockIcon} size={16} />
							<span>Secure by Default</span>
						</div>
						<div className="flex items-center gap-2">
							<Icon icon={SecurityCheckIcon} size={16} />
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
							className="block bg-card-bg border border-card-border rounded-xl p-5 no-underline transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-lg"
						>
							{/* Header */}
							<div
								className="flex items-center justify-between mb-3"
							>
								<div className="flex items-center gap-2.5">
									<div
										className="w-9 h-9 bg-surface-secondary rounded-lg flex items-center justify-center"
									>
										<Icon icon={getIconById(project.icon || "folder")} size={20} className="text-primary" />
									</div>
									<div>
										<h3 className="project-name">
											{project.name}
										</h3>
										{project.slug && (
												<p className="project-slug">
												{project.slug}
											</p>
										)}
									</div>
								</div>
								<div className="flex items-center justify-center">
									<Icon icon={Tick02Icon} size={18} className="text-success" bold />
								</div>
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
									<Icon icon={DollarCircleIcon} size={14} className="text-success" />
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
				<div className="card-hover p-0">
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
							className="border-b border-white/5 transition-colors cursor-pointer hover:bg-surface-hover"
									onClick={() => (window.location.href = `/projects/${project.id}`)}
								>
									<td className="p-4">
										<div className="flex items-center gap-3">
											<div
												className="w-8 h-8 bg-surface-secondary rounded-md flex items-center justify-center flex-shrink-0"
											>
												<Icon icon={getIconById(project.icon || "folder")} size={18} className="text-primary" />
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
									<td className="p-4">
										<div className="flex items-center justify-center">
											<Icon icon={Tick02Icon} size={18} className="text-success" bold />
										</div>
									</td>
									<td className="p-4 text-center">
										<Icon icon={ArrowRight01Icon} size={16} className="text-text-tertiary" />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			</div>
		</>	);
}