import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Text,
	Heading,
	Card,
	CardBody,
	Button,
	Badge,
	Breadcrumb,
	BreadcrumbSeparator,
} from "@proofa/components";
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
			<div className="flex justify-center items-center py-12">
				<Spinner />
			</div>
		);
	}

	if (appError || !app) {
		return <Alert variant="danger">App not found</Alert>;
	}

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div className="mb-6">
				<Breadcrumb>
					<Link to="/projects">
						Projects
					</Link>
					/
					<Link to={`/projects/${projectId}`}>
						{project?.name}
					</Link>
					/
					<Link to={`/projects/${projectId}/apps`}>
						Apps
					</Link>
					/
					<Link to={`/projects/${projectId}/apps/${appId}`}>
						{app.name}
					</Link>
					/
					<Text>OAuth</Text>
				</Breadcrumb>
			</div>

			{/* Page Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<Heading level={1} size="lg">OAuth Providers</Heading>
					<Text className="text-text-secondary">
						Select which OAuth providers to enable for <strong>{app.name}</strong>
					</Text>
				</div>
				{!isEditing ? (
					<Button variant="primary" onClick={() => setIsEditing(true)}>
						Edit
					</Button>
				) : (
					<div className="flex gap-3">
						<Button variant="secondary" onClick={handleCancel}>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleSave}
							disabled={updateAppMutation.isPending}
						>
							{updateAppMutation.isPending ? "Saving..." : "Save"}
						</Button>
					</div>
				)}
			</div>

			{/* Info Banner */}
			<Alert variant="info" className="mb-6">
				<div className="flex gap-3">
					<Icon icon={IconType.AlertCircle} size={20} className="text-primary shrink-0" />
					<div>
						<Text className="font-semibold text-primary mb-1">
							Platform-Level Configuration
						</Text>
						<Text className="text-text-secondary">
							OAuth credentials are managed at the platform level. Simply select which providers to enable for
							your app.
						</Text>
					</div>
				</div>
			</Alert>

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
										<Badge variant="info">
											Platform
										</Badge>
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
