import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState<"checking" | "redirecting" | "processing" | "error">("checking");
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

			// Check if already authenticated before redirecting
			try {
				const meRes = await fetch("/api/me", { credentials: "include" });
				if (meRes.ok) {
					// Already logged in, redirect to projects
					navigate("/projects", { replace: true });
					return;
				}
			} catch {
				// Not authenticated, continue to OAuth
			}

			// No code and not authenticated - redirect to OAuth
			setStatus("redirecting");
			const coreAuthUrl = `${import.meta.env.VITE_CORE_URL || "http://localhost:3003"}/v1/auth/start?provider=google&redirect_uri=${encodeURIComponent(`${window.location.origin}/login`)}`;
			window.location.href = coreAuthUrl;
		};

		handleAuth();
	}, [searchParams, navigate]);

	const handleRetry = () => {
		setStatus("redirecting");
		setErrorMessage(null);
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
					<div style={{
						width: "72px",
						height: "72px",
						background: "linear-gradient(135deg, var(--primary), #8b5cf6)",
						borderRadius: "16px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						margin: "0 auto 20px",
						boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)"
					}}>
						<svg style={{ width: "36px", height: "36px", color: "white" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
						</svg>
					</div>
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
								onClick={handleRetry}
								className="btn btn-primary"
								style={{ width: "100%" }}
							>
								<svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Try Again
							</button>
						</div>
					) : (
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
