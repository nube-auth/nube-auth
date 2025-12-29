import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp, useProject } from "../hooks/api";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

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
	const [isRegenerating, setIsRegenerating] = useState(false);
	const { showToast } = useToast();

	const handleRevealKeys = async () => {
		try {
			const response = await fetch(
				`/api/admin/projects/${projectId}/apps/${appId}/api-keys`,
				{
					credentials: "include",
				}
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
			const response = await fetch(
				`/api/admin/projects/${projectId}/apps/${appId}/regenerate-secret`,
				{
					method: "POST",
					credentials: "include",
				}
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
			const response = await fetch(
				`/api/admin/projects/${projectId}/apps/${appId}/regenerate-token`,
				{
					method: "POST",
					credentials: "include",
				}
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
			<div style={{ marginBottom: "24px" }}>
				<div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
					<Link to="/projects" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						Projects
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}`} style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						{project.name}
					</Link>
					<span>›</span>
					<Link to={`/projects/${projectId}/apps/${appId}`} style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						{app.name}
					</Link>
					<span>›</span>
					<span style={{ color: "var(--text-primary)" }}>API Keys</span>
				</div>
			</div>

			{/* Page Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
				<div>
					<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>API Keys</h1>
					<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
						Manage your app's API credentials for integration
					</p>
				</div>
			</div>

			{/* Warning Banner */}
			<div style={{
				padding: "16px",
				background: "rgba(251, 191, 36, 0.1)",
				border: "1px solid rgba(251, 191, 36, 0.3)",
				borderRadius: "8px",
				marginBottom: "24px",
				display: "flex",
				gap: "12px",
			}}>
				<svg style={{ width: "20px", height: "20px", color: "#fbbf24", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				<div>
					<div style={{ fontWeight: "600", color: "#fbbf24", marginBottom: "4px" }}>Keep these keys secure!</div>
					<div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
						Never expose these keys in client-side code or public repositories. Store them securely as environment variables.
					</div>
				</div>
			</div>

			{/* App ID Card */}
			<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
				<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
					<div style={{ flex: 1 }}>
						<div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
							App ID (Public)
						</div>
						<code style={{
							display: "block",
							padding: "12px 16px",
							background: "var(--surface-secondary)",
							borderRadius: "8px",
							fontSize: "14px",
							fontFamily: "monospace",
							color: "var(--text-primary)",
							wordBreak: "break-all",
						}}>
							{app.id}
						</code>
						<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "8px" }}>
							This is your public app identifier. Safe to use in client-side code.
						</p>
					</div>
					<button
						type="button"
						onClick={() => handleCopy(app.id, "appId")}
						className="btn btn-secondary-outline btn-sm"
						style={{ marginLeft: "16px" }}
					>
						{copying === "appId" ? "✓ Copied" : "Copy"}
					</button>
				</div>
			</div>

			{/* Client Secret Card */}
			<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
				<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
					<div style={{ flex: 1 }}>
						<div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
							Client Secret
						</div>
						<code style={{
							display: "block",
							padding: "12px 16px",
							background: "var(--surface-secondary)",
							borderRadius: "8px",
							fontSize: "14px",
							fontFamily: "monospace",
							color: "var(--text-primary)",
							wordBreak: "break-all",
						}}>
							{showSecret && revealedKeys.clientSecret ? revealedKeys.clientSecret : app.clientSecret}
						</code>
						<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "8px" }}>
							Used for server-to-server authentication. Keep this secret!
						</p>
					</div>
					<div style={{ display: "flex", gap: "8px", marginLeft: "16px" }}>
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
			<div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
				<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
					<div style={{ flex: 1 }}>
						<div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
							Service Token
						</div>
						<code style={{
							display: "block",
							padding: "12px 16px",
							background: "var(--surface-secondary)",
							borderRadius: "8px",
							fontSize: "14px",
							fontFamily: "monospace",
							color: "var(--text-primary)",
							wordBreak: "break-all",
						}}>
							{showToken && revealedKeys.serviceToken ? revealedKeys.serviceToken : app.serviceToken}
						</code>
						<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "8px" }}>
							Used for API calls from your backend. Keep this secret!
						</p>
					</div>
					<div style={{ display: "flex", gap: "8px", marginLeft: "16px" }}>
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
			<div className="card" style={{ padding: "24px", background: "var(--surface-secondary)" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
					<svg style={{ width: "24px", height: "24px", color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
					<div style={{ flex: 1 }}>
						<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
							Integration Guide
						</div>
						<div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
							Learn how to integrate Proofa into your application with code examples
						</div>
					</div>
					<Link
						to={`/projects/${projectId}/apps/${appId}/developers`}
						className="btn btn-primary btn-sm"
					>
						View Guide
					</Link>
				</div>
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
				isLoading={isRegenerating}
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
				isLoading={isRegenerating}
			/>
		</div>
	);
}
