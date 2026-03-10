import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import config from "../config";
import { csrfHeaders } from "../lib/csrf";
import { useProject, useUpdateProject } from "../hooks/api";
import { pingpong } from "../lib/pingpong";
import {
	Alert,
	Text,
	Heading,
	Card,
	CardBody,
	Button,
	Label,
	Input,
	Textarea,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
} from "@proofa/components";
import { PageLoader } from "../components/PageLoader";

export function ProjectSettingsPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const navigate = useNavigate();
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
			showToast("Project updated successfully", "success");
		} catch (error) {
			showToast(error instanceof Error ? error.message : "Failed to update project", "error");
		}
	};

	if (projectLoading) {
		return <PageLoader />;
	}

	if (!project || !formData) {
		return <Alert variant="danger">Project not found</Alert>;
	}

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div className="mb-6">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
						</BreadcrumbItem>
						/
						<BreadcrumbItem>
							<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>{project.name}</BreadcrumbButton>
						</BreadcrumbItem>
						/
						<BreadcrumbItem>
							<BreadcrumbButton active>Settings</BreadcrumbButton>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			{/* Page Header */}
			<div className="mb-8">
				<Heading level={1} size="lg">Project Settings</Heading>
				<Text className="text-text-secondary">Manage your project configuration and preferences</Text>
			</div>

			{/* Settings Content */}
			{!isEditing ? (
				<>
					{/* View Mode */}
					<Card className="mb-4">
						<CardBody className="p-6">
							<div className="flex justify-between items-center mb-6">
								<Heading level={2} size="md">Project Information</Heading>
								<Button variant="secondary" onClick={() => setIsEditing(true)}>
									Edit
								</Button>
							</div>

							<div className="grid gap-6 md:grid-cols-2">
								<div>
									<Text className="text-12px text-text-tertiary mb-1.5 uppercase font-semibold tracking-wider">
										Project Name
									</Text>
									<Text className="text-15px text-text-primary font-semibold">
										{project.name}
									</Text>
								</div>

								<div>
									<Text className="text-12px text-text-tertiary mb-1.5 uppercase font-semibold tracking-wider">
										Project Slug
									</Text>
									<Text className="text-15px text-text-primary font-semibold font-mono">
										{project.slug}
									</Text>
								</div>

								{project.description && (
									<div>
										<Text className="text-12px text-text-tertiary mb-1.5 uppercase font-semibold tracking-wider">
											Description
										</Text>
										<Text className="text-15px text-text-secondary leading-relaxed">
											{project.description}
										</Text>
									</div>
								)}

								<div>
									<Text className="text-12px text-text-tertiary mb-1.5 uppercase font-semibold tracking-wider">
										Project ID
									</Text>
									<code className="inline-block py-2.5 px-3.5 rounded-lg text-13px font-mono text-text-primary font-semibold tracking-wider bg-surface-secondary border border-border">
										{project.id}
									</code>
								</div>

								<div>
									<Text className="text-12px text-text-tertiary mb-1.5 uppercase font-semibold tracking-wider">
										Created
									</Text>
									<Text className="text-15px text-text-primary">
										{project.createdAt
											? new Date(project.createdAt).toLocaleDateString("en-US", {
													year: "numeric",
													month: "long",
													day: "numeric",
											  })
											: "—"}
									</Text>
								</div>
							</div>
						</CardBody>
					</Card>

					{/* Danger Zone */}
					<Card className="border border-danger/35 bg-danger/5">
						<CardBody className="p-6">
							<Heading level={3} size="sm" className="mb-3 text-danger">⚠️ Danger Zone</Heading>
							<Text className="text-text-secondary mb-5">
								These actions are permanent and cannot be undone.
							</Text>

							<div className="p-5 bg-danger-bg/20 rounded-lg border border-border">
								<Heading level={4} size="sm" className="mb-2 text-danger">Delete This Project</Heading>
								<Text className="text-13px text-text-secondary mb-4">
									Once you delete a project, there is no going back. This will:
								</Text>
								<ul className="text-13px text-text-secondary mb-4 pl-5">
									<li>Delete all apps in this project</li>
									<li>Remove all user data and sessions</li>
									<li>Revoke all active licenses</li>
									<li>Remove all team members</li>
								</ul>
								<Button variant="danger" onClick={() => setShowDeleteModal(true)}>
									Delete Project
								</Button>
							</div>
						</CardBody>
					</Card>
				</>
			) : (
				<>
					{/* Edit Mode */}
					<Card>
						<CardBody className="p-8">
							<form onSubmit={handleSave}>
								<Heading level={2} size="md" className="mb-7">Edit Project Information</Heading>

								<div className="grid gap-5 mb-8">
									<div>
										<Label htmlFor="project-name">
											Project Name <span className="text-danger">*</span>
										</Label>
										<Input
											id="project-name"
											type="text"
											name="name"
											value={formData.name}
											onChange={(e) => setFormData({ ...formData, name: e.target.value })}
											required
											placeholder="My Project"
										/>
										<Text className="text-12px text-text-tertiary mt-1.5">The display name for your project</Text>
									</div>

									<div>
										<Label htmlFor="project-slug">
											Project Slug <span className="text-danger">*</span>
										</Label>
										<Input
											id="project-slug"
											type="text"
											name="slug"
											value={formData.slug}
											onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
											required
											pattern="[a-z0-9-]+"
											placeholder="my-project"
										/>
										<Text className="text-12px text-text-tertiary mt-1.5">
											URL-friendly identifier (lowercase, hyphens only)
										</Text>
									</div>

									<div>
										<Label htmlFor="project-description">
											Description
										</Label>
										<Textarea
											id="project-description"
											name="description"
											className="resize-y"
											value={formData.description || ""}
											onChange={(e) => setFormData({ ...formData, description: e.target.value })}
											rows={3}
											placeholder="A brief description of your project..."
										/>
										<Text className="text-12px text-text-tertiary mt-1.5">
											Optional description for internal reference
										</Text>
									</div>
								</div>

								<div className="flex gap-3">
									<Button
										type="submit"
										disabled={updateProjectMutation.isPending}
										variant="primary"
									>
										{updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
									</Button>
									<Button
										type="button"
										onClick={() => {
											setIsEditing(false);
											setFormData({
												name: project.name,
												slug: project.slug || "",
												description: project.description || "",
											});
										}}
										variant="secondary"
									>
										Cancel
									</Button>
								</div>
							</form>
						</CardBody>
					</Card>
				</>
			)}

			{/* Delete Confirmation Modal with Captcha */}
			<ConfirmModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={async () => {
					try {
						const response = await pingpong(
							`${config.gatewayUrl}/v1/admin/projects/${projectId}`,
							{
								method: "DELETE",
								credentials: "include",
								headers: csrfHeaders(),
							},
						);

						showToast("Project deleted successfully", "success");
						setShowDeleteModal(false);

						// Redirect to projects list
					navigate("/projects");
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
