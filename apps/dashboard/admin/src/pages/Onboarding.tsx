import { useState } from "react";
import { Icon } from "../components/Icon";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import {
	NextJsLogo,
	ReactLogo,
	JavaScriptLogo,
	FlutterLogo,
	NodeJsLogo,
	TailwindLogo,
} from "@proofa/react";
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
					<h1 className="page-title">Welcome to Proofa</h1>
					<p className="page-description">Get started by creating your first project</p>
				</div>
			</div>

			{/* Get Started Section */}
			<div className="card get-started-card">
				<div className="get-started-content">
					<div className="get-started-text">
						<span className="badge badge-success mb-3">
							Getting Started
						</span>
						<h2 className="text-24px font-bold mb-3 text-text-primary">
							Create your first project
						</h2>
						<p className="text-text-secondary mb-6 leading-relaxed">
							Set up authentication for your application in minutes. Proofa handles user management, OAuth
							providers, sessions, and more so you can focus on building your product.
						</p>
						<button type="button" onClick={() => setShowForm(true)} className="btn btn-primary">
							<Icon icon={Add01Icon} size={16} />
							Create Project
						</button>
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
			</div>

			{/* Integrations Section */}
			<div>
				<h3 className="text-16px font-semibold text-text-primary mb-4">
					Supported Integrations
				</h3>
				<div className="integrations-grid">
					<div className="integration-card">
						<div className="integration-icon bg-black">
						<NextJsLogo className="w-6 h-6" />
							<span className="integration-name">Next.js</span>
							<span className="integration-desc">React framework</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#61DAFB]">
						<ReactLogo className="w-6 h-6" />
							<span className="integration-name">React</span>
							<span className="integration-desc">JavaScript library</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#F7DF1E]">
							<JavaScriptLogo className="w-6 h-6" />
						</div>
						<div className="integration-info">
							<span className="integration-name">JavaScript</span>
							<span className="integration-desc">Vanilla JS</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#02569B]">
							<FlutterLogo className="w-6 h-6" />
						</div>
						<div className="integration-info">
							<span className="integration-name">Flutter</span>
							<span className="integration-desc">Cross-platform</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#47A248]">
							<NodeJsLogo className="w-6 h-6" />
						</div>
						<div className="integration-info">
							<span className="integration-name">Node.js</span>
							<span className="integration-desc">Backend SDK</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#FF6B6B]">
							<TailwindLogo className="w-6 h-6" />
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
				<h3 className="text-16px font-semibold text-text-primary mb-4">
					Quick Start Guide
				</h3>
				<div className="quickstart-steps">
					<div className="quickstart-step">
						<div className="quickstart-step-number">1</div>
						<div className="quickstart-step-content">
							<h4 className="quickstart-step-title">Create a project</h4>
							<p className="quickstart-step-desc">Set up a new project for your application</p>
						</div>
					</div>
					<div className="quickstart-step">
						<div className="quickstart-step-number">2</div>
						<div className="quickstart-step-content">
							<h4 className="quickstart-step-title">Configure OAuth providers</h4>
							<p className="quickstart-step-desc">Enable Google, GitHub, or other providers</p>
						</div>
					</div>
					<div className="quickstart-step">
						<div className="quickstart-step-number">3</div>
						<div className="quickstart-step-content">
							<h4 className="quickstart-step-title">Install the SDK</h4>
							<p className="quickstart-step-desc">Add Proofa to your application</p>
						</div>
					</div>
					<div className="quickstart-step">
						<div className="quickstart-step-number">4</div>
						<div className="quickstart-step-content">
							<h4 className="quickstart-step-title">Go live</h4>
							<p className="quickstart-step-desc">Deploy and start authenticating users</p>
						</div>
					</div>
				</div>
			</div>

		{/* Create Project Modal/Form */}
		{showForm && (
			<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10001] p-8" onClick={() => setShowForm(false)}>
				<div className="bg-card-bg border border-card-border rounded-xl w-full mx-4 max-w-md max-h-[90vh] overflow-y-auto shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
					<div className="flex items-center justify-between p-6 border-b border-card-border flex-shrink-0">
						<h3 className="text-18px font-600 text-text-primary m-0">Create New Project</h3>
						<button type="button" className="w-8 h-8 flex items-center justify-center border-none bg-transparent text-text-secondary cursor-pointer rounded-md transition-all hover:bg-surface-secondary hover:text-text-primary" onClick={() => setShowForm(false)}>
							<Icon icon={Cancel01Icon} size={20} />
						</button>
					</div>
					<form onSubmit={handleSubmit} className="flex flex-col flex-1">
						<div className="p-6 text-text-primary overflow-y-auto flex-1">
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
						<div className="flex items-center justify-end gap-3 p-6 border-t border-card-border flex-shrink-0">
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
		</div>
	);
}
