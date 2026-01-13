import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useProject, useUpdateProject } from "../hooks/api";
import { pingpong } from "../lib/pingpong";

export function ProjectSettingsPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const updateProjectMutation = useUpdateProject(projectId || "");

	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState<{
		name: string;
		slug: string;
		description?: string;
	} | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const { showToast } = useToast();

	// Initialize form data when project loads
	if (project && !formData) {
		setFormData({
			name: project.name,
			slug: project.slug || "",
			description: project.description || "",
		});
	}

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData) return;

		try {
			await updateProjectMutation.mutateAsync(formData);
			setIsEditing(false);
			// Success feedback
		} catch (error) {
			console.error("Failed to update project:", error);
			// Error feedback
		}
	};

	if (projectLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project || !formData) {
		return <div className="error-state">Project not found</div>;
	}

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div className="mb-6">
				<div className="breadcrumb">
					<Link to="/projects" className="breadcrumb-item">
						Projects
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}`} className="breadcrumb-item">
						{project.name}
					</Link>
					<span>›</span>
					<span className="breadcrumb-current">Settings</span>
				</div>
			</div>

			{/* Page Header */}
			<div className="mb-8">
				<h1 className="page-title">Project Settings</h1>
				<p className="page-description">Manage your project configuration and preferences</p>
			</div>

			{/* Settings Content */}
			{!isEditing ? (
				<>
					{/* View Mode */}
					<div className="card p-6 mb-4">
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-18px font-semibold text-text-primary">Project Information</h2>
							<button type="button" onClick={() => setIsEditing(true)} className="btn-secondary">
								Edit
							</button>
						</div>

						<div className="grid gap-6">
							<div>
							<p className="text-12px text-text-tertiary mb-1.5 uppercase font-semibold tracking-wider">
								Project Name
							</p>
							<p className="text-15px text-text-primary font-semibold m-0">
								</p>
							</div>

							<div>
							<p className="text-12px text-text-tertiary mb-1.5 uppercase font-semibold tracking-wider">
								Project Slug
							</p>
							<p className="text-15px text-text-primary font-semibold font-mono m-0">
								</p>
							</div>

							{project.description && (
								<div>
							<p className="text-12px text-text-tertiary mb-1.5 uppercase font-semibold tracking-wider">
								Description
							</p>
							<p className="text-15px text-text-secondary m-0 leading-relaxed">
								{project.description}
							</p>
						</div>
					)}

					<div>
						<p className="text-12px text-text-tertiary mb-1.5 uppercase font-semibold tracking-wider">
							Project ID
						</p>
						<code className="inline-block py-2.5 px-3.5 rounded-lg text-13px font-mono text-primary font-semibold tracking-wider bg-primary bg-opacity-10 border border-primary border-opacity-30">
							{project.id}
						</code>
					</div>

					<div>
						<p className="text-12px text-text-tertiary mb-1.5 uppercase font-semibold tracking-wider">
							Created
						</p>
						<p className="text-15px text-text-primary m-0">
							{project.createdAt
								? new Date(project.createdAt).toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})
								: "—"}
						</p>
					</div>
						</div>
					</div>

					{/* Danger Zone */}
					<div className="card p-6 border-2 border-danger">
						<h3 className="text-16px font-semibold mb-3 text-danger">⚠️ Danger Zone</h3>
						<p className="text-14px text-text-secondary mb-5">
							These actions are permanent and cannot be undone.
						</p>

						<div className="p-5 bg-danger-bg bg-opacity-5 rounded-lg border border-danger border-opacity-20">
							<h4 className="text-14px font-semibold mb-2 text-danger">Delete This Project</h4>
							<p className="text-13px text-text-secondary mb-4">
								Once you delete a project, there is no going back. This will:
							</p>
							<ul className="text-13px text-text-secondary mb-4 pl-5">
								<li>Delete all apps in this project</li>
								<li>Remove all user data and sessions</li>
								<li>Revoke all active licenses</li>
								<li>Remove all team members</li>
							</ul>
							<button type="button" onClick={() => setShowDeleteModal(true)} className="btn-danger">
								Delete Project
							</button>
						</div>
					</div>
				</>
			) : (
				<>
					{/* Edit Mode */}
					<form onSubmit={handleSave} className="card p-8">
						<h2 className="text-18px font-bold mb-7 text-text-primary">Edit Project Information</h2>

						<div className="grid gap-5 mb-8">
							<div>
								<label className="form-label">Project Name *</label>
								<input
									type="text"
									name="name"
									className="form-control"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									required
									placeholder="My Project"
								/>
								<p className="text-12px text-text-tertiary mt-1.5">The display name for your project</p>
							</div>

							<div>
								<label className="form-label">Project Slug *</label>
								<input
									type="text"
									name="slug"
									className="form-control"
									value={formData.slug}
									onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
									required
									pattern="[a-z0-9-]+"
									placeholder="my-project"
								/>
								<p className="text-12px text-text-tertiary mt-1.5">
									URL-friendly identifier (lowercase, hyphens only)
								</p>
							</div>

							<div>
								<label className="form-label">Description</label>
								<textarea
									name="description"
									className="form-control resize-y"
									value={formData.description || ""}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									rows={3}
									placeholder="A brief description of your project..."
								/>
								<p className="text-12px text-text-tertiary mt-1.5">
									Optional description for internal reference
								</p>
							</div>
						</div>

						<div className="flex gap-3">
							<button
								type="submit"
								disabled={updateProjectMutation.isPending}
								className={`btn-primary ${updateProjectMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
							>
								{updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
							</button>
							<button
								type="button"
								onClick={() => {
									setIsEditing(false);
									setFormData({
										name: project.name,
										slug: project.slug || "",
										description: project.description || "",
									});
								}}
								className="btn-secondary"
							>
								Cancel
							</button>
						</div>
					</form>
				</>
			)}

			{/* Delete Confirmation Modal with Captcha */}
			<ConfirmModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={async () => {
					try {
						const response = await pingpong(
							`${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/admin/projects/${projectId}`,
							{
								method: "DELETE",
								credentials: "include",
							},
						);

						if (!response.ok) {
							const data = await response.json();
							throw new Error(data.error || "Failed to delete project");
						}

						showToast("Project deleted successfully", "success");
						setShowDeleteModal(false);

						// Redirect to projects list
						window.location.href = "/projects";
					} catch (error) {
						showToast(error instanceof Error ? error.message : "Failed to delete project", "error");
					}
				}}
				title="Delete Project"
				message={`Are you sure you want to delete "${project?.name}"? This action cannot be undone and will permanently delete all apps, user data, sessions, licenses, and team members.`}
				confirmText="Delete Project"
				variant="danger"
				requireCaptcha={true}
			/>
		</div>
	);
}
