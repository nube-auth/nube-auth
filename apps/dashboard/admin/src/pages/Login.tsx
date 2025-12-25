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

	if (status === "error") {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-100">
				<div className="text-center">
					<h1 className="text-3xl font-bold mb-4 text-red-600">Login Failed</h1>
					<p className="text-gray-600 mb-4">{errorMessage}</p>
					<button
						type="button"
						onClick={() => {
							setStatus("redirecting");
							setErrorMessage(null);
							const coreAuthUrl = `${import.meta.env.VITE_CORE_URL || "http://localhost:3003"}/v1/auth/start?provider=google&redirect_uri=${encodeURIComponent(`${window.location.origin}/login`)}`;
							window.location.href = coreAuthUrl;
						}}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
				<h1 className="text-3xl font-bold mb-4">
					{status === "checking" && "Checking authentication..."}
					{status === "redirecting" && "Redirecting to login..."}
					{status === "processing" && "Completing login..."}
				</h1>
				<p className="text-gray-600">Please wait...</p>
			</div>
		</div>
	);
}
