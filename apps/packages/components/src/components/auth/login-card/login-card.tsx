import React from "react";
import { cn } from "../../../lib/cn";

export interface LoginCardProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	error?: string;
	loading?: boolean;
}

export interface LoginCardLogoProps extends React.HTMLAttributes<HTMLDivElement> {
	src?: string;
	alt?: string;
	children?: React.ReactNode;
}

export interface LoginCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
	children: React.ReactNode;
}

export interface LoginCardSubtitleProps extends React.HTMLAttributes<HTMLParagraphElement> {
	children: React.ReactNode;
}

export interface LoginCardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

export interface LoginCardTermsProps extends React.HTMLAttributes<HTMLParagraphElement> {
	children: React.ReactNode;
}

export interface LoginCardErrorProps extends React.HTMLAttributes<HTMLDivElement> {
	message: string;
}

export const LoginCard = React.forwardRef<HTMLDivElement, LoginCardProps>(
	({ className, children, error, loading, ...props }, ref) => {
		return (
			<div className="flex items-center justify-center min-h-screen w-full px-6 bg-background">
				<div
					ref={ref}
					className={cn(
						"relative flex flex-col w-full max-w-md bg-card border border-card-border rounded-xl shadow overflow-hidden",
						className,
					)}
					{...props}
				>
					{error && <LoginCardError message={error} />}
					{loading && (
						<div className="absolute inset-0 bg-card/50 backdrop-blur-sm flex items-center justify-center z-50">
							<div className="animate-spin">
								<svg
									className="h-6 w-6 text-primary"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									/>
								</svg>
							</div>
						</div>
					)}
					<div className={loading ? "opacity-50 pointer-events-none" : ""}>{children}</div>
				</div>
			</div>
		);
	},
);

LoginCard.displayName = "LoginCard";

export const LoginCardLogo = React.forwardRef<HTMLDivElement, LoginCardLogoProps>(
	({ className, children, src, alt, ...props }, ref) => {
		return (
			<div ref={ref} className={cn("flex items-center justify-center pt-8 pb-6", className)} {...props}>
				{src ? <img src={src} alt={alt || "Logo"} className="w-12 h-12" /> : children}
			</div>
		);
	},
);

LoginCardLogo.displayName = "LoginCardLogo";

export const LoginCardTitle = React.forwardRef<HTMLHeadingElement, LoginCardTitleProps>(
	({ className, children, ...props }, ref) => {
		return (
			<h1
				ref={ref}
				className={cn("text-2xl font-bold text-center text-foreground px-6 pb-3 m-0", className)}
				{...props}
			>
				{children}
			</h1>
		);
	},
);

LoginCardTitle.displayName = "LoginCardTitle";

export const LoginCardSubtitle = React.forwardRef<HTMLParagraphElement, LoginCardSubtitleProps>(
	({ className, children, ...props }, ref) => {
		return (
			<p ref={ref} className={cn("text-center text-muted px-6 pb-3 m-0", className)} {...props}>
				{children}
			</p>
		);
	},
);

LoginCardSubtitle.displayName = "LoginCardSubtitle";

export const LoginCardBody = React.forwardRef<HTMLDivElement, LoginCardBodyProps>(
	({ className, children, ...props }, ref) => {
		return (
			<div ref={ref} className={cn("px-6 pt-4 pb-8", className)} {...props}>
				{children}
			</div>
		);
	},
);

LoginCardBody.displayName = "LoginCardBody";

export const LoginCardTerms = React.forwardRef<HTMLParagraphElement, LoginCardTermsProps>(
	({ className, children, ...props }, ref) => {
		return (
			<p ref={ref} className={cn("text-center text-xs text-dimmed m-0", className)} {...props}>
				{children}
			</p>
		);
	},
);

LoginCardTerms.displayName = "LoginCardTerms";

export const LoginCardError = React.forwardRef<HTMLDivElement, LoginCardErrorProps>(({ message, className }, ref) => {
	return (
		<div ref={ref} className={cn("bg-danger/10 border-b border-danger/20 px-6 py-3", className)}>
			<p className="text-sm text-danger m-0">{message}</p>
		</div>
	);
});

LoginCardError.displayName = "LoginCardError";
