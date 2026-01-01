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
					<span style={{ color: "var(--text-primary)" }}>Settings</span>
				</div>
			</div>

			{/* Page Header */}
			<div style={{ marginBottom: "32px" }}>
				<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Project Settings</h1>
				<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
					Manage your project configuration and preferences
				</p>
			</div>

			{/* Settings Content */}
			{!isEditing ? (
				<>
					{/* View Mode */}
					<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "24px",
							}}
						>
							<h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
								Project Information
							</h2>
							<button
								type="button"
								onClick={() => setIsEditing(true)}
								className="btn btn-secondary-outline"
							>
								Edit
							</button>
						</div>

						<div style={{ display: "grid", gap: "24px" }}>
							<div>
								<p
									style={{
										fontSize: "12px",
										color: "var(--text-tertiary)",
										marginBottom: "6px",
										textTransform: "uppercase",
										fontWeight: "600",
										letterSpacing: "0.5px",
									}}
								>
									Project Name
								</p>
								<p
									style={{
										fontSize: "15px",
										color: "var(--text-primary)",
										fontWeight: "600",
										margin: 0,
									}}
								>
									{project.name}
								</p>
							</div>

							<div>
								<p
									style={{
										fontSize: "12px",
										color: "var(--text-tertiary)",
										marginBottom: "6px",
										textTransform: "uppercase",
										fontWeight: "600",
										letterSpacing: "0.5px",
									}}
								>
									Project Slug
								</p>
								<p
									style={{
										fontSize: "15px",
										color: "var(--text-primary)",
										fontWeight: "600",
										fontFamily: "monospace",
										margin: 0,
									}}
								>
									{project.slug || "—"}
								</p>
							</div>

							{project.description && (
								<div>
									<p
										style={{
											fontSize: "12px",
											color: "var(--text-tertiary)",
											marginBottom: "6px",
											textTransform: "uppercase",
											fontWeight: "600",
											letterSpacing: "0.5px",
										}}
									>
										Description
									</p>
									<p
										style={{
											fontSize: "15px",
											color: "var(--text-secondary)",
											margin: 0,
											lineHeight: "1.6",
										}}
									>
										{project.description}
									</p>
								</div>
							)}

							<div>
								<p
									style={{
										fontSize: "12px",
										color: "var(--text-tertiary)",
										marginBottom: "6px",
										textTransform: "uppercase",
										fontWeight: "600",
										letterSpacing: "0.5px",
									}}
								>
									Project ID
								</p>
								<code
									style={{
										display: "inline-block",
										padding: "10px 14px",
										background: "rgba(139, 92, 246, 0.1)",
										border: "1px solid rgba(139, 92, 246, 0.3)",
										borderRadius: "8px",
										fontSize: "13px",
										fontFamily: "'JetBrains Mono', 'Courier New', monospace",
										color: "var(--primary)",
										fontWeight: "600",
										letterSpacing: "0.5px",
									}}
								>
									{project.id}
								</code>
							</div>

							<div>
								<p
									style={{
										fontSize: "12px",
										color: "var(--text-tertiary)",
										marginBottom: "6px",
										textTransform: "uppercase",
										fontWeight: "600",
										letterSpacing: "0.5px",
									}}
								>
									Created
								</p>
								<p style={{ fontSize: "15px", color: "var(--text-primary)", margin: 0 }}>
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
					<div className="card" style={{ padding: "24px", borderColor: "var(--danger)", borderWidth: "2px" }}>
						<h3
							style={{
								fontSize: "16px",
								fontWeight: "600",
								marginBottom: "12px",
								color: "var(--danger)",
							}}
						>
							⚠️ Danger Zone
						</h3>
						<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
							These actions are permanent and cannot be undone.
						</p>

						<div
							style={{
								padding: "20px",
								background: "rgba(239, 68, 68, 0.05)",
								borderRadius: "8px",
								border: "1px solid rgba(239, 68, 68, 0.2)",
							}}
						>
							<h4
								style={{
									fontSize: "14px",
									fontWeight: "600",
									marginBottom: "8px",
									color: "var(--danger)",
								}}
							>
								Delete This Project
							</h4>
							<p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
								Once you delete a project, there is no going back. This will:
							</p>
							<ul
								style={{
									fontSize: "13px",
									color: "var(--text-secondary)",
									marginBottom: "16px",
									paddingLeft: "20px",
								}}
							>
								<li>Delete all apps in this project</li>
								<li>Remove all user data and sessions</li>
								<li>Revoke all active licenses</li>
								<li>Remove all team members</li>
							</ul>
							<button type="button" onClick={() => setShowDeleteModal(true)} className="btn btn-danger">
								Delete Project
							</button>
						</div>
					</div>
				</>
			) : (
				<>
					{/* Edit Mode */}
					<form onSubmit={handleSave} className="card" style={{ padding: "32px" }}>
						<h2
							style={{
								fontSize: "18px",
								fontWeight: "700",
								marginBottom: "28px",
								color: "var(--text-primary)",
							}}
						>
							Edit Project Information
						</h2>

						<div style={{ display: "grid", gap: "20px", marginBottom: "32px" }}>
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
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
									The display name for your project
								</p>
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
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
									URL-friendly identifier (lowercase, hyphens only)
								</p>
							</div>

							<div>
								<label className="form-label">Description</label>
								<textarea
									name="description"
									className="form-control"
									value={formData.description || ""}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									rows={3}
									placeholder="A brief description of your project..."
									style={{ resize: "vertical" }}
								/>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
									Optional description for internal reference
								</p>
							</div>
						</div>

						<div style={{ display: "flex", gap: "12px" }}>
							<button
								type="submit"
								disabled={updateProjectMutation.isPending}
								className="btn btn-primary"
								style={{
									opacity: updateProjectMutation.isPending ? 0.6 : 1,
									cursor: updateProjectMutation.isPending ? "not-allowed" : "pointer",
								}}
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
								className="btn btn-secondary-outline"
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
