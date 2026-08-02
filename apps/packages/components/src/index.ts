/**
 * @nube-auth/components - Shared Design System and Component Library
 *
 * This package contains:
 * - Selia UI components (base design system)
 * - Unified icon system (single IconType registry for all icons)
 * - Reusable React components used across Nube Auth dashboards
 * - Style configuration (Tailwind, CSS files)
 * - Design tokens and theming
 */

// ============================================================================
// SELIA UI COMPONENTS (Base Design System)
// ============================================================================
// These are the core UI primitives from Selia. Use these directly in your code.

// Re-export all Selia UI components
export * from "./base";

// Explicitly export Tabs components
export { Tabs, TabsItem, TabsList, TabsPanel } from "./base/display/tabs";

// Legacy specific exports for backward compatibility
export type { SelectItem as SelectItemType } from "./base/forms/select";

// ============================================================================
// ICONS (Unified Icon System)
// ============================================================================

export type { IconProps, IconTypeName } from "./icons";
export { Icon, IconType } from "./icons";

// ============================================================================
// HOOKS
// ============================================================================

export type { Theme } from "./hooks/useTheme";
export { useTheme } from "./hooks/useTheme";

// ============================================================================
// UTILITIES
// ============================================================================

export { cn } from "./lib/cn";

// ============================================================================
// NUBE_AUTH COMPOSITE COMPONENTS (Built on Selia)
// ============================================================================
// These are Nube Auth-specific components built using Selia primitives

export type {
	AuthLoginCardProps,
	LoginCardBodyProps,
	LoginCardErrorProps,
	LoginCardLogoProps,
	LoginCardProps,
	LoginCardSubtitleProps,
	LoginCardTermsProps,
	LoginCardTitleProps,
} from "./components/auth/login-card";
// Auth
export {
	AuthLoginCard,
	LoginCard,
	LoginCardBody,
	LoginCardError,
	LoginCardLogo,
	LoginCardSubtitle,
	LoginCardTerms,
	LoginCardTitle,
} from "./components/auth/login-card";
export type { DataTableHeaderProps, DataTableProps, DataTableRowProps } from "./components/display/data-table";
export { DataTable, DataTableHeader, DataTableRow } from "./components/display/data-table";
export type { EmptyStateProps } from "./components/display/empty-state";
// Display
export { EmptyState } from "./components/display/empty-state";
export type { InfoGridProps } from "./components/display/info-grid";
export { InfoGrid } from "./components/display/info-grid";
export type { InfoListItemProps, InfoListProps } from "./components/display/info-list";
export { InfoList } from "./components/display/info-list";
export type { ProfileHeaderProps } from "./components/display/profile-header";
export { ProfileHeader } from "./components/display/profile-header";
export type { SessionCardProps } from "./components/display/session-card";
export { SessionCard } from "./components/display/session-card";
export type { ThemeToggleProps } from "./components/display/ThemeToggle";
export { ThemeToggle } from "./components/display/ThemeToggle";
export type { LoadingProps, LoadingSize } from "./components/feedback/loading";
// Feedback
export { Loading } from "./components/feedback/loading";
export type { StatusDotProps, StatusDotVariant } from "./components/feedback/status-dot";
export { StatusDot } from "./components/feedback/status-dot";
export type { FormGroupProps, FormHintProps, FormInputProps, FormLabelProps } from "./components/forms/form-group";
// Forms
export { FormGroup, FormHint, FormInput, FormLabel } from "./components/forms/form-group";
