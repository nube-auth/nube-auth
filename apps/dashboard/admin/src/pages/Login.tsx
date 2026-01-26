import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pingpong } from "../lib/pingpong";
import { AuthLoginCard } from "@proofa/components";

type AuthStatus = "idle" | "checking" | "redirecting" | "processing" | "error";

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState<AuthStatus>("checking");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const homeUrl = import.meta.env.VITE_HOME_URL || "http://localhost:4321";

	useEffect(() => {
		const handleAuth = async () => {
			try {
				const inviteCode = searchParams.get("invite") || undefined;
				const error = searchParams.get("error");
				if (error) {
					setStatus("error");
					setErrorMessage(`Authentication failed: ${error}`);
					return;
				}

				const code = searchParams.get("code");
				if (code) {
					setStatus("processing");
					const res = await pingpong("/api/auth/login", {
						method: "POST",
						credentials: "include",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ coreSessionId: code, audience: "admin" }),
					});

					if (res.ok) {
						if (inviteCode) {
							const inviteRes = await pingpong(`/api/admin/invitations/${inviteCode}/accept`, {
								method: "POST",
								credentials: "include",
							});

							if (inviteRes.ok) {
								const inviteData = await inviteRes.json().catch(() => null as any);
								if (inviteData?.project?.id) {
									navigate(`/projects/${inviteData.project.id}`, { replace: true });
									return;
								}
							}
						}

						navigate("/projects", { replace: true });
						return;
					}

					const errorData = await res.json().catch(() => null as any);
					setStatus("error");
					setErrorMessage(errorData?.error || "Failed to complete login");
					return;
				}

				// Check if already authenticated before showing login
				const statusRes = await pingpong("/api/auth/status?audience=admin", { credentials: "include" });
				if (statusRes.ok) {
					const statusData = await statusRes.json().catch(() => null as any);
					if (statusData?.loggedIn) {
						const meRes = await pingpong("/api/admin/me", { credentials: "include" });
						if (meRes.ok) {
							if (inviteCode) {
								const inviteRes = await pingpong(`/api/admin/invitations/${inviteCode}/accept`, {
									method: "POST",
									credentials: "include",
								});

								if (inviteRes.ok) {
									const inviteData = await inviteRes.json().catch(() => null as any);
									if (inviteData?.project?.id) {
										navigate(`/projects/${inviteData.project.id}`, { replace: true });
										return;
									}
								}
							}

							navigate("/projects", { replace: true });
							return;
						}
					}
				}

				setStatus("idle");
			} catch (err) {
				setStatus("error");
				setErrorMessage(err instanceof Error ? err.message : "Failed to complete login");
			}
		};

		handleAuth();
	}, [searchParams, navigate]);

	const handleGoogleLogin = () => {
		setStatus("redirecting");
		const inviteCode = searchParams.get("invite") || "";
		const returnTo = inviteCode ? `/login?invite=${inviteCode}` : "/login";
		const gatewayAuthUrl = `${import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004"}/v1/auth/start?provider=google&audience=admin&return_to=${encodeURIComponent(returnTo)}&invite=${encodeURIComponent(inviteCode)}`;
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
			footerText="Secure authentication powered by Proofa"
			securityBadge={true}
		/>
	);
}
