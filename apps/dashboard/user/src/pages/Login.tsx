import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState<"checking" | "redirecting" | "error">("checking");

	useEffect(() => {
		const error = searchParams.get("error");

		if (error) {
			setStatus("error");
			return;
		}

		setStatus("redirecting");
		// If we reached here without error, redirect to Gateway to start OAuth
		// Gateway handles the entire OAuth flow with Core
		const gatewayAuthUrl = `${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/auth/start?provider=google&return_to=/profile`;
		window.location.href = gatewayAuthUrl;
	}, [searchParams, navigate]);

	const error = searchParams.get("error");

	if (status === "error" && error) {
		return (
			<div className="login-container">
				<div className="login-card">
					<div className="login-icon login-icon-error">
						<svg style={{ width: "32px", height: "32px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<h1 className="login-title">Login Failed</h1>
					<p className="login-subtitle">
						{error === "missing_code" && "Authentication code was missing from the response."}
						{error === "exchange_failed" && "Failed to complete the authentication process."}
						{error === "internal_error" && "An internal server error occurred."}
						{!["missing_code", "exchange_failed", "internal_error"].includes(error) && `Error: ${error}`}
					</p>

					<div className="alert alert-danger" style={{ marginBottom: "24px" }}>
						<svg style={{ width: "20px", height: "20px", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Please try again or contact support if the issue persists.</span>
					</div>

					<button
						type="button"
						onClick={() => {
							setStatus("redirecting");
							const gatewayAuthUrl = `${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/auth/start?provider=google&return_to=/profile`;
							window.location.href = gatewayAuthUrl;
						}}
						className="btn btn-primary w-full"
					>
						<svg style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="currentColor">
							<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
							<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
							<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
							<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
						</svg>
						Try Again with Google
					</button>

					<p className="login-footer">
						Having trouble? <a href="mailto:support@proofa.io">Contact support</a>
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="login-container">
			<div className="login-card">
				<div className="login-icon">
					<svg style={{ width: "32px", height: "32px", color: "white" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
				</div>

				<h1 className="login-title">Welcome to Proofa</h1>
				<p className="login-subtitle">
					{status === "checking" && "Checking authentication..."}
					{status === "redirecting" && "Redirecting to Google sign-in..."}
				</p>

				{/* Loading Animation */}
				<div className="login-loading">
					<div className="spinner" />
					<div className="login-loading-text">
						<svg style={{ width: "16px", height: "16px", opacity: 0.7 }} viewBox="0 0 24 24" fill="currentColor">
							<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
							<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
							<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
							<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
						</svg>
						<span>Connecting to Google...</span>
					</div>
				</div>

				<p className="login-terms">
					By continuing, you agree to our Terms of Service and Privacy Policy
				</p>
			</div>
		</div>
	);
}
