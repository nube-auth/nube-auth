import { ConsoleLanding, IconType, Spinner } from "@nube-auth/components";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import config from "../config";
import { useMe } from "../hooks/api";

const OAUTH_ERRORS: Record<string, string> = {
	access_denied: "Access denied. Please try again.",
	invalid_invite: "This invite link is invalid or has expired.",
	unauthorized: "You are not authorized to access the Admin Console.",
};

function AdminLanding() {
	const [searchParams] = useSearchParams();
	const [isRedirecting, setIsRedirecting] = useState(false);

	const errorCode = searchParams.get("error");
	const inviteCode = searchParams.get("invite") || "";
	const errorMessage = errorCode ? (OAUTH_ERRORS[errorCode] ?? "Authentication failed. Please try again.") : null;

	const handleSignIn = () => {
		setIsRedirecting(true);
		const returnTo = inviteCode ? `/login?invite=${inviteCode}` : "/home";
		window.location.href = `${config.gatewayUrl}/v1/auth/start?provider=google&audience=admin&return_to=${encodeURIComponent(returnTo)}&invite=${encodeURIComponent(inviteCode)}`;
	};

	return (
		<ConsoleLanding
			title="Admin Console"
			subtitle="Manage authentication projects, apps, users, and billing — all in one place."
			icon={IconType.Dashboard}
			envTag={config.envTag}
			features={[
				{ icon: IconType.Layers, label: "Projects & Apps" },
				{ icon: IconType.Users, label: "User Management" },
				{ icon: IconType.CreditCard, label: "Billing & Licenses" },
			]}
			errorMessage={errorMessage}
			busy={isRedirecting}
			onSignIn={handleSignIn}
			termsUrl={`${config.homeUrl}/terms`}
			privacyUrl={`${config.homeUrl}/privacy`}
		/>
	);
}

export function RootPage() {
	const { data: user, isLoading } = useMe();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isLoading && user) {
			navigate("/home", { replace: true });
		}
	}, [user, isLoading, navigate]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}

	if (user) return null;

	return <AdminLanding />;
}
