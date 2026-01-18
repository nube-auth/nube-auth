import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon, IconType } from "@proofa/components";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
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
	const [selectedProviders, setSelectedProviders] = useState<("google" | "github")[]>([]);

	// Initialize selected providers when app data loads
	if (app && selectedProviders.length === 0 && app.enabledProviders) {
		setSelectedProviders(app.enabledProviders as ("google" | "github")[]);
	}

	const handleToggleProvider = (providerId: string) => {
		const provider = providerId as "google" | "github";
		setSelectedProviders((prev) =>
			prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider],
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
		setSelectedProviders((app?.enabledProviders as ("google" | "github")[]) || ["google"]);
	};

	const getProviderIcon = (provider: string) => {
		switch (provider.toLowerCase()) {
			case "google":
				return <Icon icon={IconType.Google} size={24} />;
			case "github":
				return <Icon icon={IconType.GitHub} size={24} />;
			default:
				return <span className="text-24px">🔐</span>;
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
			<div className="mb-6">
				<div className="breadcrumb">
					<Link to="/projects" className="breadcrumb-link">
						Projects
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}`}
						className="breadcrumb-link"
					>
						{project?.name}
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}/apps`}
						className="breadcrumb-link"
					>
						Apps
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}/apps/${appId}`}
						className="breadcrumb-link"
					>
						{app.name}
					</Link>
					<span>›</span>
					<span className="text-text-primary">OAuth</span>
				</div>
			</div>

			{/* Page Header */}
			<div className="page-header mb-8">
				<div>
					<h1 className="page-title">OAuth Providers</h1>
					<p className="text-14px text-text-tertiary">
						Select which OAuth providers to enable for <strong>{app.name}</strong>
					</p>
				</div>
				{!isEditing ? (
					<button type="button" onClick={() => setIsEditing(true)} className="btn btn-primary">
						Edit
					</button>
				) : (
					<div className="flex gap-3">
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
			<div className="card-info mb-6">
				<Icon icon={AlertCircleIcon} size={20} className="text-primary shrink-0" />
				<div>
					<p className="text-14px font-semibold text-primary mb-1">
						Platform-Level Configuration
					</p>
					<p className="text-13px text-text-secondary m-0">
						OAuth credentials are managed at the platform level. Simply select which providers to enable for
						your app.
					</p>
				</div>
			</div>

			{/* Providers Grid */}
			<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
				{AVAILABLE_PROVIDERS.map((provider) => {
					const isSelected = selectedProviders.includes(provider.id);

					return (
						<div
							key={provider.id}
							className={`card p-6 transition-all duration-200 border-2 ${
								isSelected ? "border-primary bg-primary-light" : "border-card-border bg-card-bg"
							} ${isEditing ? "cursor-pointer opacity-100" : "cursor-default opacity-80"}`}
							onClick={() => isEditing && handleToggleProvider(provider.id)}
						>
							<div className="flex items-start gap-4 mb-4">
								<div className="w-12 h-12 rounded-12px bg-content-bg flex items-center justify-center shrink-0">
									{getProviderIcon(provider.id)}
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<h3 className="text-16px font-semibold text-text-primary m-0">
											{provider.name}
										</h3>
										<span className="badge badge-primary">
											Platform
										</span>
									</div>
									<p className="text-13px text-text-secondary m-0">
										Managed by Proofa
									</p>
								</div>
							</div>

							<div className="flex items-center justify-between pt-4 border-t border-border-primary">
								<span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-text-secondary"}`}>
									{isSelected ? "Enabled" : "Disabled"}
								</span>
								{isEditing && (
									<div className={`toggle-switch ${isSelected ? "bg-primary" : "bg-border-primary"}`}>
								<div className={`toggle-button ${isSelected ? "left-[26px]" : "left-[2px]"}`} />
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
