import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pingpong } from "../lib/pingpong";
import { useMe } from "../hooks/api";
import { AuthLoginCard } from "@nube-auth/components";
import config from "../config";

type AuthStatus = "idle" | "checking" | "redirecting" | "processing" | "error";

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState<AuthStatus>("checking");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const homeUrl = import.meta.env.VITE_HOME_URL || "http://localhost:4321";
	const { data: user, isLoading } = useMe();

	useEffect(() => {
		const handleAuth = async () => {
			try {
				const inviteCode = searchParams.get("invite");
				const error = searchParams.get("error");

				if (error) {
					setStatus("error");
					// Only show known error codes to prevent reflected content injection
					const errorMessages: Record<string, string> = {
						access_denied: "Access denied",
						invalid_invite: "Invalid or expired invite",
						unauthorized: "You are not authorized to access this dashboard",
					};
					setErrorMessage(errorMessages[error] || "Authentication failed");
					return;
				}

				// Check if already authenticated using useMe() hook
				// Gateway callback already handles OAuth code exchange and sets cookie
				if (!isLoading && user) {
					// Handle invite acceptance if invite code present
					if (inviteCode) {
						const inviteRes = await pingpong(`/api/admin/invitations/${inviteCode}/accept`, {
							method: "POST",
							credentials: "include",
						});

						if (inviteRes.ok()) {
							const inviteData = inviteRes.data as { project?: { id: string } };
							if (inviteData?.project?.id) {
								navigate(`/projects/${inviteData.project.id}`, { replace: true });
								return;
							}
						}
					}

					// Already authenticated, go to home
					navigate("/home", { replace: true });
					return;
				}

				// Show login form if not loading and no user
				if (!isLoading && !user) {
					setStatus("idle");
				}
			} catch (err) {
				setStatus("error");
				setErrorMessage(err instanceof Error ? err.message : "Failed to complete login");
			}
		};

		handleAuth();
	}, [searchParams, navigate, user, isLoading]);

	const handleGoogleLogin = () => {
		setStatus("redirecting");
		const inviteCode = searchParams.get("invite") || "";
		// After successful auth, redirect to projects (or handle invite flow)
		const returnTo = inviteCode ? `/login?invite=${inviteCode}` : "/";
		const gatewayAuthUrl = `${config.gatewayUrl}/v1/auth/start?provider=google&audience=admin&return_to=${encodeURIComponent(returnTo)}&invite=${encodeURIComponent(inviteCode)}`;
		window.location.href = gatewayAuthUrl;
	};

	const isBusy = status === "checking" || status === "processing" || status === "redirecting";

	return (
		<AuthLoginCard
			title="Admin Console"
			subtitle="Manage projects, apps, and licensing"
			errorMessage={status === "error" ? errorMessage || "Something went wrong" : null}
			buttonLabel="Continue with Google"
			onContinue={handleGoogleLogin}
			busy={isBusy}
			termsUrl={`${homeUrl}/terms`}
			privacyUrl={`${homeUrl}/privacy`}
			footerText="Secure authentication powered by Nube Auth"
			securityBadge={true}
		/>
	);
}
