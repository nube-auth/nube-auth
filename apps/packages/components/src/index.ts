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
export { Icon, IconType, } from './components/icons';
export type { IconProps, IconTypeName } from './components/icons';

// Utilities
export { cn } from './utils/cn';

// Component exports for Phase 2
// export { Button } from './components/button';
// export { Card } from './components/card';
// export { Dialog } from './components/dialog';
// etc.
