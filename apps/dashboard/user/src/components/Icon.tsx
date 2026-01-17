import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

export type IconProps = Omit<HugeiconsIconProps, "icon"> & {
	icon: IconSvgElement;
};

/**
 * Icon component wrapper for HugeIcons
 * 
 * @example
 * import { UserIcon } from "@hugeicons/core-free-icons";
 * <Icon icon={UserIcon} size={20} />
 */
export function Icon({ icon, size = 20, strokeWidth = 1.5, color = "currentColor", ...props }: IconProps) {
	return (
		<HugeiconsIcon
			icon={icon}
			size={size}
			strokeWidth={strokeWidth}
			color={color}
			{...props}
		/>
	);
}

export default Icon;
