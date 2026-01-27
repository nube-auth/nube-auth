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
	Breadcrumb,
	BreadcrumbSeparator,
} from "@proofa/components";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useApp, useProject } from "../hooks/api";
import { pingpong } from "../lib/pingpong";

export function AppApiKeysPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");

	const [showSecret, setShowSecret] = useState(false);
	const [showToken, setShowToken] = useState(false);
	const [revealedKeys, setRevealedKeys] = useState<{
		clientSecret?: string;
		serviceToken?: string;
	}>({});
	const [copying, setCopying] = useState<string | null>(null);
	const [showRegenerateSecretModal, setShowRegenerateSecretModal] = useState(false);
	const [showRegenerateTokenModal, setShowRegenerateTokenModal] = useState(false);
	const [_isRegenerating, setIsRegenerating] = useState(false);
	const { showToast } = useToast();

	const handleRevealKeys = async () => {
		try {
			const response = await pingpong(
				`${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/admin/projects/${projectId}/apps/${appId}/api-keys`,
				{
					credentials: "include",
				},
			);

			if (response.ok()) {
				const keys = response.data;
				setRevealedKeys(keys);
				setShowSecret(true);
				setShowToken(true);
			} else {
				showToast("Failed to retrieve keys", "error");
			}
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Error revealing keys:", error);
			}
			showToast("Failed to retrieve keys", "error");
		}
	};

	const handleCopy = async (text: string, type: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopying(type);
			setTimeout(() => setCopying(null), 2000);
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Copy failed:", error);
			}
			showToast("Copy failed", "error");
		}
	};

	const handleRegenerateSecret = async () => {
		setIsRegenerating(true);
		try {
			const response = await pingpong(
				`${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/admin/projects/${projectId}/apps/${appId}/regenerate-secret`,
				{
					method: "POST",
					credentials: "include",
				},
			);

			if (response.ok()) {
				const data = response.data;
				setRevealedKeys((prev) => ({ ...prev, clientSecret: data.clientSecret }));
				setShowSecret(true);
				showToast("Client Secret regenerated successfully", "success");
				setShowRegenerateSecretModal(false);
			} else {
				showToast("Failed to regenerate secret", "error");
			}
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Error regenerating secret:", error);
			}
			showToast("Failed to regenerate secret", "error");
		} finally {
			setIsRegenerating(false);
		}
	};

	const handleRegenerateToken = async () => {
		setIsRegenerating(true);
		try {
			const response = await pingpong(
				`${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/admin/projects/${projectId}/apps/${appId}/regenerate-token`,
				{
					method: "POST",
					credentials: "include",
				},
			);

			if (response.ok()) {
				const data = response.data;
				setRevealedKeys((prev) => ({ ...prev, serviceToken: data.serviceToken }));
				setShowToken(true);
				showToast("Service Token regenerated successfully", "success");
				setShowRegenerateTokenModal(false);
			} else {
				showToast("Failed to regenerate token", "error");
			}
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error("Error regenerating token:", error);
			}
			showToast("Failed to regenerate token", "error");
		} finally {
			setIsRegenerating(false);
		}
	};

	if (projectLoading || appLoading) {
		return (
			<div className="flex justify-center items-center py-12">
				<Spinner />
			</div>
		);
	}

	if (!project || !app) {
		return <Alert variant="danger">Project or App not found</Alert>;
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
						{project.name}
					</Link>
					/
					<Link to={`/projects/${projectId}/apps/${appId}`}>
						{app.name}
					</Link>
					/
					<Text>API Keys</Text>
				</Breadcrumb>
			</div>

			{/* Page Header */}
			<div className="mb-8">
				<Heading level={1} size="lg">API Keys</Heading>
				<Text className="text-text-secondary">
					Manage your app's API credentials for integration
				</Text>
			</div>

			{/* Warning Banner */}
			<Alert variant="warning" className="mb-6">
				<div className="flex gap-4">
					<Icon icon={IconType.AlertCircle} size={20} className="text-yellow-500 flex-shrink-0" />
					<div>
						<Text className="font-semibold text-text-primary mb-1">
							Keep these keys secure!
						</Text>
						<Text className="text-text-secondary">
							Never expose these keys in client-side code or public repositories. Store them securely as
							environment variables.
						</Text>
					</div>
				</div>
			</Alert>

			{/* App ID Card */}
			<Card className="mb-4">
				<CardBody className="p-6">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<Text className="form-label">
								App ID (Public)
							</Text>
							<code className="code-block">
								{app.id}
							</code>
							<Text className="text-12px text-text-tertiary mt-2">
								This is your public app identifier. Safe to use in client-side code.
							</Text>
						</div>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => handleCopy(app.id, "appId")}
							className="ml-4"
						>
							{copying === "appId" ? "✓ Copied" : "Copy"}
						</Button>
					</div>
				</CardBody>
			</Card>

			{/* Client Secret Card */}
			<Card className="mb-4">
				<CardBody className="p-6">
					<div className="flex items-start justify-between mb-4">
						<div className="flex-1">
							<Text className="form-label">
								Client Secret
							</Text>
							<code className="code-block">
								{showSecret && revealedKeys.clientSecret ? revealedKeys.clientSecret : app.clientSecret}
							</code>
							<Text className="text-12px text-text-tertiary mt-2">
								Used for server-to-server authentication. Keep this secret!
							</Text>
						</div>
						<div className="flex gap-2 ml-4">
							{showSecret && revealedKeys.clientSecret && (
								<Button
									variant="secondary"
									size="sm"
									onClick={() => handleCopy(revealedKeys.clientSecret!, "secret")}
								>
									{copying === "secret" ? "✓ Copied" : "Copy"}
								</Button>
							)}
							<Button
								variant="secondary"
								size="sm"
								onClick={showSecret ? () => setShowSecret(false) : handleRevealKeys}
							>
								{showSecret ? "Hide" : "Reveal"}
							</Button>
						</div>
					</div>
					<Button
						variant="danger"
						size="sm"
						onClick={() => setShowRegenerateSecretModal(true)}
					>
						Regenerate Secret
					</Button>
				</CardBody>
			</Card>

			{/* Service Token Card */}
			<Card className="mb-6">
				<CardBody className="p-6">
					<div className="flex items-start justify-between mb-4">
						<div className="flex-1">
							<Text className="form-label">
								Service Token
							</Text>
							<code className="code-block">
								{showToken && revealedKeys.serviceToken ? revealedKeys.serviceToken : app.serviceToken}
							</code>
							<Text className="text-12px text-text-tertiary mt-2">
								Used for API calls from your backend. Keep this secret!
							</Text>
						</div>
						<div className="flex gap-2 ml-4">
							{showToken && revealedKeys.serviceToken && (
								<Button
									variant="secondary"
									size="sm"
									onClick={() => handleCopy(revealedKeys.serviceToken!, "token")}
								>
									{copying === "token" ? "✓ Copied" : "Copy"}
								</Button>
							)}
							<Button
								variant="secondary"
								size="sm"
								onClick={showToken ? () => setShowToken(false) : handleRevealKeys}
							>
								{showToken ? "Hide" : "Reveal"}
							</Button>
						</div>
					</div>
					<Button
						variant="danger"
						size="sm"
						onClick={() => setShowRegenerateTokenModal(true)}
					>
						Regenerate Token
					</Button>
				</CardBody>
			</Card>

			{/* Integration Guide Link */}
			<Card className="bg-surface-secondary">
				<CardBody className="p-6">
					<div className="flex items-center gap-4 mb-4">
						<Icon icon={IconType.Bookmark} size={24} className="text-primary" />
						<div>
							<Text className="font-semibold text-text-primary mb-1">
								Integration Guide
							</Text>
							<Text className="text-text-tertiary">
								Learn how to integrate Proofa into your application with code examples
							</Text>
						</div>
					</div>
					<Button variant="primary" size="sm" onClick={() => window.location.href = `/projects/${projectId}/apps/${appId}/developers`}>
						View Guide
					</Button>
				</CardBody>
			</Card>

			{/* Regenerate Secret Confirmation Modal with Captcha */}
			<ConfirmModal
				isOpen={showRegenerateSecretModal}
				onClose={() => setShowRegenerateSecretModal(false)}
				onConfirm={handleRegenerateSecret}
				title="Regenerate Client Secret"
				message="⚠️ WARNING: This will break all existing integrations using the current secret. Make sure to update your applications with the new secret immediately."
				confirmText="Regenerate Secret"
				variant="danger"
				requireCaptcha={true}
			/>

			{/* Regenerate Token Confirmation Modal with Captcha */}
			<ConfirmModal
				isOpen={showRegenerateTokenModal}
				onClose={() => setShowRegenerateTokenModal(false)}
				onConfirm={handleRegenerateToken}
				title="Regenerate Service Token"
				message="⚠️ WARNING: This will break all existing integrations using the current token. Make sure to update your backend services with the new token immediately."
				confirmText="Regenerate Token"
				variant="danger"
				requireCaptcha={true}
			/>
		</div>
	);
}
