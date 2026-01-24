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

// Alert Components
export { 
  Alert, 
  AlertTitle, 
  AlertDescription, 
  AlertAction,
  alertVariants 
} from './components/selia/ui/alert';

// Button Component
export { 
  Button,
  buttonVariants 
} from './components/selia/ui/button';

// Checkbox Components
export { 
  Checkbox, 
  CheckboxGroup, 
  CheckboxGroupLabel 
} from './components/selia/ui/checkbox';

// Chip Components (Badge alternative)
export { 
  Chip, 
  ChipButton,
  chipVariants 
} from './components/selia/ui/chip';

// Dialog Components
export { 
  Dialog, 
  DialogTrigger, 
  DialogPopup, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from './components/selia/ui/dialog';

// Input Component
export { 
  Input,
  inputVariants 
} from './components/selia/ui/input';

// Label Component
export { Label } from './components/selia/ui/label';

// Select Components
export { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectPopup, 
  SelectList, 
  SelectItem, 
  SelectGroup, 
  SelectGroupLabel, 
  SelectSeparator,
  selectTriggerVariants 
} from './components/selia/ui/select';
export type { SelectItem as SelectItemType } from './components/selia/ui/select';

// Spinner Component
export { Spinner } from './components/selia/ui/spinner';

// ============================================================================
// ICONS (Unified Icon System)
// ============================================================================

export { Icon, IconType, } from './icons';
export type { IconProps, IconTypeName } from './icons';

// Utilities
export { cn } from './utils/cn';

// ============================================================================
// PROOFA CUSTOM COMPONENTS (Legacy - Consider migrating to Selia)
// ============================================================================
// These are custom implementations. Prefer Selia components above when possible.

/**
 * @deprecated Use Selia Badge (exported as Chip) instead
 * Legacy custom badge implementation - consider migrating to Chip from Selia
 */
export { Badge } from './components/ui/Badge';
export type { BadgeProps, BadgeVariant } from './components/ui/Badge';

/**
 * @deprecated Use Selia Button instead  
 * Legacy custom button implementation - use Selia Button for new code
 */
export { Button as LegacyButton } from './components/ui/Button';
export type { ButtonProps as LegacyButtonProps } from './components/ui/Button';

/**
 * @deprecated Use Selia components to build cards
 * Legacy custom card implementation
 */
export { Card, CardHeader, CardTitle, CardBody } from './components/ui/Card';
export type { CardProps } from './components/ui/Card';

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
