import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon, IconType } from "@proofa/components";
import { pingpong } from "../lib/pingpong";

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState<"idle" | "checking" | "redirecting" | "error">("checking");
	const homeUrl = import.meta.env.VITE_HOME_URL || "http://localhost:4321";

	useEffect(() => {
		const error = searchParams.get("error");

		if (error) {
			setStatus("error");
			return;
		}

		// Check if already authenticated
		const checkAuth = async () => {
			try {
				const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";
				const res = await pingpong(`${gatewayUrl}/v1/auth/status`, { credentials: "include" });
				if (res.ok) {
					const data = await res.json();
					if (data.loggedIn) {
						navigate("/profile", { replace: true });
						return;
					}
				}
			} catch {
				// Not authenticated
			}
			setStatus("idle");
		};

		checkAuth();
	}, [searchParams, navigate]);

	const handleGoogleLogin = () => {
		setStatus("redirecting");
		const gatewayAuthUrl = `${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/auth/start?provider=google&return_to=/profile`;
		window.location.href = gatewayAuthUrl;
	};

	const error = searchParams.get("error");

	if (status === "error" && error) {
		return (
			<div className="login-container">
				<div className="login-card">
					<div className="w-14 h-14 bg-danger-bg text-danger rounded-lg flex items-center justify-center mx-auto mb-5">
						<Icon icon={IconType.AlertCircle} size={32} className="text-danger" />
					</div>
					<h1 className="login-title">Login Failed</h1>
					<p className="login-subtitle">
						{error === "missing_code" && "Authentication code was missing from the response."}
						{error === "exchange_failed" && "Failed to complete the authentication process."}
						{error === "internal_error" && "An internal server error occurred."}
						{!["missing_code", "exchange_failed", "internal_error"].includes(error) && `Error: ${error}`}
					</p>

					<div className="alert-danger mb-6">
						<Icon icon={IconType.AlertCircle} size={20} className="shrink-0" />
						<span>Please try again or contact support if the issue persists.</span>
					</div>

					<button
						type="button"
						onClick={handleGoogleLogin}
						className="btn-google"
					>
						<Icon icon={IconType.Google} size={20} />
						Continue with Google
					</button>
				</div>
			</div>
		);
	}

	if (status === "checking") {
		return (
			<div className="login-container">
				<div className="login-card">
					<img
						src="/favicon.png"
						alt="Proofa"
						className="w-12 h-12 mx-auto mb-4"
					/>
					<h1 className="login-title">Welcome to Proofa</h1>
					<div className="login-loading">
						<div className="spinner" />
					</div>
				</div>
			</div>
		);
	}

	if (status === "redirecting") {
		return (
			<div className="login-container">
				<div className="login-card">
					<img
						src="/favicon.png"
						alt="Proofa"
						className="w-12 h-12 mx-auto mb-4"
					/>
					<h1 className="login-title">Welcome to Proofa</h1>
					<p className="login-subtitle">Redirecting to Google sign-in...</p>
					<div className="login-loading">
						<div className="spinner" />
						<div className="login-loading-text">
							<Icon icon={IconType.Google} size={16} />
							<span>Connecting to Google...</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Default: Show login page with Sign in button
	return (
		<div className="login-container">
			<div className="login-card">
				<img src="/favicon.png" alt="Proofa" className="w-12 h-12 mx-auto mb-4" />

				<h1 className="login-title">Welcome to Proofa</h1>
				<p className="login-subtitle">Sign in to manage your account and sessions</p>

				<button
					type="button"
					onClick={handleGoogleLogin}
					className="btn-google"
				>
					<Icon icon={IconType.Google} size={20} />
					Continue with Google
				</button>

				<p className="login-terms">
					By continuing, you agree to our{" "}
					<a href={`${homeUrl}/terms`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
						Terms of Service
					</a>{" "}
					and{" "}
					<a href={`${homeUrl}/privacy`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
						Privacy Policy
					</a>
				</p>
			</div>
		</div>
	);
}
