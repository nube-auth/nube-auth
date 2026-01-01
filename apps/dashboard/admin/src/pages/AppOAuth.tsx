import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import { useApp, useProject, useUpdateApp } from "../hooks/api";

const AVAILABLE_PROVIDERS = [
	{ id: "google", name: "Google", icon: "🔵" },
	{ id: "github", name: "GitHub", icon: "⚫" },
] as const;

export default function AppOAuthPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { showToast } = useToast();

	const { data: app, isLoading: appLoading, error: appError } = useApp(projectId!, appId!);
	const { data: project, isLoading: projectLoading } = useProject(projectId!);
	const updateAppMutation = useUpdateApp(projectId!, appId!);

	const [isEditing, setIsEditing] = useState(false);
	const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

	// Initialize selected providers when app data loads
	if (app && selectedProviders.length === 0 && app.enabledProviders) {
		setSelectedProviders(app.enabledProviders);
	}

	const handleToggleProvider = (providerId: string) => {
		setSelectedProviders((prev) =>
			prev.includes(providerId) ? prev.filter((p) => p !== providerId) : [...prev, providerId],
		);
	};

	const handleSave = async () => {
		try {
			await updateAppMutation.mutateAsync({ enabledProviders: selectedProviders });
			showToast("OAuth providers updated successfully", "success");
			setIsEditing(false);
		} catch (error) {
			console.error("Failed to update OAuth providers:", error);
			showToast("Failed to update OAuth providers", "error");
		}
	};

	const handleCancel = () => {
		setIsEditing(false);
		setSelectedProviders(app?.enabledProviders || ["google"]);
	};

	const getProviderIcon = (provider: string) => {
		switch (provider.toLowerCase()) {
			case "google":
				return (
					<svg style={{ width: "24px", height: "24px" }} viewBox="0 0 24 24">
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
				);
			case "github":
				return (
					<svg style={{ width: "24px", height: "24px" }} viewBox="0 0 24 24" fill="#181717">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
					</svg>
				);
			default:
				return <span style={{ fontSize: "24px" }}>🔐</span>;
		}
	};

	if (appLoading || projectLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (appError || !app) {
		return <div className="error-state">App not found</div>;
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
						{project?.name}
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}/apps`}
						style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
					>
						Apps
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}/apps/${appId}`}
						style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
					>
						{app.name}
					</Link>
					<span>›</span>
					<span style={{ color: "var(--text-primary)" }}>OAuth</span>
				</div>
			</div>

			{/* Page Header */}
			<div
				style={{
					marginBottom: "32px",
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>OAuth Providers</h1>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
						Select which OAuth providers to enable for <strong>{app.name}</strong>
					</p>
				</div>
				{!isEditing ? (
					<button type="button" onClick={() => setIsEditing(true)} className="btn btn-primary">
						Edit
					</button>
				) : (
					<div style={{ display: "flex", gap: "12px" }}>
						<button type="button" onClick={handleCancel} className="btn btn-secondary">
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

			{/* Info Banner */}
			<div
				style={{
					padding: "16px",
					background: "var(--primary-light)",
					border: "1px solid var(--primary)",
					borderRadius: "12px",
					marginBottom: "24px",
					display: "flex",
					gap: "12px",
				}}
			>
				<svg
					style={{ width: "20px", height: "20px", color: "var(--primary)", flexShrink: 0 }}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<div>
					<p style={{ fontSize: "14px", fontWeight: "600", color: "var(--primary)", marginBottom: "4px" }}>
						Platform-Level Configuration
					</p>
					<p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
						OAuth credentials are managed at the platform level. Simply select which providers to enable for
						your app.
					</p>
				</div>
			</div>

			{/* Providers Grid */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
				{AVAILABLE_PROVIDERS.map((provider) => {
					const isSelected = selectedProviders.includes(provider.id);

					return (
						<div
							key={provider.id}
							className="card"
							style={{
								padding: "24px",
								border: `2px solid ${isSelected ? "var(--primary)" : "var(--card-border)"}`,
								background: isSelected ? "var(--primary-light)" : "var(--card-bg)",
								transition: "all 0.2s ease",
								cursor: isEditing ? "pointer" : "default",
								opacity: isEditing ? 1 : 0.8,
							}}
							onClick={() => isEditing && handleToggleProvider(provider.id)}
						>
							<div
								style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}
							>
								<div
									style={{
										width: "48px",
										height: "48px",
										borderRadius: "12px",
										background: "var(--content-bg)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										flexShrink: 0,
									}}
								>
									{getProviderIcon(provider.id)}
								</div>
								<div style={{ flex: 1 }}>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											marginBottom: "4px",
										}}
									>
										<h3
											style={{
												fontSize: "16px",
												fontWeight: "600",
												color: "var(--text-primary)",
												margin: 0,
											}}
										>
											{provider.name}
										</h3>
										<span
											style={{
												padding: "2px 8px",
												borderRadius: "4px",
												fontSize: "10px",
												fontWeight: "600",
												background: "var(--primary)",
												color: "white",
												textTransform: "uppercase",
											}}
										>
											Platform
										</span>
									</div>
									<p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
										Managed by Proofa
									</p>
								</div>
							</div>

							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									paddingTop: "16px",
									borderTop: "1px solid var(--border-primary)",
								}}
							>
								<span
									style={{
										fontSize: "14px",
										fontWeight: "500",
										color: isSelected ? "var(--primary)" : "var(--text-secondary)",
									}}
								>
									{isSelected ? "Enabled" : "Disabled"}
								</span>
								{isEditing && (
									<div
										style={{
											width: "48px",
											height: "24px",
											borderRadius: "12px",
											background: isSelected ? "var(--primary)" : "var(--border-primary)",
											position: "relative",
											transition: "all 0.2s ease",
										}}
									>
										<div
											style={{
												width: "20px",
												height: "20px",
												borderRadius: "50%",
												background: "white",
												position: "absolute",
												top: "2px",
												left: isSelected ? "26px" : "2px",
												transition: "all 0.2s ease",
												boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
											}}
										/>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
