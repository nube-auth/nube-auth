import type { ReactNode } from "react";
import { Alert, Button, Spinner } from "../../base";
import { cycleTheme, type Theme, useTheme } from "../../hooks/useTheme";
import { Icon, IconType, type IconTypeName } from "../../icons";
import { cn } from "../../lib/cn";
import { ThemeToggle } from "./ThemeToggle";

export function GoogleMark() {
	return (
		<span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
			<Icon icon={IconType.Google} size={16} />
		</span>
	);
}

export function BrandLockup({ envTag, className }: { envTag?: string; className?: string }) {
	return (
		<span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
			<img src="/favicon.png" alt="" className="size-7 shrink-0" />
			<span className="truncate text-base font-bold tracking-tight">Nube Auth</span>
			{envTag ? (
				<span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
					{envTag}
				</span>
			) : null}
		</span>
	);
}

export function DocsLink({ href }: { href: string }) {
	return (
		<Button
			variant="outline"
			size="sm"
			className="max-sm:px-2"
			onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
		>
			<Icon icon={IconType.BookOpen} size={16} />
			<span className="max-sm:hidden">Docs</span>
		</Button>
	);
}

export function ConsoleHeader({
	brand,
	theme,
	onToggleTheme,
	children,
}: {
	brand: ReactNode;
	theme: Theme;
	onToggleTheme: () => void;
	children?: ReactNode;
}) {
	return (
		<header className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-8">
			<div className="min-w-0">{brand}</div>
			<div className="flex shrink-0 items-center gap-2 sm:gap-3">
				<ThemeToggle theme={theme} onToggle={onToggleTheme} />
				{children}
			</div>
		</header>
	);
}

export interface ConsoleLandingFeature {
	icon: IconTypeName;
	label: string;
}

export interface ConsoleLandingProps {
	title: string;
	subtitle: string;
	icon: IconTypeName;
	features: ConsoleLandingFeature[];
	envTag: string;
	errorMessage?: string | null;
	busy?: boolean;
	onSignIn: () => void;
	termsUrl: string;
	privacyUrl: string;
}

export function ConsoleLanding({
	title,
	subtitle,
	icon,
	features,
	envTag,
	errorMessage,
	busy = false,
	onSignIn,
	termsUrl,
	privacyUrl,
}: ConsoleLandingProps) {
	const { theme, setTheme } = useTheme();

	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<ConsoleHeader
				brand={<BrandLockup envTag={envTag} />}
				theme={theme}
				onToggleTheme={() => setTheme(cycleTheme(theme))}
			/>
			<main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
				<div className="w-full max-w-md text-center">
					<div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
						<Icon icon={icon} size={32} className="text-primary" />
					</div>
					<h1 className="mb-2 text-3xl font-bold tracking-tight">{title}</h1>
					<p className="mb-10 text-base text-muted">{subtitle}</p>
					<div className="mb-10 grid grid-cols-3 gap-3 text-sm">
						{features.map((feature) => (
							<div
								key={feature.label}
								className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3"
							>
								<Icon icon={feature.icon} size={20} className="text-primary" />
								<span className="font-medium leading-tight text-muted">{feature.label}</span>
							</div>
						))}
					</div>
					{errorMessage ? (
						<Alert variant="danger" className="mb-6 text-left">
							<Icon icon={IconType.AlertCircle} size={16} />
							<span>{errorMessage}</span>
						</Alert>
					) : null}
					<Button variant="primary" size="lg" className="w-full" onClick={onSignIn} disabled={busy}>
						{busy ? <Spinner className="h-4 w-4" /> : <GoogleMark />}
						{busy ? "Redirecting…" : "Continue with Google"}
					</Button>
					<p className="mt-6 text-xs text-dimmed">
						By continuing, you agree to the{" "}
						<a
							href={termsUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="underline hover:text-muted"
						>
							Terms of Service
						</a>{" "}
						and{" "}
						<a
							href={privacyUrl}
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

export function ConsoleShell({ header, children }: { header: ReactNode; children: ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			{header}
			<main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 sm:px-8">{children}</main>
		</div>
	);
}
