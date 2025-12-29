import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useApp, useUpdateApp, useProject } from "../hooks/api";
import { useToast } from "../components/Toast";

export default function AppOAuthPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { showToast } = useToast();

	const { data: app, isLoading: appLoading, error: appError } = useApp(projectId!, appId!);
	const { data: project, isLoading: projectLoading } = useProject(projectId!);
	const updateAppMutation = useUpdateApp(projectId!, appId!);

	const [isEditing, setIsEditing] = useState(false);
	const [inheritSource, setInheritSource] = useState<"proofa" | "project" | "app">("proofa");
	const [oauthForm, setOauthForm] = useState({
		googleClientId: "",
		googleClientSecret: "",
		githubClientId: "",
		githubClientSecret: "",
	});

	// Initialize form when app data loads
	useEffect(() => {
		if (app) {
			setInheritSource(app.oauthInheritSource || "proofa");
			setOauthForm({
				googleClientId: app.googleClientId || "",
				googleClientSecret: "", // Don't populate secrets for security
				githubClientId: app.githubClientId || "",
				githubClientSecret: "", // Don't populate secrets for security
			});
		}
	}, [app]);

	const handleSave = async () => {
		try {
			const updates: any = {
				oauthInheritSource: inheritSource,
			};

			// Only send OAuth credentials if inherit source is 'app'
			if (inheritSource === "app") {
				if (oauthForm.googleClientId !== (app?.googleClientId || "")) {
					updates.googleClientId = oauthForm.googleClientId || null;
				}
				if (oauthForm.googleClientSecret) {
					updates.googleClientSecret = oauthForm.googleClientSecret;
				}
				if (oauthForm.githubClientId !== (app?.githubClientId || "")) {
					updates.githubClientId = oauthForm.githubClientId || null;
				}
				if (oauthForm.githubClientSecret) {
					updates.githubClientSecret = oauthForm.githubClientSecret;
				}
			}

			await updateAppMutation.mutateAsync(updates);
			showToast("OAuth configuration updated successfully", "success");
			setIsEditing(false);
			// Clear secret fields after save
			setOauthForm((prev) => ({
				...prev,
				googleClientSecret: "",
				githubClientSecret: "",
			}));
		} catch (error) {
			console.error("Failed to update OAuth configuration:", error);
			showToast("Failed to update OAuth configuration", "error");
		}
	};

	const handleCancel = () => {
		setIsEditing(false);
		// Reset form to app data
		if (app) {
			setInheritSource(app.oauthInheritSource || "proofa");
			setOauthForm({
				googleClientId: app.googleClientId || "",
				googleClientSecret: "",
				githubClientId: app.githubClientId || "",
				githubClientSecret: "",
			});
		}
	};

	const handleOverride = () => {
		setIsEditing(true);
		setInheritSource("app");
	};

	if (appLoading || projectLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (appError || !app) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-red-500">Failed to load OAuth configuration</div>
			</div>
		);
	}

	const currentInheritSource = app.oauthInheritSource || "proofa";
	const isInheriting = currentInheritSource !== "app";
	const isInheritingFromProject = currentInheritSource === "project";
	const hasProjectConfig = project?.googleClientId || project?.githubClientId;

	// Determine what credentials are being used
	const effectiveGoogleClientId = isInheriting
		? isInheritingFromProject && hasProjectConfig
			? project?.googleClientId
			: "Proofa Default"
		: app.googleClientId;

	const effectiveGithubClientId = isInheriting
		? isInheritingFromProject && hasProjectConfig
			? project?.githubClientId
			: "Proofa Default"
		: app.githubClientId;

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div style={{ marginBottom: "24px" }}>
				<div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
					<Link to="/projects" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						Projects
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}`} style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						{project?.name || "Project"}
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}/apps/${appId}`} style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						{app.name}
					</Link>
					<span>›</span>
					<span style={{ color: "var(--text-primary)" }}>OAuth</span>
				</div>
			</div>

			{/* Page Header */}
			<div style={{ marginBottom: "32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
				<div>
					<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>OAuth Configuration</h1>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
						Configure OAuth providers for <strong>{app.name}</strong>
					</p>
				</div>
				{!isEditing ? (
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="btn btn-primary"
					>
						Edit
					</button>
				) : (
					<div style={{ display: "flex", gap: "12px" }}>
						<button
							type="button"
							onClick={handleCancel}
							className="btn btn-secondary"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							disabled={updateAppMutation.isPending}
							className="btn btn-primary"
						>
							{updateAppMutation.isPending ? "Saving..." : "Save"}
						</button>
					</div>
				)}
			</div>

			{/* Current Status Card - Show if inheriting */}
			{isInheriting && !isEditing && (
				<div className="card" style={{ marginBottom: "24px", padding: "20px" }}>
					<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
						<div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
							<div
								style={{
									width: "40px",
									height: "40px",
									borderRadius: "8px",
									background: "var(--info-bg)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "20px",
									flexShrink: 0,
								}}
							>
								🔗
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
									<span
										className="badge badge-info"
										style={{ fontSize: "11px", fontWeight: "600" }}
									>
										Inherited
									</span>
									<span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
										{isInheritingFromProject ? "From Project" : "From Proofa"}
									</span>
								</div>
								<p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
									{isInheritingFromProject
										? "Using OAuth configuration from project settings"
										: "Using default Proofa OAuth configuration"}
								</p>
								<div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--text-tertiary)" }}>
									<span style={{ color: "var(--info)" }}>
										💡 You can override this for this app
									</span>
								</div>
							</div>
						</div>
						<button
							type="button"
							onClick={handleOverride}
							className="btn btn-secondary"
							style={{ flexShrink: 0 }}
						>
							Override
						</button>
					</div>
				</div>
			)}

			{/* Inheritance Source Selector - Show in edit mode */}
			{isEditing && (
				<div className="card" style={{ marginBottom: "24px", padding: "20px" }}>
					<div style={{ marginBottom: "16px" }}>
						<label className="form-label" style={{ marginBottom: "12px", display: "block" }}>
							OAuth Configuration Source
						</label>
						<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "16px" }}>
							Choose where this app should get its OAuth credentials from
						</p>
					</div>
					<div style={{ display: "grid", gap: "12px" }}>
						{/* Proofa Option */}
						<label
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: "12px",
								padding: "12px",
								border: `2px solid ${inheritSource === "proofa" ? "var(--primary)" : "var(--card-border)"}`,
								borderRadius: "var(--radius)",
								cursor: "pointer",
								background: inheritSource === "proofa" ? "var(--primary-bg)" : "transparent",
								transition: "all 0.2s",
							}}
						>
							<input
								type="radio"
								name="inheritSource"
								value="proofa"
								checked={inheritSource === "proofa"}
								onChange={(e) => setInheritSource(e.target.value as "proofa" | "project" | "app")}
								style={{ marginTop: "2px" }}
							/>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
									Proofa (Default)
								</div>
								<div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
									Use Proofa's default OAuth configuration
								</div>
							</div>
						</label>

						{/* Project Option */}
						<label
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: "12px",
								padding: "12px",
								border: `2px solid ${inheritSource === "project" ? "var(--primary)" : "var(--card-border)"}`,
								borderRadius: "var(--radius)",
								cursor: "pointer",
								background: inheritSource === "project" ? "var(--primary-bg)" : "transparent",
								transition: "all 0.2s",
							}}
						>
							<input
								type="radio"
								name="inheritSource"
								value="project"
								checked={inheritSource === "project"}
								onChange={(e) => setInheritSource(e.target.value as "proofa" | "project" | "app")}
								style={{ marginTop: "2px" }}
							/>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
									Project
								</div>
								<div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
									Use OAuth configuration from project settings
									{!hasProjectConfig && (
										<span style={{ color: "var(--warning)", marginLeft: "4px" }}>
											(Not configured yet)
										</span>
									)}
								</div>
							</div>
						</label>

						{/* App Option */}
						<label
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: "12px",
								padding: "12px",
								border: `2px solid ${inheritSource === "app" ? "var(--primary)" : "var(--card-border)"}`,
								borderRadius: "var(--radius)",
								cursor: "pointer",
								background: inheritSource === "app" ? "var(--primary-bg)" : "transparent",
								transition: "all 0.2s",
							}}
						>
							<input
								type="radio"
								name="inheritSource"
								value="app"
								checked={inheritSource === "app"}
								onChange={(e) => setInheritSource(e.target.value as "proofa" | "project" | "app")}
								style={{ marginTop: "2px" }}
							/>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
									App-Specific (Override)
								</div>
								<div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
									Configure custom OAuth credentials for this app only
								</div>
							</div>
						</label>
					</div>
				</div>
			)}

			{/* OAuth Credentials - Only show if source is 'app' or in view mode */}
			{(inheritSource === "app" || !isEditing) && (
				<>
					{/* Google OAuth */}
					<div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--border-primary)" }}>
							<div style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
								<svg style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24">
									<path
										fill="#4285F4"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="#34A853"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="#FBBC05"
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									/>
									<path
										fill="#EA4335"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									/>
								</svg>
							</div>
							<h2 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Google OAuth</h2>
						</div>
						<div style={{ display: "grid", gap: "20px" }}>
							<div className="form-group">
								<label className="form-label" htmlFor="googleClientId">Client ID</label>
								{isEditing && inheritSource === "app" ? (
									<input
										type="text"
										id="googleClientId"
										value={oauthForm.googleClientId}
										onChange={(e) => setOauthForm({ ...oauthForm, googleClientId: e.target.value })}
										placeholder="Enter Google Client ID"
										className="form-control"
									/>
								) : (
									<div style={{ padding: "10px 14px", background: "var(--content-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", fontSize: "13px", fontFamily: "monospace", color: "var(--text-primary)" }}>
										{effectiveGoogleClientId || <span style={{ color: "var(--text-tertiary)" }}>Not configured</span>}
									</div>
								)}
							</div>
							<div className="form-group">
								<label className="form-label" htmlFor="googleClientSecret">Client Secret</label>
								{isEditing && inheritSource === "app" ? (
									<div>
										<input
											type="password"
											id="googleClientSecret"
											value={oauthForm.googleClientSecret}
											onChange={(e) => setOauthForm({ ...oauthForm, googleClientSecret: e.target.value })}
											placeholder={app.googleClientSecret ? "Enter new secret to update" : "Enter Google Client Secret"}
											className="form-control"
										/>
										{app.googleClientSecret && (
											<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
												Leave empty to keep existing secret
											</p>
										)}
									</div>
								) : (
									<div style={{ padding: "10px 14px", background: "var(--content-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", fontSize: "13px", fontFamily: "monospace", color: "var(--text-primary)" }}>
										{isInheriting
											? isInheritingFromProject && project?.googleClientSecret
												? "••••••••••••"
												: effectiveGoogleClientId === "Proofa Default"
												? "••••••••••••"
												: <span style={{ color: "var(--text-tertiary)" }}>Not configured</span>
											: app.googleClientSecret
											? "••••••••••••"
											: <span style={{ color: "var(--text-tertiary)" }}>Not configured</span>}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* GitHub OAuth */}
					<div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--border-primary)" }}>
							<div style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
								<svg style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="#181717">
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
								</svg>
							</div>
							<h2 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>GitHub OAuth</h2>
						</div>
						<div style={{ display: "grid", gap: "20px" }}>
							<div className="form-group">
								<label className="form-label" htmlFor="githubClientId">Client ID</label>
								{isEditing && inheritSource === "app" ? (
									<input
										type="text"
										id="githubClientId"
										value={oauthForm.githubClientId}
										onChange={(e) => setOauthForm({ ...oauthForm, githubClientId: e.target.value })}
										placeholder="Enter GitHub Client ID"
										className="form-control"
									/>
								) : (
									<div style={{ padding: "10px 14px", background: "var(--content-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", fontSize: "13px", fontFamily: "monospace", color: "var(--text-primary)" }}>
										{effectiveGithubClientId || <span style={{ color: "var(--text-tertiary)" }}>Not configured</span>}
									</div>
								)}
							</div>
							<div className="form-group">
								<label className="form-label" htmlFor="githubClientSecret">Client Secret</label>
								{isEditing && inheritSource === "app" ? (
									<div>
										<input
											type="password"
											id="githubClientSecret"
											value={oauthForm.githubClientSecret}
											onChange={(e) => setOauthForm({ ...oauthForm, githubClientSecret: e.target.value })}
											placeholder={app.githubClientSecret ? "Enter new secret to update" : "Enter GitHub Client Secret"}
											className="form-control"
										/>
										{app.githubClientSecret && (
											<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
												Leave empty to keep existing secret
											</p>
										)}
									</div>
								) : (
									<div style={{ padding: "10px 14px", background: "var(--content-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", fontSize: "13px", fontFamily: "monospace", color: "var(--text-primary)" }}>
										{isInheriting
											? isInheritingFromProject && project?.githubClientSecret
												? "••••••••••••"
												: effectiveGithubClientId === "Proofa Default"
												? "••••••••••••"
												: <span style={{ color: "var(--text-tertiary)" }}>Not configured</span>
											: app.githubClientSecret
											? "••••••••••••"
											: <span style={{ color: "var(--text-tertiary)" }}>Not configured</span>}
									</div>
								)}
							</div>
						</div>
					</div>
				</>
			)}

			{/* Info Box */}
			<div className="alert alert-info">
				<svg style={{ width: "20px", height: "20px", flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
					<path
						fillRule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clipRule="evenodd"
					/>
				</svg>
				<div style={{ fontSize: "13px" }}>
					<p style={{ fontWeight: "600", marginBottom: "8px" }}>OAuth Inheritance</p>
					<ul style={{ listStyle: "disc", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
						<li>By default, apps inherit OAuth configuration from Proofa</li>
						<li>You can configure project-level OAuth that all apps inherit</li>
						<li>Override at the app level for app-specific OAuth credentials</li>
						<li>Client secrets are encrypted before storage</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
