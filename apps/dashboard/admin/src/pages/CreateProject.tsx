import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateProject } from "../hooks/api";
import { IconPicker, } from "../components/IconPicker";

export function CreateProjectPage() {
	const navigate = useNavigate();
	const createProjectMutation = useCreateProject();
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
			onSuccess: (newProject) => {
				setFormData({ name: "", slug: "", description: "", icon: "folder" });
				navigate(`/projects/${newProject.id}`, { 
					state: { toast: { message: "Project created successfully!", type: "success" } }
				});
			},
		});
	};

	return (
		<div className="w-full">
			{/* Page Header */}
			<div className="mb-8 pb-6 border-b border-card-border">
				<h1 className="text-32px font-bold text-text-primary mb-2">Create New Project</h1>
				<p className="text-16px text-text-secondary">
					Projects help you organize your applications and manage authentication across your services.
				</p>
			</div>

			<div className="grid grid-cols-3 gap-8">
				{/* Form - Left Column */}
				<div className="col-span-2">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Project Name */}
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
							<p className="text-12px text-text-tertiary mt-2">
								Choose a memorable name for your project.
							</p>
						</div>

						{/* Project Slug */}
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
							<p className="text-12px text-text-tertiary mt-2">
								Auto-generated from project name. Use only letters, numbers, and hyphens.
							</p>
						</div>

						{/* Project Icon */}
						<div>
							<label className="form-label">Project Icon</label>
							<IconPicker
								selectedIconId={formData.icon}
								onSelect={(icon) => setFormData({ ...formData, icon })}
								label=""
							/>
						</div>

						{/* Description */}
						<div className="form-group">
							<label htmlFor="projectDescription" className="form-label">Description (optional)</label>
							<textarea
								id="projectDescription"
								className="form-control resize-y"
								placeholder="What is this project about?"
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								rows={4}
							/>
							<p className="text-12px text-text-tertiary mt-2">
								You can change this anytime in project settings.
							</p>
						</div>

						{/* Action Buttons */}
						<div className="flex items-center gap-3 pt-6">
							<button 
								type="button" 
								onClick={() => navigate("/projects")}
								className="btn btn-secondary"
							>
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

				{/* Sidebar Info - Right Column */}
				<div className="col-span-1">
					<div className="space-y-6 sticky top-6">
						{/* Quick Info Card */}
						<div className="bg-card-bg border border-card-border rounded-lg p-5">
							<h3 className="text-14px font-semibold text-text-primary mb-3">What happens next?</h3>
							<p className="text-13px text-text-secondary leading-relaxed">
								Your project is created and ready to use immediately. You'll be redirected to the project dashboard.
							</p>
						</div>

						{/* Features Card */}
						<div className="bg-card-bg border border-card-border rounded-lg p-5">
							<h3 className="text-14px font-semibold text-text-primary mb-4">You can manage</h3>
							<ul className="space-y-3">
								<li className="flex items-start gap-3">
									<span className="text-primary text-14px font-bold mt-0.5">•</span>
									<div>
										<div className="text-13px font-medium text-text-primary">Applications</div>
										<div className="text-12px text-text-tertiary">Create and configure apps</div>
									</div>
								</li>
								<li className="flex items-start gap-3">
									<span className="text-primary text-14px font-bold mt-0.5">•</span>
									<div>
										<div className="text-13px font-medium text-text-primary">Users</div>
										<div className="text-12px text-text-tertiary">Track and manage users</div>
									</div>
								</li>
								<li className="flex items-start gap-3">
									<span className="text-primary text-14px font-bold mt-0.5">•</span>
									<div>
										<div className="text-13px font-medium text-text-primary">Billing</div>
										<div className="text-12px text-text-tertiary">Configure payment settings</div>
									</div>
								</li>
							</ul>
						</div>

						{/* Team Card */}
						<div className="bg-card-bg border border-card-border rounded-lg p-5">
							<h3 className="text-14px font-semibold text-text-primary mb-3">Collaboration</h3>
							<p className="text-13px text-text-secondary leading-relaxed">
								Invite team members to collaborate on your project from the project settings.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
