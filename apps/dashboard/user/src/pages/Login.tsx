import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthLoginCard } from "@proofa/components";
import { pingpong } from "../lib/pingpong";
import { config } from "../config";

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState<"idle" | "checking" | "redirecting" | "error">("checking");

	useEffect(() => {
		const error = searchParams.get("error");

		if (error) {
			setStatus("error");
			return;
		}

		// Check if already authenticated
		const checkAuth = async () => {
			try {
				const res = await pingpong(`${config.gatewayUrl}/v1/auth/status`, { credentials: "include" });
				if (res.ok()) {
					if (res.data.loggedIn) {
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
		const gatewayAuthUrl = `${config.gatewayUrl}/v1/auth/start?provider=google&return_to=/profile`;
		window.location.href = gatewayAuthUrl;
	};

	const error = searchParams.get("error");

	const getErrorMessage = (errorCode: string) => {
		const errorMessages: Record<string, string> = {
			missing_code: "Authentication code was missing from the response.",
			exchange_failed: "Failed to complete the authentication process.",
			internal_error: "An internal server error occurred.",
		};
		return errorMessages[errorCode] || "Authentication failed";
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
			termsUrl={`${config.homeUrl}/terms`}
			privacyUrl={`${config.homeUrl}/privacy`}
		/>
	);
}
