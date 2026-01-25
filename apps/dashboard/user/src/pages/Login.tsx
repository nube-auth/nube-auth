import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
	Icon, 
	IconType,
	Button,
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardBody,
	Alert
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
			<div className="w-full min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader align="center" className="flex flex-col gap-3">
						<img src="/favicon.png" alt="Proofa" className="w-12 h-12" />
						<CardTitle>Login Failed</CardTitle>
						<CardDescription>
							Please try again or contact support if the issue persists.
						</CardDescription>
					</CardHeader>
					<CardBody className="flex flex-col gap-4">
						<Alert variant="danger">
							{getErrorMessage(error)}
						</Alert>
						<Button
							variant="secondary"
							size="lg"
							onClick={handleGoogleLogin}
							block
							className="text-black"
						>
							<Icon icon={IconType.Google} size={18} />
							Continue with Google
						</Button>
					</CardBody>
				</Card>
			</div>
		);
	}

	if (status === "checking") {
		return (
			<div className="w-full min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader align="center" className="flex flex-col gap-3">
						<img src="/favicon.png" alt="Proofa" className="w-12 h-12" />
						<CardTitle>Welcome to Proofa</CardTitle>
						<CardDescription>Checking authentication...</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (status === "redirecting") {
		return (
			<div className="w-full min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader align="center" className="flex flex-col gap-3">
						<img src="/favicon.png" alt="Proofa" className="w-12 h-12" />
						<CardTitle>Welcome to Proofa</CardTitle>
						<CardDescription>Redirecting to Google sign-in...</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	// Default: Show login page with Sign in button
	return (
		<div className="w-full min-h-screen flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader align="center" className="flex flex-col gap-3">
					<img src="/favicon.png" alt="Proofa" className="w-12 h-12" />
					<CardTitle>Welcome to Proofa</CardTitle>
					<CardDescription>
						Sign in to manage your account and sessions
					</CardDescription>
				</CardHeader>
				<CardBody className="flex flex-col gap-4">
					<Button
						variant="secondary"
						size="lg"
						onClick={handleGoogleLogin}
						// className="text-black"
						block
					>
						<Icon icon={IconType.Google} size={18} />
						Continue with Google
					</Button>

					<p className="text-center text-sm text-muted">
						By continuing, you agree to our{" "}
						<a href={`${homeUrl}/terms`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
							Terms of Service
						</a>{" "}
						and{" "}
						<a href={`${homeUrl}/privacy`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
							Privacy Policy
						</a>
					</p>
				</CardBody>
			</Card>
		</div>
	);
}
