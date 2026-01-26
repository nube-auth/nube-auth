import { Button, Spinner } from "../../selia/ui";
import {
	LoginCard,
	LoginCardLogo,
	LoginCardTitle,
	LoginCardSubtitle,
	LoginCardBody,
	LoginCardTerms,
} from "./LoginCard";
import { Icon, IconType } from "../../../icons";
import type { IconTypeName } from "../../../icons";
import { cn } from "../../../utils/cn";

export type AuthLoginCardProps = {
	logoSrc?: string;
	title: string;
	subtitle?: string;
	statusMessage?: string;
	errorMessage?: string | null;
	buttonLabel: string;
	buttonVariant?: "primary" | "secondary" | "tertiary" | "danger" | "outline" | "plain";
	buttonIcon?: IconTypeName;
	onContinue: () => void;
	busy?: boolean;
	termsUrl?: string;
	privacyUrl?: string;
	footerText?: string;
	securityBadge?: boolean;
	className?: string;
};

export function AuthLoginCard({
	logoSrc = "/favicon.png",
	title,
	subtitle,
	statusMessage,
	errorMessage,
	buttonLabel,
	buttonVariant = "secondary",
	buttonIcon = IconType.Google,
	onContinue,
	busy = false,
	termsUrl,
	privacyUrl,
	footerText,
	securityBadge = false,
	className,
}: AuthLoginCardProps) {
	const showFooter = termsUrl && privacyUrl;

	return (
		<LoginCard className={className} error={errorMessage || undefined} loading={busy}>
			<LoginCardLogo src={logoSrc} />
			<LoginCardTitle>{title}</LoginCardTitle>
			{subtitle ? <LoginCardSubtitle>{subtitle}</LoginCardSubtitle> : null}

<LoginCardBody>
			{statusMessage ? (
				<p className="text-sm text-muted text-center leading-relaxed">{statusMessage}</p>
			) : null}

			<Button
				variant={buttonVariant}
				onClick={onContinue}
				disabled={busy}
				className={cn("w-full justify-center", buttonVariant === "secondary" ? "text-foreground" : "")}
			>
				{busy ? <Spinner className="h-4 w-4" /> : <Icon icon={buttonIcon} size={18} />}
				<span>{busy ? "Please wait..." : buttonLabel}</span>
			</Button>

			{showFooter ? (
				<LoginCardTerms className="text-center text-xs text-muted leading-relaxed mt-4">
						By continuing, you agree to our {" "}
						<a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-primary">Terms of Service</a>
						{" "}and{" "}
						<a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="text-primary">Privacy Policy</a>.
					</LoginCardTerms>
				) : null}
			</LoginCardBody>

			{footerText ? (
				<div className={cn(
					"flex items-center justify-center gap-2 pb-6",
					securityBadge
						? "bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 py-3 border-t border-primary/20"
						: "text-xs text-muted"
				)}>
					<Icon icon={IconType.Lock} size={securityBadge ? 16 : 14} className={securityBadge ? "text-primary" : ""} />
					<span className={cn(
						securityBadge ? "text-sm font-medium text-primary" : "text-xs"
					)}>{footerText}</span>
				</div>
			) : null}
		</LoginCard>
	);
}
