import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pingpong } from "../lib/pingpong";
import { Icon, IconType } from "@proofa/components";

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState<"idle" | "checking" | "redirecting" | "processing" | "error">("checking");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const homeUrl = import.meta.env.VITE_HOME_URL || "http://localhost:4321";

	useEffect(() => {
		const handleAuth = async () => {
			// Check for OAuth error
			const error = searchParams.get("error");
			if (error) {
				setStatus("error");
				setErrorMessage(`Authentication failed: ${error}`);
				return;
			}

			// Check for OAuth callback code (Core returns session ID as "code")
			const code = searchParams.get("code");
			if (code) {
				setStatus("processing");
				try {
					// Exchange the code with Core via our backend
					const res = await pingpong("/api/auth/login", {
						method: "POST",
						credentials: "include",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ coreSessionId: code, audience: "admin" }),
					});

					if (res.ok) {
						// Check if there's an invitation code to accept
						const inviteCode = searchParams.get("invite");
						if (inviteCode) {
							try {
								const inviteRes = await pingpong(`/api/admin/invitations/${inviteCode}/accept`, {
									method: "POST",
									credentials: "include",
								});

								if (inviteRes.ok) {
									const inviteData = await inviteRes.json();
									// Redirect to the project they were invited to
									if (inviteData.project?.id) {
										navigate(`/projects/${inviteData.project.id}`, { replace: true });
										return;
									}
								}
							} catch (inviteErr) {
								console.error("Failed to accept invitation:", inviteErr);
								// Continue to projects page even if invitation acceptance fails
							}
						}

						navigate("/projects", { replace: true });
						return;
					}

					const data = await res.json().catch(() => ({}));
					setStatus("error");
					setErrorMessage(data.error || "Failed to complete login");
					return;
				} catch (err) {
					console.error("Login exchange error:", err);
					setStatus("error");
					setErrorMessage("Failed to complete login");
					return;
				}
			}

			// Check if already authenticated before showing login
			try {
				const statusRes = await pingpong("/api/auth/status?audience=admin", { credentials: "include" });
				if (statusRes.ok) {
					const statusData = (await statusRes.json()) as { loggedIn?: boolean };
					if (!statusData.loggedIn) {
						setStatus("idle");
						return;
					}
				}

				// Session exists - now fetch admin profile
				const meRes = await pingpong("/api/admin/me", { credentials: "include" });
				if (meRes.ok) {
					// Already logged in - check for invitation code
					const inviteCode = searchParams.get("invite");
					if (inviteCode) {
						try {
							const inviteRes = await pingpong(`/api/admin/invitations/${inviteCode}/accept`, {
								method: "POST",
								credentials: "include",
							});

							if (inviteRes.ok) {
								const inviteData = await inviteRes.json();
								// Redirect to the project they were invited to
								if (inviteData.project?.id) {
									navigate(`/projects/${inviteData.project.id}`, { replace: true });
									return;
								}
							}
						} catch (inviteErr) {
							console.error("Failed to accept invitation:", inviteErr);
							// Continue to projects page even if invitation acceptance fails
						}
					}

					// Already logged in, redirect to projects
					navigate("/projects", { replace: true });
					return;
				}
			} catch {
				// Not authenticated
			}

			// Not authenticated - show login page
			setStatus("idle");
		};

		handleAuth();
	}, [searchParams, navigate]);

	const handleGoogleLogin = () => {
		setStatus("redirecting");
		// Preserve invite code in return_to parameter
		const inviteCode = searchParams.get("invite");
		const returnTo = inviteCode ? `/login?invite=${inviteCode}` : "/login";
		const gatewayAuthUrl = `${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/auth/start?provider=google&audience=admin&return_to=${encodeURIComponent(returnTo)}&invite=${encodeURIComponent(inviteCode || "")}`;
		window.location.href = gatewayAuthUrl;
	};

	return (
		<div className="login-page">
			{/* Login Card */}
			<div className="login-card">
				{/* Header with branding */}
				<div className="login-header">
					<img src="/favicon.png" alt="Proofa" className="login-logo" />
					<h1 className="login-brand-title">Proofa Admin</h1>
					<p className="login-brand-subtitle">Sign in to access the admin console</p>
				</div>

				{/* Body */}
				<div className="login-body">
					<h2 className="login-title">
						{status === "error" ? "Login Failed" : "Sign in to continue"}
					</h2>
					<p className="login-description">
						{status === "error"
							? errorMessage
							: status === "checking"
								? "Verifying your authentication..."
								: status === "redirecting"
									? "Redirecting to Google..."
									: status === "processing"
										? "Completing sign in..."
										: "Use your Google account to access the admin console"}
					</p>

					{status === "checking" || status === "processing" || status === "redirecting" ? (
						<div className="login-loading">
							<div className="login-spinner" />
						</div>
					) : (
						<>
							<button
								type="button"
								onClick={handleGoogleLogin}
								className="login-btn-google"
							>
								<Icon icon={IconType.Google} size={18} />
								Continue with Google
							</button>

							<p className="login-footer">
								By continuing, you agree to our{" "}
								<a href={`${homeUrl}/terms`} target="_blank" rel="noopener noreferrer">Terms of Service</a>
								{" "}and{" "}
								<a href={`${homeUrl}/privacy`} target="_blank" rel="noopener noreferrer">Privacy Policy</a>
							</p>
						</>
					)}
				</div>
			</div>

			{/* Security Badge */}
			<div className="login-security">
				<Icon icon={IconType.Lock} size={14} />
				<span>Secure authentication powered by Proofa</span>
			</div>
		</div>
	);
}
