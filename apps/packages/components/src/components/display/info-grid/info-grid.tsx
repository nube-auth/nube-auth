import React from "react";

export interface InfoGridProps extends React.HTMLAttributes<HTMLDivElement> {
	items: Array<{ label: string; value: React.ReactNode }>;
	columns?: number;
}

export const InfoGrid = React.forwardRef<HTMLDivElement, InfoGridProps>(
	({ items, columns = 4, className = "", ...props }, ref) => {
		const gridColsClass =
			{
				1: "grid-cols-1",
				2: "grid-cols-2",
				3: "grid-cols-3",
				4: "grid-cols-4",
			}[Math.min(columns, 4)] || "grid-cols-4";

		return (
			<div ref={ref} className={`grid ${gridColsClass} gap-4 md:gap-6 ${className}`} {...props}>
				{items.map((item, idx) => (
					<div key={idx} className="flex flex-col">
						<p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
							{item.label}
						</p>
						<p className="text-sm text-gray-900 dark:text-white font-medium">{item.value}</p>
					</div>
				))}
			</div>
		);
	},
);

InfoGrid.displayName = "InfoGrid";
