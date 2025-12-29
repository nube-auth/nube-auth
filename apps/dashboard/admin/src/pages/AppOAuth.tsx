import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
	useApp,
	useProject,
	useAvailableOAuthProviders,
	useSelectedOAuthProviders,
	useSelectOAuthProvider,
	useDeselectOAuthProvider,
} from "../hooks/api";
import { useToast } from "../components/Toast";

type OAuthProvider = {
	id: number;
	provider: string;
	entityType: "platform" | "project" | "app";
	entityId: number | null;
	credentials: {
		client_id?: string;
		redirect_uri?: string;
	};
	isActive: boolean;
	createdAt: string;
};

type SelectedProvider = OAuthProvider & {
	displayOrder: number;
	customButtonText?: string;
};

export default function AppOAuthPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { showToast } = useToast();

	const { data: app, isLoading: appLoading, error: appError } = useApp(projectId!, appId!);
	const { data: project, isLoading: projectLoading } = useProject(projectId!);
	const { data: availableProviders = [], isLoading: loadingAvailable } = useAvailableOAuthProviders(appId!);
	const { data: selectedProviders = [], isLoading: loadingSelected } = useSelectedOAuthProviders(appId!);
	
	const selectProviderMutation = useSelectOAuthProvider(appId!);
	const deselectProviderMutation = useDeselectOAuthProvider(appId!);

	const [showCreateForm, setShowCreateForm] = useState(false);

	const handleToggleProvider = async (provider: OAuthProvider) => {
		const isSelected = selectedProviders.some((p: SelectedProvider) => p.id === provider.id);
		
		try {
			if (isSelected) {
				await deselectProviderMutation.mutateAsync(provider.id);
				showToast(`${provider.provider} deselected`, "success");
			} else {
				await selectProviderMutation.mutateAsync({
					oauthProviderId: provider.id,
					displayOrder: selectedProviders.length,
				});
				showToast(`${provider.provider} selected`, "success");
			}
		} catch (error) {
			showToast(`Failed to ${isSelected ? "deselect" : "select"} provider`, "error");
		}
	};

	const getProviderIcon = (provider: string) => {
		switch (provider.toLowerCase()) {
			case "google":
				return (
					<svg style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
				);
			case "github":
				return (
					<svg style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="#181717">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
				);
			default:
				return <span style={{ fontSize: "20px" }}>🔐</span>;
		}
	};

	const getSourceBadge = (entityType: string) => {
		const colors = {
			platform: { bg: "var(--primary-bg)", text: "var(--primary)" },
			project: { bg: "var(--info-bg)", text: "var(--info)" },
			app: { bg: "var(--success-bg)", text: "var(--success)" },
		};
		const color = colors[entityType as keyof typeof colors] || colors.platform;
		
		return (
			<span
				style={{
					padding: "2px 8px",
					borderRadius: "4px",
					fontSize: "11px",
					fontWeight: "600",
					background: color.bg,
					color: color.text,
					textTransform: "capitalize",
				}}
			>
				{entityType}
			</span>
		);
	};

	if (appLoading || projectLoading || loadingAvailable || loadingSelected) {
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

	const selectedProviderIds = new Set(selectedProviders.map((p: SelectedProvider) => p.id));

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
						Select OAuth providers for <strong>{app.name}</strong>
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreateForm(!showCreateForm)}
					className="btn btn-primary"
				>
					Create App Provider
				</button>
			</div>

			{/* Selected Providers */}
			{selectedProviders.length > 0 && (
				<div style={{ marginBottom: "24px" }}>
					<h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
						Selected Providers ({selectedProviders.length})
					</h2>
					<div style={{ display: "grid", gap: "12px" }}>
						{selectedProviders
							.sort((a: SelectedProvider, b: SelectedProvider) => a.displayOrder - b.displayOrder)
							.map((provider: SelectedProvider) => (
								<div
									key={provider.id}
									className="card"
									style={{
										padding: "16px",
										display: "flex",
										alignItems: "center",
										gap: "12px",
										border: "2px solid var(--success)",
									}}
								>
									<div style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
										{getProviderIcon(provider.provider)}
									</div>
									<div style={{ flex: 1 }}>
										<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
											<span style={{ fontSize: "14px", fontWeight: "600", textTransform: "capitalize" }}>
												{provider.provider}
											</span>
											{getSourceBadge(provider.entityType)}
										</div>
										<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
											{provider.credentials.client_id && `Client ID: ${provider.credentials.client_id.substring(0, 20)}...`}
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleToggleProvider(provider)}
										className="btn btn-secondary"
										style={{ fontSize: "13px" }}
										disabled={deselectProviderMutation.isPending}
									>
										Remove
									</button>
								</div>
							))}
					</div>
				</div>
			)}

			{/* Available Providers */}
			<div>
				<h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
					Available Providers
				</h2>
				{availableProviders.length === 0 ? (
					<div className="card" style={{ padding: "32px", textAlign: "center" }}>
						<p style={{ color: "var(--text-tertiary)" }}>No OAuth providers configured yet.</p>
						<p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "8px" }}>
							Create an app-level provider to get started.
						</p>
					</div>
				) : (
					<div style={{ display: "grid", gap: "12px" }}>
						{availableProviders.map((provider: OAuthProvider) => {
							const isSelected = selectedProviderIds.has(provider.id);
							return (
								<div
									key={provider.id}
									className="card"
									style={{
										padding: "16px",
										display: "flex",
										alignItems: "center",
										gap: "12px",
										opacity: provider.isActive ? 1 : 0.5,
									}}
								>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => handleToggleProvider(provider)}
										disabled={!provider.isActive || selectProviderMutation.isPending || deselectProviderMutation.isPending}
										style={{ width: "18px", height: "18px", cursor: "pointer" }}
									/>
									<div style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
										{getProviderIcon(provider.provider)}
									</div>
									<div style={{ flex: 1 }}>
										<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
											<span style={{ fontSize: "14px", fontWeight: "600", textTransform: "capitalize" }}>
												{provider.provider}
											</span>
											{getSourceBadge(provider.entityType)}
											{!provider.isActive && (
												<span
													style={{
														padding: "2px 8px",
														borderRadius: "4px",
														fontSize: "11px",
														fontWeight: "600",
														background: "var(--warning-bg)",
														color: "var(--warning)",
													}}
												>
													Inactive
												</span>
											)}
										</div>
										<div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
											{provider.credentials.client_id && `Client ID: ${provider.credentials.client_id.substring(0, 20)}...`}
											{provider.credentials.redirect_uri && (
												<span style={{ marginLeft: "8px" }}>
													• Redirect: {provider.credentials.redirect_uri}
												</span>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Info Box */}
			<div className="alert alert-info" style={{ marginTop: "24px" }}>
				<svg style={{ width: "20px", height: "20px", flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
					<path
						fillRule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clipRule="evenodd"
					/>
				</svg>
				<div style={{ fontSize: "13px" }}>
					<p style={{ fontWeight: "600", marginBottom: "8px" }}>OAuth Provider Selection</p>
					<ul style={{ listStyle: "disc", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
						<li>Platform providers are configured at the system level</li>
						<li>Project providers are shared across all apps in the project</li>
						<li>App providers are specific to this app only</li>
						<li>Select multiple providers to offer users different sign-in options</li>
						<li>The order of selected providers determines button display order</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
