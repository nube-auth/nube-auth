import { ConsoleLanding, IconType, Spinner } from "@nube-auth/components";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { config } from "../config";
import { useAuth } from "../hooks/api";

const OAUTH_ERRORS: Record<string, string> = {
	missing_code: "Authentication code was missing. Please try again.",
	exchange_failed: "Failed to complete sign-in. Please try again.",
	internal_error: "An internal error occurred. Please try again.",
};

function UserLanding() {
	const [searchParams] = useSearchParams();
	const [isRedirecting, setIsRedirecting] = useState(false);

	const errorCode = searchParams.get("error");
	const errorMessage = errorCode ? (OAUTH_ERRORS[errorCode] ?? "Authentication failed. Please try again.") : null;

	const handleSignIn = () => {
		setIsRedirecting(true);
		window.location.href = `${config.gatewayUrl}/v1/auth/start?provider=google&audience=user&return_to=${encodeURIComponent("/home")}`;
	};

	return (
		<ConsoleLanding
			title="User Console"
			subtitle="Manage your profile, active sessions, and account security."
			icon={IconType.User}
			envTag={config.envTag}
			features={[
				{ icon: IconType.User, label: "Profile" },
				{ icon: IconType.Key, label: "Sessions" },
				{ icon: IconType.Shield, label: "Security" },
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
	const { isAuthenticated, isLoading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			navigate("/home", { replace: true });
		}
	}, [isAuthenticated, isLoading, navigate]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}

	if (isAuthenticated) return null;

	return <UserLanding />;
}
