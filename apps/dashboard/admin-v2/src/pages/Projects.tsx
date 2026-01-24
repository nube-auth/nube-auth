import { useState } from "react";
import { Link } from "react-router-dom";
import {
	Button,
	Dialog,
	DialogTrigger,
	DialogPopup,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter,
	Input,
	Label,
	Alert,
	Spinner,
} from "@proofa/components";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/useProjects";

export default function Projects() {
	const { data: projects, isLoading, error } = useProjects();
	const createProject = useCreateProject();
	const deleteProject = useDeleteProject();

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		slug: "",
		description: "",
	});
	const [formError, setFormError] = useState<string | null>(null);

	const handleCreateProject = async (e: React.FormEvent) => {
		e.preventDefault();
		setFormError(null);

		if (!formData.name.trim() || !formData.slug.trim()) {
			setFormError("Name and slug are required");
			return;
		}

		try {
			await createProject.mutateAsync({
				name: formData.name,
				slug: formData.slug,
				description: formData.description || undefined,
			});
			setIsCreateDialogOpen(false);
			setFormData({ name: "", slug: "", description: "" });
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Failed to create project");
		}
	};

	const handleDeleteProject = async (projectId: string, projectName: string) => {
		if (!confirm(`Are you sure you want to delete "${projectName}"?`)) {
			return;
		}

		try {
			await deleteProject.mutateAsync(projectId);
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to delete project");
		}
	};

	const generateSlug = (name: string) => {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
	};

	const handleNameChange = (name: string) => {
		setFormData({
			...formData,
			name,
			// Auto-generate slug if it hasn't been manually edited
			slug: formData.slug === generateSlug(formData.name) || !formData.slug
				? generateSlug(name)
				: formData.slug,
		});
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<Alert variant="danger">
					Failed to load projects: {error instanceof Error ? error.message : "Unknown error"}
				</Alert>
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-text-primary">Projects</h1>
					<p className="text-text-muted mt-1">Manage your Proofa projects and applications</p>
				</div>
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger>
						<Button variant="primary">Create Project</Button>
					</DialogTrigger>
					<DialogPopup>
						<form onSubmit={handleCreateProject}>
							<DialogHeader>
								<DialogTitle>Create New Project</DialogTitle>
							</DialogHeader>
							<DialogBody>
								{formError && (
									<Alert variant="danger" className="mb-4">
										{formError}
									</Alert>
								)}
								<div className="space-y-4">
									<div>
										<Label>
											<span className="text-sm font-medium text-text-primary mb-1.5 block">
												Project Name
											</span>
											<Input
												value={formData.name}
												onChange={(e) => handleNameChange(e.target.value)}
												placeholder="My Awesome Project"
												required
											/>
										</Label>
									</div>
									<div>
										<Label>
											<span className="text-sm font-medium text-text-primary mb-1.5 block">
												Slug
											</span>
											<Input
												value={formData.slug}
												onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
												placeholder="my-awesome-project"
												required
											/>
											<span className="text-xs text-text-muted mt-1 block">
												Used in URLs and API calls
											</span>
										</Label>
									</div>
									<div>
										<Label>
											<span className="text-sm font-medium text-text-primary mb-1.5 block">
												Description (optional)
											</span>
											<Input
												value={formData.description}
												onChange={(e) => setFormData({ ...formData, description: e.target.value })}
												placeholder="A brief description of your project"
											/>
										</Label>
									</div>
								</div>
							</DialogBody>
							<DialogFooter>
								<Button
									type="button"
									variant="secondary"
									onClick={() => setIsCreateDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" variant="primary" disabled={createProject.isPending}>
									{createProject.isPending ? "Creating..." : "Create Project"}
								</Button>
							</DialogFooter>
						</form>
					</DialogPopup>
				</Dialog>
			</div>

			{projects && projects.length === 0 ? (
				<div className="bg-card-bg border border-card-border rounded-lg p-8 text-center">
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
								d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-text-primary mb-2">
						No projects yet
					</h3>
					<p className="text-text-muted text-sm mb-4">
						Get started by creating your first project
					</p>
					<Button variant="primary" onClick={() => setIsCreateDialogOpen(true)}>
						Create Your First Project
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{projects?.map((project) => (
						<div
							key={project.id}
							className="bg-card-bg border border-card-border rounded-lg p-6 hover:border-primary transition-colors"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex-1 min-w-0">
									<h3 className="text-lg font-semibold text-text-primary truncate">
										{project.name}
									</h3>
									<p className="text-sm text-text-muted">/{project.slug}</p>
								</div>
							</div>

							{project.description && (
								<p className="text-sm text-text-muted mb-4 line-clamp-2">
									{project.description}
								</p>
							)}

							<div className="flex items-center gap-2 pt-4 border-t border-border">
								<Link to={`/projects/${project.id}`} className="flex-1">
									<Button variant="secondary" className="w-full">
										View Details
									</Button>
								</Link>
								<Button
									variant="danger"
									onClick={() => handleDeleteProject(project.id, project.name)}
									disabled={deleteProject.isPending}
								>
									Delete
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

