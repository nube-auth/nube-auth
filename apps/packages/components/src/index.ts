/**
 * @proofa/components - Shared Design System and Component Library
 * 
 * This package contains:
 * - Selia UI components (base design system)
 * - Unified icon system (single IconType registry for all icons)
 * - Reusable React components used across Proofa dashboards
 * - Style configuration (Tailwind, CSS files)
 * - Design tokens and theming
 */

// ============================================================================
// SELIA UI COMPONENTS (Base Design System)
// ============================================================================
// These are the core UI primitives from Selia. Use these directly in your code.

// Re-export all Selia UI components
export * from './components/selia/ui';

// Legacy specific exports for backward compatibility
export type { SelectItem as SelectItemType } from './components/selia/ui/select';

// ============================================================================
// ICONS (Unified Icon System)
// ============================================================================

export { Icon, IconType, } from './icons';
export type { IconProps, IconTypeName } from './icons';

// Utilities
export { cn } from './utils/cn';

// ============================================================================
// PROOFA CUSTOM COMPONENTS (Legacy - Deprecated)
// ============================================================================
// These are legacy custom implementations. Use Selia components instead.

/**
 * @deprecated Use Selia Badge component instead
 * Legacy custom badge implementation - migrate to Selia Badge or Chip
 */
export { Badge as LegacyBadge } from './components/ui/Badge';
export type { BadgeProps as LegacyBadgeProps, BadgeVariant as LegacyBadgeVariant } from './components/ui/Badge';

/**
 * @deprecated Use Selia Button instead  
 * Legacy custom button implementation - use Selia Button for new code
 */
export { Button as LegacyButton } from './components/ui/Button';
export type { ButtonProps as LegacyButtonProps } from './components/ui/Button';

/**
 * @deprecated Use Selia Card component instead
 * Legacy custom card implementation - migrate to Selia Card
 */
export { Card as LegacyCard, CardHeader as LegacyCardHeader, CardTitle as LegacyCardTitle, CardBody as LegacyCardBody } from './components/ui/Card';
export type { CardProps as LegacyCardProps } from './components/ui/Card';

// ============================================================================
// PROOFA COMPOSITE COMPONENTS (Built on Selia)
// ============================================================================
// These are Proofa-specific components built using Selia primitives

export { FormGroup, FormLabel, FormInput, FormHint } from './components/ui/FormGroup';
export type { FormGroupProps, FormLabelProps, FormInputProps, FormHintProps } from './components/ui/FormGroup';

export { Loading } from './components/ui/Loading';
export type { LoadingProps, LoadingSize } from './components/ui/Loading';

export { EmptyState } from './components/ui/EmptyState';
export type { EmptyStateProps } from './components/ui/EmptyState';

export { InfoGrid } from './components/ui/InfoGrid';
export type { InfoGridProps } from './components/ui/InfoGrid';

export { ProfileHeader } from './components/ui/ProfileHeader';
export type { ProfileHeaderProps } from './components/ui/ProfileHeader';

export { InfoList } from './components/ui/InfoList';
export type { InfoListProps, InfoListItemProps } from './components/ui/InfoList';

export { LoginCard, LoginCardLogo, LoginCardTitle, LoginCardSubtitle, LoginCardBody, LoginCardTerms, LoginCardError } from './components/ui/LoginCard';
export type { LoginCardProps, LoginCardLogoProps, LoginCardTitleProps, LoginCardSubtitleProps, LoginCardBodyProps, LoginCardTermsProps, LoginCardErrorProps } from './components/ui/LoginCard';

export { SessionCard } from './components/ui/SessionCard';
export type { SessionCardProps } from './components/ui/SessionCard';

export { StatusDot } from './components/ui/StatusDot';
export type { StatusDotProps, StatusDotVariant } from './components/ui/StatusDot';
