import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import config from "../config";
import { csrfHeaders } from "../lib/csrf";
import { useApp, useProject, useUpdateApp } from "../hooks/api";
import { pingpong } from "../lib/pingpong";
import type { App } from "../types/admin";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Heading,
	Text,
	Tabs,
	TabsList,
	TabsItem,
	TabsPanel,
	Card,
	CardBody,
	Label,
	Input,
	Textarea,
	Button,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
} from "@nube-auth/components";
import { PageLoader } from "../components/PageLoader";

export function AppSettingsPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const updateAppMutation = useUpdateApp(projectId || "", appId || "");

	const [formData, setFormData] = useState<Partial<App> | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const { showToast } = useToast();

	// Initialize formData when app data is loaded
	if (app && !formData) {
		setFormData({
			name: app.name,
			slug: app.slug,
			description: app.description,
			redirectUris: app.redirectUris || [],
			allowedHosts: app.allowedHosts || [],
			sessionTtlDays: app.sessionTtlDays || 30,
			accountLockoutMinutes: app.accountLockoutMinutes || 15,
			cacheTtlMinutes: app.cacheTtlMinutes || 10,
			rateLimit: app.rateLimit || 100,
			corsOrigins: app.corsOrigins || [],
		});
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value, type } = e.target;
		if (!formData) return;

		if (type === "checkbox") {
			setFormData((prev: Partial<App> | null) => ({
				...prev,
				[name]: (e.target as HTMLInputElement).checked,
			}));
		} else if (type === "number") {
			setFormData((prev: Partial<App> | null) => ({
				...prev,
				[name]: parseInt(value, 10),
			}));
		} else {
			setFormData((prev: Partial<App> | null) => ({
				...prev,
				[name]: value,
			}));
		}
	};

	const handleArrayFieldChange = (field: string, index: number, value: string) => {
		if (!formData) return;
		setFormData((prev: Partial<App> | null) => {
			if (!prev) return null;
			const arr = [...(prev[field as keyof typeof formData] as string[])];
			arr[index] = value;
			return {
				...prev,
				[field]: arr,
			};
		});
	};

	const addArrayField = (field: string) => {
		if (!formData) return;
		setFormData((prev: Partial<App> | null) => {
			if (!prev) return null;
			return {
				...prev,
				[field]: [...(prev[field as keyof typeof formData] as string[]), ""],
			};
		});
	};

	const removeArrayField = (field: string, index: number) => {
		if (!formData) return;
		setFormData((prev: Partial<App> | null) => {
			if (!prev) return null;
			const arr = [...(prev[field as keyof typeof formData] as string[])];
			arr.splice(index, 1);
			return {
				...prev,
				[field]: arr,
			};
		});
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData) return;

		setIsSaving(true);

		const dataToSend = {
			name: formData.name,
			slug: formData.slug,
			description: formData.description,
			redirectUris: (formData.redirectUris || []).filter((uri: string) => uri.trim()),
			allowedHosts: (formData.allowedHosts || []).filter((host: string) => host.trim()),
			sessionTtlDays: formData.sessionTtlDays || 30,
			accountLockoutMinutes: formData.accountLockoutMinutes || 15,
			cacheTtlMinutes: formData.cacheTtlMinutes || 10,
			rateLimit: formData.rateLimit || 100,
			corsOrigins: formData.corsOrigins || [],
		};

		try {
			await updateAppMutation.mutateAsync(dataToSend);
			showToast("Settings saved successfully", "success");
		} catch (error) {
			showToast(error instanceof Error ? error.message : "Failed to save settings", "error");
		} finally {
			setIsSaving(false);
		}
	};

	if (projectLoading || appLoading) {
		return <PageLoader />;
	}

	if (!project || !app || !formData) {
		return <Alert variant="danger">App not found</Alert>;
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>{project.name}</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}/apps`} />}>Apps</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}/apps/${appId}`} />}>{app.name}</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton active>Settings</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Page Header */}
			<div>
				<Heading level={1} size="lg">App Settings</Heading>
				<Text className="text-muted-foreground mt-1">Configure your application settings and preferences</Text>
			</div>

			{/* Tabs */}
			<Tabs defaultValue="general">
				<TabsList>
					<TabsItem value="general">General</TabsItem>
					<TabsItem value="authentication">Authentication</TabsItem>
					<TabsItem value="security">Security</TabsItem>
					<TabsItem value="danger">Danger Zone</TabsItem>
				</TabsList>

				{/* General Tab */}
				<TabsPanel value="general">
					<form onSubmit={handleSave} className="space-y-6">
						<Card>
							<CardBody className="space-y-5">
								<Heading level={3} size="sm">Basic Information</Heading>

								<div className="space-y-1.5">
									<Label htmlFor="name" className="inline-flex items-center gap-1">
										<span>App Name</span>
										<span className="text-danger">*</span>
									</Label>
									<Input
										id="name"
										name="name"
										value={formData.name || ""}
										onChange={handleInputChange}
										required
										placeholder="My Awesome App"
									/>
									<Text className="text-muted-foreground text-xs">The public name of your application</Text>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="slug" className="inline-flex items-center gap-1">
										<span>App Slug</span>
										<span className="text-danger">*</span>
									</Label>
									<Input
										id="slug"
										name="slug"
										value={formData.slug || ""}
										onChange={handleInputChange}
										required
										pattern="[a-z0-9-]+"
										placeholder="my-awesome-app"
									/>
									<Text className="text-muted-foreground text-xs">URL-friendly identifier (lowercase, hyphens only)</Text>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="description">Description</Label>
									<Textarea
										id="description"
										name="description"
										value={formData.description || ""}
										onChange={handleInputChange}
										rows={3}
										placeholder="A brief description of your application..."
									/>
									<Text className="text-muted-foreground text-xs">Optional description for internal reference</Text>
								</div>
							</CardBody>
						</Card>

						<div className="flex gap-3">
							<Button type="submit" disabled={isSaving || updateAppMutation.isPending}>
								{isSaving || updateAppMutation.isPending ? "Saving..." : "Save Changes"}
							</Button>
							<Button
								type="button"
								variant="secondary"
								onClick={() => navigate(`/projects/${projectId}/apps/${appId}`)}
							>
								Cancel
							</Button>
						</div>
					</form>
				</TabsPanel>

				{/* Authentication Tab */}
				<TabsPanel value="authentication">
					<form onSubmit={handleSave} className="space-y-6">
						<Card>
							<CardBody className="space-y-5">
								<div>
									<Heading level={3} size="sm">Redirect URIs</Heading>
									<Text className="text-muted-foreground text-sm mt-1">
										Allowed callback URLs after successful authentication
									</Text>
								</div>

								<div className="space-y-3">
									{(formData.redirectUris || []).map((uri: string, index: number) => (
										<div key={`redirectUri-${index}`} className="flex gap-2">
											<Input
												className="flex-1"
												type="url"
												value={uri}
												onChange={(e) => handleArrayFieldChange("redirectUris", index, e.target.value)}
												placeholder="https://myapp.com/callback"
											/>
											<Button
												type="button"
												variant="danger"
												size="sm"
												onClick={() => removeArrayField("redirectUris", index)}
											>
												Remove
											</Button>
										</div>
									))}
								</div>

								<Button type="button" variant="secondary" size="sm" onClick={() => addArrayField("redirectUris")}>
									<Icon icon={IconType.Add} size={14} />
									Add Redirect URI
								</Button>
							</CardBody>
						</Card>

						<Card>
							<CardBody className="space-y-5">
								<div>
									<Heading level={3} size="sm">Allowed Hosts</Heading>
									<Text className="text-muted-foreground text-sm mt-1">
										Domains allowed to make requests to your app
									</Text>
								</div>

								<div className="space-y-3">
									{(formData.allowedHosts || []).map((host: string, index: number) => (
										<div key={`allowedHost-${index}`} className="flex gap-2">
											<Input
												className="flex-1"
												value={host}
												onChange={(e) => handleArrayFieldChange("allowedHosts", index, e.target.value)}
												placeholder="myapp.com or localhost:3000"
											/>
											<Button
												type="button"
												variant="danger"
												size="sm"
												onClick={() => removeArrayField("allowedHosts", index)}
											>
												Remove
											</Button>
										</div>
									))}
								</div>

								<Button type="button" variant="secondary" size="sm" onClick={() => addArrayField("allowedHosts")}>
									<Icon icon={IconType.Add} size={14} />
									Add Allowed Host
								</Button>
							</CardBody>
						</Card>

						<div className="flex gap-3">
							<Button type="submit" disabled={isSaving || updateAppMutation.isPending}>
								{isSaving || updateAppMutation.isPending ? "Saving..." : "Save Changes"}
							</Button>
							<Button
								type="button"
								variant="secondary"
								onClick={() => navigate(`/projects/${projectId}/apps/${appId}`)}
							>
								Cancel
							</Button>
						</div>
					</form>
				</TabsPanel>

				{/* Security Tab */}
				<TabsPanel value="security">
					<form onSubmit={handleSave} className="space-y-6">
						<Card>
							<CardBody className="space-y-5">
								<Heading level={3} size="sm">Security Settings</Heading>

								<div className="space-y-1.5">
									<Label htmlFor="accountLockoutMinutes">Account Lockout Duration (Minutes)</Label>
									<Input
										id="accountLockoutMinutes"
										type="number"
										name="accountLockoutMinutes"
										value={formData.accountLockoutMinutes || 15}
										onChange={handleInputChange}
										min={5}
										max={120}
										required
									/>
									<Text className="text-muted-foreground text-xs">Duration to lock accounts after failed login attempts (5-120 minutes)</Text>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="cacheTtlMinutes">Cache TTL (Minutes)</Label>
									<Input
										id="cacheTtlMinutes"
										type="number"
										name="cacheTtlMinutes"
										value={formData.cacheTtlMinutes || 10}
										onChange={handleInputChange}
										min={1}
										max={60}
										required
									/>
									<Text className="text-muted-foreground text-xs">How long to cache user session data (1-60 minutes)</Text>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="rateLimit">Rate Limit (Requests Per Minute)</Label>
									<Input
										id="rateLimit"
										type="number"
										name="rateLimit"
										value={formData.rateLimit || 100}
										onChange={handleInputChange}
										min={10}
										max={1000}
										required
									/>
									<Text className="text-muted-foreground text-xs">Maximum API requests per minute per user (10-1000)</Text>
								</div>
							</CardBody>
						</Card>

						<Alert variant="info">
							Adjust these settings based on your app's needs. Higher values provide better UX but may increase security risks.
						</Alert>

						<div className="flex gap-3">
							<Button type="submit" disabled={isSaving || updateAppMutation.isPending}>
								{isSaving || updateAppMutation.isPending ? "Saving..." : "Save Changes"}
							</Button>
							<Button
								type="button"
								variant="secondary"
								onClick={() => navigate(`/projects/${projectId}/apps/${appId}`)}
							>
								Cancel
							</Button>
						</div>
					</form>
				</TabsPanel>

				{/* Danger Zone Tab */}
				<TabsPanel value="danger">
					<Card className="border-danger/30 bg-danger/5">
						<CardBody className="space-y-5">
							<div>
								<Heading level={3} size="sm" className="text-danger">Danger Zone</Heading>
								<Text className="text-muted-foreground text-sm mt-1">
									These actions are permanent and cannot be undone.
								</Text>
							</div>

							<div className="rounded-lg border border-danger/25 bg-danger/10 p-5 space-y-4">
								<div>
									<Text className="font-semibold text-danger text-sm">Delete This App</Text>
									<Text className="text-muted-foreground text-sm mt-1">
										Once you delete an app, there is no going back. This will:
									</Text>
								</div>
								<ul className="text-muted-foreground text-sm list-disc pl-5 space-y-1">
									<li>Delete all user data and sessions</li>
									<li>Revoke all active licenses</li>
									<li>Remove all API keys and integrations</li>
									<li>Cancel all active subscriptions</li>
								</ul>
								<Button variant="danger" onClick={() => setShowDeleteModal(true)}>
									Delete App
								</Button>
							</div>
						</CardBody>
					</Card>
				</TabsPanel>
			</Tabs>

			{/* Delete Confirmation Modal with Captcha */}
			<ConfirmModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={async () => {
					try {
						const response = await pingpong(
							`${config.gatewayUrl}/v1/admin/projects/${projectId}/apps/${appId}`,
							{
								method: "DELETE",
								credentials: "include",
								headers: csrfHeaders(),
							},
						);

						showToast("App deleted successfully", "success");
						setShowDeleteModal(false);
						navigate(`/projects/${projectId}/apps`);
					} catch (error) {
						showToast(error instanceof Error ? error.message : "Failed to delete app", "error");
					}
				}}
				title="Delete Application"
				message={`Are you sure you want to delete "${app?.name}"? This action cannot be undone and will permanently delete all user data, sessions, licenses, API keys, and integrations.`}
				confirmText="Delete App"
				variant="danger"
				requireCaptcha={true}
			/>
		</div>
	);
}
