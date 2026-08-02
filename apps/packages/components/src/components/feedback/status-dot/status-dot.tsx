import React from "react";

export type StatusDotVariant = "success" | "danger" | "info" | "warning" | "neutral";

export interface StatusDotProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: StatusDotVariant;
	label?: string;
}

const variantClasses: Record<StatusDotVariant, string> = {
	success: "bg-emerald-500",
	danger: "bg-red-500",
	info: "bg-blue-500",
	warning: "bg-amber-500",
	neutral: "bg-gray-400",
};

export const StatusDot = React.forwardRef<HTMLDivElement, StatusDotProps>(
	({ variant = "neutral", label, className = "", ...props }, ref) => {
		return (
			<div ref={ref} className={`flex items-center gap-2 ${className}`} {...props}>
				<div className={`h-2 w-2 rounded-full ${variantClasses[variant]}`} />
				{label && <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>}
			</div>
		);
	},
);

StatusDot.displayName = "StatusDot";
