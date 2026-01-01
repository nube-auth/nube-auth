import { useState } from "react";
import { Link } from "react-router-dom";
import { useCreateProject, useProjects } from "../hooks/api";

type ViewMode = "grid" | "table";

export function ProjectsPage() {
	const { data: projects, isLoading, error } = useProjects();
	const createProjectMutation = useCreateProject();
	const [showForm, setShowForm] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>("table");
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
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span>Error loading projects. Please try again.</span>
			</div>
		);
	}

	const hasProjects = projects && projects.length > 0;

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="page-header">
				<div>
					<h1 className="page-title">Projects</h1>
					<p className="page-description">Manage your authentication projects</p>
				</div>
				<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
					{hasProjects && (
						<div
							style={{
								display: "flex",
								background: "var(--surface-secondary)",
								borderRadius: "8px",
								padding: "4px",
								gap: "4px",
							}}
						>
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								style={{
									padding: "6px 12px",
									border: "none",
									background: viewMode === "grid" ? "var(--background-primary)" : "transparent",
									color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-secondary)",
									borderRadius: "6px",
									cursor: "pointer",
									transition: "all 0.2s ease",
									display: "flex",
									alignItems: "center",
									gap: "6px",
									fontSize: "13px",
									fontWeight: "500",
								}}
							>
								<svg
									style={{ width: "14px", height: "14px" }}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
									/>
								</svg>
								Grid
							</button>
							<button
								type="button"
								onClick={() => setViewMode("table")}
								style={{
									padding: "6px 12px",
									border: "none",
									background: viewMode === "table" ? "var(--background-primary)" : "transparent",
									color: viewMode === "table" ? "var(--text-primary)" : "var(--text-secondary)",
									borderRadius: "6px",
									cursor: "pointer",
									transition: "all 0.2s ease",
									display: "flex",
									alignItems: "center",
									gap: "6px",
									fontSize: "13px",
									fontWeight: "500",
								}}
							>
								<svg
									style={{ width: "14px", height: "14px" }}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
									/>
								</svg>
								Table
							</button>
						</div>
					)}
					<button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
						<svg
							style={{ width: "16px", height: "16px" }}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						New Project
					</button>
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

			{/* Empty State */}
			{!hasProjects && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						padding: "80px 20px",
						textAlign: "center",
					}}
				>
					<div
						style={{
							width: "120px",
							height: "120px",
							background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))",
							borderRadius: "50%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							marginBottom: "24px",
						}}
					>
						<svg
							style={{ width: "56px", height: "56px", color: "var(--primary)" }}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
							/>
						</svg>
					</div>
					<h2
						style={{
							fontSize: "24px",
							fontWeight: "700",
							color: "var(--text-primary)",
							marginBottom: "12px",
						}}
					>
						Welcome to Proofa!
					</h2>
					<p
						style={{
							fontSize: "15px",
							color: "var(--text-secondary)",
							maxWidth: "480px",
							marginBottom: "32px",
							lineHeight: "1.6",
						}}
					>
						Get started by creating your first project. Projects help you organize your applications and
						manage authentication across your services.
					</p>
					<button
						type="button"
						onClick={() => setShowForm(true)}
						className="btn btn-primary"
						style={{ padding: "12px 24px", fontSize: "15px" }}
					>
						<svg
							style={{ width: "18px", height: "18px" }}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Create Your First Project
					</button>
					<div
						style={{
							marginTop: "48px",
							display: "flex",
							gap: "32px",
							color: "var(--text-tertiary)",
							fontSize: "13px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<svg
								style={{ width: "16px", height: "16px" }}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
							<span>Quick Setup</span>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<svg
								style={{ width: "16px", height: "16px" }}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
								/>
							</svg>
							<span>Secure by Default</span>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<svg
								style={{ width: "16px", height: "16px" }}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
								/>
							</svg>
							<span>Production Ready</span>
						</div>
					</div>
				</div>
			)}

			{/* Grid View */}
			{hasProjects && viewMode === "grid" && (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
						gap: "20px",
					}}
				>
					{projects.map((project) => (
						<Link
							key={project.id}
							to={`/projects/${project.id}`}
							style={{
								display: "block",
								background: "var(--card-bg)",
								border: "1px solid var(--border-secondary)",
								borderRadius: "12px",
								padding: "20px",
								textDecoration: "none",
								transition: "all 0.2s ease",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.borderColor = "var(--primary)";
								e.currentTarget.style.transform = "translateY(-2px)";
								e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = "var(--border-secondary)";
								e.currentTarget.style.transform = "translateY(0)";
								e.currentTarget.style.boxShadow = "none";
							}}
						>
							{/* Header */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: "12px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
									<div
										style={{
											width: "36px",
											height: "36px",
											background:
												"linear-gradient(135deg, var(--primary), rgba(139, 92, 246, 0.7))",
											borderRadius: "8px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "white",
											fontSize: "14px",
											fontWeight: "600",
										}}
									>
										{project.name.charAt(0).toUpperCase()}
									</div>
									<div>
										<h3
											style={{
												fontSize: "16px",
												fontWeight: "600",
												color: "var(--text-primary)",
												marginBottom: "2px",
											}}
										>
											{project.name}
										</h3>
										{project.slug && (
											<p style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
												{project.slug}
											</p>
										)}
									</div>
								</div>
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "4px",
										padding: "4px 8px",
										background: "rgba(34, 197, 94, 0.1)",
										color: "var(--success)",
										borderRadius: "4px",
										fontSize: "11px",
										fontWeight: "500",
									}}
								>
									<span
										style={{
											width: "6px",
											height: "6px",
											background: "currentColor",
											borderRadius: "50%",
										}}
									/>
									Active
								</span>
							</div>

							{/* Stats Grid */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(3, 1fr)",
									gap: "12px",
									marginTop: "16px",
									padding: "12px",
									background: "var(--surface-secondary)",
									borderRadius: "8px",
								}}
							>
								<div style={{ textAlign: "center" }}>
									<div
										style={{
											fontSize: "20px",
											fontWeight: "700",
											color: "var(--text-primary)",
											marginBottom: "2px",
										}}
									>
										{project.totalApps || 0}
									</div>
									<div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Apps</div>
								</div>
								<div style={{ textAlign: "center" }}>
									<div
										style={{
											fontSize: "20px",
											fontWeight: "700",
											color: "var(--text-primary)",
											marginBottom: "2px",
										}}
									>
										{project.totalUsers || 0}
									</div>
									<div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Users</div>
								</div>
								<div style={{ textAlign: "center" }}>
									<div
										style={{
											fontSize: "20px",
											fontWeight: "700",
											color: "var(--text-primary)",
											marginBottom: "2px",
										}}
									>
										{project.activeLicenses || 0}
									</div>
									<div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Licenses</div>
								</div>
							</div>

							{/* Footer */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginTop: "12px",
									paddingTop: "12px",
									borderTop: "1px solid var(--border-secondary)",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<svg
										style={{ width: "13px", height: "13px", color: "var(--success)" }}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span style={{ fontSize: "14px", fontWeight: "600", color: "var(--success)" }}>
										${(project.totalRevenue || 0).toFixed(2)}
									</span>
								</div>
								<span
									style={{ fontSize: "11px", color: "var(--text-tertiary)", fontFamily: "monospace" }}
								>
									{project.id.substring(0, 8)}
								</span>
							</div>
						</Link>
					))}
				</div>
			)}

			{/* Table View */}
			{hasProjects && viewMode === "table" && (
				<div className="card" style={{ padding: "0", overflow: "hidden" }}>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr
								style={{
									background: "var(--surface-secondary)",
									borderBottom: "1px solid var(--border-secondary)",
								}}
							>
								<th
									style={{
										padding: "12px 16px",
										textAlign: "left",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-secondary)",
										textTransform: "uppercase",
									}}
								>
									Name
								</th>
								<th
									style={{
										padding: "12px 16px",
										textAlign: "center",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-secondary)",
										textTransform: "uppercase",
									}}
								>
									Apps
								</th>
								<th
									style={{
										padding: "12px 16px",
										textAlign: "center",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-secondary)",
										textTransform: "uppercase",
									}}
								>
									Users
								</th>
								<th
									style={{
										padding: "12px 16px",
										textAlign: "center",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-secondary)",
										textTransform: "uppercase",
									}}
								>
									Licenses
								</th>
								<th
									style={{
										padding: "12px 16px",
										textAlign: "right",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-secondary)",
										textTransform: "uppercase",
									}}
								>
									Revenue
								</th>
								<th
									style={{
										padding: "12px 16px",
										textAlign: "center",
										fontSize: "12px",
										fontWeight: "600",
										color: "var(--text-secondary)",
										textTransform: "uppercase",
									}}
								>
									Status
								</th>
								<th style={{ padding: "12px 16px", width: "50px" }}></th>
							</tr>
						</thead>
						<tbody>
							{projects.map((project) => (
								<tr
									key={project.id}
									style={{
										borderBottom: "1px solid var(--border-secondary)",
										transition: "background 0.15s ease",
										cursor: "pointer",
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = "var(--surface-hover)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = "transparent";
									}}
									onClick={() => (window.location.href = `/projects/${project.id}`)}
								>
									<td style={{ padding: "16px" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
											<div
												style={{
													width: "32px",
													height: "32px",
													background:
														"linear-gradient(135deg, var(--primary), rgba(139, 92, 246, 0.7))",
													borderRadius: "6px",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													color: "white",
													fontSize: "13px",
													fontWeight: "600",
													flexShrink: 0,
												}}
											>
												{project.name.charAt(0).toUpperCase()}
											</div>
											<div>
												<div
													style={{
														fontSize: "14px",
														fontWeight: "500",
														color: "var(--text-primary)",
														marginBottom: "2px",
													}}
												>
													{project.name}
												</div>
												{project.slug && (
													<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
														{project.slug}
													</div>
												)}
											</div>
										</div>
									</td>
									<td style={{ padding: "16px", textAlign: "center" }}>
										<span
											style={{
												fontSize: "15px",
												fontWeight: "600",
												color: "var(--text-primary)",
											}}
										>
											{project.totalApps || 0}
										</span>
									</td>
									<td style={{ padding: "16px", textAlign: "center" }}>
										<span
											style={{
												fontSize: "15px",
												fontWeight: "600",
												color: "var(--text-primary)",
											}}
										>
											{project.totalUsers || 0}
										</span>
									</td>
									<td style={{ padding: "16px", textAlign: "center" }}>
										<span
											style={{
												fontSize: "15px",
												fontWeight: "600",
												color: "var(--text-primary)",
											}}
										>
											{project.activeLicenses || 0}
											<span
												style={{
													fontSize: "13px",
													color: "var(--text-tertiary)",
													fontWeight: "400",
													marginLeft: "2px",
												}}
											>
												/ {project.totalLicenses || 0}
											</span>
										</span>
									</td>
									<td style={{ padding: "16px", textAlign: "right" }}>
										<span style={{ fontSize: "15px", fontWeight: "600", color: "var(--success)" }}>
											${(project.totalRevenue || 0).toFixed(2)}
										</span>
									</td>
									<td style={{ padding: "16px", textAlign: "center" }}>
										<span
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: "4px",
												padding: "4px 10px",
												background: "rgba(34, 197, 94, 0.1)",
												color: "var(--success)",
												borderRadius: "12px",
												fontSize: "12px",
												fontWeight: "500",
											}}
										>
											<span
												style={{
													width: "6px",
													height: "6px",
													background: "currentColor",
													borderRadius: "50%",
												}}
											/>
											Active
										</span>
									</td>
									<td style={{ padding: "16px", textAlign: "center" }}>
										<svg
											style={{ width: "16px", height: "16px", color: "var(--text-tertiary)" }}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
