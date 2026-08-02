import React from "react";
import { Icon, type IconTypeName } from "../../../icons";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
	icon?: IconTypeName;
	title: string;
	description?: string;
	action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
	({ icon = "Info", title, description, action, className = "", ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
				{...props}
			>
				{icon && (
					<div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
						<Icon icon={icon} size={32} className="text-gray-600 dark:text-gray-400" />
					</div>
				)}
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
				{description && <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">{description}</p>}
				{action && <div>{action}</div>}
			</div>
		);
	},
);

EmptyState.displayName = "EmptyState";
