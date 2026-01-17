import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pingpong } from "../lib/pingpong";

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
		<div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-surface-primary via-surface-secondary to-surface-primary">
			<div className="w-full max-w-420px">
				{/* Logo & Branding */}
				<div className="text-center mb-8">
					<img
						src="/favicon.png"
						alt="Proofa"
						className="w-16 h-16 mx-auto mb-5 block"
					/>
					<h1 className="text-28px font-bold text-white mb-2">
						Proofa Admin
					</h1>
					<p className="text-15px text-text-tertiary">Sign in to access the admin console</p>
				</div>

				{/* Login Card */}
				<div className="card p-8 bg-card-bg border border-card-border">
					{status === "error" ? (
						<div className="text-center">
							<div className="w-14 h-14 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-5">
								<svg
									className="w-7 h-7 text-danger"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</div>
							<h2 className="text-18px font-semibold text-text-primary mb-2">
								Login Failed
							</h2>
							<p className="text-14px text-text-secondary mb-6">
								{errorMessage}
							</p>
							<button
								type="button"
								onClick={handleGoogleLogin}
								className="btn btn-primary w-full"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								Try Again
							</button>
						</div>
					) : status === "checking" || status === "processing" || status === "redirecting" ? (
						<div className="text-center">
							<div className="spinner mx-auto mb-5 w-8 h-8" />
							<h2 className="text-18px font-semibold text-text-primary mb-2">
								{status === "checking" && "Checking authentication..."}
								{status === "redirecting" && "Redirecting to Google..."}
								{status === "processing" && "Completing sign in..."}
							</h2>
							<p className="text-14px text-text-secondary">Please wait a moment</p>
						</div>
					) : (
						<div className="text-center">
							<h2 className="text-18px font-semibold text-text-primary mb-2">
								Sign in to continue
							</h2>
							<p className="text-14px text-text-secondary mb-6">
								Use your Google account to access the admin console
							</p>
							<button
								type="button"
								onClick={handleGoogleLogin}
								className="btn-google"
							>
								<svg className="w-5 h-5" viewBox="0 0 24 24">
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
								Continue with Google
							</button>
							<p className="text-12px text-text-tertiary mt-4">
								By continuing, you agree to our{" "}
								<a
									href={`${homeUrl}/terms`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-primary underline"
								>
									Terms of Service
								</a>{" "}
								and{" "}
								<a
									href={`${homeUrl}/privacy`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-primary underline"
								>
									Privacy Policy
								</a>
							</p>
						</div>
					)}
				</div>

				{/* Security Badge */}
				<div className="flex items-center justify-center gap-2 mt-6">
					<svg
						className="w-3.5 h-3.5 text-text-tertiary"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						/>
					</svg>
					<span className="text-13px text-text-tertiary">Secure authentication powered by Proofa</span>
				</div>
			</div>
		</div>
	);
}
