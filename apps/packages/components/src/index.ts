/**
 * @proofa/components - Shared Design System and Component Library
 * 
 * This package contains:
 * - Unified icon system (single IconType registry for all icons)
 * - Reusable React components used across Proofa dashboards
 * - Style configuration (UnoCSS, Tailwind, CSS files)
 * - Design tokens and theming
 */

// Icons (unified component + single registry for all icon sources)
export { Icon, IconType, } from './icons';
export type { IconProps, IconTypeName } from './icons';

// Utilities
export { cn } from './utils/cn';

// UI Components - Phase 1 (Essential)
export { Badge } from './components/ui/Badge';
export type { BadgeProps, BadgeVariant } from './components/ui/Badge';

export { Button } from './components/ui/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/ui/Button';

export { Card, CardHeader, CardTitle, CardBody } from './components/ui/Card';
export type { CardProps, CardHeaderProps, CardTitleProps, CardBodyProps } from './components/ui/Card';

export { LoginCard, LoginCardLogo, LoginCardTitle, LoginCardSubtitle, LoginCardBody, LoginCardTerms, LoginCardError } from './components/ui/LoginCard';
export type { LoginCardProps, LoginCardLogoProps, LoginCardTitleProps, LoginCardSubtitleProps, LoginCardBodyProps, LoginCardTermsProps, LoginCardErrorProps } from './components/ui/LoginCard';

export { FormGroup, FormLabel, FormInput, FormHint } from './components/ui/FormGroup';
export type { FormGroupProps, FormLabelProps, FormInputProps, FormHintProps } from './components/ui/FormGroup';

export { Loading } from './components/ui/Loading';
export type { LoadingProps, LoadingSize } from './components/ui/Loading';

// UI Components - Phase 2 (Intermediate)
export { EmptyState } from './components/ui/EmptyState';
export type { EmptyStateProps } from './components/ui/EmptyState';

export { InfoGrid } from './components/ui/InfoGrid';
export type { InfoGridProps } from './components/ui/InfoGrid';

export { ProfileHeader } from './components/ui/ProfileHeader';
export type { ProfileHeaderProps } from './components/ui/ProfileHeader';

export { InfoList } from './components/ui/InfoList';
export type { InfoListProps, InfoListItemProps } from './components/ui/InfoList';

// UI Components - Phase 3 (Specialized)
export { SessionCard } from './components/ui/SessionCard';
export type { SessionCardProps } from './components/ui/SessionCard';

export { StatusDot } from './components/ui/StatusDot';
export type { StatusDotProps, StatusDotVariant } from './components/ui/StatusDot';
