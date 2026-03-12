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
export * from './base';

// Explicitly export Tabs components
export { Tabs, TabsList, TabsItem, TabsPanel } from './base/display/tabs';

// Legacy specific exports for backward compatibility
export type { SelectItem as SelectItemType } from './base/forms/select';

// ============================================================================
// ICONS (Unified Icon System)
// ============================================================================

export { Icon, IconType, } from './icons';
export type { IconProps, IconTypeName } from './icons';

// ============================================================================
// HOOKS
// ============================================================================

export { useTheme } from './hooks/useTheme';
export type { Theme } from './hooks/useTheme';

// ============================================================================
// UTILITIES
// ============================================================================

export { cn } from './lib/cn';

// ============================================================================
// NUBE_AUTH COMPOSITE COMPONENTS (Built on Selia)
// ============================================================================
// These are Nube Auth-specific components built using Selia primitives

// Forms
export { FormGroup, FormLabel, FormInput, FormHint } from './components/forms/form-group';
export type { FormGroupProps, FormLabelProps, FormInputProps, FormHintProps } from './components/forms/form-group';

// Feedback
export { Loading } from './components/feedback/loading';
export type { LoadingProps, LoadingSize } from './components/feedback/loading';

export { StatusDot } from './components/feedback/status-dot';
export type { StatusDotProps, StatusDotVariant } from './components/feedback/status-dot';

// Display
export { EmptyState } from './components/display/empty-state';
export type { EmptyStateProps } from './components/display/empty-state';

export { InfoGrid } from './components/display/info-grid';
export type { InfoGridProps } from './components/display/info-grid';

export { ProfileHeader } from './components/display/profile-header';
export type { ProfileHeaderProps } from './components/display/profile-header';

export { InfoList } from './components/display/info-list';
export type { InfoListProps, InfoListItemProps } from './components/display/info-list';

export { SessionCard } from './components/display/session-card';
export type { SessionCardProps } from './components/display/session-card';

export { DataTable, DataTableHeader, DataTableRow } from './components/display/data-table';
export type { DataTableProps, DataTableHeaderProps, DataTableRowProps } from './components/display/data-table';

export { ThemeToggle } from './components/display/ThemeToggle';
export type { ThemeToggleProps } from './components/display/ThemeToggle';

// Auth
export { LoginCard, LoginCardLogo, LoginCardTitle, LoginCardSubtitle, LoginCardBody, LoginCardTerms, LoginCardError, AuthLoginCard } from './components/auth/login-card';
export type { LoginCardProps, LoginCardLogoProps, LoginCardTitleProps, LoginCardSubtitleProps, LoginCardBodyProps, LoginCardTermsProps, LoginCardErrorProps, AuthLoginCardProps } from './components/auth/login-card';
