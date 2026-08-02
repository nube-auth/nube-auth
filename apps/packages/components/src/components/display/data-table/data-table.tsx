"use client";

import type * as React from "react";
import { TableContainer } from "../../../base/display/table";
import { Card } from "../../../base/layout/card";
import { cn } from "../../../lib/cn";

// ============================================================================
// DataTable — Card + TableContainer wrapper for consistent table layouts
// ============================================================================

export interface DataTableProps extends React.ComponentProps<"div"> {
	/** Content rendered above the table (typically DataTableHeader) */
	header?: React.ReactNode;
	/** Shown instead of children when isEmpty is true */
	emptyState?: React.ReactNode;
	/** When true, renders emptyState instead of the table */
	isEmpty?: boolean;
	/** Content rendered below the table (e.g. pagination text) */
	footer?: React.ReactNode;
}

/**
 * DataTable wraps a <Table> inside a Card + TableContainer with consistent
 * overflow-hidden, optional header, empty state, and footer.
 *
 * Usage:
 * ```tsx
 * <DataTable header={<DataTableHeader ... />}>
 *   <TableHeader>...</TableHeader>
 *   <TableBody>
 *     <DataTableRow>...</DataTableRow>
 *   </TableBody>
 * </DataTable>
 * ```
 */
export function DataTable({ header, emptyState, isEmpty, footer, children, className, ...props }: DataTableProps) {
	return (
		<Card data-slot="data-table" className={cn("overflow-hidden", className)} {...props}>
			{header}
			{isEmpty ? (
				<div data-slot="card-body" className="p-6">
					{emptyState}
				</div>
			) : (
				<>
					<TableContainer>
						<table data-slot="table" className="w-full text-table-foreground text-left">
							{children}
						</table>
					</TableContainer>
					{footer && (
						<div data-slot="card-body" className="px-6 py-4 border-t border-card-separator">
							{footer}
						</div>
					)}
				</>
			)}
		</Card>
	);
}

// ============================================================================
// DataTableHeader — Standardized header for DataTable (built on CardHeader)
// ============================================================================

export interface DataTableHeaderProps {
	title: React.ReactNode;
	description?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}

export function DataTableHeader({ title, description, action, className }: DataTableHeaderProps) {
	return (
		<header
			data-slot="card-header"
			className={cn(
				"p-6 gap-x-3.5 gap-y-2 border-b border-card-separator",
				"grid grid-cols-[1fr_auto] items-center",
				className,
			)}
		>
			<div>
				<h3 data-slot="card-title" className="text-lg font-semibold leading-none">
					{title}
				</h3>
				{description && (
					<p data-slot="card-description" className="text-muted mt-1.5">
						{description}
					</p>
				)}
			</div>
			{action && <div className="ml-auto flex items-center gap-2">{action}</div>}
		</header>
	);
}

// ============================================================================
// DataTableRow — TableRow with hover + optional click styling
// ============================================================================

export interface DataTableRowProps extends React.ComponentProps<"tr"> {}

/**
 * A table row with consistent hover styling. Adds cursor-pointer
 * automatically when an onClick handler is provided.
 */
export function DataTableRow({ className, onClick, children, ...props }: DataTableRowProps) {
	return (
		<tr
			data-slot="table-row"
			className={cn(
				"border-b border-table-separator last:border-none hover:bg-accent transition-colors",
				onClick && "cursor-pointer",
				className,
			)}
			onClick={onClick}
			{...props}
		>
			{children}
		</tr>
	);
}
