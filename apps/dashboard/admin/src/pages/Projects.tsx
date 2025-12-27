import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useCreateProject, useProjects } from "../hooks/api";

export function ProjectsPage() {
	const { data: projects, isLoading, error } = useProjects();
	const createProjectMutation = useCreateProject();
	const [showForm, setShowForm] = useState(false);
	const [formData, setFormData] = useState({ name: "", slug: "", description: "" });

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
				<svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>Error loading projects. Please try again.</span>
			</div>
		);
	}

	// Redirect to onboarding if no projects
	if (!projects || projects.length === 0) {
		return <Navigate to="/onboarding" replace />;
	}

	// If we have projects, show the grid
	return (
			<div className="space-y-6">
			{/* Page Header */}
			<div className="page-header">
				<div>
					<h1 className="page-title">Projects</h1>
					<p className="page-description">Manage your authentication projects</p>
				</div>
				<button
					type="button"
					onClick={() => setShowForm(!showForm)}
					className="btn btn-primary"
				>
					<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					New Project
				</button>
			</div>

			{/* Stats Grid */}
			<div className="stats-grid">
				<div className="stat-card">
					<div className="stat-value">{projects.length}</div>
					<div className="stat-label">Total Projects</div>
				</div>
				<div className="stat-card">
					<div className="stat-value">0</div>
					<div className="stat-label">Active Users</div>
				</div>
				<div className="stat-card">
					<div className="stat-value">0</div>
					<div className="stat-label">Auth Events Today</div>
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
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						<form onSubmit={handleSubmit}>
							<div className="modal-body">
								<div className="form-group">
									<label htmlFor="projectName">Project Name</label>
									<input
										type="text"
										id="projectName"
										placeholder="My Awesome Project"
										required
										value={formData.name}
										onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									/>
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
								<button type="submit" className="btn btn-primary" disabled={createProjectMutation.isPending}>
									{createProjectMutation.isPending ? "Creating..." : "Create Project"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Projects Grid */}
			<div className="projects-grid">
				{projects.map((project) => (
					<Link key={project.public_id} to={`/projects/${project.public_id}`} className="project-card">
						<div className="project-card-header">
							<div className="project-icon">
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
								</svg>
							</div>
							<div className="project-status">
								<span className="status-dot" />
								Active
							</div>
						</div>
						<div className="project-card-body">
							<h3 className="project-name">{project.name}</h3>
							{project.slug && <p className="project-slug">{project.slug}</p>}
						</div>
						<div className="project-card-footer">
							<span className="project-id">{project.public_id}</span>
							<svg style={{ width: "16px", height: "16px", color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
