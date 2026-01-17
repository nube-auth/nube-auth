import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

export type IconProps = Omit<HugeiconsIconProps, "icon"> & {
	icon: IconSvgElement;
	/** Use bold variant with thicker stroke for emphasis */
	bold?: boolean;
};

/**
 * Icon component wrapper for HugeIcons
 * 
 * @example
 * import { UserIcon } from "@hugeicons/core-free-icons";
 * <Icon icon={UserIcon} size={20} />
 * <Icon icon={UserIcon} size={20} bold /> // Thicker stroke for emphasis
 */
export function Icon({ icon, size = 20, strokeWidth, bold = false, color = "currentColor", ...props }: IconProps) {
	// Bold uses thicker stroke for more visual weight
	const resolvedStrokeWidth = strokeWidth ?? (bold ? 2.5 : 1.5);
	
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

export default Icon;
