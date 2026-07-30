import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
	Icon,
	IconType,
	Button,
	Alert,
	Spinner,
	ThemeToggle,
	useTheme,
} from "@nube-auth/components";
import { useMe } from "../hooks/api";
import config from "../config";

const OAUTH_ERRORS: Record<string, string> = {
	access_denied: "Access denied. Please try again.",
	invalid_invite: "This invite link is invalid or has expired.",
	unauthorized: "You are not authorized to access the Admin Console.",
};

function AdminLanding() {
	const [searchParams] = useSearchParams();
	const [isRedirecting, setIsRedirecting] = useState(false);
	const { theme, setTheme } = useTheme();

	const errorCode = searchParams.get("error");
	const inviteCode = searchParams.get("invite") || "";
	const errorMessage = errorCode ? (OAUTH_ERRORS[errorCode] ?? "Authentication failed. Please try again.") : null;

	const cycleTheme = () => {
		if (theme === "system") setTheme("light");
		else if (theme === "light") setTheme("dark");
		else setTheme("system");
	};

	const handleSignIn = () => {
		setIsRedirecting(true);
		const returnTo = inviteCode ? `/login?invite=${inviteCode}` : "/home";
		window.location.href = `${config.gatewayUrl}/v1/auth/start?provider=google&audience=admin&return_to=${encodeURIComponent(returnTo)}&invite=${encodeURIComponent(inviteCode)}`;
	};

	return (
		<div className="min-h-screen flex flex-col bg-background text-foreground">
			{/* Top bar */}
			<header className="flex items-center justify-between px-6 py-4 border-b border-border">
				<div className="flex items-center gap-2">
					<img src="/favicon.png" alt="Nube Auth" className="w-7 h-7" />
					<span className="text-base font-bold tracking-tight">Nube Auth</span>
					<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
						{config.envTag}
					</span>
				</div>
				<ThemeToggle theme={theme} onToggle={cycleTheme} />
			</header>

			{/* Hero */}
			<main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
				<div className="w-full max-w-md text-center">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
						<Icon icon={IconType.Dashboard} size={32} className="text-primary" />
					</div>

					<h1 className="text-3xl font-bold tracking-tight mb-2">Admin Console</h1>
					<p className="text-muted text-base mb-10">
						Manage authentication projects, apps, users, and billing — all in one place.
					</p>

					{/* Features */}
					<div className="grid grid-cols-3 gap-3 mb-10 text-sm">
						{[
							{ icon: IconType.Layers, label: "Projects & Apps" },
							{ icon: IconType.Users, label: "User Management" },
							{ icon: IconType.CreditCard, label: "Billing & Licenses" },
						].map(({ icon, label }) => (
							<div
								key={label}
								className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card"
							>
								<Icon icon={icon} size={20} className="text-primary" />
								<span className="text-muted font-medium leading-tight">{label}</span>
							</div>
						))}
					</div>

					{/* Error */}
					{errorMessage && (
						<Alert variant="danger" className="mb-6 text-left">
							<Icon icon={IconType.AlertCircle} size={16} />
							<span>{errorMessage}</span>
						</Alert>
					)}

					{/* CTA */}
					<Button
						variant="outline"
						size="lg"
						className="w-full"
						onClick={handleSignIn}
						disabled={isRedirecting}
					>
						{isRedirecting ? (
							<Spinner className="w-4 h-4" />
						) : (
							<Icon icon={IconType.Google} size={18} />
						)}
						{isRedirecting ? "Redirecting…" : "Continue with Google"}
					</Button>

					{/* Footer */}
					<p className="mt-6 text-xs text-text-dimmed">
						By continuing, you agree to the{" "}
						<a
							href={`${config.homeUrl}/terms`}
							target="_blank"
							rel="noopener noreferrer"
							className="underline hover:text-muted"
						>
							Terms of Service
						</a>{" "}
						and{" "}
						<a
							href={`${config.homeUrl}/privacy`}
							target="_blank"
							rel="noopener noreferrer"
							className="underline hover:text-muted"
						>
							Privacy Policy
						</a>
						.
					</p>
				</div>
			</main>
		</div>
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
			<div className="min-h-screen flex items-center justify-center">
				<Spinner />
			</div>
		);
	}

	if (user) return null;

	return <AdminLanding />;
}
