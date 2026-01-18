import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pingpong } from "../lib/pingpong";
import { Icon, IconType } from "@proofa/components";
import {
	Cancel01Icon,
	RotateClockwiseIcon,
	LockIcon,
} from "@hugeicons/core-free-icons";

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
			<div className="w-full max-w-460px">
				{/* Logo & Branding */}
				<div className="text-center mb-10">
					<img
						src="/favicon.png"
						alt="Proofa"
						className="w-20 h-20 mx-auto mb-6 block"
					/>
					<h1 className="text-32px font-bold text-white mb-3">
						Proofa Admin
					</h1>
					<p className="text-16px text-text-secondary">Sign in to access the admin console</p>
				</div>

				{/* Login Card */}
				<div className="card p-10 bg-card-bg border border-card-border rounded-xl">
					{status === "error" ? (
						<div className="text-center">
							<div className="w-16 h-16 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-6">
								<Icon icon={Cancel01Icon} size={32} bold className="text-danger" />
							</div>
							<h2 className="text-20px font-semibold text-text-primary mb-3">
								Login Failed
							</h2>
							<p className="text-15px text-text-secondary mb-8">
								{errorMessage}
							</p>
							<button
								type="button"
								onClick={handleGoogleLogin}
								className="btn btn-primary w-full"
							>
								<Icon icon={RotateClockwiseIcon} size={16} />
								Try Again
							</button>
						</div>
					) : status === "checking" || status === "processing" || status === "redirecting" ? (
						<div className="text-center py-4">
							<div className="spinner mx-auto mb-6" style={{ width: '40px', height: '40px' }} />
							<h2 className="text-20px font-semibold text-text-primary mb-3">
								{status === "checking" && "Checking authentication..."}
								{status === "redirecting" && "Redirecting to Google..."}
								{status === "processing" && "Completing sign in..."}
							</h2>
							<p className="text-15px text-text-secondary">Please wait a moment</p>
						</div>
					) : (
						<div className="text-center">
							<h2 className="text-20px font-semibold text-text-primary mb-3">
								Sign in to continue
							</h2>
							<p className="text-15px text-text-secondary mb-8">
								Use your Google account to access the admin console
							</p>
							<button
								type="button"
								onClick={handleGoogleLogin}
								className="btn-google"
							>
								<Icon icon={IconType.Google} size={20} />
								Continue with Google
							</button>
							<p className="text-13px text-text-tertiary mt-6 leading-relaxed">
								By continuing, you agree to our{" "}
								<a
									href={`${homeUrl}/terms`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-primary hover:underline"
								>
									Terms of Service
								</a>{" "}
								and{" "}
								<a
									href={`${homeUrl}/privacy`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-primary hover:underline"
								>
									Privacy Policy
								</a>
							</p>
						</div>
					)}
				</div>

				{/* Security Badge */}
				<div className="flex items-center justify-center gap-2 mt-8">
					<Icon icon={LockIcon} size={16} className="text-text-tertiary" />
					<span className="text-14px text-text-tertiary">Secure authentication powered by Proofa</span>
				</div>
			</div>
		</div>
	);
}
