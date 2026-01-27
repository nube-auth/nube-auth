import { useState } from "react";
import {
	Icon,
	IconType,
	Heading,
	Text,
	Button,
	Badge,
	Card,
	CardBody,
	Dialog,
	DialogTrigger,
	DialogPopup,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter,
	Label,
	Input,
	Textarea,
} from "@proofa/components";
import { useCreateProject } from "../hooks/api";

export function OnboardingPage() {
	const createProjectMutation = useCreateProject();
	const [showForm, setShowForm] = useState(false);
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

	return (
		<div className="space-y-8">
			{/* Welcome Header */}
			<div className="page-header">
				<div>
					<Heading level={1} size="lg">Welcome to Proofa</Heading>
					<Text className="text-text-secondary mt-2">Get started by creating your first project</Text>
				</div>
			</div>

			{/* Get Started Section */}
			<Card>
				<CardBody>
					<div className="get-started-content">
						<div className="get-started-text">
							<Badge variant="success" className="mb-3">
								Getting Started
							</Badge>
							<Heading level={2} size="lg" className="mb-3">
								Create your first project
							</Heading>
							<Text className="text-text-secondary mb-6 leading-relaxed">
								Set up authentication for your application in minutes. Proofa handles user management, OAuth
								providers, sessions, and more so you can focus on building your product.
							</Text>
							<Button variant="primary" onClick={() => setShowForm(true)}>
								<Icon icon={IconType.Add} size={16} />
								Create Project
							</Button>
						</div>
					<div className="get-started-preview">
						<div className="code-preview">
							<div className="code-preview-header">
							<span className="code-preview-dot bg-[#ff5f57]" />
							<span className="code-preview-dot bg-[#febc2e]" />
							<span className="code-preview-dot bg-[#28c840]" />
							</div>
							<pre className="code-preview-content">
								{`import { ProofaAuth } from '@proofa/auth';

const auth = new ProofaAuth({
  projectId: 'your-project-id',
  redirectUrl: '/dashboard'
});

// Sign in with Google
await auth.signIn('google');

// Get current user
const user = await auth.getUser();`}
								</pre>
							</div>
						</div>
					</div>
				</CardBody>
			</Card>

			{/* Integrations Section */}
			<div>
				<Heading level={3} size="md" className="mb-4">
					Supported Integrations
				</Heading>
				<div className="integrations-grid">
					<div className="integration-card">
						<div className="integration-icon bg-black">
							<Icon icon={IconType.NextJS} size={24} />
							<span className="integration-name">Next.js</span>
							<span className="integration-desc">React framework</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#61DAFB]">
							<Icon icon={IconType.React} size={24} />
							<span className="integration-name">React</span>
							<span className="integration-desc">JavaScript library</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#F7DF1E]">
							<Icon icon={IconType.JavaScript} size={24} />
						</div>
						<div className="integration-info">
							<span className="integration-name">JavaScript</span>
							<span className="integration-desc">Vanilla JS</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#02569B]">
							<Icon icon={IconType.Flutter} size={24} />
						</div>
						<div className="integration-info">
							<span className="integration-name">Flutter</span>
							<span className="integration-desc">Cross-platform</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#47A248]">
							<Icon icon={IconType.NodeJS} size={24} />
						</div>
						<div className="integration-info">
							<span className="integration-name">Node.js</span>
							<span className="integration-desc">Backend SDK</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#FF6B6B]">
							<Icon icon={IconType.Tailwind} size={24} />
						</div>
						<div className="integration-info">
							<span className="integration-name">REST API</span>
							<span className="integration-desc">Any language</span>
						</div>
					</div>
				</div>
			</div>

			{/* Quick Start Steps */}
			<div>
					<Heading level={3} size="md" className="mb-4">
						Quick Start Guide
					</Heading>
					<div className="quickstart-steps">
						<div className="quickstart-step">
							<div className="quickstart-step-number">1</div>
							<div className="quickstart-step-content">
								<Heading level={4} size="sm" className="quickstart-step-title">Create a project</Heading>
								<Text className="quickstart-step-desc">Set up a new project for your application</Text>
							</div>
						</div>
						<div className="quickstart-step">
							<div className="quickstart-step-number">2</div>
							<div className="quickstart-step-content">
								<Heading level={4} size="sm" className="quickstart-step-title">Configure OAuth providers</Heading>
								<Text className="quickstart-step-desc">Enable Google, GitHub, or other providers</Text>
							</div>
						</div>
						<div className="quickstart-step">
							<div className="quickstart-step-number">3</div>
							<div className="quickstart-step-content">
								<Heading level={4} size="sm" className="quickstart-step-title">Install the SDK</Heading>
								<Text className="quickstart-step-desc">Add Proofa to your application</Text>
							</div>
						</div>
						<div className="quickstart-step">
							<div className="quickstart-step-number">4</div>
							<div className="quickstart-step-content">
								<Heading level={4} size="sm" className="quickstart-step-title">Go live</Heading>
								<Text className="quickstart-step-desc">Deploy and start authenticating users</Text>					</div>
				</div>				</div>
			</div>

		{/* Create Project Modal/Form */}
		<Dialog open={showForm} onOpenChange={setShowForm}>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>Create New Project</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<DialogBody>
						<div className="space-y-4">
							<Label>
								Project Name *
								<Input
									type="text"
									id="projectName"
									placeholder="My Awesome Project"
									required
									value={formData.name}
									onChange={(e) => handleNameChange(e.target.value)}
								/>
							</Label>
							<Label>
								Project Slug *
								<Input
									type="text"
									id="projectSlug"
									placeholder="my-awesome-project"
									required
									value={formData.slug}
									onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
								/>
								<Text className="text-text-tertiary mt-1.5">
									Auto-generated from project name. Use only letters, numbers, and hyphens.
								</Text>
							</Label>
							<Label>
								Description (optional)
								<Textarea
									id="projectDescription"
									placeholder="What is this project about?"
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									rows={3}
								/>
							</Label>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button variant="secondary" onClick={() => setShowForm(false)}>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={createProjectMutation.isPending}
						>
							{createProjectMutation.isPending ? "Creating..." : "Create Project"}
						</Button>
					</DialogFooter>
				</form>
			</DialogPopup>
		</Dialog>
		</div>
	);
}
