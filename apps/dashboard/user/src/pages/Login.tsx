import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
			<div className="min-h-screen flex items-center justify-center p-5 bg-gray-100">
				<div className="w-full max-w-md bg-white rounded-xl shadow-xl p-10 text-center">
					<div className="w-14 h-14 bg-red-100 text-red-500 rounded-lg flex items-center justify-center mx-auto mb-5">
						<svg
							className="w-8 h-8"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<h1 className="text-xl font-semibold text-gray-900 mb-2">Login Failed</h1>
					<p className="text-sm text-gray-600 mb-6">
						{error === "missing_code" && "Authentication code was missing from the response."}
						{error === "exchange_failed" && "Failed to complete the authentication process."}
						{error === "internal_error" && "An internal server error occurred."}
						{!["missing_code", "exchange_failed", "internal_error"].includes(error) && `Error: ${error}`}
					</p>

					<div className="flex items-start gap-3 px-4 py-3 rounded-md mb-6 bg-red-50 text-red-700 text-sm">
						<svg
							className="w-5 h-5 shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>Please try again or contact support if the issue persists.</span>
					</div>

					<button
						type="button"
						onClick={handleGoogleLogin}
						className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-500 text-white rounded-md font-medium text-sm hover:bg-blue-600 transition-colors"
					>
						<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
							<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
							<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
							<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
							<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
						</svg>
						Try Again with Google
					</button>

					<p className="text-xs text-gray-500 mt-6">
						Having trouble? <a href="mailto:support@proofa.io" className="text-blue-500">Contact support</a>
					</p>
				</div>
			</div>
		);
	}

	if (status === "checking") {
		return (
			<div className="min-h-screen flex items-center justify-center p-5 bg-gray-100">
				<div className="w-full max-w-md bg-white rounded-xl shadow-xl p-10 text-center">
					<img
						src="/favicon.png"
						alt="Proofa"
						className="w-12 h-12 mx-auto mb-4"
					/>
					<h1 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Proofa</h1>
					<div className="flex flex-col items-center gap-4 py-8">
						<div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
					</div>
				</div>
			</div>
		);
	}

	if (status === "redirecting") {
		return (
			<div className="min-h-screen flex items-center justify-center p-5 bg-gray-100">
				<div className="w-full max-w-md bg-white rounded-xl shadow-xl p-10 text-center">
					<img
						src="/favicon.png"
						alt="Proofa"
						className="w-12 h-12 mx-auto mb-4"
					/>
					<h1 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Proofa</h1>
					<p className="text-sm text-gray-600 mb-6">Redirecting to Google sign-in...</p>
					<div className="flex flex-col items-center gap-4 py-8">
						<div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<svg
								className="w-4 h-4 opacity-70"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
								<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
								<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
								<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
							</svg>
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

				<p className="login-terms">
					By continuing, you agree to our{" "}
					<a href={`${homeUrl}/terms`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
						Terms of Service
					</a>{" "}
					and{" "}
					<a href={`${homeUrl}/privacy`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
						Privacy Policy
					</a>
				</p>
			</div>
		</div>
	);
}
