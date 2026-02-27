import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
	IconBox,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
} from "@proofa/components";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useApp, useProject } from "../hooks/api";
import { pingpong } from "../lib/pingpong";

export function AppApiKeysPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
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
						<BreadcrumbButton render={<Link to={`/projects/${projectId}/apps/${appId}`} />}>{app.name}</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton active>API Keys</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Page Header */}
			<div>
				<Heading level={1} size="lg">API Keys</Heading>
				<Text className="text-muted-foreground mt-1">
					Manage your app's API credentials for integration
				</Text>
			</div>

			{/* Warning Banner */}
			<Alert variant="warning">
				<Icon icon={IconType.AlertCircle} size={20} />
				<div>
					<Text className="font-semibold mb-1">
						Keep these keys secure!
					</Text>
					<Text className="text-muted-foreground text-sm">
						Never expose these keys in client-side code or public repositories. Store them securely as
						environment variables.
					</Text>
				</div>
			</Alert>

			{/* App ID Card */}
			<Card>
				<CardBody>
					<Text className="text-sm font-semibold text-muted-foreground mb-2">
						App ID (Public)
					</Text>
					<code className="block w-full rounded-lg bg-muted/30 px-4 py-3 font-mono text-sm text-foreground break-all">
						{app.id}
					</code>
					<Text className="text-xs text-muted-foreground mt-2">
						This is your public app identifier. Safe to use in client-side code.
					</Text>
					<div className="flex gap-2 mt-4">
						<Button
							variant="secondary"
							size="sm"
							onClick={() => handleCopy(app.id, "appId")}
						>
							{copying === "appId" ? "✓ Copied" : "Copy"}
						</Button>
					</div>
				</CardBody>
			</Card>

			{/* Client Secret Card */}
			<Card>
				<CardBody>
					<Text className="text-sm font-semibold text-muted-foreground mb-2">
						Client Secret
					</Text>
					<code className="block w-full rounded-lg bg-muted/30 px-4 py-3 font-mono text-sm text-foreground break-all">
						{showSecret && revealedKeys.clientSecret ? revealedKeys.clientSecret : app.clientSecret}
					</code>
					<Text className="text-xs text-muted-foreground mt-2">
						Used for server-to-server authentication. Keep this secret!
					</Text>
					<div className="flex gap-2 mt-4">
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
						<Button
							variant="danger"
							size="sm"
							onClick={() => setShowRegenerateSecretModal(true)}
						>
							Regenerate Secret
						</Button>
					</div>
				</CardBody>
			</Card>

			{/* Service Token Card */}
			<Card>
				<CardBody>
					<Text className="text-sm font-semibold text-muted-foreground mb-2">
						Service Token
					</Text>
					<code className="block w-full rounded-lg bg-muted/30 px-4 py-3 font-mono text-sm text-foreground break-all">
						{showToken && revealedKeys.serviceToken ? revealedKeys.serviceToken : app.serviceToken}
					</code>
					<Text className="text-xs text-muted-foreground mt-2">
						Used for API calls from your backend. Keep this secret!
					</Text>
					<div className="flex gap-2 mt-4">
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
						<Button
							variant="danger"
							size="sm"
							onClick={() => setShowRegenerateTokenModal(true)}
						>
							Regenerate Token
						</Button>
					</div>
				</CardBody>
			</Card>

			{/* Integration Guide Link */}
			<Card className="bg-muted/20">
				<CardBody>
					<div className="flex items-center gap-4 mb-4">
						<IconBox variant="primary-subtle" size="lg">
							<Icon icon={IconType.Bookmark} size={22} />
						</IconBox>
						<div>
							<Text className="font-semibold mb-1">
								Integration Guide
							</Text>
							<Text className="text-muted-foreground text-sm">
								Learn how to integrate Proofa into your application with code examples
							</Text>
						</div>
					</div>
					<Button variant="primary" size="sm" onClick={() => navigate(`/projects/${projectId}/apps/${appId}/developers`)}>
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
