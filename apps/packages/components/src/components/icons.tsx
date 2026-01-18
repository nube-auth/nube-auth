import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import React from "react";

// Import common HugeIcons for unified registry
import {
	UserIcon,
	ComputerIcon,
	SecurityCheckIcon,
	CheckmarkCircle02Icon,
	Tick02Icon,
	Alert02Icon,
	AlertCircleIcon,
	LogoutIcon,
	HomeIcon,
	SettingsIcon,
	Add01Icon,
	Cancel01Icon,
	BookmarkIcon,
	UserMultiple02Icon,
	FlashIcon,
	SmartPhone01Icon,
	InformationCircleIcon,
	Logout03Icon,
	GridViewIcon,
	Menu01Icon,
	Layers01Icon,
	LockIcon,
	DollarCircleIcon,
	ArrowRight01Icon,
	Home01Icon,
	CreditCardIcon,
	CloudUploadIcon,
	ReturnRequestIcon,
	FileExportIcon,
	TestTubeIcon,
	BookOpen01Icon,
	ChartColumnIcon,
	LayoutGridIcon,
	UserGroupIcon,
	Settings02Icon,
	DashboardSquare02Icon,
	LicenseIcon,
	Key01Icon,
	ShieldKeyIcon,
	CodeIcon,
	ArrowDown01Icon,
	Sun03Icon,
	Moon02Icon,
	UserWarningIcon,
} from "@hugeicons/core-free-icons";

// ============================================================================
// Brand Logo Components - Centralized in one place for consistency
// ============================================================================

function GoogleLogo({ className = "w-5 h-5" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className}>
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
			/>
		</svg>
	);
}

function GitHubLogo({ className = "w-5 h-5" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} fill="currentColor">
			<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
		</svg>
	);
}

function StripeLogo({ className = "w-6 h-6" }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24">
			<path
				fill="#635BFF"
				d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"
			/>
		</svg>
	);
}

function NextJsLogo({ className = "w-8 h-8" }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="white" />
		</svg>
	);
}

function ReactLogo({ className = "w-8 h-8" }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<circle cx="12" cy="11.245" r="1.785" fill="#61DAFB" />
			<path d="M12 7.593c-2.494 0-4.888.923-6.697 2.606-1.809 1.682-2.82 3.964-2.82 6.346s1.011 4.664 2.82 6.346c1.809 1.682 4.203 2.606 6.697 2.606 2.494 0 4.888-.923 6.697-2.606 1.809-1.682 2.82-3.964 2.82-6.346s-1.011-4.664-2.82-6.346c-1.809-1.682-4.203-2.606-6.697-2.606z" stroke="#61DAFB" strokeWidth="1" fill="none" />
			<path d="M7.303 15.405c-1.247.724-2.452 1.698-3.349 2.928M16.697 15.405c1.247.724 2.452 1.698 3.349 2.928M16.697 8.085c1.247-.724 2.452-1.698 3.349-2.928M7.303 8.085c-1.247-.724-2.452-1.698-3.349-2.928" stroke="#61DAFB" strokeWidth="1" />
		</svg>
	);
}

function JavaScriptLogo({ className = "w-8 h-8" }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect x="2" y="2" width="20" height="20" fill="#F7DF1E" />
			<path d="M9.5 16.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5" stroke="#000" strokeWidth="1" fill="none" />
			<path d="M14.5 8.5h-5" stroke="#000" strokeWidth="1" />
		</svg>
	);
}

function FlutterLogo({ className = "w-8 h-8" }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M13 2L3 12l5 5 5-5 5 5 5-5-10-10z" fill="#02569B" />
			<path d="M13 7L8 12l5 5 5-5-5-5z" fill="#02569B" opacity="0.5" />
		</svg>
	);
}

function NodeJsLogo({ className = "w-8 h-8" }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" fill="#47A248" />
		</svg>
	);
}

function TailwindLogo({ className = "w-8 h-8" }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 2L2 8l2 6-2 6 10 6 10-6-2-6 2-6-10-6z" fill="#FF6B6B" />
			<path d="M12 6L6 9l1 4-1 4 6 3 6-3-1-4 1-4-6-3z" fill="white" />
		</svg>
	);
}

/**
 * Type-safe icon registry
 * Unified registry for all icons (brand logos + HugeIcons)
 * Users only need to import from @proofa/components - no need to know the source
 * 
 * Usage:
 * <Icon icon={IconType.Google} size={20} />
 * <Icon icon={IconType.UserIcon} size={20} bold />
 */
export const IconType = {
	// Brand logos
	Google: 'Google' as const,
	GitHub: 'GitHub' as const,
	Stripe: 'Stripe' as const,
	NextJS: 'NextJS' as const,
	React: 'React' as const,
	JavaScript: 'JavaScript' as const,
	Flutter: 'Flutter' as const,
	NodeJS: 'NodeJS' as const,
	Tailwind: 'Tailwind' as const,
	
	// HugeIcons
	UserIcon: 'UserIcon' as const,
	ComputerIcon: 'ComputerIcon' as const,
	SecurityCheckIcon: 'SecurityCheckIcon' as const,
	CheckmarkCircle02Icon: 'CheckmarkCircle02Icon' as const,
	Tick02Icon: 'Tick02Icon' as const,
	Alert02Icon: 'Alert02Icon' as const,
	AlertCircleIcon: 'AlertCircleIcon' as const,
	LogoutIcon: 'LogoutIcon' as const,
	HomeIcon: 'HomeIcon' as const,
	SettingsIcon: 'SettingsIcon' as const,
	Add01Icon: 'Add01Icon' as const,
	Cancel01Icon: 'Cancel01Icon' as const,
	BookmarkIcon: 'BookmarkIcon' as const,
	UserMultiple02Icon: 'UserMultiple02Icon' as const,
	FlashIcon: 'FlashIcon' as const,
	SmartPhone01Icon: 'SmartPhone01Icon' as const,
	InformationCircleIcon: 'InformationCircleIcon' as const,
	Logout03Icon: 'Logout03Icon' as const,
	GridViewIcon: 'GridViewIcon' as const,
	Menu01Icon: 'Menu01Icon' as const,
	Layers01Icon: 'Layers01Icon' as const,
	LockIcon: 'LockIcon' as const,
	DollarCircleIcon: 'DollarCircleIcon' as const,
	ArrowRight01Icon: 'ArrowRight01Icon' as const,
	Home01Icon: 'Home01Icon' as const,
	CreditCardIcon: 'CreditCardIcon' as const,
	CloudUploadIcon: 'CloudUploadIcon' as const,
	ReturnRequestIcon: 'ReturnRequestIcon' as const,
	FileExportIcon: 'FileExportIcon' as const,
	TestTubeIcon: 'TestTubeIcon' as const,
	BookOpen01Icon: 'BookOpen01Icon' as const,
	ChartColumnIcon: 'ChartColumnIcon' as const,
	LayoutGridIcon: 'LayoutGridIcon' as const,
	UserGroupIcon: 'UserGroupIcon' as const,
	Settings02Icon: 'Settings02Icon' as const,
	DashboardSquare02Icon: 'DashboardSquare02Icon' as const,
	LicenseIcon: 'LicenseIcon' as const,
	Key01Icon: 'Key01Icon' as const,
	ShieldKeyIcon: 'ShieldKeyIcon' as const,
	CodeIcon: 'CodeIcon' as const,
	ArrowDown01Icon: 'ArrowDown01Icon' as const,
	Sun03Icon: 'Sun03Icon' as const,
	Moon02Icon: 'Moon02Icon' as const,
	UserWarningIcon: 'UserWarningIcon' as const,
} as const;

// Type-safe icon name type
export type IconTypeName = keyof typeof IconType;

// Icon registry mapping (brand logos + HugeIcons)
const ICON_REGISTRY: Record<IconTypeName, IconSvgElement | React.ComponentType<{ className?: string }>> = {
	// Brand logos
	Google: GoogleLogo,
	GitHub: GitHubLogo,
	Stripe: StripeLogo,
	NextJS: NextJsLogo,
	React: ReactLogo,
	JavaScript: JavaScriptLogo,
	Flutter: FlutterLogo,
	NodeJS: NodeJsLogo,
	Tailwind: TailwindLogo,
	
	// HugeIcons
	UserIcon,
	ComputerIcon,
	SecurityCheckIcon,
	CheckmarkCircle02Icon,
	Tick02Icon,
	Alert02Icon,
	AlertCircleIcon,
	LogoutIcon,
	HomeIcon,
	SettingsIcon,
	Add01Icon,
	Cancel01Icon,
	BookmarkIcon,
	UserMultiple02Icon,
	FlashIcon,
	SmartPhone01Icon,
	InformationCircleIcon,
	Logout03Icon,
	GridViewIcon,
	Menu01Icon,
	Layers01Icon,
	LockIcon,
	DollarCircleIcon,
	ArrowRight01Icon,
	Home01Icon,
	CreditCardIcon,
	CloudUploadIcon,
	ReturnRequestIcon,
	FileExportIcon,
	TestTubeIcon,
	BookOpen01Icon,
	ChartColumnIcon,
	LayoutGridIcon,
	UserGroupIcon,
	Settings02Icon,
	DashboardSquare02Icon,
	LicenseIcon,
	Key01Icon,
	ShieldKeyIcon,
	CodeIcon,
	ArrowDown01Icon,
	Sun03Icon,
	Moon02Icon,
	UserWarningIcon,
};

export type IconProps = Omit<HugeiconsIconProps, "icon"> & {
	icon: IconTypeName | IconSvgElement;
	/** Use bold variant with thicker stroke for emphasis */
	bold?: boolean;
};

/**
 * Unified Icon component for all icon usage across Proofa
 * 
 * Single source of truth for all icons (brand logos + HugeIcons)
 * Users don't need to import from multiple places or know which icon pack is used
 * 
 * @example
 * import { Icon, IconType } from "@proofa/components";
 * 
 * // Brand logos
 * <Icon icon={IconType.Google} size={20} />
 * <Icon icon={IconType.GitHub} size={24} bold />
 * 
 * // HugeIcons (no need to import from @hugeicons/core-free-icons)
 * <Icon icon={IconType.UserIcon} size={20} />
 * <Icon icon={IconType.SettingsIcon} size={20} bold />
 * <Icon icon={IconType.Home01Icon} size={24} />
 */
export function Icon({ icon, size = 20, strokeWidth, bold = false, color = "currentColor", ...props }: IconProps) {
	const resolvedStrokeWidth = strokeWidth ?? (bold ? 2.5 : 1.5);
	
	// Check if icon is directly a HugeIcons IconSvgElement (looks like an array)
	if (Array.isArray(icon)) {
		return (
			<HugeiconsIcon
				icon={icon}
				size={size}
				strokeWidth={resolvedStrokeWidth}
				color={color}
				{...props}
			/>
		);
	}
	
	// Otherwise it's an IconTypeName - look it up in the registry
	const iconSource = ICON_REGISTRY[icon as IconTypeName];
	
	// Check if it's a HugeIcons IconSvgElement (looks like an array)
	if (Array.isArray(iconSource)) {
		return (
			<HugeiconsIcon
				icon={iconSource}
				size={size}
				strokeWidth={resolvedStrokeWidth}
				color={color}
				{...props}
			/>
		);
	}
	
	// Otherwise it's a brand logo component
	const BrandLogo = iconSource as React.ElementType;
	return (
		<BrandLogo 
			className={props.className}
			style={{ ...props.style, width: size, height: size, strokeWidth: resolvedStrokeWidth }}
		/>
	);
}

export default Icon;
