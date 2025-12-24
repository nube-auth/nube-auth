import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	useEffect(() => {
		const error = searchParams.get("error");

		if (error) {
			// Show error message - OAuth failed
			console.error("Login error:", error);
			return;
		}

		// If we reached here without error, redirect to Gateway to start OAuth
		// Gateway handles the entire OAuth flow with Core
		const gatewayAuthUrl = `${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/auth/start?provider=google&return_to=/profile`;
		window.location.href = gatewayAuthUrl;
	}, [searchParams, navigate]);

	const error = searchParams.get("error");

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-100">
				<div className="text-center">
					<h1 className="text-3xl font-bold mb-4 text-red-600">Login Failed</h1>
					<p className="text-gray-600 mb-4">
						{error === "missing_code" && "Authentication code was missing."}
						{error === "exchange_failed" && "Failed to complete authentication."}
						{error === "internal_error" && "An internal error occurred."}
						{!["missing_code", "exchange_failed", "internal_error"].includes(error) && `Error: ${error}`}
					</p>
					<button
						onClick={() => {
							const gatewayAuthUrl = `${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/auth/start?provider=google&return_to=/profile`;
							window.location.href = gatewayAuthUrl;
						}}
						className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-100">
			<div className="text-center">
				<h1 className="text-3xl font-bold mb-4">Redirecting to login...</h1>
				<p className="text-gray-600">Please wait while we redirect you to sign in with Google.</p>
			</div>
		</div>
	);
}
