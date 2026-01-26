import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthLoginCard } from "@proofa/components";
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

	const getErrorMessage = (errorCode: string) => {
		switch (errorCode) {
			case "missing_code":
				return "Authentication code was missing from the response.";
			case "exchange_failed":
				return "Failed to complete the authentication process.";
			case "internal_error":
				return "An internal server error occurred.";
			default:
				return `Error: ${errorCode}`;
		}
	};

	const isBusy = status === "checking" || status === "redirecting";

	return (
		<AuthLoginCard
			title="User Console"
			subtitle="Manage your account, sessions, and licenses"
			errorMessage={status === "error" && error ? getErrorMessage(error) : null}
			buttonLabel="Continue with Google"
			buttonVariant="secondary"
			onContinue={handleGoogleLogin}
			busy={isBusy}
			termsUrl={`${homeUrl}/terms`}
			privacyUrl={`${homeUrl}/privacy`}
		/>
	);
}
