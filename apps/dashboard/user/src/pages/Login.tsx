import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
	Icon, 
	IconType,
	Button,
	LoginCard,
	LoginCardLogo,
	LoginCardTitle,
	LoginCardSubtitle,
	LoginCardBody,
	LoginCardTerms
} from "@proofa/components";
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
	
	// Get friendly error message
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

	if (status === "error" && error) {
		return (
			<LoginCard error={getErrorMessage(error)}>
				<LoginCardLogo src="/favicon.png" alt="Proofa" />
				<LoginCardTitle>Login Failed</LoginCardTitle>
				<LoginCardSubtitle>
					Please try again or contact support if the issue persists.
				</LoginCardSubtitle>

				<LoginCardBody>
					<Button
						variant="secondary"
						size="md"
						onClick={handleGoogleLogin}
						className="w-full"
					>
						<Icon icon={IconType.Google} />
						Continue with Google
					</Button>
				</LoginCardBody>
			</LoginCard>
		);
	}

	if (status === "checking") {
		return (
			<LoginCard loading>
				<LoginCardLogo src="/favicon.png" alt="Proofa" />
				<LoginCardTitle>Welcome to Proofa</LoginCardTitle>
				<LoginCardSubtitle>Checking authentication...</LoginCardSubtitle>
			</LoginCard>
		);
	}

	if (status === "redirecting") {
		return (
			<LoginCard loading>
				<LoginCardLogo src="/favicon.png" alt="Proofa" />
				<LoginCardTitle>Welcome to Proofa</LoginCardTitle>
				<LoginCardSubtitle>Redirecting to Google sign-in...</LoginCardSubtitle>
			</LoginCard>
		);
	}

	// Default: Show login page with Sign in button
	return (
		<LoginCard>
			<LoginCardLogo src="/favicon.png" alt="Proofa" />
			<LoginCardTitle>Welcome to Proofa</LoginCardTitle>
			<LoginCardSubtitle>Sign in to manage your account and sessions</LoginCardSubtitle>

			<LoginCardBody>
				<Button
					variant="secondary"
					size="md"
					onClick={handleGoogleLogin}
					className="w-full"
				>
					<Icon icon={IconType.Google} />
					Continue with Google
				</Button>
			</LoginCardBody>

			<LoginCardTerms>
				By continuing, you agree to our{" "}
				<a href={`${homeUrl}/terms`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
					Terms of Service
				</a>{" "}
				and{" "}
				<a href={`${homeUrl}/privacy`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
					Privacy Policy
				</a>
			</LoginCardTerms>
		</LoginCard>
	);
}
