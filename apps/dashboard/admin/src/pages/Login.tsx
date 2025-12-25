import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState<"idle" | "checking" | "redirecting" | "processing" | "error">("checking");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
					const res = await fetch("/api/auth/login", {
						method: "POST",
						credentials: "include",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ coreSessionId: code }),
					});

					if (res.ok) {
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
				const meRes = await fetch("/api/me", { credentials: "include" });
				if (meRes.ok) {
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
		const coreAuthUrl = `${import.meta.env.VITE_CORE_URL || "http://localhost:3003"}/v1/auth/start?provider=google&redirect_uri=${encodeURIComponent(`${window.location.origin}/login`)}`;
		window.location.href = coreAuthUrl;
	};

	return (
		<div style={{
			minHeight: "100vh",
			background: "linear-gradient(135deg, #0f1117 0%, #1a1d27 50%, #0f1117 100%)",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			padding: "24px"
		}}>
			<div style={{ width: "100%", maxWidth: "420px" }}>
				{/* Logo & Branding */}
				<div style={{ textAlign: "center", marginBottom: "32px" }}>
					<img 
						src="/favicon.png" 
						alt="Proofa" 
						style={{
							width: "64px",
							height: "64px",
							margin: "0 auto 20px",
							display: "block"
						}}
					/>
					<h1 style={{ fontSize: "28px", fontWeight: "700", color: "white", marginBottom: "8px" }}>
						Proofa Admin
					</h1>
					<p style={{ color: "#9ca3af", fontSize: "15px" }}>
						Sign in to access the admin console
					</p>
				</div>

				{/* Login Card */}
				<div className="card" style={{ padding: "32px", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
					{status === "error" ? (
						<div style={{ textAlign: "center" }}>
							<div style={{
								width: "56px",
								height: "56px",
								background: "var(--danger-bg)",
								borderRadius: "50%",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								margin: "0 auto 20px"
							}}>
								<svg style={{ width: "28px", height: "28px", color: "var(--danger)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</div>
							<h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
								Login Failed
							</h2>
							<p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
								{errorMessage}
							</p>
							<button
								type="button"
								onClick={handleGoogleLogin}
								className="btn btn-primary"
								style={{ width: "100%" }}
							>
								<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Try Again
							</button>
						</div>
					) : status === "checking" || status === "processing" || status === "redirecting" ? (
						<div style={{ textAlign: "center" }}>
							<div className="spinner" style={{ margin: "0 auto 20px", width: "32px", height: "32px" }} />
							<h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
								{status === "checking" && "Checking authentication..."}
								{status === "redirecting" && "Redirecting to Google..."}
								{status === "processing" && "Completing sign in..."}
							</h2>
							<p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
								Please wait a moment
							</p>
						</div>
					) : (
						<div style={{ textAlign: "center" }}>
							<h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
								Sign in to continue
							</h2>
							<p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
								Use your Google account to access the admin console
							</p>
							<button
								type="button"
								onClick={handleGoogleLogin}
								className="btn"
								style={{ 
									width: "100%",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "12px",
									padding: "12px 20px",
									background: "white",
									color: "#374151",
									border: "1px solid #e5e7eb",
									borderRadius: "8px",
									fontSize: "15px",
									fontWeight: "500",
									cursor: "pointer",
									transition: "all 0.2s"
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = "#f9fafb";
									e.currentTarget.style.borderColor = "#d1d5db";
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = "white";
									e.currentTarget.style.borderColor = "#e5e7eb";
								}}
							>
								<svg style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24">
									<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
									<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
									<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
									<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
								</svg>
								Continue with Google
							</button>
							<p style={{ color: "#6b7280", fontSize: "12px", marginTop: "16px" }}>
								By continuing, you agree to our Terms of Service and Privacy Policy
							</p>
						</div>
					)}
				</div>

				{/* Security Badge */}
				<div style={{ 
					display: "flex", 
					alignItems: "center", 
					justifyContent: "center", 
					gap: "8px",
					marginTop: "24px" 
				}}>
					<svg style={{ width: "14px", height: "14px", color: "#6b7280" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
					<span style={{ color: "#6b7280", fontSize: "13px" }}>
						Secure authentication powered by Proofa
					</span>
				</div>
			</div>
		</div>
	);
}
