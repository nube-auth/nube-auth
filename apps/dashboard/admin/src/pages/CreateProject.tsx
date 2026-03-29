import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateProject } from "../hooks/api";
import { IconPicker } from "../components/IconPicker";
import { 
	Button, 
	Card, 
	CardBody, 
	CardHeader, 
	CardTitle, 
	Field, 
	Heading, 
	Input, 
	Label, 
	Text, 
	Textarea 
} from "@nube-auth/components";

export function CreateProjectPage() {
	const navigate = useNavigate();
	const createProjectMutation = useCreateProject();
	const [formData, setFormData] = useState({ name: "", slug: "", description: "", icon: "dashboard" });

	// Mirrors the server-side slugify() — only lowercase alphanumeric + hyphens
	const generateSlug = (name: string) => {
		return name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
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
				setFormData({ name: "", slug: "", description: "", icon: "dashboard" });
				navigate(`/projects/${newProject.id}`, { 
					state: { toast: { message: "Project created successfully!", type: "success" } }
				});
			},
		});
	};

	return (
		<div className="w-full">
			{/* Page Header */}
			<div className="mb-8 pb-6 border-b border-border">
				<Heading size="lg" className="mb-2">Create New Project</Heading>
				<Text className="text-text-secondary">
					Projects help you organize your applications and manage authentication across your services.
				</Text>
			</div>

			<div className="grid grid-cols-3 gap-8">
				{/* Form - Left Column */}
				<div className="col-span-2">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Project Name */}
					<Field>
						<Label htmlFor="projectName" className="inline-flex items-center gap-1">
							<span>Project Name</span>
							<span className="text-danger">*</span>
						</Label>
						<Input
							type="text"
							id="projectName"
							placeholder="My Awesome Project"
							required
							value={formData.name}
							onChange={(e) => handleNameChange(e.target.value)}
						/>
						<Text className="text-text-muted mt-2">
							Choose a memorable name for your project.
						</Text>
					</Field>
						{/* Project Slug */}
					<Field>
						<Label htmlFor="projectSlug" className="inline-flex items-center gap-1">
							<span>Project Slug</span>
							<span className="text-danger">*</span>
						</Label>
						<Input
							type="text"
							id="projectSlug"
							placeholder="my-awesome-project"
							required
							value={formData.slug}
							onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
						/>
						<Text className="text-text-muted mt-2">
							Auto-generated from project name. Use only letters, numbers, and hyphens.
						</Text>
					</Field>
						{/* Project Icon */}
					<Field>
						<Label>Project Icon</Label>
						<IconPicker
							selectedIconId={formData.icon}
							onSelect={(icon) => setFormData({ ...formData, icon })}
							label=""
						/>
					</Field>
						{/* Description */}
					<Field>
						<Label htmlFor="projectDescription">Description (optional)</Label>
						<Textarea
							id="projectDescription"
							placeholder="What is this project about?"
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							rows={4}
						/>
						<Text className="text-text-muted mt-2">
							You can change this anytime in project settings.
						</Text>
					</Field>
						{/* Action Buttons */}
						<div className="flex items-center gap-3 pt-6">
							<Button 
								type="button" 
								variant="secondary"
								onClick={() => navigate("/projects")}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								variant="primary"
								disabled={createProjectMutation.isPending}
							>
								{createProjectMutation.isPending ? "Creating..." : "Create Project"}
							</Button>
						</div>
					</form>
				</div>

				{/* Sidebar Info - Right Column */}
				<div className="col-span-1">
					<div className="space-y-6 sticky top-6">
						{/* Quick Info Card */}
					<Card>
						<CardBody>
							<Heading size="sm" className="mb-3">What happens next?</Heading>
							<Text className="text-text-secondary leading-relaxed">
								Your project is created and ready to use immediately. You'll be redirected to the project dashboard.
							</Text>
						</CardBody>
					</Card>
						{/* Features Card */}
					<Card>
						<CardBody>
							<Heading size="sm" className="mb-4">You can manage</Heading>
							<ul className="space-y-3">
								<li className="flex items-start gap-3">
									<span className="text-primary text-sm font-bold mt-0.5">•</span>
									<div>
										<Text className="font-medium">Applications</Text>
										<Text className="text-text-muted">Create and configure apps</Text>
									</div>
								</li>
								<li className="flex items-start gap-3">
									<span className="text-primary text-sm font-bold mt-0.5">•</span>
									<div>
										<Text className="font-medium">Users</Text>
										<Text className="text-text-muted">Track and manage users</Text>
									</div>
								</li>
								<li className="flex items-start gap-3">
									<span className="text-primary text-sm font-bold mt-0.5">•</span>
									<div>
										<Text className="font-medium">Billing</Text>
										<Text className="text-text-muted">Configure payment settings</Text>
									</div>
								</li>
							</ul>
						</CardBody>
					</Card>
						{/* Team Card */}
					<Card>
						<CardBody>
							<Heading size="sm" className="mb-3">Collaboration</Heading>
							<Text className="text-text-secondary leading-relaxed">
								Invite team members to collaborate on your project from the project settings.
							</Text>
						</CardBody>
					</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
