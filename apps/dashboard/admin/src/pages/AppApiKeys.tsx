import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon, IconType } from "@proofa/components";
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

			if (response.ok) {
				const keys = await response.json();
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

			if (response.ok) {
				const data = await response.json();
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

			if (response.ok) {
				const data = await response.json();
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
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project || !app) {
		return <div className="error-state">Project or App not found</div>;
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
						{project.name}
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}/apps/${appId}`}
						className="breadcrumb-link"
					>
						{app.name}
					</Link>
					<span>›</span>
					<span className="text-text-primary">API Keys</span>
				</div>
			</div>

			{/* Page Header */}
			<div className="page-header mb-8">
				<div>
					<h1 className="page-title">API Keys</h1>
					<p className="text-14px text-text-tertiary">
						Manage your app's API credentials for integration
					</p>
				</div>
			</div>

			{/* Warning Banner */}
			<div className="card-warning mb-6">
				<div className="flex gap-4">
					<Icon icon={IconType.AlertCircle} size={20} className="text-yellow-500 flex-shrink-0" />
					<div>
						<div className="font-semibold text-text-primary">
							Keep these keys secure!
						</div>
						<div className="text-13px text-text-secondary">
							Never expose these keys in client-side code or public repositories. Store them securely as
							environment variables.
						</div>
					</div>
				</div>
			</div>

			{/* App ID Card */}
			<div className="card p-6 mb-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="form-label">
							App ID (Public)
						</div>
						<code className="code-block">
							{app.id}
						</code>
						<p className="text-12px text-text-tertiary mt-2">
							This is your public app identifier. Safe to use in client-side code.
						</p>
					</div>
					<button
						type="button"
						onClick={() => handleCopy(app.id, "appId")}
						className="btn btn-secondary-outline btn-sm ml-4"
					>
						{copying === "appId" ? "✓ Copied" : "Copy"}
					</button>
				</div>
			</div>

			{/* Client Secret Card */}
			<div className="card p-6 mb-4">
				<div className="flex items-start justify-between mb-4">
					<div className="flex-1">
						<div className="form-label">
							Client Secret
						</div>
						<code className="code-block">
							{showSecret && revealedKeys.clientSecret ? revealedKeys.clientSecret : app.clientSecret}
						</code>
						<p className="text-12px text-text-tertiary mt-2">
							Used for server-to-server authentication. Keep this secret!
						</p>
					</div>
					<div className="flex gap-2 ml-4">
						{showSecret && revealedKeys.clientSecret && (
							<button
								type="button"
								onClick={() => handleCopy(revealedKeys.clientSecret!, "secret")}
								className="btn btn-secondary-outline btn-sm"
							>
								{copying === "secret" ? "✓ Copied" : "Copy"}
							</button>
						)}
						<button
							type="button"
							onClick={showSecret ? () => setShowSecret(false) : handleRevealKeys}
							className="btn btn-secondary-outline btn-sm"
						>
							{showSecret ? "Hide" : "Reveal"}
						</button>
					</div>
				</div>
				<button
					type="button"
					onClick={() => setShowRegenerateSecretModal(true)}
					className="btn btn-danger-outline btn-sm"
				>
					Regenerate Secret
				</button>
			</div>

			{/* Service Token Card */}
			<div className="card p-6 mb-6">
				<div className="flex items-start justify-between mb-4">
					<div className="flex-1">
						<div className="form-label">
							Service Token
						</div>
						<code className="code-block">
							{showToken && revealedKeys.serviceToken ? revealedKeys.serviceToken : app.serviceToken}
						</code>
						<p className="text-12px text-text-tertiary mt-2">
							Used for API calls from your backend. Keep this secret!
						</p>
					</div>
					<div className="flex gap-2 ml-4">
						{showToken && revealedKeys.serviceToken && (
							<button
								type="button"
								onClick={() => handleCopy(revealedKeys.serviceToken!, "token")}
								className="btn btn-secondary-outline btn-sm"
							>
								{copying === "token" ? "✓ Copied" : "Copy"}
							</button>
						)}
						<button
							type="button"
							onClick={showToken ? () => setShowToken(false) : handleRevealKeys}
							className="btn btn-secondary-outline btn-sm"
						>
							{showToken ? "Hide" : "Reveal"}
						</button>
					</div>
				</div>
				<button
					type="button"
					onClick={() => setShowRegenerateTokenModal(true)}
					className="btn btn-danger-outline btn-sm"
				>
					Regenerate Token
				</button>
			</div>

			{/* Integration Guide Link */}
			<div className="card p-6 bg-surface-secondary">
				<div className="flex items-center gap-4 mb-4">
					<Icon icon={IconType.Bookmark} size={24} className="text-primary" />
					<div>
						<div className="font-semibold text-text-primary">
							Integration Guide
						</div>
						<div className="text-13px text-text-tertiary">
							Learn how to integrate Proofa into your application with code examples
						</div>
					</div>
				</div>
				<Link to={`/projects/${projectId}/apps/${appId}/developers`} className="btn btn-primary btn-sm">
					View Guide
				</Link>
			</div>

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
