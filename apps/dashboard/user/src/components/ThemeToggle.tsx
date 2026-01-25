import React from "react";
import { Button, Icon, IconType } from "@proofa/components";

type ThemeKey = "light" | "dark" | "system";

const THEME_META: Record<ThemeKey, { label: string; icon: (typeof IconType)[keyof typeof IconType] }> = {
	light: { label: "Light", icon: IconType.Sun },
	dark: { label: "Dark", icon: IconType.Moon },
	system: { label: "System", icon: IconType.Computer },
};

export function ThemeToggle({
	theme,
	onToggle,
}: {
	theme: "light" | "dark" | "system";
	onToggle: () => void;
}) {
	const current = THEME_META[theme];

	return (
		<Button
			variant="plain"
			onClick={onToggle}
			className="theme-toggle"
			title={`Current: ${current.label}`}
		>
			<Icon icon={current.icon} size={16} />
			<span className="theme-text">{current.label}</span>
		</Button>
	);
}
