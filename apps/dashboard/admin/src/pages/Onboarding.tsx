import { useState } from "react";
import { useCreateProject } from "../hooks/api";

export function OnboardingPage() {
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
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
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
							<svg viewBox="0 0 24 24" fill="white">
								<path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.251 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.049-.106.006-4.703.007-4.705.073-.091a.637.637 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361l4.706 7.141 1.898 2.877.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.572 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 0 1 .237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 0 1 .233-.296c.096-.05.13-.054.5-.054z" />
							</svg>
						</div>
						<div className="integration-info">
							<span className="integration-name">Next.js</span>
							<span className="integration-desc">React framework</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#61DAFB]">
							<svg viewBox="0 0 24 24" fill="#000">
								<path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38a2.167 2.167 0 0 0-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44a23.476 23.476 0 0 0-3.107-.534A23.892 23.892 0 0 0 12.769 4.7c1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442a22.73 22.73 0 0 0-3.113.538 15.02 15.02 0 0 1-.254-1.42c-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.127zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87a25.64 25.64 0 0 1-4.412.005 26.64 26.64 0 0 1-1.183-1.86c-.372-.64-.71-1.29-1.018-1.946a25.17 25.17 0 0 1 1.013-1.954c.38-.66.773-1.286 1.18-1.868A25.245 25.245 0 0 1 12 8.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933a25.952 25.952 0 0 0-1.345-2.32zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493a23.966 23.966 0 0 0-1.1-2.98c.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39a25.819 25.819 0 0 0 1.341-2.338zm-9.945.02c.24.38.48.77.705 1.16.225.39.435.788.636 1.18-.7.103-1.37.24-2.02.39.186-.64.415-1.29.679-1.93z" />
							</svg>
						</div>
						<div className="integration-info">
							<span className="integration-name">React</span>
							<span className="integration-desc">JavaScript library</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#F7DF1E]">
							<svg viewBox="0 0 24 24" fill="#000">
								<path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.405-.6-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z" />
							</svg>
						</div>
						<div className="integration-info">
							<span className="integration-name">JavaScript</span>
							<span className="integration-desc">Vanilla JS</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#02569B]">
							<svg viewBox="0 0 24 24" fill="white">
								<path d="M14.314 0L2.3 12 6 15.7 21.684.013h-7.357L14.314 0zm.014 11.072L7.857 17.53l6.47 6.47H21.7l-6.46-6.468 6.46-6.46h-7.386z" />
							</svg>
						</div>
						<div className="integration-info">
							<span className="integration-name">Flutter</span>
							<span className="integration-desc">Cross-platform</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#47A248]">
							<svg viewBox="0 0 24 24" fill="white">
								<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97-.492c-.455-.113-.796-.052-1.046.253l-4.608 5.609c-.084.102-.026.219.104.219h2.106c.174 0 .327-.096.48-.22l4.934-5.37z" />
							</svg>
						</div>
						<div className="integration-info">
							<span className="integration-name">Node.js</span>
							<span className="integration-desc">Backend SDK</span>
						</div>
					</div>

					<div className="integration-card">
						<div className="integration-icon bg-[#FF6B6B]">
							<svg viewBox="0 0 24 24" fill="white">
								<path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z" />
							</svg>
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
				<div className="modal-overlay" onClick={() => setShowForm(false)}>
					<div className="modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Create New Project</h3>
							<button type="button" className="modal-close" onClick={() => setShowForm(false)}>
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
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
