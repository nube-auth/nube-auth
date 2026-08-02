import React from "react";
import { Icon, IconType } from "../../../icons";

export interface SessionCardProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	isCurrent?: boolean;
	metadata: Array<{ label: string; value: React.ReactNode }>;
	action?: React.ReactNode;
}

export const SessionCard = React.forwardRef<HTMLDivElement, SessionCardProps>(
	({ title, isCurrent = false, metadata, action, className = "", ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={`border-l-4 ${isCurrent ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-900 p-4 rounded ${className}`}
				{...props}
			>
				<div className="flex items-start justify-between mb-3">
					<div className="flex items-center gap-2">
						<h4 className="text-sm font-semibold text-gray-900 dark:text-white m-0">{title}</h4>
						{isCurrent && (
							<span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900 rounded text-xs font-medium text-emerald-800 dark:text-emerald-200">
								<Icon icon={IconType.Check} size={12} />
								Current
							</span>
						)}
					</div>
					{action && <div>{action}</div>}
				</div>
				<div className="grid grid-cols-2 gap-3 text-xs">
					{metadata.map((item, idx) => (
						<div key={idx}>
							<p className="text-gray-600 dark:text-gray-400 mb-1">{item.label}</p>
							<p className="font-medium text-gray-900 dark:text-white">{item.value}</p>
						</div>
					))}
				</div>
			</div>
		);
	},
);

SessionCard.displayName = "SessionCard";
